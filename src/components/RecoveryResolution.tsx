import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rikishi, AttributeKey } from '../types';
import { performRecoveryRoll, secureRandomInt } from '../lib/gameLogic';
import { AttributeIcon } from './AttributeIcon';
import { HeartPulse, ChevronRight, Activity, Zap } from 'lucide-react';

interface RecoveryResolutionProps {
  rikishi: Rikishi;
  onComplete: (updatedRikishi: Rikishi, logs: string[]) => void;
}

const STAT_LABELS: Record<AttributeKey, string> = {
  power: 'Power',
  balance: 'Balance',
  footwork: 'Footwork',
  technique: 'Technique',
  spirit: 'Spirit',
};

export default function RecoveryResolution({ rikishi, onComplete }: RecoveryResolutionProps) {
  const [currentInjuryIndex, setCurrentInjuryIndex] = useState(0);
  const [step, setStep] = useState<'intro' | 'rolling' | 'results' | 'summary'>('intro');
  const [recoveryDice, setRecoveryDice] = useState<number[]>([]);
  const [recoveryPoints, setRecoveryPoints] = useState(0);
  const [resultsLog, setResultsLog] = useState<string[]>([]);
  const [currentRikishi, setCurrentRikishi] = useState<Rikishi>({ ...rikishi });

  const severeInjuries = (Object.keys(rikishi.injuries) as AttributeKey[])
    .filter(attr => rikishi.injuries[attr].severity >= 2)
    .map(attr => ({ attr, label: STAT_LABELS[attr], severity: rikishi.injuries[attr].severity }));

  const mildInjuries = (Object.keys(rikishi.injuries) as AttributeKey[])
    .filter(attr => rikishi.injuries[attr].severity === 1)
    .map(attr => ({ attr, label: STAT_LABELS[attr] }));

  useEffect(() => {
    // Auto-handle mild injuries first
    if (step === 'intro' && mildInjuries.length > 0) {
      const logs: string[] = [];
      const updated = { ...currentRikishi, injuries: { ...currentRikishi.injuries } };
      mildInjuries.forEach(inj => {
        updated.injuries[inj.attr] = { ...updated.injuries[inj.attr], severity: 0 };
        logs.push(`${inj.label} (Severity 1) automatically recovered.`);
      });
      setCurrentRikishi(updated);
      setResultsLog(logs);
    }
    
    if (step === 'intro' && severeInjuries.length === 0) {
      setStep('summary');
    }
  }, [step]);

  const handleStartRoll = () => {
    if (currentInjuryIndex >= severeInjuries.length) {
      setStep('summary');
      return;
    }

    setStep('rolling');
    
    setTimeout(() => {
      const injury = severeInjuries[currentInjuryIndex];
      const { recoveryPoints: rPoints, rolls } = performRecoveryRoll();
      
      setRecoveryDice(rolls);
      setRecoveryPoints(rPoints);
      
      const updated = { ...currentRikishi, injuries: { ...currentRikishi.injuries } };
      const currentSev = updated.injuries[injury.attr].severity;
      const newSev = Math.max(0, currentSev - rPoints);
      updated.injuries[injury.attr] = { ...updated.injuries[injury.attr], severity: newSev };
      
      setCurrentRikishi(updated);
      
      const msg = rPoints === 2 
        ? `${injury.label} recovered significantly (-2 Severity).`
        : `${injury.label} recovered (-1 Severity).`;
      
      setResultsLog(prev => [...prev, msg]);
      setStep('results');
    }, 1500);
  };

  const nextInjury = () => {
    if (currentInjuryIndex + 1 < severeInjuries.length) {
      setCurrentInjuryIndex(prev => prev + 1);
      setStep('intro');
      setRecoveryDice([]);
    } else {
      setStep('summary');
    }
  };

  const handleFinalize = () => {
    onComplete(currentRikishi, resultsLog);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-sumo-paper w-full max-w-lg rounded-xl overflow-hidden shadow-2xl border-2 border-sumo-earth/30"
      >
        <div className="bg-sumo-ink p-4 border-b border-white/10 flex items-center gap-3">
          <HeartPulse className="text-sumo-green" />
          <div>
            <h2 className="text-white font-serif font-black tracking-tight uppercase">Recovery & Rehabilitation</h2>
            <p className="text-white/40 text-[10px] font-mono leading-none mt-1">POST-BASHO MEDICAL STATUS</p>
          </div>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 'intro' && severeInjuries.length > 0 && (
              <motion.div 
                key="intro"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="text-center py-4">
                  <span className="text-[10px] font-black uppercase text-sumo-ink/40 tracking-widest">Currently Assessing</span>
                  <div className="flex items-center justify-center gap-3 mt-2">
                    <AttributeIcon attr={severeInjuries[currentInjuryIndex].attr} size={32} />
                    <h3 className="text-2xl font-serif font-black italic">{severeInjuries[currentInjuryIndex].label}</h3>
                  </div>
                  <div className="mt-2 text-sm font-mono font-bold text-red-900 bg-red-50 inline-block px-3 py-1 rounded-full border border-red-100">
                    Severity {severeInjuries[currentInjuryIndex].severity}
                  </div>
                </div>

                <div className="bg-sumo-soft p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sumo-ink/60">
                    <Activity size={14} /> Recovery Protocol
                  </div>
                  <p className="text-sm opacity-70 italic">"Rolling 2d50 with a target of 33. One level of recovery is guaranteed."</p>
                </div>

                <button 
                  onClick={handleStartRoll}
                  className="w-full py-4 bg-sumo-ink text-white font-black uppercase tracking-widest text-sm rounded-lg hover:shadow-lg transition-all"
                >
                  Roll Recovery Dice
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
                  {[1, 2].map((n) => (
                    <motion.div
                      key={n}
                      animate={{ rotate: [0, 90, 180, 270, 360], scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.3, repeat: Infinity }}
                      className="w-16 h-16 bg-white border-2 border-sumo-green rounded-lg flex items-center justify-center text-2xl font-black text-sumo-green shadow-lg shadow-sumo-green/10"
                    >
                      ?
                    </motion.div>
                  ))}
                </div>
                <p className="text-sm font-mono text-sumo-green uppercase tracking-widest animate-pulse">Healing in progress...</p>
              </motion.div>
            )}

            {step === 'results' && (
              <motion.div 
                key="results"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="flex justify-center gap-4">
                  {recoveryDice.map((d, i) => (
                    <div key={i} className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center shadow-md border-2 transition-all ${d >= 33 ? 'bg-green-100 border-green-700 text-green-950 scale-110' : 'bg-white border-sumo-earth/20 text-sumo-ink opacity-60'}`}>
                      <span className="text-2xl font-black">{d}</span>
                      <span className="text-[8px] font-mono mt-0.5 uppercase tracking-tighter">{d >= 33 ? 'Success' : 'Fail'}</span>
                    </div>
                  ))}
                </div>

                <div className="text-center space-y-2">
                   <div className="text-[10px] font-black uppercase tracking-widest opacity-40">Outcome</div>
                   <div className="text-xl font-serif font-black italic">
                      Recovered {recoveryPoints} Level{recoveryPoints > 1 ? 's' : ''}
                   </div>
                   <p className="text-xs opacity-60">
                      Remaining Severity: {currentRikishi.injuries[severeInjuries[currentInjuryIndex].attr].severity}
                   </p>
                </div>

                <button 
                  onClick={nextInjury}
                  className="w-full py-4 bg-sumo-ink text-white font-black uppercase tracking-widest text-sm rounded-lg flex items-center justify-center gap-2"
                >
                  {currentInjuryIndex + 1 < severeInjuries.length ? "Next Injury" : "Finalize Assessment"} <ChevronRight size={16} />
                </button>
              </motion.div>
            )}

            {step === 'summary' && (
              <motion.div 
                key="summary"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="bg-sumo-soft p-4 rounded-xl border border-sumo-earth/10">
                  <div className="flex items-center gap-2 mb-3 text-xs font-black uppercase tracking-widest text-sumo-ink/60">
                    <Activity size={14} /> Rehabilitation Summary
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 no-scrollbar">
                    {resultsLog.length > 0 ? (
                      resultsLog.map((log, i) => (
                        <div key={i} className="flex gap-2 text-xs font-medium text-sumo-ink/80">
                          <span className="text-sumo-accent">•</span>
                          <span>{log}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs italic opacity-40 text-center py-4">No injuries requiring medical attention.</div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-sumo-earth/20 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <Zap size={18} className="text-orange-500" />
                     <span className="text-sm font-bold">Base Fatigue Floor</span>
                   </div>
                   <span className="font-mono font-bold text-lg">{currentRikishi.baseFatigue}%</span>
                </div>

                <button 
                  onClick={handleFinalize}
                  className="w-full py-4 bg-sumo-ink text-white font-black uppercase tracking-widest text-sm rounded-lg hover:shadow-xl transition-all"
                >
                  Finalize Recovery & Return
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
