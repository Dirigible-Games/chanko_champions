import {
  WorldState,
  Rikishi,
  NewsItem,
  Division,
  BoutPairing,
  AttributeKey,
} from "../types";
import { DIVISIONS } from "../constants/world";
import {
  getEffectiveStats,
  secureRandom,
  secureRandomInt,
  applyInjury,
  performInjuryRoll,
  performRecoveryRoll,
  evaluateKyujo,
  evaluateRetirement
} from "./gameLogic";
import {
  calculateRankChange,
  formatRank,
  abbreviateRank,
  reRankAllDivisions,
} from "./rankLogic";
import { calculateMomentumPoints } from "./gameLogic";
import { simulateFullBout } from "./combatEngine";
import { generateNPCRikishi } from "./worldGeneration";
import { generateBashoScheduleForDay } from "./tournamentScheduler";

export function simulateAllBoutsForDay(
  schedule: BoutPairing[],
  allRikishi: Rikishi[],
  day: number,
  playerRikishiId?: string,
  onInjuryCallback?: (rikishi: Rikishi, severity: number, attr: AttributeKey, day: number) => void
): Rikishi[] {
  const rikishiMap = new Map(allRikishi.map((r) => [r.id, { ...r }]));
  const dayBouts = schedule.filter((p) => p.day === day);

  for (const bout of dayBouts) {
    const r1 = rikishiMap.get(bout.rikishiId1);
    const r2 = rikishiMap.get(bout.rikishiId2);

    if (
      (bout.rikishiId1 === playerRikishiId && r1?.status !== 'kyujo') ||
      (bout.rikishiId2 === playerRikishiId && r2?.status !== 'kyujo')
    ) {
      continue;
    }

    if (r1 && r2 && !bout.result) {
      const isR1Kyujo = r1.status === 'kyujo' || evaluateKyujo(r1);
      const isR2Kyujo = r2.status === 'kyujo' || evaluateKyujo(r2);

      if (isR1Kyujo && r1.status !== 'kyujo') r1.status = 'kyujo';
      if (isR2Kyujo && r2.status !== 'kyujo') r2.status = 'kyujo';

      if (isR1Kyujo && isR2Kyujo) {
        // Both absent, both get a loss, no winner
        r1.losses += 1;
        r2.losses += 1;
        bout.result = 'draw';
        rikishiMap.set(r1.id, r1);
        rikishiMap.set(r2.id, r2);
        continue;
      } else if (isR1Kyujo) {
        // R1 absent, R2 wins by default
        r1.losses += 1;
        r2.wins += 1;
        r2.boutsFoughtThisBasho = (r2.boutsFoughtThisBasho || 0) + 1;
        bout.result = 'rikishiId2';
        rikishiMap.set(r1.id, r1);
        rikishiMap.set(r2.id, r2);
        continue;
      } else if (isR2Kyujo) {
        // R2 absent, R1 wins by default
        r2.losses += 1;
        r1.wins += 1;
        r1.boutsFoughtThisBasho = (r1.boutsFoughtThisBasho || 0) + 1;
        bout.result = 'rikishiId1';
        rikishiMap.set(r1.id, r1);
        rikishiMap.set(r2.id, r2);
        continue;
      }

      const result = simulateFullBout(r1, r2);
      result.updatedR1.wins += result.winnerId === r1.id ? 1 : 0;
      result.updatedR1.losses += result.winnerId === r1.id ? 0 : 1;
      result.updatedR1.boutsFoughtThisBasho = (result.updatedR1.boutsFoughtThisBasho || 0) + 1;
      result.updatedR2.wins += result.winnerId === r2.id ? 1 : 0;
      result.updatedR2.losses += result.winnerId === r2.id ? 0 : 1;
      result.updatedR2.boutsFoughtThisBasho = (result.updatedR2.boutsFoughtThisBasho || 0) + 1;

      if (result.injuryHits1 > 0) {
        const attrs: AttributeKey[] = ["power", "balance", "footwork", "technique", "spirit"];
        const severityResult = performInjuryRoll(result.updatedR1.fatigue, result.injuryHits1);
        
        let targetAttr: AttributeKey | null = null;
        if (result.updatedR1.fatigue < 60) {
          targetAttr = attrs[secureRandomInt(attrs.length) - 1];
        }

        severityResult.results.forEach(res => {
          const attr = targetAttr || attrs[secureRandomInt(attrs.length) - 1];
          result.updatedR1 = applyInjury(
            result.updatedR1,
            res.severity,
            attr
          );
          if (onInjuryCallback) onInjuryCallback(result.updatedR1, res.severity, attr, day);
        });
      }

      if (result.injuryHits2 > 0) {
        const attrs: AttributeKey[] = ["power", "balance", "footwork", "technique", "spirit"];
        const severityResult = performInjuryRoll(result.updatedR2.fatigue, result.injuryHits2);
        
        let targetAttr: AttributeKey | null = null;
        if (result.updatedR2.fatigue < 60) {
          targetAttr = attrs[secureRandomInt(attrs.length) - 1];
        }

        severityResult.results.forEach(res => {
          const attr = targetAttr || attrs[secureRandomInt(attrs.length) - 1];
          result.updatedR2 = applyInjury(
            result.updatedR2,
            res.severity,
            attr
          );
          if (onInjuryCallback) onInjuryCallback(result.updatedR2, res.severity, attr, day);
        });
      }

      bout.result = result.winnerId === r1.id ? "rikishiId1" : "rikishiId2";

      rikishiMap.set(r1.id, result.updatedR1);
      rikishiMap.set(r2.id, result.updatedR2);
    }
  }

  return Array.from(rikishiMap.values());
}

export function simulateBashoEnd(
  worldState: WorldState,
  playerRikishi: Rikishi,
): { updatedWorld: WorldState; updatedPlayer: Rikishi } {
  let newNews: NewsItem[] = [...(worldState.news || [])];
  const newsForThisMonth: NewsItem[] = [];
  const divisionAverages = new Map<string, number>();
  DIVISIONS.forEach((d) => {
    const subset = worldState.rikishi.filter((r) => r.rank.division === d.name);
    if (subset.length === 0) {
      divisionAverages.set(d.name, 30);
      return;
    }
    const sum = subset.reduce((acc, r) => {
      const p =
        r.stats.power +
        r.stats.technique +
        r.stats.balance +
        r.stats.spirit +
        r.stats.footwork;
      return acc + p;
    }, 0);
    divisionAverages.set(d.name, sum / subset.length);
  });

  let currentRikishiList = worldState.rikishi.map((r) => {
    // Clone rikishi to avoid mutation of world state objects
    const clone = { ...r, stats: { ...r.stats }, injuries: { ...r.injuries }, permanentPenalties: { ...r.permanentPenalties }, careerHistory: [...(r.careerHistory || [])] };
    return clone.id === playerRikishi.id ? { ...playerRikishi, careerHistory: [...(playerRikishi.careerHistory || [])] } : clone;
  });

  if (worldState.bashoSchedule) {
    let currentSchedule = [...worldState.bashoSchedule];
    for (let d = worldState.currentBashoDay || 1; d <= 15; d++) {
      const nextDaySchedule = generateBashoScheduleForDay(currentRikishiList, currentSchedule, d);
      currentSchedule = [...currentSchedule, ...nextDaySchedule];

      currentRikishiList = simulateAllBoutsForDay(
        currentSchedule,
        currentRikishiList,
        d,
        playerRikishi.id,
        (rikishi, severity, attr, day) => {
          if (rikishi.rank.division === "Makuuchi") {
            const isHighRankTitle = typeof rikishi.rank.title === 'string' && ['Yokozuna', 'Ozeki', 'Sekiwake', 'Komusubi'].includes(rikishi.rank.title);
            const isHighMaegashira = typeof rikishi.rank.title === 'number' && rikishi.rank.title <= 5;
            
            if (severity >= 3 && (isHighRankTitle || isHighMaegashira)) {
               newsForThisMonth.push({
                 id: secureRandomInt(1000000).toString(36),
                 year: worldState.currentYear,
                 month: worldState.currentMonth,
                 type: "general",
                 division: rikishi.rank.division,
                 text: `${rikishi.name} (${abbreviateRank(rikishi.rank)}) was severely injured on Day ${day} in a bout!`
               });
            }
          }
        }
      );
    }
  }

  // Create a record of OLD ranks before re-ranking
  const oldRanksMap = new Map<string, any>();
  currentRikishiList.forEach(r => oldRanksMap.set(r.id, { ...r.rank }));

  const rikishiWithRecords = currentRikishiList.map((r) => {
    if (r.id === playerRikishi.id) return r;

    if (r.isNPC) {
      r.bashosCompleted += 1;
      
      let tpEarned = 0;
      if (r.bashosCompleted >= 20) {
        tpEarned = 2;
      } else {
        const divInfo = DIVISIONS.find(d => d.name === r.rank.division);
        const boutsScheduled = divInfo ? divInfo.bouts : 15;
        const participated = r.boutsFoughtThisBasho || 0;
        
        if (r.status === 'kyujo' && participated < boutsScheduled / 2) {
          tpEarned = 0;
        } else {
          tpEarned = secureRandomInt(2) + 1; // 1-3
        }
      }

      const attrs: AttributeKey[] = [
        "power",
        "balance",
        "technique",
        "footwork",
        "spirit",
      ];
      for (let i = 0; i < tpEarned; i++) {
        const attr = attrs[secureRandomInt(attrs.length) - 1];
        r.stats[attr] += 1;
      }
      r.fatigue = Math.max(0, r.fatigue - 40);
    }
    return r;
  });

  const divisions = DIVISIONS.map((d) => d.name);
  let yushoWinners = new Set<string>();
  let junYushoWinners = new Set<string>();
  
  divisions.forEach((divName) => {
    const divisionRikishi = rikishiWithRecords.filter(
      (r) => r.rank.division === divName,
    );
    if (divisionRikishi.length === 0) return;
    
    // Determine the highest win count
    const maxWins = Math.max(...divisionRikishi.map(r => r.wins));
    const tiedRikishi = divisionRikishi.filter(r => r.wins === maxWins);

    let winner = tiedRikishi[0];
    
    if (tiedRikishi.length > 1) {
      newsForThisMonth.push({
        id: secureRandomInt(1000000).toString(36),
        year: worldState.currentYear,
        month: worldState.currentMonth,
        type: "general",
        division: divName,
        text: `A ${tiedRikishi.length}-way playoff is occurring in ${divName} to decide the Yusho!`,
      });
      
      let remaining = [...tiedRikishi];
      while (remaining.length > 1) {
        // Randomly pick two
        remaining.sort(() => secureRandom() - 0.5);
        const r1Index = rikishiWithRecords.findIndex(r => r.id === remaining[0].id);
        const r2Index = rikishiWithRecords.findIndex(r => r.id === remaining[1].id);
        
        const result = simulateFullBout(rikishiWithRecords[r1Index], rikishiWithRecords[r2Index]);
        
        // Save the updated health/fatigue back
        rikishiWithRecords[r1Index] = result.updatedR1;
        rikishiWithRecords[r2Index] = result.updatedR2;

        let boutWinnerId = result.winnerId;
        let boutLoserId = boutWinnerId === remaining[0].id ? remaining[1].id : remaining[0].id;

        remaining = remaining.filter(r => r.id !== boutLoserId);
      }
      winner = remaining[0];
      
      // The rest of the tied rikishi receive Jun-Yusho
      tiedRikishi.filter(r => r.id !== winner.id).forEach(r => junYushoWinners.add(r.id));
    } else {
      // If there's no tie for maxWins, the next highest wins gets Jun-Yusho
      const remainingWins = divisionRikishi.filter(r => r.wins < maxWins).map(r => r.wins);
      if (remainingWins.length > 0) {
        const nextMaxWins = Math.max(...remainingWins);
        divisionRikishi.filter(r => r.wins === nextMaxWins).forEach(r => junYushoWinners.add(r.id));
      }
    }

    // Refresh winner reference in case it was modified by simulateFullBout
    winner = rikishiWithRecords.find(r => r.id === winner.id) || winner;
    yushoWinners.add(winner.id);

    newsForThisMonth.push({
      id: secureRandomInt(1000000).toString(36),
      year: worldState.currentYear,
      month: worldState.currentMonth,
      type: "yusho",
      division: divName,
      text: `${abbreviateRank(winner.rank)} ${winner.name} wins the ${divName} Yusho with a ${winner.wins}-${winner.losses} record!`,
      rikishiId: winner.id,
    });
  });

  // Evaluate retirements and reset kyujo status
  let retiredCount = 0;
  const activeRikishiList = rikishiWithRecords.filter(r => {
     if (r.id === playerRikishi.id) {
         if (r.status === 'kyujo') r.status = 'active';
         return true; 
     }
     
     if (evaluateRetirement(r)) {
         newsForThisMonth.push({
            id: secureRandomInt(1000000).toString(36),
            year: worldState.currentYear,
            month: worldState.currentMonth,
            type: 'retirement',
            text: `${abbreviateRank(r.rank)} ${r.name} has announced their retirement.`,
            division: r.rank.division
         });
         retiredCount++;
         return false; // filtered out
     }
     
     if (r.status === 'kyujo') r.status = 'active';
     return true;
  });

  if (retiredCount > 0) {
    const existingNames = new Set<string>(activeRikishiList.map(r => r.name));
    for (let i = 0; i < retiredCount; i++) {
      const newRookie = generateNPCRikishi({ division: 'Jonokuchi', title: 99, side: 'East' }, existingNames);
      activeRikishiList.push(newRookie);
    }
  }

  // Re-rank everyone globally
  const rerankedAll = reRankAllDivisions(activeRikishiList, yushoWinners, junYushoWinners);

  const finalRikishiList: Rikishi[] = [];

  rerankedAll.forEach((r) => {
    const divisionInfo = DIVISIONS.find((d) => d.name === r.rank.division);
    const bouts = divisionInfo ? divisionInfo.bouts : 15;
    const oldRank = oldRanksMap.get(r.id) || { ...r.rank }; // Rookies won't have an old rank in the map
    
    const oldFormatted = formatRank(oldRank);
    const newFormatted = formatRank(r.rank);
    const isYusho = yushoWinners.has(r.id);
    const isJunYusho = junYushoWinners.has(r.id);

    r.careerHistory = [
      ...(r.careerHistory || []),
      {
        year: worldState.currentYear,
        month: worldState.currentMonth.toString(),
        rank: oldRank, // Use the actual rank they competed at, fallback to their current one if new
        wins: r.wins,
        losses: r.losses,
        isYusho: isYusho,
        isJunYusho: isJunYusho,
      },
    ];

    // Cap NPC career history to the last 4 bashos to prevent localStorage QuotaExceededError
    if (r.id !== playerRikishi.id && r.careerHistory.length > 4) {
      r.careerHistory = r.careerHistory.slice(-4);
    }

    if (oldFormatted !== newFormatted) {
      const isDemotion = r.wins < bouts / 2;
      // News logic for promotion
      if (r.rank.title === "Ozeki" && oldFormatted !== "Ozeki" && !isDemotion) {
        newsForThisMonth.push({
          id: secureRandomInt(1000000).toString(36),
          year: worldState.currentYear,
          month: worldState.currentMonth,
          type: "promotion",
          text: `${abbreviateRank({ division: r.rank.division, title: "Ozeki", side: r.rank.side })} ${r.name} is promoted to Ozeki!`,
          rikishiId: r.id,
        });
      }
      // Added Yokozuna promotion news
      if (
        r.rank.title === "Yokozuna" &&
        oldFormatted !== "Yokozuna" &&
        !isDemotion
      ) {
        newsForThisMonth.push({
          id: secureRandomInt(1000000).toString(36),
          year: worldState.currentYear,
          month: worldState.currentMonth,
          type: "promotion",
          text: `${abbreviateRank({ division: r.rank.division, title: "Yokozuna", side: r.rank.side })} ${r.name} has reached the rank of Yokozuna!`,
          rikishiId: r.id,
        });
      }
    }

    // Recovery Phase for ALL rikishi
    let currentRikishi = { ...r };
    const { recoveryPoints } = performRecoveryRoll();
    let remainingPoints = recoveryPoints;

    const attrKeys: AttributeKey[] = [
      "power",
      "balance",
      "footwork",
      "technique",
      "spirit",
    ];
    const injuredAttrs = attrKeys.filter(
      (k) => currentRikishi.injuries[k].severity > 0,
    );

    // Simple recovery: distribute points among injuries
    injuredAttrs.forEach((attr) => {
      if (remainingPoints > 0) {
        const reduction = Math.min(
          remainingPoints,
          currentRikishi.injuries[attr].severity,
        );
        currentRikishi.injuries[attr].severity -= reduction;
        remainingPoints -= reduction;
      }
    });

    // Finalize
    let finalRikishi = {
      ...currentRikishi,
      wins: 0,
      losses: 0,
      boutsFoughtThisBasho: 0,
      // Fatigue no longer resets to baseline; it persists to simulate aging/wear
    };

    if (r.id === playerRikishi.id) {
      finalRikishi.fatigue = Math.min(100, finalRikishi.fatigue + 5);
      finalRikishi.momentum.value = calculateMomentumPoints(
        r,
        r.wins,
        r.losses,
        bouts,
        oldRank,
        r.rank,
        isYusho || false,
        isJunYusho || false,
      );
    }
    finalRikishiList.push(finalRikishi);
  });

  let newMonth = worldState.currentMonth + 1;
  let newYear = worldState.currentYear;
  if (newMonth > 5) {
    newMonth = 0;
    newYear += 1;
  }
  return {
    updatedPlayer: finalRikishiList.find(
      (r) => r.id === playerRikishi.id,
    ) as Rikishi,
    updatedWorld: {
      ...worldState,
      currentMonth: newMonth,
      currentYear: newYear,
      rikishi: finalRikishiList,
      bashoSchedule: undefined,
      currentBashoDay: undefined,
      news: [...newsForThisMonth, ...newNews].slice(0, 50),
    },
  };
}
