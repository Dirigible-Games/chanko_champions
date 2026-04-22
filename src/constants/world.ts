import { Division } from '../types';

export const DIVISIONS: { name: Division; size: number | [number, number]; bouts: number }[] = [
  { name: 'Makuuchi', size: 42, bouts: 15 },
  { name: 'Juryo', size: 28, bouts: 15 },
  { name: 'Makushita', size: 120, bouts: 7 },
  { name: 'Sandanme', size: 160, bouts: 7 },
  { name: 'Jonidan', size: [200, 260], bouts: 7 },
  { name: 'Jonokuchi', size: [50, 100], bouts: 7 },
];

export const MONTHS = [
  'January', 'March', 'May', 'July', 'September', 'November'
];

export const BASHO_NAMES = [
  'Hatsu Basho', 'Haru Basho', 'Natsu Basho', 'Nagoya Basho', 'Aki Basho', 'Kyushu Basho'
];
