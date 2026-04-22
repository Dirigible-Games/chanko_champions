import { Rikishi, RankInfo, Division } from '../types';
import { DIVISIONS } from '../constants/world';

export function calculateNewBanzuke(allRikishi: Rikishi[]): Rikishi[] {
  const updatedRikishi = [...allRikishi];
  const divisionOrder: Division[] = ['Makuuchi', 'Juryo', 'Makushita', 'Sandanme', 'Jonidan', 'Jonokuchi'];

  // 1. Group and sort by division performance
  const divisionRikishi: Record<Division, Rikishi[]> = {
    'Makuuchi': [], 'Juryo': [], 'Makushita': [], 'Sandanme': [], 'Jonidan': [], 'Jonokuchi': []
  };

  updatedRikishi.forEach(r => {
    divisionRikishi[r.rank.division].push(r);
  });

  // Sort each division: higher wins = better rank
  divisionOrder.forEach(div => {
    divisionRikishi[div].sort((a, b) => b.wins - a.wins);
  });

  // 2. Promotion/Demotion between divisions (simplified: top N/bottom N)
  // Promotion/Demotion counts (very simplified, usually more complex based on specific spots)
  const promoCount = 2; 

  for (let i = 0; i < divisionOrder.length - 1; i++) {
    const upperDiv = divisionOrder[i];
    const lowerDiv = divisionOrder[i + 1];

    // Promote bottom N from upperDiv to lowerDiv (demote), promote top N from lowerDiv to upperDiv
    const demotees = divisionRikishi[upperDiv].splice(-promoCount);
    const promotees = divisionRikishi[lowerDiv].splice(0, promoCount);

    divisionRikishi[upperDiv].push(...promotees);
    divisionRikishi[lowerDiv].push(...demotees);

    // Re-sort to maintain order after promotion/demotion
    divisionRikishi[upperDiv].sort((a, b) => b.wins - a.wins);
    divisionRikishi[lowerDiv].sort((a, b) => b.wins - a.wins);
  }

  // 3. Re-assign ranks within each division
  const result: Rikishi[] = [];
  divisionOrder.forEach(div => {
    divisionRikishi[div].forEach((r, index) => {
        const isEast = index % 2 === 0;
        const numericalRank = Math.floor(index / 2) + 1;
        
        // This is a simplified re-ranking, need to preserve Sanyaku if possible
        // But for true Banzuke, it usually wipes and resets.
        r.rank = {
            division: div,
            title: numericalRank,
            side: isEast ? 'East' : 'West'
        };
        result.push(r);
    });
  });

  return result;
}
