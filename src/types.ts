export type Division = 'Makuuchi' | 'Juryo' | 'Makushita' | 'Sandanme' | 'Jonidan' | 'Jonokuchi';

export type SanyakuRank = 'Yokozuna' | 'Ozeki' | 'Sekiwake' | 'Komusubi' | 'Maegashira';

export interface RankInfo {
  division: Division;
  title: SanyakuRank | number; // e.g., 'Yokozuna' or 1, 2, 3...
  side?: 'East' | 'West';
}

export interface CareerRecord {
  month: string;
  year: number;
  rank: RankInfo;
  wins: number;
  losses: number;
  isYusho: boolean;
  isJunYusho: boolean;
  isSpecialPrize?: boolean;
}

export type RikishiArchetype = 'Yotsu' | 'Nagete' | 'Kakete' | 'Tokushuwaza' | 'Oshi' | 'Custom';

export interface RikishiStats {
  power: number;
  balance: number;
  footwork: number;
  technique: number;
  spirit: number;
  weight: number;
}

export type AttributeKey = keyof Omit<RikishiStats, 'weight'>;

export interface Injury {
  severity: number;      // 0-3
  hits: number;         // Track how many times this attribute was hit (5 hits = 1 permanent)
}

export interface Specialization {
  kimariteId: string;
  stanceId: string;
  primaryAttr: AttributeKey;
  secondaryAttr: AttributeKey;
}

export type Stance = 'Neutral' | 'Yotsu' | 'Nagete' | 'Kakete' | 'Tokushuwaza' | 'Oshi';

export interface Kimarite {
  id: string;
  name: string;
  type: 'offense' | 'defense' | 'tachiai';
  primaryAttr: AttributeKey;
  secondaryAttr: AttributeKey;
  stanceRequirement?: Stance;
  transitionsTo?: Stance[]; // For Tachiai and Defense
  counters?: string[]; // IDs it counters
  description?: string;
}

export interface BoutState {
  round: number;
  attackerId: 'player' | 'opponent';
  playerStance: Stance;
  opponentStance: Stance;
  focusPoints: number;
  logs: string[];
  isFinished: boolean;
  winnerId: 'player' | 'opponent' | null;
  victoryKimarite: string | null;
  isMonoii: boolean;
  fatigueDieUsed: boolean;
  hasInjuryTrigger: boolean;
}

export interface Rikishi {
  id: string;
  name: string;
  nameKanji?: string;
  rank: RankInfo;
  beya: string;
  mawashiColor: string;
  archetype: RikishiArchetype;
  experience: number;
  wins: number;
  losses: number;
  health: number;
  energy: number;
  fatigue: number; 
  baseFatigue: number;
  focusPoints: number;
  bashosCompleted: number;
  totalUniqueInjuries: number; 
  bashoProgressPenalty: number;
  tpAvailable: number;
  tpAssigned: Record<AttributeKey, number>;
  totalTpSpent: Record<AttributeKey, number>;
  momentum: {
    attribute: AttributeKey | null;
    value: number;
  };
  stats: RikishiStats;
  injuries: Record<AttributeKey, Injury>;
  permanentPenalties: Record<AttributeKey, number>;
  specializations: Specialization[];
  hasRenamedAtCurrentRank: boolean;
  careerHistory: CareerRecord[];
  isNPC: boolean;
  status?: 'active' | 'kyujo' | 'retired';
  kyujoDays?: number;
  boutsFoughtThisBasho?: number;
}

export interface NewsItem {
  id: string;
  year: number;
  month: number;
  type: 'yusho' | 'promotion' | 'demotion' | 'retirement' | 'injury' | 'general';
  text: string;
  rikishiId?: string;
  division?: Division;
}

export interface BoutPairing {
  day: number;
  rikishiId1: string;
  rikishiId2: string;
  result: 'rikishiId1' | 'rikishiId2' | 'draw' | null;
}

export interface WorldState {
  currentMonth: number; // 0-5 index for MONTHS array
  currentYear: number;
  rikishi: Rikishi[];
  playerRikishiId: string;
  news: NewsItem[];
  bashoSchedule?: BoutPairing[]; // Generated at start of basho
  currentBashoDay?: number;
}

export type GameView = 'main-menu' | 'creation' | 'dashboard' | 'news' | 'basho' | 'profile' | 'basho-summary' | 'inter-basho' | 'world' | 'leaderboard' | 'torikumi' | 'injury-resolution' | 'health';

export const BEYAS = [
  "Ajigawa", "Arashio", "Asahiyama", "Asakayama", "Dewanoumi",
  "Fujishima", "Futagoyama", "Hakkaku", "Hanaregoma", "Hidenoyama",
  "Ikazuchi", "Isegahama", "Isenoumi", "Kasugano", "Kataonami",
  "Kise", "Kokonoe", "Minato", "Minatogawa", "Miyagino",
  "Musashigawa", "Nakamura", "Naruto", "Nishiiwa", "Nishikido",
  "Nishonoseki", "Oitekaze", "Onoe", "Ōnomatsu", "Ōshima",
  "Oshiogawa", "Ōtake", "Otowayama", "Sadogatake", "Sakaigawa",
  "Shibatayama", "Shikihide", "Shikoroyama", "Tagonoura", "Takadagawa",
  "Takasago", "Takekuma", "Tamanoi", "Tatsunami", "Tokitsukaze",
  "Yamahibiki"
];
