import { Rikishi, RankInfo, Division, SanyakuRank, RikishiStats } from '../types';
import { BEYAS } from '../types';
import { DIVISIONS } from '../constants/world';
import { generateShikona } from './nameGenerator';

/**
 * Seeds the initial world state with ~600 rikishi
 */
export function seedWorld(): Rikishi[] {
  const world: Rikishi[] = [];
  const existingNames = new Set<string>();
  
  // Use bounds from guidelines for variable sized divisions
  const jonidanSize = Math.floor(Math.random() * 61) + 200; // 200 - 260
  const jonokuchiSize = Math.floor(Math.random() * 51) + 50; // 50 - 100
  
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

function generateNPCRikishi(rank: RankInfo, existingNames: Set<string>): Rikishi {
  const stats: RikishiStats = {
    power: 3 + Math.floor(Math.random() * 8),
    balance: 3 + Math.floor(Math.random() * 8),
    footwork: 3 + Math.floor(Math.random() * 8),
    technique: 3 + Math.floor(Math.random() * 8),
    spirit: 3 + Math.floor(Math.random() * 8),
    weight: 120 + Math.floor(Math.random() * 80)
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

  const beya = BEYAS[Math.floor(Math.random() * BEYAS.length)];

  return {
    id: Math.random().toString(36).substr(2, 9),
    name: generateShikona(beya, existingNames),
    rank,
    beya,
    mawashiColor: ['Black', 'Blue', 'Green', 'Purple', 'Maroon'][Math.floor(Math.random() * 5)],
    archetype: 'Custom',
    experience: 5 + Math.floor(Math.random() * 40),
    wins: 0,
    losses: 0,
    health: 100,
    energy: 100,
    fatigue: Math.floor(Math.random() * 30),
    baseFatigue: 0,
    focusPoints: 10 + Math.floor(Math.random() * 30),
    bashosCompleted: 5 + Math.floor(Math.random() * 50),
    totalUniqueInjuries: 0,
    bashoProgressPenalty: 0,
    tpAvailable: 0,
    tpAssigned: { power: 0, balance: 0, footwork: 0, technique: 0, spirit: 0 },
    totalTpSpent: { power: 0, balance: 0, footwork: 0, technique: 0, spirit: 0 },
    momentum: { attribute: null, value: 0 },
    stats,
    injuries: {
      power: { severity: 0, hits: 0 },
      balance: { severity: 0, hits: 0 },
      footwork: { severity: 0, hits: 0 },
      technique: { severity: 0, hits: 0 },
      spirit: { severity: 0, hits: 0 }
    },
    permanentPenalties: { power: 0, balance: 0, footwork: 0, technique: 0, spirit: 0 },
    specializations: [],
    hasRenamedAtCurrentRank: false,
    careerHistory: [],
    isNPC: true
  };
}
