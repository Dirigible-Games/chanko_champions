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
} from "./gameLogic";
import {
  calculateRankChange,
  formatRank,
  abbreviateRank,
  reRankAllDivisions,
} from "./rankLogic";
import { calculateMomentumPoints } from "./gameLogic";
import { simulateFullBout } from "./combatEngine";

export function simulateAllBoutsForDay(
  schedule: BoutPairing[],
  allRikishi: Rikishi[],
  day: number,
  playerRikishiId?: string,
): Rikishi[] {
  const rikishiMap = new Map(allRikishi.map((r) => [r.id, { ...r }]));
  const dayBouts = schedule.filter((p) => p.day === day);

  for (const bout of dayBouts) {
    if (
      bout.rikishiId1 === playerRikishiId ||
      bout.rikishiId2 === playerRikishiId
    )
      continue;

    const r1 = rikishiMap.get(bout.rikishiId1);
    const r2 = rikishiMap.get(bout.rikishiId2);

    if (r1 && r2 && !bout.result) {
      const result = simulateFullBout(r1, r2);
      result.updatedR1.wins += result.winnerId === r1.id ? 1 : 0;
      result.updatedR1.losses += result.winnerId === r1.id ? 0 : 1;
      result.updatedR2.wins += result.winnerId === r2.id ? 1 : 0;
      result.updatedR2.losses += result.winnerId === r2.id ? 0 : 1;

      if (result.hasInjury1) {
        const attrs: AttributeKey[] = [
          "power",
          "balance",
          "footwork",
          "technique",
          "spirit",
        ];
        const attr = attrs[secureRandomInt(attrs.length) - 1];
        const severityResult = performInjuryRoll(result.updatedR1.fatigue);
        if (severityResult.results.length > 0) {
          result.updatedR1 = applyInjury(
            result.updatedR1,
            severityResult.results[0].severity,
            attr,
          );
        }
      }

      if (result.hasInjury2) {
        const attrs: AttributeKey[] = [
          "power",
          "balance",
          "footwork",
          "technique",
          "spirit",
        ];
        const attr = attrs[secureRandomInt(attrs.length) - 1];
        const severityResult = performInjuryRoll(result.updatedR2.fatigue);
        if (severityResult.results.length > 0) {
          result.updatedR2 = applyInjury(
            result.updatedR2,
            severityResult.results[0].severity,
            attr,
          );
        }
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
    for (let d = worldState.currentBashoDay || 1; d <= 15; d++) {
      currentRikishiList = simulateAllBoutsForDay(
        worldState.bashoSchedule,
        currentRikishiList,
        d,
        playerRikishi.id,
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
      // Slightly toned down stat growth: 1-3 instead of 1-4
      const tpEarned = secureRandomInt(2) + 1; 
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
  divisions.forEach((divName) => {
    const divisionRikishi = rikishiWithRecords.filter(
      (r) => r.rank.division === divName,
    );
    if (divisionRikishi.length === 0) return;
    divisionRikishi.sort((a, b) => b.wins - a.wins);
    const winner = divisionRikishi[0];
    winner.careerHistory = [
      ...(winner.careerHistory || []),
      {
        year: worldState.currentYear,
        month: worldState.currentMonth.toString(),
        rank: winner.rank,
        wins: winner.wins,
        losses: winner.losses,
        isYusho: true,
        isJunYusho: false,
      },
    ];
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

  // Re-rank everyone globally
  const rerankedAll = reRankAllDivisions(rikishiWithRecords);

  const finalRikishiList: Rikishi[] = [];

  rerankedAll.forEach((r) => {
    const divisionInfo = DIVISIONS.find((d) => d.name === r.rank.division);
    const bouts = divisionInfo ? divisionInfo.bouts : 15;
    const oldRank = oldRanksMap.get(r.id);
    
    const oldFormatted = formatRank(oldRank);
    const newFormatted = formatRank(r.rank);
    const isYusho =
      r.careerHistory?.length > 0 &&
      r.careerHistory[r.careerHistory.length - 1].year ===
        worldState.currentYear &&
      r.careerHistory[r.careerHistory.length - 1].month ===
        worldState.currentMonth.toString() &&
      r.careerHistory[r.careerHistory.length - 1].isYusho;

    if (!isYusho) {
      r.careerHistory = [
        ...(r.careerHistory || []),
        {
          year: worldState.currentYear,
          month: worldState.currentMonth.toString(),
          rank: oldRank, // Use the actual rank they competed at
          wins: r.wins,
          losses: r.losses,
          isYusho: false,
          isJunYusho: false,
        },
      ];
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
      // Fatigue no longer resets to baseline; it persists to simulate aging/wear
    };

    if (r.id === playerRikishi.id) {
      finalRikishi.momentum.value = calculateMomentumPoints(
        r,
        r.wins,
        r.losses,
        bouts,
        origRikishi.rank,
        r.rank,
        isYusho || false,
        false,
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
