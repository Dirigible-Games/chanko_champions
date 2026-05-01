import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rikishi, AttributeKey } from '../types';
import { performInjuryRoll, applyInjury, secureRandomInt, InjuryEvent } from '../lib/gameLogic';
import { AttributeIcon } from './AttributeIcon';
import { AlertTriangle, Activity, Database, HeartPulse } from 'lucide-react';

interface InjuryResolutionProps {
  rikishi: Rikishi;
  hits: number;
  onComplete: (updatedRikishi: Rikishi, reports: string[]) => void;
}

export default function InjuryResolution({ rikishi, hits, onComplete }: InjuryResolutionProps) {
  const [step, setStep] = useState<'intro' | 'rolling' | 'results'>('intro');
  const [injuryEvents, setInjuryEvents] = useState<InjuryEvent[]>([]);
  const [injuryResults, setInjuryResults] = useState<{ attr: AttributeKey, severity: number }[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const fatigue = rikishi.fatigue;
  const getTierInfo = () => {
    if (fatigue < 40) return { title: "Resilient State", formula: "3d54 t33 - 1", desc: "Your body is fresh. A successful die is discarded." };
    if (fatigue < 60) return { title: "Taxed State", formula: "3d54 t33", desc: "Fatigue is setting in. Standard injury risks apply." };
    if (fatigue < 80) return { title: "Exhausted State", formula: "3d54 t33 (Multi-Hit)", desc: "Warning: Every success event results in an individual injury." };
    return { title: "Critical State", formula: "3d54 t33 + 1 (Guaranteed)", desc: "Extremely Dangerous! Multiple heavy injuries are likely." };
  };

  const tier = getTierInfo();

  const handleStartRoll = () => {
    setStep('rolling');
    
    setTimeout(() => {
      const { events, results } = performInjuryRoll(rikishi.fatigue, hits);
      
      setInjuryEvents(events);
      setInjuryResults(results);
      setStep('results');

      const localLogs: string[] = [];
      if (results.length === 0) {
        localLogs.push("The rikishi narrowly avoided immediate physical damage.");
      } else {
        results.forEach(res => {
          localLogs.push(`Sustained a Severity ${res.severity} injury to ${res.attr.toUpperCase()}.`);
        });
      }
      setLogs(localLogs);
    }, 2000);
  };

  const handleFinalize = () => {
    let updated = { ...rikishi };
    injuryResults.forEach(res => {
      updated = applyInjury(updated, res.severity, res.attr as AttributeKey);
    });
    onComplete(updated, logs);
  };

  const attrMapping: Record<string, string> = {
    power: 'Power',
    balance: 'Balance',
    footwork: 'Footwork',
    technique: 'Technique',
    spirit: 'Spirit',
    random: 'Random / TBD'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-sumo-paper w-full max-w-lg rounded-xl overflow-hidden shadow-2xl relative border-2 border-sumo-earth/30"
      >
        <div className="bg-red-950 p-4 border-b border-white/10 flex items-center gap-3">
          <AlertTriangle className="text-red-500 animate-pulse" />
          <div>
            <h2 className="text-white font-serif font-black tracking-tight uppercase">Medical Assessment Required</h2>
            <p className="text-red-400/80 text-[10px] font-mono leading-none mt-1">{hits} INJURY TRIGGER{hits > 1 ? 'S' : ''} DETECTED DURING BOUT</p>
          </div>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 'intro' && (
              <motion.div 
                key="intro"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="bg-sumo-earth/10 p-4 rounded-lg border border-sumo-earth/20">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs uppercase font-black text-sumo-ink/60 tracking-wider">Current Fatigue</span>
                    <span className="text-xl font-mono font-bold text-sumo-ink">{Math.round(fatigue)}%</span>
                  </div>
                  <div className="h-2 bg-sumo-earth/20 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${fatigue}%` }}
                      className={`h-full ${fatigue >= 80 ? 'bg-red-600' : fatigue >= 60 ? 'bg-orange-500' : 'bg-sumo-ink'}`}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-red-50 p-3 border-l-4 border-red-500 rounded flex gap-3 text-red-900 items-start">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <p className="text-sm font-bold">The opponent landed {hits} impactful blow{hits > 1 ? 's' : ''}. You must undergo {hits} injury roll event{hits > 1 ? 's' : ''}.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sumo-ink">
                      <HeartPulse size={18} className="text-red-800" />
                      <h3 className="font-bold text-lg">{tier.title}</h3>
                    </div>
                    <p className="text-sm text-sumo-ink/70 leading-relaxed italic">"{tier.desc}"</p>
                    <div className="bg-white/50 p-2 rounded font-mono text-xs border border-sumo-earth/10">
                      <span className="opacity-50">Formula:</span> <span className="font-bold">{tier.formula}</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleStartRoll}
                  className="w-full py-4 bg-red-900 hover:bg-red-800 text-white font-black uppercase tracking-widest text-sm rounded-lg transition-colors shadow-lg"
                >
                  Confirm Physical Condition
                </button>
              </motion.div>
            )}

            {step === 'rolling' && (
              <motion.div 
                key="rolling"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-64 flex flex-col items-center justify-center space-y-4"
              >
                <div className="flex items-center justify-center h-20">
                  <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-4 border-red-900/20 border-t-red-900 rounded-full shadow-lg shadow-red-900/10"
                  />
                </div>
                <p className="text-sm font-mono text-red-900 uppercase tracking-widest animate-pulse">Calculating Internal Stress...</p>
              </motion.div>
            )}

            {step === 'results' && (
              <motion.div 
                key="results"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                {/* Dice Display for each event */}
                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  {injuryEvents.map((evt, idx) => (
                    <motion.div 
                      key={idx} 
                      className="bg-white p-3 rounded-lg border border-sumo-earth/20 flex flex-col gap-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.3 }}
                    >
                       <div className="text-[10px] font-black uppercase text-sumo-ink/50 tracking-widest">Event {idx + 1}</div>
                       <div className="flex gap-3 justify-center">
                          {evt.rolls.map((d, i) => (
                            <motion.div 
                              key={i} 
                              className={`w-14 h-14 rounded-xl shadow-md border-2 flex flex-col items-center justify-center font-black text-2xl relative overflow-hidden ${d >= 33 ? 'bg-red-50 border-red-700 text-red-950 shadow-red-500/10' : 'bg-white border-sumo-ink/20 text-sumo-ink/60 shadow-black/5'}`}
                              initial={{ rotateX: 90, scale: 0.5, opacity: 0 }}
                              animate={{ rotateX: 0, scale: 1, opacity: 1 }}
                              transition={{ type: "spring", stiffness: 150, damping: 10, delay: (idx * 0.3) + (i * 0.1) + 0.2 }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-transparent"></div>
                              <span className="relative z-10">{d}</span>
                            </motion.div>
                          ))}
                       </div>
                       <motion.div 
                         className="flex justify-between items-center text-xs px-2 mt-2"
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         transition={{ delay: (idx * 0.3) + 0.6 }}
                       >
                          <span className="font-mono text-sumo-ink/60">Base: {evt.baseSuccesses} | Mod: {evt.finalSuccesses}</span>
                          <span className={`font-bold uppercase tracking-wider ${evt.severity > 0 ? 'text-red-700' : 'text-green-600'}`}>
                            {evt.severity > 0 ? `SEV ${evt.severity}` : 'SAFE'}
                          </span>
                       </motion.div>
                    </motion.div>
                  ))}
                </div>

                {/* Outcome */}
                <div className="bg-white rounded-lg border border-sumo-earth/20 overflow-hidden">
                  <div className="bg-sumo-ink/5 p-2 border-b border-sumo-earth/10 flex items-center gap-2">
                    <Activity size={14} className="text-sumo-accent" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-sumo-ink/60">Results Log</span>
                  </div>
                  <div className="p-3 space-y-2">
                    {injuryResults.length === 0 ? (
                      <div className="p-4 text-center text-sumo-ink/60 font-serif italic text-sm">
                        Total mitigation. The rikishi returns to the stable without any immediate damage.
                      </div>
                    ) : (
                      injuryResults.map((res, i) => (
                        <motion.div 
                          initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}
                          key={i} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-100"
                        >
                          <div className="flex items-center gap-3">
                            {res.attr !== 'random' && <AttributeIcon attr={res.attr as AttributeKey} size={20} className="text-red-900" />}
                            <span className="font-bold text-sm text-red-950">{attrMapping[res.attr]}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-red-400 uppercase">Severity</span>
                            <span className="text-sm font-black text-red-700">{res.severity}</span>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>

                {/* Legacy Stats Preview */}
                <div className="flex gap-2">
                   <div className="flex-1 bg-sumo-earth/5 p-3 rounded border border-sumo-earth/10 text-center">
                     <div className="text-[8px] uppercase tracking-widest text-sumo-ink/40 mb-1">Total Unique Injuries</div>
                     <div className="text-lg font-mono font-bold">{rikishi.totalUniqueInjuries + (injuryResults.some(r => r.attr !== 'random' && rikishi.injuries[r.attr as AttributeKey].severity === 0) ? 1 : 0)}</div>
                   </div>
                   <div className="flex-1 bg-red-900/5 p-3 rounded border border-red-900/10 text-center">
                     <div className="text-[8px] uppercase tracking-widest text-red-900/40 mb-1">Base Fatigue Penalty</div>
                     <div className="text-lg font-mono font-bold text-red-900">+{rikishi.baseFatigue + (injuryResults.length > 0 ? 1 : 0)}</div>
                   </div>
                </div>

                <button 
                  onClick={handleFinalize}
                  className="w-full py-4 bg-sumo-ink text-white font-black uppercase tracking-widest text-sm rounded-lg hover:bg-black transition-all"
                >
                  Return to Stable
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
