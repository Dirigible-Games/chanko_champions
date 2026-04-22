import { Kimarite, Stance } from '../types';

export const STANCE_DESCRIPTIONS: Record<Stance, string> = {
  'Neutral': 'Starting position. No specific advantage.',
  'Yotsu': 'A belt-grip grappling stance. Favors power and technique.',
  'Nagete': 'A throwing-specialist stance. Favors balance and leverage.',
  'Kakete': 'A leg-tripping and sweeping stance. Favors footwork and timing.',
  'Tokushuwaza': 'Specialized technical maneuvers. High technique requirement.',
  'Oshi': 'Pushing and thrusting combat. Favors spirit and forward momentum.'
};

export const TACHIAI_MOVES: Kimarite[] = [
  { 
    id: 'powerful', 
    name: 'Powerful Tachiai', 
    type: 'tachiai', 
    primaryAttr: 'power', 
    secondaryAttr: 'balance', 
    transitionsTo: ['Yotsu', 'Nagete'],
    counters: ['reserved'],
    description: 'A massive frontal collision designed to force a belt grip or a throw.'
  },
  { 
    id: 'reserved', 
    name: 'Reserved Tachiai', 
    type: 'tachiai', 
    primaryAttr: 'spirit', 
    secondaryAttr: 'footwork', 
    transitionsTo: ['Oshi', 'Kakete'],
    counters: ['quick'],
    description: 'A calculated start that maintains distance, preparing for thrusting or leg trips.'
  },
  { 
    id: 'quick', 
    name: 'Quick Tachiai', 
    type: 'tachiai', 
    primaryAttr: 'technique', 
    secondaryAttr: 'power', 
    transitionsTo: ['Tokushuwaza', 'Yotsu'],
    counters: ['surprise'],
    description: 'A rapid entry using refined technique to slip into a preferred grip.'
  },
  { 
    id: 'surprise', 
    name: 'Surprise Tachiai', 
    type: 'tachiai', 
    primaryAttr: 'balance', 
    secondaryAttr: 'spirit', 
    transitionsTo: ['Nagete', 'Oshi'],
    counters: ['evasive'],
    description: 'An unpredictable lunge intended to catch the opponent off-guard.'
  },
  { 
    id: 'evasive', 
    name: 'Evasive Tachiai', 
    type: 'tachiai', 
    primaryAttr: 'footwork', 
    secondaryAttr: 'technique', 
    transitionsTo: ['Kakete', 'Tokushuwaza'],
    counters: ['powerful'],
    description: 'Lateral movement at the hit, looking to exploit the opponent\'s momentum.'
  },
];

export const OFFENSIVE_MOVES: Kimarite[] = [
  // Yotsu Stance
  { id: 'yorikiri', name: 'Yorikiri', type: 'offense', primaryAttr: 'power', secondaryAttr: 'balance', stanceRequirement: 'Yotsu', counters: ['tsuppari'], description: 'Frontal force-out while maintaining a steady belt grip.' },
  { id: 'uwatehineri', name: 'Uwatehineri', type: 'offense', primaryAttr: 'power', secondaryAttr: 'technique', stanceRequirement: 'Yotsu', counters: ['hanmi'], description: 'Overarm twisting throw that brings the opponent down.' },
  { id: 'uwatenage', name: 'Uwatenage', type: 'offense', primaryAttr: 'power', secondaryAttr: 'spirit', stanceRequirement: 'Yotsu', counters: ['tawara_escape'], description: 'Powerful overarm throw executed with a high belt grip.' },
  { id: 'shitatenage', name: 'Shitatenage', type: 'offense', primaryAttr: 'balance', secondaryAttr: 'footwork', stanceRequirement: 'Yotsu', counters: ['inashi'], description: 'Underarm throw using the inner belt grip to swing the opponent down.' },
  
  // Nagete Stance
  { id: 'kakenage', name: 'Kakenage', type: 'offense', primaryAttr: 'balance', secondaryAttr: 'spirit', stanceRequirement: 'Nagete', counters: ['inashi'], description: 'Hooking the opponent\'s leg while executing a throw.' },
  { id: 'kotenage', name: 'Kotenage', type: 'offense', primaryAttr: 'balance', secondaryAttr: 'power', stanceRequirement: 'Nagete', counters: ['makikae'], description: 'Arm-lock throw that doesn\'t require a belt grip.' },
  { id: 'sukuinage', name: 'Sukuinage', type: 'offense', primaryAttr: 'balance', secondaryAttr: 'footwork', stanceRequirement: 'Nagete', counters: ['tsuppari'], description: 'Beltless scoop throw used to upend the opponent.' },
  { id: 'kubinage', name: 'Kubinage', type: 'offense', primaryAttr: 'spirit', secondaryAttr: 'technique', stanceRequirement: 'Nagete', counters: ['hanmi'], description: 'Neck-throw using the arm wrapped around the opponent\'s head.' },

  // Kakete Stance
  { id: 'sotogake', name: 'Sotogake', type: 'offense', primaryAttr: 'footwork', secondaryAttr: 'technique', stanceRequirement: 'Kakete', counters: ['makikae'], description: 'Tripping the opponent by hooking their leg from the outside.' },
  { id: 'ashitori', name: 'Ashitori', type: 'offense', primaryAttr: 'footwork', secondaryAttr: 'spirit', stanceRequirement: 'Kakete', counters: ['tsuppari'], description: 'Diving for the opponent\'s leg to pull them down.' },
  { id: 'kekaeshi', name: 'Kekaeshi', type: 'offense', primaryAttr: 'footwork', secondaryAttr: 'power', stanceRequirement: 'Kakete', counters: ['hanmi'], description: 'A foot-sweep used to kick the opponent\'s supporting leg away.' },
  { id: 'kirikaeshi', name: 'Kirikaeshi', type: 'offense', primaryAttr: 'balance', secondaryAttr: 'technique', stanceRequirement: 'Kakete', counters: ['tawara_escape'], description: 'Twisting the opponent over one\'s own leg to trip them.' },

  // Tokushuwaza Stance
  { id: 'tsuridashi', name: 'Tsuridashi', type: 'offense', primaryAttr: 'technique', secondaryAttr: 'power', stanceRequirement: 'Tokushuwaza', counters: ['tawara_escape'], description: 'Lifting the opponent off the ground by their belt and carrying them out.' },
  { id: 'katasukashi', name: 'Katasukashi', type: 'offense', primaryAttr: 'technique', secondaryAttr: 'footwork', stanceRequirement: 'Tokushuwaza', counters: ['inashi'], description: 'Dodging a charge while pulling the opponent down by their underarm.' },
  { id: 'hikiotoshi', name: 'Hikiotoshi', type: 'offense', primaryAttr: 'technique', secondaryAttr: 'balance', stanceRequirement: 'Tokushuwaza', counters: ['makikae'], description: 'Pulling the opponent forward and down by their shoulders.' },
  { id: 'kimedashi', name: 'Kimedashi', type: 'offense', primaryAttr: 'power', secondaryAttr: 'spirit', stanceRequirement: 'Tokushuwaza', counters: ['tsuppari'], description: 'Pinning the opponent\'s arms and marching them out of the ring.' },

  // Oshi Stance
  { id: 'hatakikomi', name: 'Hatakikomi', type: 'offense', primaryAttr: 'spirit', secondaryAttr: 'footwork', stanceRequirement: 'Oshi', counters: ['hanmi'], description: 'Slapping the opponent down as they attempt to charge.' },
  { id: 'okuridashi', name: 'Okuridashi', type: 'offense', primaryAttr: 'spirit', secondaryAttr: 'balance', stanceRequirement: 'Oshi', counters: ['tawara_escape'], description: 'Pushing the opponent out from behind after circling them.' },
  { id: 'tsukidashi', name: 'Tsukidashi', type: 'offense', primaryAttr: 'spirit', secondaryAttr: 'technique', stanceRequirement: 'Oshi', counters: ['inashi'], description: 'Successive thrusts to the chest that knock the opponent out.' },
  { id: 'oshidashi', name: 'Oshidashi', type: 'offense', primaryAttr: 'footwork', secondaryAttr: 'power', stanceRequirement: 'Oshi', counters: ['makikae'], description: 'Pushing the opponent backward across the ring line.' },
];

export const DEFENSIVE_MOVES: Kimarite[] = [
  { 
    id: 'inashi', 
    name: 'Inashi', 
    type: 'defense', 
    primaryAttr: 'footwork', 
    secondaryAttr: 'power', 
    transitionsTo: ['Kakete', 'Yotsu'],
    counters: ['yorikiri', 'kotenage', 'hikiotoshi', 'oshidashi'],
    description: 'Slidestepping or parrying an attack to use the opponent\'s momentum against them.'
  },
  { 
    id: 'makikae', 
    name: 'Makikae', 
    type: 'defense', 
    primaryAttr: 'power', 
    secondaryAttr: 'spirit', 
    transitionsTo: ['Yotsu', 'Oshi'],
    counters: ['sukuinage', 'ashitori', 'kimedashi', 'hatakikomi'],
    description: 'Switching belt grips or fighting for a better inner position.'
  },
  { 
    id: 'tawara_escape', 
    name: 'Tawara Escape', 
    type: 'defense', 
    primaryAttr: 'balance', 
    secondaryAttr: 'footwork', 
    transitionsTo: ['Nagete', 'Kakete'],
    counters: ['shitatenage', 'sotogake', 'katasukashi', 'tsukidashi'],
    description: 'Utilizing the ring\'s edge (tawara) to pivot away from a finishing push.'
  },
  { 
    id: 'hanmi', 
    name: 'Hanmi', 
    type: 'defense', 
    primaryAttr: 'technique', 
    secondaryAttr: 'balance', 
    transitionsTo: ['Tokushuwaza', 'Nagete'],
    counters: ['uwatenage', 'kakenage', 'kirikaeshi', 'okuridashi'],
    description: 'Adopting a half-bodied stance to reduce the target area and prepare a counter.'
  },
  { 
    id: 'tsuppari', 
    name: 'Tsuppari', 
    type: 'defense', 
    primaryAttr: 'spirit', 
    secondaryAttr: 'technique', 
    transitionsTo: ['Oshi', 'Tokushuwaza'],
    counters: ['uwatehineri', 'kubinage', 'kekaeshi', 'tsuridashi'],
    description: 'Rapid open-palm thrusts used to halt the opponent\'s advance.'
  },
];
