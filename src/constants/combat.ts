import { Kimarite } from '../types';

export const TACHIAI_MOVES: Kimarite[] = [
  { 
    id: 'powerful', 
    name: 'Powerful Tachiai', 
    type: 'tachiai', 
    primaryAttr: 'power', 
    secondaryAttr: 'balance', 
    transitionsTo: ['Yotsu', 'Nagete'],
    counters: ['reserved']
  },
  { 
    id: 'reserved', 
    name: 'Reserved Tachiai', 
    type: 'tachiai', 
    primaryAttr: 'spirit', 
    secondaryAttr: 'footwork', 
    transitionsTo: ['Oshi', 'Kakete'],
    counters: ['quick']
  },
  { 
    id: 'quick', 
    name: 'Quick Tachiai', 
    type: 'tachiai', 
    primaryAttr: 'technique', 
    secondaryAttr: 'power', 
    transitionsTo: ['Tokushuwaza', 'Yotsu'],
    counters: ['surprise']
  },
  { 
    id: 'surprise', 
    name: 'Surprise Tachiai', 
    type: 'tachiai', 
    primaryAttr: 'balance', 
    secondaryAttr: 'spirit', 
    transitionsTo: ['Nagete', 'Oshi'],
    counters: ['evasive']
  },
  { 
    id: 'evasive', 
    name: 'Evasive Tachiai', 
    type: 'tachiai', 
    primaryAttr: 'footwork', 
    secondaryAttr: 'technique', 
    transitionsTo: ['Kakete', 'Tokushuwaza'],
    counters: ['powerful']
  },
];

export const OFFENSIVE_MOVES: Kimarite[] = [
  // Yotsu Stance
  { id: 'yorikiri', name: 'Yorikiri', type: 'offense', primaryAttr: 'power', secondaryAttr: 'balance', stanceRequirement: 'Yotsu', counters: ['tsuppari'] },
  { id: 'uwatehineri', name: 'Uwatehineri', type: 'offense', primaryAttr: 'power', secondaryAttr: 'technique', stanceRequirement: 'Yotsu', counters: ['hanmi'] },
  { id: 'uwatenage', name: 'Uwatenage', type: 'offense', primaryAttr: 'power', secondaryAttr: 'spirit', stanceRequirement: 'Yotsu', counters: ['tawara_escape'] },
  { id: 'shitatenage', name: 'Shitatenage', type: 'offense', primaryAttr: 'balance', secondaryAttr: 'footwork', stanceRequirement: 'Yotsu', counters: ['inashi'] },
  
  // Nagete Stance
  { id: 'kakenage', name: 'Kakenage', type: 'offense', primaryAttr: 'balance', secondaryAttr: 'spirit', stanceRequirement: 'Nagete', counters: ['inashi'] },
  { id: 'kotenage', name: 'Kotenage', type: 'offense', primaryAttr: 'balance', secondaryAttr: 'power', stanceRequirement: 'Nagete', counters: ['makikae'] },
  { id: 'sukuinage', name: 'Sukuinage', type: 'offense', primaryAttr: 'balance', secondaryAttr: 'footwork', stanceRequirement: 'Nagete', counters: ['tsuppari'] },
  { id: 'kubinage', name: 'Kubinage', type: 'offense', primaryAttr: 'spirit', secondaryAttr: 'technique', stanceRequirement: 'Nagete', counters: ['hanmi'] },

  // Kakete Stance
  { id: 'sotogake', name: 'Sotogake', type: 'offense', primaryAttr: 'footwork', secondaryAttr: 'technique', stanceRequirement: 'Kakete', counters: ['makikae'] },
  { id: 'ashitori', name: 'Ashitori', type: 'offense', primaryAttr: 'footwork', secondaryAttr: 'spirit', stanceRequirement: 'Kakete', counters: ['tsuppari'] },
  { id: 'kekaeshi', name: 'Kekaeshi', type: 'offense', primaryAttr: 'footwork', secondaryAttr: 'power', stanceRequirement: 'Kakete', counters: ['hanmi'] },
  { id: 'kirikaeshi', name: 'Kirikaeshi', type: 'offense', primaryAttr: 'balance', secondaryAttr: 'technique', stanceRequirement: 'Kakete', counters: ['tawara_escape'] },

  // Tokushuwaza Stance
  { id: 'tsuridashi', name: 'Tsuridashi', type: 'offense', primaryAttr: 'technique', secondaryAttr: 'power', stanceRequirement: 'Tokushuwaza', counters: ['tawara_escape'] },
  { id: 'katasukashi', name: 'Katasukashi', type: 'offense', primaryAttr: 'technique', secondaryAttr: 'footwork', stanceRequirement: 'Tokushuwaza', counters: ['inashi'] },
  { id: 'hikiotoshi', name: 'Hikiotoshi', type: 'offense', primaryAttr: 'technique', secondaryAttr: 'balance', stanceRequirement: 'Tokushuwaza', counters: ['makikae'] },
  { id: 'kimedashi', name: 'Kimedashi', type: 'offense', primaryAttr: 'power', secondaryAttr: 'spirit', stanceRequirement: 'Tokushuwaza', counters: ['tsuppari'] },

  // Oshi Stance
  { id: 'hatakikomi', name: 'Hatakikomi', type: 'offense', primaryAttr: 'spirit', secondaryAttr: 'footwork', stanceRequirement: 'Oshi', counters: ['hanmi'] },
  { id: 'okuridashi', name: 'Okuridashi', type: 'offense', primaryAttr: 'spirit', secondaryAttr: 'balance', stanceRequirement: 'Oshi', counters: ['tawara_escape'] },
  { id: 'tsukidashi', name: 'Tsukidashi', type: 'offense', primaryAttr: 'spirit', secondaryAttr: 'technique', stanceRequirement: 'Oshi', counters: ['inashi'] },
  { id: 'oshidashi', name: 'Oshidashi', type: 'offense', primaryAttr: 'footwork', secondaryAttr: 'power', stanceRequirement: 'Oshi', counters: ['makikae'] },
];

export const DEFENSIVE_MOVES: Kimarite[] = [
  { 
    id: 'inashi', 
    name: 'Inashi', 
    type: 'defense', 
    primaryAttr: 'footwork', 
    secondaryAttr: 'power', 
    transitionsTo: ['Kakete', 'Yotsu'],
    counters: ['yorikiri', 'kotenage', 'hikiotoshi', 'oshidashi']
  },
  { 
    id: 'makikae', 
    name: 'Makikae', 
    type: 'defense', 
    primaryAttr: 'power', 
    secondaryAttr: 'spirit', 
    transitionsTo: ['Yotsu', 'Oshi'],
    counters: ['sukuinage', 'ashitori', 'kimedashi', 'hatakikomi']
  },
  { 
    id: 'tawara_escape', 
    name: 'Tawara Escape', 
    type: 'defense', 
    primaryAttr: 'balance', 
    secondaryAttr: 'footwork', 
    transitionsTo: ['Nagete', 'Kakete'],
    counters: ['shitatenage', 'sotogake', 'katasukashi', 'tsukidashi']
  },
  { 
    id: 'hanmi', 
    name: 'Hanmi', 
    type: 'defense', 
    primaryAttr: 'technique', 
    secondaryAttr: 'balance', 
    transitionsTo: ['Tokushuwaza', 'Nagete'],
    counters: ['uwatenage', 'kakenage', 'kirikaeshi', 'okuridashi']
  },
  { 
    id: 'tsuppari', 
    name: 'Tsuppari', 
    type: 'defense', 
    primaryAttr: 'spirit', 
    secondaryAttr: 'technique', 
    transitionsTo: ['Oshi', 'Tokushuwaza'],
    counters: ['uwatehineri', 'kubinage', 'kekaeshi', 'tsuridashi']
  },
];
