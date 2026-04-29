import { Rikishi, RankInfo, Division, SanyakuRank, RikishiStats, AttributeKey, Injury } from '../types';
import { BEYAS } from '../types';
import { DIVISIONS } from '../constants/world';
import { generateShikona } from './nameGenerator';
import { secureRandomInt, secureRandom } from './gameLogic';

/**
 * Seeds the initial world state with ~600 rikishi
 */
export function seedWorld(): Rikishi[] {
  const world: Rikishi[] = [];
  const existingNames = new Set<string>();
  
  // Use bounds from guidelines for variable sized divisions
  const jonidanSize = secureRandomInt(61) - 1 + 200; // 200 - 260
  const jonokuchiSize = secureRandomInt(51) - 1 + 50; // 50 - 100
  
  const distributions: Record<Division, number> = {
    'Makuuchi': 42,
    'Juryo': 28,
    'Makushita': 120,
    'Sandanme': 160,
    'Jonidan': jonidanSize,
    'Jonokuchi': jonokuchiSize
  };

  const divisions: Division[] = ['Makuuchi', 'Juryo', 'Makushita', 'Sandanme', 'Jonidan', 'Jonokuchi'];

  divisions.forEach(div => {
    const count = distributions[div];
    for (let i = 0; i < count; i++) {
      const isEast = i % 2 === 0;
      const numericalRank = Math.floor(i / 2) + 1;
      
      let rank: RankInfo = {
        division: div,
        title: numericalRank,
        side: isEast ? 'East' : 'West'
      };

      // Makuuchi special ranks
      if (div === 'Makuuchi') {
        if (i < 2) {
          rank.title = 'Yokozuna';
        } else if (i < 6) {
          rank.title = 'Ozeki';
        } else if (i < 10) {
          rank.title = 'Sekiwake';
        } else if (i < 14) {
          rank.title = 'Komusubi';
        } else {
          rank.title = Math.floor((i - 14) / 2) + 1;
        }
      }

      world.push(generateNPCRikishi(rank, existingNames));
    }
  });

  return world;
}

export function generateNPCRikishi(rank: RankInfo, existingNames: Set<string>): Rikishi {
  const stats: RikishiStats = {
    power: 3 + secureRandomInt(8) - 1,
    balance: 3 + secureRandomInt(8) - 1,
    footwork: 3 + secureRandomInt(8) - 1,
    technique: 3 + secureRandomInt(8) - 1,
    spirit: 3 + secureRandomInt(8) - 1,
    weight: 120 + secureRandomInt(80) - 1
  };

  // Adjust stats based on division
  const divMultiplier: Record<Division, number> = {
    'Makuuchi': 2.0,
    'Juryo': 1.6,
    'Makushita': 1.3,
    'Sandanme': 1.1,
    'Jonidan': 1.0,
    'Jonokuchi': 0.8
  };

  const mult = divMultiplier[rank.division];
  (Object.keys(stats) as Array<keyof RikishiStats>).forEach(key => {
    if (key !== 'weight') {
      stats[key] = Math.max(3, Math.floor(stats[key] * mult));
    }
  });

  const beya = BEYAS[secureRandomInt(BEYAS.length)];
  const bashosCompleted = 5 + secureRandomInt(80) - 1; // 5 to 84 bashos
  
  // Calculate Base Stats for legacy
  const baseFatigue = Math.floor(bashosCompleted / 2);
  
  // Create the record with default clean state first
  const injuries: Record<AttributeKey, Injury> = {
    power: { severity: 0, hits: 0 },
    balance: { severity: 0, hits: 0 },
    footwork: { severity: 0, hits: 0 },
    technique: { severity: 0, hits: 0 },
    spirit: { severity: 0, hits: 0 }
  };
  const permanentPenalties: Record<AttributeKey, number> = {
    power: 0, balance: 0, footwork: 0, technique: 0, spirit: 0
  };

  // Simulate "Legacy Injuries" for veterans
  let totalUniqueInjuries = 0;
  if (bashosCompleted > 20) {
    const attrs: AttributeKey[] = ['power', 'balance', 'footwork', 'technique', 'spirit'];
    const rolls = Math.floor(bashosCompleted / 10); // One per ~year
    for (let i = 0; i < rolls; i++) {
      if (secureRandom() < 0.2) { // 20% chance of a historical permanent injury per roll
        const attr = attrs[secureRandomInt(attrs.length)];
        permanentPenalties[attr] += 1;
        totalUniqueInjuries += 1;
      }
    }
  }

  return {
    id: secureRandomInt(1000000).toString(36) + secureRandomInt(1000000).toString(36),
    name: generateShikona(beya, existingNames),
    rank,
    beya,
    mawashiColor: ['Black', 'Blue', 'Green', 'Purple', 'Maroon'][secureRandomInt(5) - 1],
    archetype: 'Custom',
    experience: 5 + secureRandomInt(40) - 1,
    wins: 0,
    losses: 0,
    health: 100,
    energy: 100,
    fatigue: secureRandomInt(30) + baseFatigue,
    baseFatigue,
    focusPoints: 10 + secureRandomInt(30) - 1,
    bashosCompleted,
    totalUniqueInjuries,
    bashoProgressPenalty: 0,
    tpAvailable: 0,
    tpAssigned: { power: 0, balance: 0, footwork: 0, technique: 0, spirit: 0 },
    totalTpSpent: { power: 0, balance: 0, footwork: 0, technique: 0, spirit: 0 },
    momentum: { attribute: null, value: 0 },
    stats,
    injuries,
    permanentPenalties,
    specializations: [],
    hasRenamedAtCurrentRank: false,
    careerHistory: [],
    isNPC: true,
    status: 'active'
  };
}
