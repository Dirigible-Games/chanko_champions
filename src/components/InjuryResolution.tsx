import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rikishi, AttributeKey } from '../types';
import { performInjuryRoll, applyInjury, secureRandomInt } from '../lib/gameLogic';
import { AttributeIcon } from './AttributeIcon';
import { AlertTriangle, Activity, Database, HeartPulse } from 'lucide-react';

interface InjuryResolutionProps {
  rikishi: Rikishi;
  onComplete: (updatedRikishi: Rikishi, reports: string[]) => void;
}

export default function InjuryResolution({ rikishi, onComplete }: InjuryResolutionProps) {
  const [step, setStep] = useState<'intro' | 'rolling' | 'results'>('intro');
  const [dice, setDice] = useState<number[]>([]);
  const [successes, setSuccesses] = useState(0);
  const [injuryResults, setInjuryResults] = useState<{ attr: AttributeKey, severity: number }[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const fatigue = rikishi.fatigue;
  const getTierInfo = () => {
    if (fatigue < 40) return { title: "Resilient State", formula: "3d54 t33 - 1", desc: "Your body is fresh. Only extreme stress will result in injury." };
    if (fatigue < 60) return { title: "Taxed State", formula: "3d54 t33", desc: "Fatigue is setting in. Standard injury risks apply." };
    if (fatigue < 80) return { title: "Exhausted State", formula: "3d54 t33 (Multi-Hit)", desc: "Warning: Every success results in an individual injury." };
    return { title: "Critical State", formula: "3d54 t33 + 1 (Guaranteed)", desc: "Extremely Dangerous! Multiple heavy injuries are likely." };
  };

  const tier = getTierInfo();

  const handleStartRoll = () => {
    setStep('rolling');
    
    // Simulate dice roll delay
    setTimeout(() => {
      const { successes: sCount, results: rawResults, rolls } = performInjuryRoll(rikishi.fatigue);
      
      setDice(rolls);
      setSuccesses(sCount);
      
      const attrs: AttributeKey[] = ['power', 'balance', 'footwork', 'technique', 'spirit'];
      
      let finalizedResults: { attr: AttributeKey, severity: number }[] = [];

      if (rikishi.fatigue < 60) {
        // Tiers 1 and 2: Single attribute for all attempts
        const selectedAttr = attrs[secureRandomInt(attrs.length)];
        finalizedResults = rawResults.map(res => ({
          attr: selectedAttr,
          severity: res.severity
        }));
      } else {
        // Tiers 3 and 4: Random attribute for each attempt
        finalizedResults = rawResults.map(res => ({
          attr: attrs[secureRandomInt(attrs.length)],
          severity: res.severity
        }));
      }

      setInjuryResults(finalizedResults);
      setStep('results');

      // Create logs
      const localLogs: string[] = [];
      if (finalizedResults.length === 0) {
        localLogs.push("The rikishi narrowly avoided immediate physical damage.");
      } else {
        finalizedResults.forEach(res => {
          localLogs.push(`Sustained a Severity ${res.severity} injury to ${res.attr.toUpperCase()}.`);
        });
      }
      setLogs(localLogs);
    }, 2000);
  };

  const handleFinalize = () => {
    let updated = { ...rikishi };
    injuryResults.forEach(res => {
      updated = applyInjury(updated, res.severity, res.attr);
    });
    onComplete(updated, logs);
  };

  const attrMapping: Record<AttributeKey, string> = {
    power: 'Power',
    balance: 'Balance',
    footwork: 'Footwork',
    technique: 'Technique',
    spirit: 'Spirit'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-sumo-paper w-full max-w-lg rounded-xl overflow-hidden shadow-2xl relative border-2 border-sumo-earth/30"
      >
        {/* Header */}
        <div className="bg-red-950 p-4 border-b border-white/10 flex items-center gap-3">
          <AlertTriangle className="text-red-500 animate-pulse" />
          <div>
            <h2 className="text-white font-serif font-black tracking-tight uppercase">Medical Assessment Required</h2>
            <p className="text-red-400/80 text-[10px] font-mono leading-none mt-1">INJURY TRIGGER DETECTED DURING BOUT</p>
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
                      className={`h-full ${fatigue > 80 ? 'bg-red-600' : fatigue > 60 ? 'bg-orange-500' : 'bg-sumo-ink'}`}
                    />
                  </div>
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
                <div className="flex gap-4">
                  {[1, 2, 3].map((n) => (
                    <motion.div
                      key={n}
                      animate={{ 
                        rotate: [0, 90, 180, 270, 360],
                        scale: [1, 1.1, 1],
                      }}
                      transition={{ duration: 0.3, repeat: Infinity }}
                      className="w-16 h-16 bg-white border-2 border-red-900 rounded-lg flex items-center justify-center text-2xl font-black text-red-900 shadow-lg shadow-red-900/10"
                    >
                      ?
                    </motion.div>
                  ))}
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
                {/* Dice Display */}
                <div className="flex justify-center gap-4">
                  {dice.map((d, i) => (
                    <div key={i} className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center shadow-md border-2 transition-all ${d >= 33 ? 'bg-red-100 border-red-700 text-red-950 scale-110 z-10' : 'bg-white border-sumo-earth/20 text-sumo-ink opacity-60'}`}>
                      <span className="text-2xl font-black">{d}</span>
                      <span className="text-[8px] font-mono mt-0.5 uppercase tracking-tighter">{d >= 33 ? 'Critical' : 'Safe'}</span>
                    </div>
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
                            <AttributeIcon attr={res.attr} size={20} className="text-red-900" />
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
                     <div className="text-lg font-mono font-bold">{rikishi.totalUniqueInjuries + (injuryResults.some(r => rikishi.injuries[r.attr].severity === 0) ? 1 : 0)}</div>
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
