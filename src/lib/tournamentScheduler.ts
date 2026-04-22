import { Rikishi, BoutPairing, Division } from '../types';
import { DIVISIONS } from '../constants/world';
import { secureRandom } from './gameLogic';

export function generateBashoSchedule(allRikishi: Rikishi[]): BoutPairing[] {
  const schedule: BoutPairing[] = [];
  const divisions = ['Makuuchi', 'Juryo', 'Makushita', 'Sandanme', 'Jonidan', 'Jonokuchi'];

  divisions.forEach(divName => {
    const rikishiInDiv = allRikishi.filter(r => r.rank.division === divName);
    
    // Simple pairing logic: shuffle and pair
    const shuffled = [...rikishiInDiv].sort(() => secureRandom() - 0.5);
    const divisionInfo = DIVISIONS.find(d => d.name === divName);
    const totalDays = divisionInfo ? divisionInfo.bouts : 15;

    for (let day = 1; day <= totalDays; day++) {
      // Pair everyone for the day (simplified - assumes even count)
      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          schedule.push({
            day,
            rikishiId1: shuffled[i].id,
            rikishiId2: shuffled[i + 1].id,
            result: null
          });
        }
      }
      // Re-shuffle for next day to ensure different opponents
      shuffled.sort(() => secureRandom() - 0.5);
    }
  });

  return schedule;
}
