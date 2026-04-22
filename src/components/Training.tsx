import { motion } from 'motion/react';
import { RikishiStats } from '../types';
import { Dumbbell, Beef, Brain, Wind, Zap, ChevronRight } from 'lucide-react';

interface TrainingOption {
  id: string;
  name: string;
  description: string;
  icon: any;
  energyCost: number;
  statBoost: Partial<RikishiStats>;
}

const trainingOptions: TrainingOption[] = [
  {
    id: 'shiko',
    name: 'Shiko Leg Stomps',
    description: 'Build core strength and lower body stability.',
    icon: Wind,
    energyCost: 15,
    statBoost: { power: 2, balance: 1 }
  },
  {
    id: 'teppo',
    name: 'Teppo Pole Slap',
    description: 'Perfect your striking technique and timing.',
    icon: Zap,
    energyCost: 10,
    statBoost: { technique: 3 }
  },
  {
    id: 'chanko',
    name: 'Chanko Banquet',
    description: 'High-protein diet to increase mass. High weight gain.',
    icon: Beef,
    energyCost: 0,
    statBoost: { weight: 5, footwork: -1 }
  },
  {
    id: 'meditation',
    name: 'Zen Meditation',
    description: 'Recover energy and improve concentration.',
    icon: Brain,
    energyCost: -30,
    statBoost: { technique: 1 }
  },
  {
    id: 'butsukari',
    name: 'Butsukari-geiko',
    description: 'Intense pushing practice. High fatigue.',
    icon: Dumbbell,
    energyCost: 40,
    statBoost: { power: 3, balance: 2 }
  }
];

export default function Training() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col p-6 space-y-4 overflow-y-auto no-scrollbar pb-24"
    >
      <div className="flex flex-col mb-2">
        <h2 className="text-xs font-bold uppercase tracking-wider opacity-60">Dojo Training</h2>
        <p className="text-lg font-serif font-bold italic">Perfect your form</p>
      </div>

      <div className="space-y-3">
        {trainingOptions.map((option) => (
          <button
            key={option.id}
            className="w-full text-left bg-white border border-sumo-beige p-4 rounded-2xl flex items-center gap-4 active:scale-[0.98] transition-all shadow-sm group"
          >
            <div className="w-12 h-12 bg-[#F5F5F0] rounded-xl flex items-center justify-center text-sumo-accent group-hover:bg-sumo-beige transition-colors">
              <option.icon size={24} />
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between items-center mb-0.5">
                <span className="font-bold text-sm tracking-tight">{option.name}</span>
                <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter">
                  <Zap size={10} className="fill-yellow-600" />
                  {option.energyCost > 0 ? `-${option.energyCost}` : `+${Math.abs(option.energyCost)}`}
                </div>
              </div>
              <p className="text-[10px] text-sumo-ink/60 leading-tight mb-2">
                {option.description}
              </p>
              <div className="flex gap-2">
                {Object.entries(option.statBoost).map(([stat, val]) => (
                  <span key={stat} className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest ${val > 0 ? 'bg-green-50 text-sumo-green' : 'bg-red-50 text-red-700'}`}>
                    {stat} {val > 0 ? `+${val}` : val}
                  </span>
                ))}
              </div>
            </div>
            
            <ChevronRight size={16} className="text-sumo-earth opacity-40" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

