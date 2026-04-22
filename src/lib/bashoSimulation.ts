import { WorldState, Rikishi, NewsItem, Division, BoutPairing } from '../types';
import { DIVISIONS } from '../constants/world';
import { getEffectiveStats, secureRandom, secureRandomInt } from './gameLogic';
import { calculateRankChange, formatRank, abbreviateRank, reRankAllDivisions } from './rankLogic';
import { calculateMomentumPoints } from './gameLogic';

export function simulateNPCBouts(rikishi: Rikishi, divisionBouts: number, avgDivisionPower: number): Rikishi {
  let wins = 0;
  const stats = getEffectiveStats(rikishi);
  const powerLevel = stats.power + stats.technique + stats.balance + stats.spirit + stats.footwork;
  let rankPowerBonus = 0;
  if (rikishi.rank.title === 'Yokozuna') rankPowerBonus = 15;
  else if (rikishi.rank.title === 'Ozeki') rankPowerBonus = 10;
  else if (['Sekiwake', 'Komusubi'].includes(rikishi.rank.title as string)) rankPowerBonus = 5;
  const effectivePowerLevel = powerLevel + rankPowerBonus;
  const powerDiff = effectivePowerLevel - avgDivisionPower;
  let winProbability = 0.5 + (powerDiff * 0.025);
  winProbability = Math.max(0.15, Math.min(0.85, winProbability));
  for (let i = 0; i < divisionBouts; i++) {
    if (secureRandom() < winProbability) {
      wins++;
    }
  }
  const fatigueGained = secureRandomInt(15) - 1 + (divisionBouts * 2);
  let newFatigue = Math.min(100, rikishi.fatigue + fatigueGained);
  newFatigue = Math.max(0, newFatigue - 40); 
  const newFocus = Math.min(40, rikishi.focusPoints + wins); 
  const tpEarned = secureRandomInt(3) - 1 + 2;
  const newStats = { ...rikishi.stats };
  const attrs: (keyof typeof newStats)[] = ['power', 'balance', 'technique', 'footwork', 'spirit'];
  for (let i = 0; i < tpEarned; i++) {
     const attr = attrs[secureRandomInt(attrs.length) - 1];
     newStats[attr] += 1; 
  }
  return {
    ...rikishi,
    wins,
    losses: divisionBouts - wins,
    fatigue: newFatigue,
    focusPoints: newFocus,
    stats: newStats,
    bashosCompleted: rikishi.bashosCompleted + 1
  };
}

export function simulateDailyNPCBouts(rikishi: Rikishi, day: number, bashoSchedule: BoutPairing[], allRikishi: Rikishi[], avgDivisionPower: number): Rikishi {
  // Find opponent for today
  const pairing = bashoSchedule.find(p => p.day === day && (p.rikishiId1 === rikishi.id || p.rikishiId2 === rikishi.id));
  
  if (!pairing) return rikishi;

  const opponentId = pairing.rikishiId1 === rikishi.id ? pairing.rikishiId2 : pairing.rikishiId1;
  const opponent = allRikishi.find(r => r.id === opponentId);
  
  if (!opponent) return rikishi; // Should not happen in valid schedule

  // Simple combat roll logic (simplified version of Bout.tsx logic)
  const stats = getEffectiveStats(rikishi);
  const oppStats = getEffectiveStats(opponent);
  const pPower = stats.power + stats.technique + stats.balance + stats.spirit + stats.footwork;
  const oPower = oppStats.power + oppStats.technique + oppStats.balance + oppStats.spirit + oppStats.footwork;
  
  const winProbability = 0.5 + ((pPower - oPower) * 0.02);
  const win = secureRandom() < winProbability;

  return {
    ...rikishi,
    wins: win ? rikishi.wins + 1 : rikishi.wins,
    losses: win ? rikishi.losses : rikishi.losses + 1,
  };
}

export function simulateBashoEnd(worldState: WorldState, playerRikishi: Rikishi): { updatedWorld: WorldState, updatedPlayer: Rikishi } {
  let newNews: NewsItem[] = [...(worldState.news || [])];
  const newsForThisMonth: NewsItem[] = [];
  const divisionAverages = new Map<string, number>();
  DIVISIONS.forEach(d => {
    const subset = worldState.rikishi.filter(r => r.rank.division === d.name);
    if (subset.length === 0) {
      divisionAverages.set(d.name, 30);
      return;
    }
    const sum = subset.reduce((acc, r) => {
      const p = r.stats.power + r.stats.technique + r.stats.balance + r.stats.spirit + r.stats.footwork;
      return acc + p;
    }, 0);
    divisionAverages.set(d.name, sum / subset.length);
  });

  const rikishiWithRecords = worldState.rikishi.map(r => {
    if (r.id === playerRikishi.id) return playerRikishi;
    
    if (r.isNPC) {
      const divisionInfo = DIVISIONS.find(d => d.name === r.rank.division);
      const bouts = divisionInfo ? divisionInfo.bouts : 15;
      const avgPower = divisionAverages.get(r.rank.division) || 30;
      return simulateNPCBouts(r, bouts, avgPower);
    }
    return r;
  });

  const divisions = DIVISIONS.map(d => d.name);
  divisions.forEach(divName => {
    const divisionRikishi = rikishiWithRecords.filter(r => r.rank.division === divName);
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
        isJunYusho: false
      }
    ];
    newsForThisMonth.push({
      id: secureRandomInt(1000000).toString(36),
      year: worldState.currentYear,
      month: worldState.currentMonth,
      type: 'yusho',
      division: divName,
      text: `${abbreviateRank(winner.rank)} ${winner.name} wins the ${divName} Yusho with a ${winner.wins}-${winner.losses} record!`,
      rikishiId: winner.id
    });
  });

  // Re-rank everyone globally
  const rerankedAll = reRankAllDivisions(rikishiWithRecords);
  
  const finalRikishiList: Rikishi[] = [];

  rerankedAll.forEach(r => {
    const divisionInfo = DIVISIONS.find(d => d.name === r.rank.division);
    const bouts = divisionInfo ? divisionInfo.bouts : 15;
    const oldFormatted = formatRank(rikishiWithRecords.find(orig => orig.id === r.id)!.rank);
    const newFormatted = formatRank(r.rank);
    const isYusho = r.careerHistory?.length > 0 && 
                    r.careerHistory[r.careerHistory.length - 1].year === worldState.currentYear && 
                    r.careerHistory[r.careerHistory.length - 1].month === worldState.currentMonth.toString() &&
                    r.careerHistory[r.careerHistory.length - 1].isYusho;
    
    if (!isYusho) {
      r.careerHistory = [
        ...(r.careerHistory || []),
        {
          year: worldState.currentYear,
          month: worldState.currentMonth.toString(),
          rank: rikishiWithRecords.find(orig => orig.id === r.id)!.rank, // Use original rank for history
          wins: r.wins,
          losses: r.losses,
          isYusho: false,
          isJunYusho: false
        }
      ];
    }
    
    if (oldFormatted !== newFormatted) {
      const isDemotion = r.wins < bouts / 2;
      // News logic for promotion
      if (r.rank.title === 'Ozeki' && oldFormatted !== 'Ozeki' && !isDemotion) {
         newsForThisMonth.push({ id: secureRandomInt(1000000).toString(36), year: worldState.currentYear, month: worldState.currentMonth, type: 'promotion', text: `${abbreviateRank({division: r.rank.division, title: 'Ozeki', side: r.rank.side})} ${r.name} is promoted to Ozeki!`, rikishiId: r.id });
      }
      // Added Yokozuna promotion news
      if (r.rank.title === 'Yokozuna' && oldFormatted !== 'Yokozuna' && !isDemotion) {
         newsForThisMonth.push({ id: secureRandomInt(1000000).toString(36), year: worldState.currentYear, month: worldState.currentMonth, type: 'promotion', text: `${abbreviateRank({division: r.rank.division, title: 'Yokozuna', side: r.rank.side})} ${r.name} has reached the rank of Yokozuna!`, rikishiId: r.id });
      }
    }
    
    // Finalize
    let finalRikishi = {
      ...r,
      wins: 0,
      losses: 0,
      fatigue: 0
    };
    
    if (r.id === playerRikishi.id) {
       const origRank = rikishiWithRecords.find(orig => orig.id === r.id)!.rank;
       finalRikishi.momentum.value = calculateMomentumPoints(
         r, r.wins, r.losses, bouts, origRank, r.rank, isYusho || false, false
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
    updatedPlayer: finalRikishiList.find(r => r.id === playerRikishi.id) as Rikishi,
    updatedWorld: {
      ...worldState,
      currentMonth: newMonth,
      currentYear: newYear,
      rikishi: finalRikishiList,
      bashoSchedule: undefined,
      currentBashoDay: undefined,
      news: [...newsForThisMonth, ...newNews].slice(0, 50)
    }
  };
}
