import { RankInfo, Division, SanyakuRank, Rikishi } from '../types';


/**
 * Re-ranks a division based on performance, mimicking Banzuke committee logic.
 */

function getGlobalRankScore(rank: RankInfo): number {
  if (rank.division === 'Makuuchi') {
    if (typeof rank.title === 'string') {
      const sanyakuBase: Record<string, number> = { 'Yokozuna': 0, 'Ozeki': 2, 'Sekiwake': 4, 'Komusubi': 6 };
      return sanyakuBase[rank.title] + (rank.side === 'East' ? 0 : 1);
    } else {
      return 7 + (rank.title * 2) - (rank.side === 'East' ? 1 : 0);
    }
  }
  const offsets: Record<Division, number> = {
    'Makuuchi': 0,
    'Juryo': 41,
    'Makushita': 69,
    'Sandanme': 189,
    'Jonidan': 349,
    'Jonokuchi': 609
  };
  const offset = offsets[rank.division] ?? 609; // Default to Jonokuchi
  return offset + ((rank.title as number) * 2) - (rank.side === 'East' ? 1 : 0);
}

function getExpectedScore(rikishi: Rikishi): number {
   const { wins, losses, rank, careerHistory } = rikishi;
   const currentScore = getGlobalRankScore(rank);
   const netWins = wins - losses;
   
   // Sanyaku stability
   if (rank.title === 'Yokozuna') return currentScore;
   
   if (rank.title === 'Ozeki') {
      const isMakeKoshi = wins < 8; // Assuming 15 bouts
      const lastBasho = careerHistory[careerHistory.length - 1];
      const lastWasMakeKoshi = lastBasho && lastBasho.wins < lastBasho.losses;
      if (isMakeKoshi && lastWasMakeKoshi) return 4; // Demoted to Sekiwake
      return currentScore; // Stays Ozeki
   }

   let stepMultiplier = 2; // Makuuchi/Juryo (1 rank -> 2 slots)
   if (rank.division === 'Makushita') stepMultiplier = 10;
   else if (rank.division === 'Sandanme') stepMultiplier = 15;
   else if (rank.division === 'Jonidan') stepMultiplier = 20;
   else if (rank.division === 'Jonokuchi') stepMultiplier = 30;

   let expected = currentScore - (netWins * stepMultiplier);
   
   // Prevents massive jumps skipping divisions
   if (rank.division === 'Makushita') expected = Math.max(42, expected); // Max rank achievable Juryo 1
   if (rank.division === 'Sandanme') expected = Math.max(70, expected); // Max rank Makushita 1
   if (rank.division === 'Jonidan') expected = Math.max(190, expected); // Max rank Sandanme 1
   if (rank.division === 'Jonokuchi') expected = Math.max(350, expected); // Max rank Jonidan 1

   // Ozeki promotion check
   if (['Sekiwake', 'Komusubi'].includes(rank.title as string) || (typeof rank.title === 'number' && rank.title <= 2)) {
       const past1 = careerHistory[careerHistory.length - 1];
       const past2 = careerHistory[careerHistory.length - 2];
       
       if (past1 && past2) {
           const threeBashoWins = wins + past1.wins + past2.wins;
           // Must be Kachi-koshi in all three bashos for Ozeki consideration
           const allKachiKoshi = wins >= 8 && past1.wins >= (past1.wins + past1.losses >= 15 ? 8 : 4) && past2.wins >= (past2.wins + past2.losses >= 15 ? 8 : 4);

           if (threeBashoWins >= 33 && allKachiKoshi && past1.rank.division === 'Makuuchi' && past2.rank.division === 'Makuuchi') {
               return 3; 
           }
       }
       // Special Ozeki re-instatement (10 wins from Sekiwake after drop)
       if (rank.title === 'Sekiwake' && wins >= 10 && past1 && past1.rank.title === 'Ozeki') {
           return 3;
       }
   }

   // Cap expected score to Sekiwake East (4) unless they earned Ozeki above
   if (expected < 4 && expected !== 3) {
       expected = 4;
   }

   return expected;
}

export function reRankAllDivisions(allRikishi: Rikishi[]): Rikishi[] {
    const scoredRikishi = allRikishi.map(r => ({
        rikishi: r,
        expectedScore: getExpectedScore(r),
        currentScore: getGlobalRankScore(r.rank)
    }));

    // Sort globally
    scoredRikishi.sort((a, b) => {
       if (a.expectedScore !== b.expectedScore) return a.expectedScore - b.expectedScore;
       const netA = (a.rikishi?.wins || 0) - (a.rikishi?.losses || 0);
       const netB = (b.rikishi?.wins || 0) - (b.rikishi?.losses || 0);
       if (netA !== netB) return netB - netA;
       return a.currentScore - b.currentScore;
    });

    const yokozuna = scoredRikishi.filter(item => item.rikishi.rank.title === 'Yokozuna');
    const ozeki = scoredRikishi.filter(item => 
        (item.rikishi.rank.title === 'Ozeki' && item.expectedScore <= 3) || 
        (item.expectedScore === 3 && item.rikishi.rank.title !== 'Yokozuna')
    );

    const generalPool = scoredRikishi.filter(item => 
        item.rikishi.rank.title !== 'Yokozuna' && 
        !(item.rikishi.rank.title === 'Ozeki' && item.expectedScore <= 3) &&
        item.expectedScore !== 3 
    );

    const newBanzuke: Rikishi[] = [];

    yokozuna.forEach((item, idx) => {
        item.rikishi.rank = { division: 'Makuuchi', title: 'Yokozuna', side: idx % 2 === 0 ? 'East' : 'West' };
        newBanzuke.push(item.rikishi);
    });

    ozeki.forEach((item, idx) => {
        item.rikishi.rank = { division: 'Makuuchi', title: 'Ozeki', side: idx % 2 === 0 ? 'East' : 'West' };
        newBanzuke.push(item.rikishi);
    });

    const numMakuuchiRemaining = Math.max(0, 42 - yokozuna.length - ozeki.length);
    const numSekiwake = 2;
    const numKomusubi = 2;
    const numMaegashira = Math.max(0, numMakuuchiRemaining - numSekiwake - numKomusubi);

    let poolIndex = 0;
    
    for (let i = 0; i < numSekiwake; i++) {
        if (poolIndex >= generalPool.length) break;
        generalPool[poolIndex].rikishi.rank = { division: 'Makuuchi', title: 'Sekiwake', side: i % 2 === 0 ? 'East' : 'West' };
        newBanzuke.push(generalPool[poolIndex].rikishi);
        poolIndex++;
    }

    for (let i = 0; i < numKomusubi; i++) {
        if (poolIndex >= generalPool.length) break;
        generalPool[poolIndex].rikishi.rank = { division: 'Makuuchi', title: 'Komusubi', side: i % 2 === 0 ? 'East' : 'West' };
        newBanzuke.push(generalPool[poolIndex].rikishi);
        poolIndex++;
    }

    for (let i = 0; i < numMaegashira; i++) {
        if (poolIndex >= generalPool.length) break;
        const mTitle = Math.floor(i / 2) + 1;
        generalPool[poolIndex].rikishi.rank = { division: 'Makuuchi', title: mTitle, side: i % 2 === 0 ? 'East' : 'West' };
        newBanzuke.push(generalPool[poolIndex].rikishi);
        poolIndex++;
    }

    for (let i = 0; i < 28; i++) {
        if (poolIndex >= generalPool.length) break;
        const jTitle = Math.floor(i / 2) + 1;
        generalPool[poolIndex].rikishi.rank = { division: 'Juryo', title: jTitle, side: i % 2 === 0 ? 'East' : 'West' };
        newBanzuke.push(generalPool[poolIndex].rikishi);
        poolIndex++;
    }

    for (let i = 0; i < 120; i++) {
        if (poolIndex >= generalPool.length) break;
        const msTitle = Math.floor(i / 2) + 1;
        generalPool[poolIndex].rikishi.rank = { division: 'Makushita', title: msTitle, side: i % 2 === 0 ? 'East' : 'West' };
        newBanzuke.push(generalPool[poolIndex].rikishi);
        poolIndex++;
    }

    for (let i = 0; i < 160; i++) {
        if (poolIndex >= generalPool.length) break;
        const sdTitle = Math.floor(i / 2) + 1;
        generalPool[poolIndex].rikishi.rank = { division: 'Sandanme', title: sdTitle, side: i % 2 === 0 ? 'East' : 'West' };
        newBanzuke.push(generalPool[poolIndex].rikishi);
        poolIndex++;
    }

    const currentJonokuchiSize = allRikishi.filter(r => r.rank.division === 'Jonokuchi').length;
    const remainingForBottomTwo = generalPool.length - poolIndex;
    let targetJonidanSize = remainingForBottomTwo - currentJonokuchiSize;
    if (targetJonidanSize < 0) targetJonidanSize = remainingForBottomTwo;

    for (let i = 0; i < targetJonidanSize; i++) {
        if (poolIndex >= generalPool.length) break;
        const jdTitle = Math.floor(i / 2) + 1;
        generalPool[poolIndex].rikishi.rank = { division: 'Jonidan', title: jdTitle, side: i % 2 === 0 ? 'East' : 'West' };
        newBanzuke.push(generalPool[poolIndex].rikishi);
        poolIndex++;
    }

    let jkCount = 0;
    while (poolIndex < generalPool.length) {
        const jkTitle = Math.floor(jkCount / 2) + 1;
        generalPool[poolIndex].rikishi.rank = { division: 'Jonokuchi', title: jkTitle, side: jkCount % 2 === 0 ? 'East' : 'West' };
        newBanzuke.push(generalPool[poolIndex].rikishi);
        poolIndex++;
        jkCount++;
    }

    return newBanzuke;
}


/**
 * Returns a human-readable rank name
 */
export function formatRank(rank: RankInfo): string {
  if (!rank) return "Unknown Rank";
  if (typeof rank.title === 'string') {
    return `${rank.title} ${rank.side || ''}`.trim();
  }
  return `${rank.division} ${rank.title} ${rank.side || ''}`.trim();
}

/**
 * Returns a short abbreviation of the rank, e.g., (Jk1E) or (Y1E)
 */
export function abbreviateRank(rank: RankInfo): string {
  if (!rank) return "(?)";
  const side = rank.side === 'East' ? 'E' : rank.side === 'West' ? 'W' : '';
  
  if (rank.division === 'Makuuchi') {
    if (typeof rank.title === 'string') {
      const prefix = rank.title.charAt(0); // Y, O, S, K
      return `(${prefix}1${side})`; 
    } else {
      return `(M${rank.title}${side})`;
    }
  }

  const prefixes: Record<string, string> = {
    'Juryo': 'J',
    'Makushita': 'Ms',
    'Sandanme': 'Sd',
    'Jonidan': 'Jd',
    'Jonokuchi': 'Jk'
  };

  return `(${prefixes[rank.division] || ''}${rank.title}${side})`;
}

/**
 * Compares two ranks to find which is higher.
 * Positive if rankA > rankB, negative if rankA < rankB, 0 if equal.
 */
export function compareRanks(rankA: RankInfo, rankB: RankInfo): number {
  const divisionOrder: Division[] = ['Makuuchi', 'Juryo', 'Makushita', 'Sandanme', 'Jonidan', 'Jonokuchi'];
  const sanyakuOrder: SanyakuRank[] = ['Yokozuna', 'Ozeki', 'Sekiwake', 'Komusubi', 'Maegashira'];

  const divA = divisionOrder.indexOf(rankA.division);
  const divB = divisionOrder.indexOf(rankB.division);

  if (divA !== divB) return divB - divA; 

  if (rankA.division === 'Makuuchi') {
    const isSanyakuA = typeof rankA.title === 'string';
    const isSanyakuB = typeof rankB.title === 'string';

    if (isSanyakuA && !isSanyakuB) return 1;
    if (!isSanyakuA && isSanyakuB) return -1;

    if (isSanyakuA && isSanyakuB) {
      const sA = sanyakuOrder.indexOf(rankA.title as SanyakuRank);
      const sB = sanyakuOrder.indexOf(rankB.title as SanyakuRank);
      if (sA !== sB) return sB - sA;
    } else {
      if (rankA.title !== rankB.title) return (rankB.title as number) - (rankA.title as number);
    }
  } else {
    if (rankA.title !== rankB.title) return (rankB.title as number) - (rankA.title as number);
  }

  if (rankA.side !== rankB.side) {
    return rankA.side === 'East' ? 1 : -1;
  }

  return 0;
}

const DIVISION_ORDER: Division[] = ['Jonokuchi', 'Jonidan', 'Sandanme', 'Makushita', 'Juryo', 'Makuuchi'];
const DIVISION_MAX_RANKS: Record<Division, number> = {
  'Jonokuchi': 100,
  'Jonidan': 130,
  'Sandanme': 80,
  'Makushita': 60,
  'Juryo': 14,
  'Makuuchi': 16
};

/**
 * Calculates the next rank based on win/loss record.
 */
export function calculateRankChange(rikishi: Rikishi, wins: number, bouts: number): RankInfo {
  const current = rikishi.rank;

  if (typeof current.title === 'string') {
    // Sanyaku logic: Ozeki/Yokozuna demotion
    const isMakeKoshi = wins < bouts / 2;
    const lastBasho = rikishi.careerHistory[rikishi.careerHistory.length - 1];
    const lastWasMakeKoshi = lastBasho && lastBasho.wins < (lastBasho.wins + lastBasho.losses) / 2;

    if (current.title === 'Ozeki' && isMakeKoshi && lastWasMakeKoshi) {
      // Demoted!
      return { division: 'Makuuchi', title: 1, side: 'East' };
    }

    if (isMakeKoshi) {
       // Demotion out of sanyaku (Sekiwake/Komusubi)
       if (current.title === 'Komusubi' || current.title === 'Sekiwake') {
         return { division: 'Makuuchi', title: 1, side: 'East' };
       }
    }
    return current;
  }

  let currentNumericalTitle = current.title as number;
  let currentSide = current.side;
  let currentDivIndex = DIVISION_ORDER.indexOf(current.division);
  
  const netWins = wins - (bouts - wins);
  
  if (netWins === 0) return current;

  let globalRankScore = (currentNumericalTitle * 2) + (currentSide === 'West' ? 0 : 1);
  
  let steps = -netWins * 2; 
  if (current.division === 'Makushita' || current.division === 'Juryo') steps = -netWins * 1.5;
  
  globalRankScore += steps;

  let newDivIndex = currentDivIndex;
  
  while (globalRankScore < 2 && newDivIndex < DIVISION_ORDER.length - 1) {
    newDivIndex++;
    const maxRankNext = DIVISION_MAX_RANKS[DIVISION_ORDER[newDivIndex]];
    globalRankScore = (maxRankNext * 2) + globalRankScore;
  }
  
  while (globalRankScore > (DIVISION_MAX_RANKS[DIVISION_ORDER[newDivIndex]] * 2) + 1 && newDivIndex > 0) {
    const maxRankCurr = DIVISION_MAX_RANKS[DIVISION_ORDER[newDivIndex]];
    globalRankScore -= (maxRankCurr * 2);
    newDivIndex--;
  }

  if (newDivIndex === 0 && globalRankScore > (DIVISION_MAX_RANKS['Jonokuchi'] * 2) + 1) {
     globalRankScore = (DIVISION_MAX_RANKS['Jonokuchi'] * 2) + 1;
  }

  globalRankScore = Math.floor(Math.max(2, globalRankScore)); 
  let newSide = globalRankScore % 2 === 0 ? 'West' : 'East';
  let newTitle = Math.floor(globalRankScore / 2);

  if (newDivIndex === DIVISION_ORDER.length - 1 && newTitle <= 0) {
      newTitle = 1;
      newSide = 'East';
  }

  return {
    division: DIVISION_ORDER[newDivIndex],
    title: newTitle,
    side: newSide as 'East' | 'West'
  };
}
