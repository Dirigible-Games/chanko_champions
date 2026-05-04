import { seedWorld } from './src/lib/worldGeneration';
import { generateBashoScheduleForDay } from './src/lib/tournamentScheduler';
import { simulateBashoEnd, simulateAllBoutsForDay } from './src/lib/bashoSimulation';
import { WorldState } from './src/types';

async function run() {
  const world = seedWorld();
  const playerRikishi = world.find(r => r.rank.division === 'Jonokuchi') || world[0]; 
  
  let worldState: WorldState = {
    rikishi: world,
    currentYear: 2024,
    currentMonth: 1,
    playerRikishiId: playerRikishi.id,
    news: []
  };

  for (let basho = 1; basho <= 40; basho++) {
    let currentSchedule: any[] = [];
    let updatedRikishiList = [...worldState.rikishi];

    updatedRikishiList = updatedRikishiList.map(r => ({ ...r, boutsFoughtThisBasho: 0, wins: 0, losses: 0 }));

    for (let d = 1; d <= 15; d++) {
      const nextDaySchedule = generateBashoScheduleForDay(updatedRikishiList, currentSchedule, d);
      currentSchedule = [...currentSchedule, ...nextDaySchedule];

      updatedRikishiList = simulateAllBoutsForDay(
        currentSchedule,
        updatedRikishiList,
        d
      );
    }
    
    worldState.rikishi = updatedRikishiList;
    worldState.bashoSchedule = currentSchedule;
    worldState.currentBashoDay = 15;

    const result = simulateBashoEnd(worldState, playerRikishi);
    let newWorldState = result.updatedWorld;

    if (basho % 5 === 0) {
      const mac = newWorldState.rikishi.filter(r => r.rank.division === 'Makuuchi');
      const oze = mac.filter(r => r.rank.title === 'Ozeki').length;
      console.log(`Basho ${basho} -> Yokozuna: ${mac.filter(r => r.rank.title === 'Yokozuna').length}, Ozeki: ${oze}, Sekiwake: ${mac.filter(r => r.rank.title === 'Sekiwake').length}, Komusubi: ${mac.filter(r => r.rank.title === 'Komusubi').length}`);
    }
    let nextMonth = newWorldState.currentMonth + 2;
    let nextYear = newWorldState.currentYear;
    if (nextMonth > 11) {
      nextMonth = 1;
      nextYear += 1;
    }
    newWorldState.currentMonth = nextMonth;
    newWorldState.currentYear = nextYear;
    
    worldState = newWorldState;
  }
}

run();
