import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rikishi, RikishiStats, RikishiArchetype, BEYAS } from '../types';
import { ChevronRight, ChevronLeft, Check, Info } from 'lucide-react';
import { AttributeIcon } from './AttributeIcon';
import { BonusTooltip } from './BonusTooltip';
import { ARCHETYPE_DESCRIPTIONS } from '../constants/rikishi';
import type { AttributeKey } from '../types';
import { secureRandomInt } from '../lib/gameLogic';
import ShikonaBuilder from './ShikonaBuilder';

interface CharacterCreationProps {
  onComplete: (rikishi: Rikishi) => void;
}

const ARCHETYPES: Record<Exclude<RikishiArchetype, 'Custom'>, Partial<RikishiStats>> = {
  Yotsu: { power: 4, balance: 4, footwork: 2, technique: 3, spirit: 2, weight: 155 },
  Nagete: { power: 3, balance: 4, footwork: 2, technique: 2, spirit: 4, weight: 145 },
  Kakete: { power: 2, balance: 2, footwork: 4, technique: 4, spirit: 3, weight: 135 },
  Tokushuwaza: { power: 4, balance: 2, footwork: 3, technique: 4, spirit: 2, weight: 140 },
  Oshi: { power: 2, balance: 3, footwork: 4, technique: 2, spirit: 4, weight: 160 },
};

const STAT_LABELS: Record<keyof Omit<RikishiStats, 'weight'>, string> = {
  power: 'Power',
  balance: 'Balance',
  footwork: 'Footwork',
  technique: 'Technique',
  spirit: 'Spirit',
};

const STAT_DESCRIPTIONS: Record<keyof Omit<RikishiStats, 'weight'>, string> = {
  power: 'Strength for pushing and lifting.',
  balance: 'Steadiness to resist trips and throws.',
  footwork: 'Speed and positioning ability.',
  technique: 'Skill with complex technical moves.',
  spirit: 'Mental stamina and aggressiveness.',
};

export default function CharacterCreation({ onComplete }: CharacterCreationProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [nameKanji, setNameKanji] = useState('');
  const [color, setColor] = useState('#8B4513');
  const [beya, setBeya] = useState(BEYAS[0]);
  const [archetype, setArchetype] = useState<RikishiArchetype>('Yotsu');
  const [customStats, setCustomStats] = useState<Omit<RikishiStats, 'weight'>>({
    power: 3,
    balance: 3,
    footwork: 3,
    technique: 3,
    spirit: 3,
  });

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  const calculateCustomTotal = () => Object.values(customStats).reduce((a, b) => (a as number) + (b as number), 0) as number;

  const isCustomValid = () => {
    const values = Object.values(customStats) as number[];
    const total = values.reduce((a, b) => a + b, 0);
    const sorted = [...values].sort((a, b) => a - b);
    const strongest = sorted[4];
    const thirdWeakest = sorted[2];
    
    return total === 15 && strongest <= thirdWeakest + 5;
  };

  const handleFinish = () => {
    let finalStats: RikishiStats;
    if (archetype === 'Custom') {
      finalStats = { ...customStats, weight: 150 };
    } else {
      finalStats = {
        power: ARCHETYPES[archetype].power!,
        balance: ARCHETYPES[archetype].balance!,
        footwork: ARCHETYPES[archetype].footwork!,
        technique: ARCHETYPES[archetype].technique!,
        spirit: ARCHETYPES[archetype].spirit!,
        weight: ARCHETYPES[archetype].weight!,
      };
    }

    const newRikishi: Rikishi = {
      id: secureRandomInt(1000000).toString(36) + secureRandomInt(1000000).toString(36),
      name: name || 'Unlabeled Rikishi',
      nameKanji,
      rank: { division: 'Jonokuchi', title: 10, side: 'West' }, // Start at bottom
      beya,
      mawashiColor: color,
      archetype,
      experience: 0,
      wins: 0,
      losses: 0,
      health: 100,
      energy: 100,
      fatigue: 0,
      baseFatigue: 0,
      focusPoints: 0,
      bashosCompleted: 0,
      totalUniqueInjuries: 0,
      bashoProgressPenalty: 0,
      tpAvailable: 0,
      tpAssigned: { power: 0, balance: 0, footwork: 0, technique: 0, spirit: 0 },
      totalTpSpent: { power: 0, balance: 0, footwork: 0, technique: 0, spirit: 0 },
      momentum: { attribute: null, value: 0 },
      stats: finalStats,
      injuries: {
        power: { severity: 0, hits: 0 },
        balance: { severity: 0, hits: 0 },
        footwork: { severity: 0, hits: 0 },
        technique: { severity: 0, hits: 0 },
        spirit: { severity: 0, hits: 0 }
      },
      permanentPenalties: { power: 0, balance: 0, footwork: 0, technique: 0, spirit: 0 },
      specializations: [],
      hasRenamedAtCurrentRank: false,
      careerHistory: [],
      isNPC: false
    };

    onComplete(newRikishi);
  };

  return (
    <div className="h-full flex flex-col bg-sumo-paper overflow-hidden">
      {/* Progress Header */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex gap-1 mb-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full ${step >= i ? 'bg-sumo-accent' : 'bg-sumo-beige'}`} />
          ))}
        </div>
        <h2 className="text-xl font-serif font-black italic text-sumo-ink uppercase tracking-tighter">
          {step === 1 && "The Stable & Colors"}
          {step === 2 && "Choose Your Shikona"}
          {step === 3 && "Wrestling Style"}
          {step === 4 && archetype === 'Custom' ? "Finishing Touches" : step === 4 ? "Review" : ""}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 no-scrollbar pb-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 pt-4"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Choose Beya (Stable)</label>
                <select
                  value={beya}
                  onChange={e => setBeya(e.target.value)}
                  className="w-full bg-white border-2 border-sumo-beige rounded-2xl p-4 text-base font-bold focus:border-sumo-accent outline-none appearance-none shadow-sm"
                >
                  {BEYAS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Mawashi Color</label>
                <div className="flex flex-wrap gap-3 p-1">
                  {['#8B4513', '#1A1A1A', '#000080', '#006400', '#8B0000', '#4B0082', '#D4AF37'].map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-10 h-10 rounded-full border-2 transition-transform active:scale-90 ${color === c ? 'border-sumo-accent scale-110 shadow-lg' : 'border-transparent shadow-sm'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <div className="relative group">
                    <input
                      type="color"
                      value={color}
                      onChange={e => setColor(e.target.value)}
                      className="w-10 h-10 opacity-0 cursor-pointer absolute inset-0 z-10"
                    />
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-red-500 via-green-500 to-blue-500 flex items-center justify-center text-white border-2 border-transparent">
                      <span className="text-[10px] font-black">+</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="pt-2 h-full"
            >
              <ShikonaBuilder 
                initialName={name}
                initialKanji={nameKanji}
                beya={beya}
                onChange={(n, k) => {
                  setName(n);
                  setNameKanji(k);
                }}
              />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 pt-4"
            >
              <div className="grid grid-cols-2 gap-2">
                {(['Yotsu', 'Nagete', 'Kakete', 'Tokushuwaza', 'Oshi', 'Custom'] as RikishiArchetype[]).map((arch) => (
                  <div
                    key={arch}
                    role="button"
                    tabIndex={0}
                    onClick={() => setArchetype(arch)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setArchetype(arch);
                      }
                    }}
                    className={`w-full text-left p-2 rounded-xl border-2 transition-all cursor-pointer ${archetype === arch ? 'border-sumo-accent bg-white shadow-md' : 'border-sumo-beige bg-white/40 opacity-70 hover:opacity-100'}`}
                  >
                    <div className="flex justify-between items-center mb-0.5">
                      <div className="flex items-center gap-1 overflow-hidden">
                        <span className="font-black text-[9px] uppercase tracking-tight truncate">{arch.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <BonusTooltip 
                          title={`${arch.replace(/([A-Z])/g, ' $1').trim()} Style`}
                          content={ARCHETYPE_DESCRIPTIONS[arch]} 
                          icon={<Info size={9} className="stroke-[3px] shrink-0" />}
                        />
                      </div>
                      {archetype === arch && <div className="bg-sumo-accent p-0.5 rounded-full text-white shrink-0"><Check size={7} /></div>}
                    </div>
                    {arch !== 'Custom' ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(ARCHETYPES[arch as keyof typeof ARCHETYPES] || {}).map(([stat, val]) => {
                          if (stat === 'weight') return null;
                          return (
                            <div key={stat} className="flex items-center bg-sumo-beige/10 px-1 rounded">
                               <AttributeIcon attr={stat as AttributeKey} size={11} className="opacity-80" />
                               <span className="text-[10px] font-bold ml-1">+{val}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-[21px]" /> // Spacer to match height
                    )}
                  </div>
                ))}
              </div>
              

            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="pt-4"
            >
              {archetype === 'Custom' ? (
                <div className="space-y-6">
                   <div className="flex justify-between items-center bg-sumo-soft p-4 rounded-2xl border border-sumo-earth">
                    <span className="text-xs font-bold text-sumo-accent uppercase tracking-widest">Points Remaining</span>
                    <span className={`text-xl font-mono font-black ${calculateCustomTotal() === 15 ? 'text-sumo-green' : 'text-sumo-accent'}`}>
                      {15 - (calculateCustomTotal() as number)}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {Object.entries(customStats).map(([stat, val]) => (
                      <div key={stat} className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                          <div className="flex items-center gap-1 opacity-60">
                            <AttributeIcon attr={stat as AttributeKey} size={14} />
                            <span>{STAT_LABELS[stat as keyof typeof customStats]}</span>
                          </div>
                          <span>{val as number}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => setCustomStats(s => ({ ...s, [stat]: Math.max(2, (val as number) - 1) }))}
                            className="w-10 h-10 rounded-full bg-white border-2 border-sumo-beige flex items-center justify-center font-bold text-lg active:scale-90"
                          >
                            -
                          </button>
                          <div className="flex-1 h-2 bg-sumo-beige rounded-full overflow-hidden">
                            <div className="h-full bg-sumo-accent transition-all" style={{ width: `${((val as number) / 7) * 100}%` }} />
                          </div>
                          <button 
                            onClick={() => setCustomStats(s => ({ ...s, [stat]: Math.min(8, (val as number) + 1) }))}
                            className="w-10 h-10 rounded-full bg-white border-2 border-sumo-beige flex items-center justify-center font-bold text-lg active:scale-90"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!isCustomValid() && calculateCustomTotal() === 15 && (
                    <div className="p-3 bg-red-50 text-red-700 text-[10px] font-bold rounded-xl border border-red-200">
                      INVALID: Strongest stat is too high compared to your average.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-sumo-dark text-sumo-paper rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 japanese-pattern opacity-10" />
                    <div className="relative z-10 flex flex-col items-center">
                      <div 
                        className="w-24 h-24 rounded-full border-4 border-white/20 flex items-center justify-center font-serif text-5xl font-black mb-4 shadow-xl"
                        style={{ backgroundColor: color }}
                      >
                        {name[0]}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-sumo-earth opacity-60">{beya} Stable</span>
                      <h3 className="text-3xl font-serif font-black italic">{name}</h3>
                      <div className="mt-4 px-4 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest">
                        {archetype} Specialist
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="p-6 bg-sumo-soft/80 backdrop-blur-md border-t border-sumo-earth flex gap-3 pb-8">
        {step > 1 && (
          <button 
            onClick={handlePrev}
            className="flex-1 bg-white text-sumo-ink p-4 rounded-2xl font-bold uppercase tracking-widest text-xs border border-sumo-earth shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <ChevronLeft size={16} /> Back
          </button>
        )}
        
        {step < 4 ? (
          <button 
            disabled={step === 2 && !name.trim()}
            onClick={handleNext}
            className="flex-[2] bg-sumo-ink text-white p-4 rounded-2xl font-bold uppercase tracking-[0.2em] text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
          >
            {step === 2 ? 'Confirm Name' : 'Continue'} <ChevronRight size={16} />
          </button>
        ) : (
          <button 
            disabled={archetype === 'Custom' && !isCustomValid()}
            onClick={handleFinish}
            className="flex-[2] bg-sumo-accent text-white p-4 rounded-2xl font-bold uppercase tracking-[0.3em] text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
          >
            Begin Legend <Check size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
