import { seedWorld } from './src/lib/worldGeneration';
import { generateBashoScheduleForDay } from './src/lib/tournamentScheduler';
import { simulateAllBoutsForDay, simulateBashoEnd } from './src/lib/bashoSimulation';
import { WorldState } from './src/types';

const world = seedWorld();
let currentSchedule: any[] = [];
let currentRikishiList = [...world];

const player = world.find(r => r.rank.division === 'Makushita') || world[0];

for (let d = 1; d <= 7; d++) {
  const nextDay = generateBashoScheduleForDay(currentRikishiList, currentSchedule, d);
  currentSchedule = [...currentSchedule, ...nextDay];
  currentRikishiList = simulateAllBoutsForDay(currentSchedule, currentRikishiList, d, player.id);
}

const updatedWorld: WorldState = {
  rikishi: currentRikishiList,
  currentYear: 2024,
  currentMonth: 1,
  news: [],
  bashoSchedule: currentSchedule,
  currentBashoDay: 8
};

const result = simulateBashoEnd(updatedWorld, player);

const mak = result.updatedWorld.news.filter((n: any) => n.type === 'yusho' && n.division === 'Makuuchi');
console.log(mak);

