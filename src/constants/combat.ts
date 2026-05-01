import { Kimarite, Stance } from '../types';

export const STANCE_DESCRIPTIONS: Record<Stance, string> = {
  'Neutral': 'Starting position. No specific advantage.',
  'Yotsu': 'A belt-grip grappling stance. Favors power and technique.',
  'Nagewaza': 'A throwing-specialist stance. Favors balance and leverage.',
  'Ashiwaza': 'A leg-tripping and sweeping stance. Favors footwork and timing.',
  'Kawari': 'Specialized technical maneuvers. High technique requirement.',
  'Oshi': 'Pushing and thrusting combat. Favors spirit and forward momentum.'
};

export const TACHIAI_MOVES: Kimarite[] = [
  { 
    id: 'powerful', 
    name: 'Powerful Tachiai', 
    type: 'tachiai', 
    primaryAttr: 'power', 
    secondaryAttr: 'balance', 
    transitionsTo: ['Yotsu', 'Nagewaza'],
    counters: ['reserved'],
    description: 'A massive frontal collision designed to force a belt grip or a throw.'
  },
  { 
    id: 'reserved', 
    name: 'Reserved Tachiai', 
    type: 'tachiai', 
    primaryAttr: 'spirit', 
    secondaryAttr: 'footwork', 
    transitionsTo: ['Oshi', 'Ashiwaza'],
    counters: ['quick'],
    description: 'A calculated start that maintains distance, preparing for thrusting or leg trips.'
  },
  { 
    id: 'quick', 
    name: 'Quick Tachiai', 
    type: 'tachiai', 
    primaryAttr: 'technique', 
    secondaryAttr: 'power', 
    transitionsTo: ['Kawari', 'Yotsu'],
    counters: ['surprise'],
    description: 'A rapid entry using refined technique to slip into a preferred grip.'
  },
  { 
    id: 'surprise', 
    name: 'Surprise Tachiai', 
    type: 'tachiai', 
    primaryAttr: 'balance', 
    secondaryAttr: 'spirit', 
    transitionsTo: ['Nagewaza', 'Oshi'],
    counters: ['evasive'],
    description: 'An unpredictable lunge intended to catch the opponent off-guard.'
  },
  { 
    id: 'evasive', 
    name: 'Evasive Tachiai', 
    type: 'tachiai', 
    primaryAttr: 'footwork', 
    secondaryAttr: 'technique', 
    transitionsTo: ['Ashiwaza', 'Kawari'],
    counters: ['powerful'],
    description: 'Lateral movement at the hit, looking to exploit the opponent\'s momentum.'
  },
];

export const OFFENSIVE_MOVES: Kimarite[] = [
  // Yotsu Stance
  { id: 'yorikiri', name: 'Yorikiri', type: 'offense', primaryAttr: 'power', secondaryAttr: 'balance', stanceRequirement: 'Yotsu', counters: ['tsuppari'], description: 'Frontal force-out while maintaining a steady belt grip.' },
  { id: 'uwatehineri', name: 'Uwatehineri', type: 'offense', primaryAttr: 'power', secondaryAttr: 'technique', stanceRequirement: 'Yotsu', counters: ['katamuki'], description: 'Overarm twisting throw that brings the opponent down.' },
  { id: 'uwatenage', name: 'Uwatenage', type: 'offense', primaryAttr: 'power', secondaryAttr: 'spirit', stanceRequirement: 'Yotsu', counters: ['tawara_escape'], description: 'Powerful overarm throw executed with a high belt grip.' },
  { id: 'shitatenage', name: 'Shitatenage', type: 'offense', primaryAttr: 'balance', secondaryAttr: 'footwork', stanceRequirement: 'Yotsu', counters: ['nagashi'], description: 'Underarm throw using the inner belt grip to swing the opponent down.' },
  
  // Nagewaza Stance
  { id: 'kakenage', name: 'Kakenage', type: 'offense', primaryAttr: 'balance', secondaryAttr: 'spirit', stanceRequirement: 'Nagewaza', counters: ['nagashi'], description: 'Hooking the opponent\'s leg while executing a throw.' },
  { id: 'kotenage', name: 'Kotenage', type: 'offense', primaryAttr: 'balance', secondaryAttr: 'power', stanceRequirement: 'Nagewaza', counters: ['kirikae'], description: 'Arm-lock throw that doesn\'t require a belt grip.' },
  { id: 'sukuinage', name: 'Sukuinage', type: 'offense', primaryAttr: 'balance', secondaryAttr: 'footwork', stanceRequirement: 'Nagewaza', counters: ['tsuppari'], description: 'Beltless scoop throw used to upend the opponent.' },
  { id: 'kubinage', name: 'Kubinage', type: 'offense', primaryAttr: 'spirit', secondaryAttr: 'technique', stanceRequirement: 'Nagewaza', counters: ['katamuki'], description: 'Neck-throw using the arm wrapped around the opponent\'s head.' },

  // Ashiwaza Stance
  { id: 'sotogake', name: 'Sotogake', type: 'offense', primaryAttr: 'footwork', secondaryAttr: 'technique', stanceRequirement: 'Ashiwaza', counters: ['kirikae'], description: 'Tripping the opponent by hooking their leg from the outside.' },
  { id: 'ashitori', name: 'Ashitori', type: 'offense', primaryAttr: 'footwork', secondaryAttr: 'spirit', stanceRequirement: 'Ashiwaza', counters: ['tsuppari'], description: 'Diving for the opponent\'s leg to pull them down.' },
  { id: 'kekaeshi', name: 'Kekaeshi', type: 'offense', primaryAttr: 'footwork', secondaryAttr: 'power', stanceRequirement: 'Ashiwaza', counters: ['katamuki'], description: 'A foot-sweep used to kick the opponent\'s supporting leg away.' },
  { id: 'kirikaeshi', name: 'Kirikaeshi', type: 'offense', primaryAttr: 'balance', secondaryAttr: 'technique', stanceRequirement: 'Ashiwaza', counters: ['tawara_escape'], description: 'Twisting the opponent over one\'s own leg to trip them.' },

  // Kawari Stance
  { id: 'tsuridashi', name: 'Tsuridashi', type: 'offense', primaryAttr: 'technique', secondaryAttr: 'power', stanceRequirement: 'Kawari', counters: ['tawara_escape'], description: 'Lifting the opponent off the ground by their belt and carrying them out.' },
  { id: 'katasukashi', name: 'Katasukashi', type: 'offense', primaryAttr: 'technique', secondaryAttr: 'footwork', stanceRequirement: 'Kawari', counters: ['nagashi'], description: 'Dodging a charge while pulling the opponent down by their underarm.' },
  { id: 'hikiotoshi', name: 'Hikiotoshi', type: 'offense', primaryAttr: 'technique', secondaryAttr: 'balance', stanceRequirement: 'Kawari', counters: ['kirikae'], description: 'Pulling the opponent forward and down by their shoulders.' },
  { id: 'kimedashi', name: 'Kimedashi', type: 'offense', primaryAttr: 'power', secondaryAttr: 'spirit', stanceRequirement: 'Kawari', counters: ['tsuppari'], description: 'Pinning the opponent\'s arms and marching them out of the ring.' },

  // Oshi Stance
  { id: 'hatakikomi', name: 'Hatakikomi', type: 'offense', primaryAttr: 'spirit', secondaryAttr: 'footwork', stanceRequirement: 'Oshi', counters: ['katamuki'], description: 'Slapping the opponent down as they attempt to charge.' },
  { id: 'okuridashi', name: 'Okuridashi', type: 'offense', primaryAttr: 'spirit', secondaryAttr: 'balance', stanceRequirement: 'Oshi', counters: ['tawara_escape'], description: 'Pushing the opponent out from behind after circling them.' },
  { id: 'tsukidashi', name: 'Tsukidashi', type: 'offense', primaryAttr: 'spirit', secondaryAttr: 'technique', stanceRequirement: 'Oshi', counters: ['nagashi'], description: 'Successive thrusts to the chest that knock the opponent out.' },
  { id: 'oshidashi', name: 'Oshidashi', type: 'offense', primaryAttr: 'footwork', secondaryAttr: 'power', stanceRequirement: 'Oshi', counters: ['kirikae'], description: 'Pushing the opponent backward across the ring line.' },
];

export const DEFENSIVE_MOVES: Kimarite[] = [
  { 
    id: 'nagashi', 
    name: 'Nagashi', 
    type: 'defense', 
    primaryAttr: 'footwork', 
    secondaryAttr: 'power', 
    transitionsTo: ['Ashiwaza', 'Yotsu'],
    counters: ['yorikiri', 'kotenage', 'hikiotoshi', 'oshidashi'],
    description: 'Slidestepping or parrying an attack to use the opponent\'s momentum against them.'
  },
  { 
    id: 'kirikae', 
    name: 'Kirikae', 
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
    transitionsTo: ['Nagewaza', 'Ashiwaza'],
    counters: ['shitatenage', 'sotogake', 'katasukashi', 'tsukidashi'],
    description: 'Utilizing the ring\'s edge (tawara) to pivot away from a finishing push.'
  },
  { 
    id: 'katamuki', 
    name: 'Katamuki', 
    type: 'defense', 
    primaryAttr: 'technique', 
    secondaryAttr: 'balance', 
    transitionsTo: ['Kawari', 'Nagewaza'],
    counters: ['uwatenage', 'kakenage', 'kirikaeshi', 'okuridashi'],
    description: 'Adopting a half-bodied stance to reduce the target area and prepare a counter.'
  },
  { 
    id: 'tsuppari', 
    name: 'Tsuppari', 
    type: 'defense', 
    primaryAttr: 'spirit', 
    secondaryAttr: 'technique', 
    transitionsTo: ['Oshi', 'Kawari'],
    counters: ['uwatehineri', 'kubinage', 'kekaeshi', 'tsuridashi'],
    description: 'Rapid open-palm thrusts used to halt the opponent\'s advance.'
  },
];
