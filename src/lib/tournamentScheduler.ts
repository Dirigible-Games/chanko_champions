import { Rikishi, BoutPairing, Division } from '../types';
import { DIVISIONS } from '../constants/world';
import { secureRandom } from './gameLogic';

export function generateBashoScheduleForDay(
  allRikishi: Rikishi[], 
  pastSchedule: BoutPairing[], 
  dayToGenerate: number
): BoutPairing[] {
  const schedule: BoutPairing[] = [];
  const divisions = ['Makuuchi', 'Juryo', 'Makushita', 'Sandanme', 'Jonidan', 'Jonokuchi'];

  divisions.forEach(divName => {
    const divisionInfo = DIVISIONS.find(d => d.name === divName);
    const totalDays = divisionInfo ? divisionInfo.bouts : 15;

    // Only generate matches if this division is supposed to fight today
    if (dayToGenerate <= totalDays) {
      // Filter active rikishi
      const rikishiInDiv = allRikishi.filter(r => r.rank.division === divName && r.status !== 'retired' && r.status !== 'kyujo');
      
      // Group by score (wins)
      const scoreGroups = new Map<number, Rikishi[]>();
      rikishiInDiv.forEach(r => {
        const score = r.wins;
        if (!scoreGroups.has(score)) scoreGroups.set(score, []);
        scoreGroups.get(score)!.push(r);
      });

      // Sort groups from highest score to lowest
      const sortedScores = Array.from(scoreGroups.keys()).sort((a, b) => b - a);
      
      let toMatch: Rikishi[] = [];
      
      for (const score of sortedScores) {
         let group = scoreGroups.get(score)!;
         // shuffle group to add randomness within same score
         group = group.sort(() => secureRandom() - 0.5);
         toMatch = toMatch.concat(group);
      }

      // Helper to check if pair fought
      const hasFought = (id1: string, id2: string) => {
         return pastSchedule.some(p => (p.rikishiId1 === id1 && p.rikishiId2 === id2) || (p.rikishiId1 === id2 && p.rikishiId2 === id1));
      };

      let i = 0;
      while (i < toMatch.length) {
         if (i + 1 >= toMatch.length) break; // odd one out gets no match today if odd count
         
         const r1 = toMatch[i];
         let r2Idx = i + 1;
         
         // Search for the nearest opponent they haven't fought yet
         for (let j = i + 1; j < Math.min(toMatch.length, i + 20); j++) {
            if (!hasFought(r1.id, toMatch[j].id)) {
               r2Idx = j;
               break;
            }
         }
         
         if (r2Idx !== i + 1) {
            const temp = toMatch[i+1];
            toMatch[i+1] = toMatch[r2Idx];
            toMatch[r2Idx] = temp;
         }
         
         const r2 = toMatch[i+1];
         
         schedule.push({
           day: dayToGenerate,
           rikishiId1: r1.id,
           rikishiId2: r2.id,
           result: null
         });

         i += 2;
      }
    }
  });

  return schedule;
}
