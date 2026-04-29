import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rikishi, AttributeKey, RikishiStats } from '../types';
import { performTrainingRoll, getTrainingThreshold, getStatUpgradeCost, isStatLineLegal, getSpecializationSlots } from '../lib/gameLogic';
import { DIVISIONS } from '../constants/world';
import { Zap, Heart, Trophy, ChevronRight, Check, Dice5, Coffee, Activity, Award, Edit3 } from 'lucide-react';
import RecoveryResolution from './RecoveryResolution';

interface InterBashoProps {
  rikishi: Rikishi;
  updateRikishi: (rikishi: Rikishi) => void;
  onFinish: () => void;
}

const STAT_LABELS: Record<AttributeKey, string> = {
  power: 'Power',
  balance: 'Balance',
  footwork: 'Footwork',
  technique: 'Technique',
  spirit: 'Spirit',
};

// Mock data for Specs until document arrives
const MOCK_KIMARITE = [
  { id: 'uwatenage', name: 'Uwatenage', stance: 'Yotsu', primary: 'power', secondary: 'technique' },
  { id: 'yorikiri', name: 'Yorikiri', stance: 'Yotsu', primary: 'balance', secondary: 'power' },
  { id: 'oshidashi', name: 'Oshidashi', stance: 'Oshi', primary: 'power', secondary: 'footwork' },
  { id: 'kotenage', name: 'Kotenage', stance: 'Nagete', primary: 'technique', secondary: 'power' },
];

export default function InterBasho({ rikishi, updateRikishi, onFinish }: InterBashoProps) {
  const [phase, setPhase] = useState<'recovery' | 'recovery_resolution' | 'roll' | 'roll_result' | 'spend' | 'momentum' | 'specialization' | 'rename'>('recovery');
  const [localRikishi, setLocalRikishi] = useState<Rikishi>({ ...rikishi });
  const [spendSnapshot, setSpendSnapshot] = useState<Rikishi | null>(null);
  const [newName, setNewName] = useState(rikishi.name);
  const [rollResult, setRollResult] = useState<{ tp: number, rolls: number[] } | null>(null);
  const [recoveryLog, setRecoveryLog] = useState<string[]>([]);

  const maxSpecSlots = getSpecializationSlots(localRikishi.rank);
  const currentSpecCount = localRikishi.specializations.length;
  const hasNewSpecSlot = currentSpecCount < maxSpecSlots;

  const showRename = 
    (localRikishi.rank.title === 'Ozeki' || localRikishi.rank.title === 'Yokozuna') 
    && !localRikishi.hasRenamedAtCurrentRank;

  // Determine phases to skip
  const canSkipMomentum = localRikishi.momentum.value === 0;

  // Auto-roll if it's the 20th+ basho or if we want to skip the animation for high levels
  useEffect(() => {
    if (rikishi.bashosCompleted >= 20 && phase === 'roll') {
      const lastRecord = rikishi.careerHistory?.[rikishi.careerHistory.length - 1];
      const divInfo = DIVISIONS.find(d => d.name === rikishi.rank.division);
      const boutsScheduled = divInfo ? divInfo.bouts : 15;
      const isKyujoEarly = (rikishi.boutsFoughtThisBasho !== undefined) && (rikishi.boutsFoughtThisBasho < boutsScheduled / 2);
      
      const result = performTrainingRoll(rikishi.bashosCompleted, lastRecord, isKyujoEarly);
      setRollResult(result);
      setLocalRikishi(prev => ({ ...prev, tpAvailable: prev.tpAvailable + result.tp }));
      setPhase('roll_result');
    }
  }, [rikishi.bashosCompleted, phase]);

  const handleStartRecovery = () => {
    setPhase('recovery_resolution');
  };

  const handleRecoveryComplete = (updated: Rikishi, logs: string[]) => {
    setRecoveryLog(logs);
    setLocalRikishi(prev => ({
      ...updated,
      bashosCompleted: prev.bashosCompleted // Ensure we keep original bashos completed until roll
    }));
    setPhase('roll');
  };

  const handleRoll = () => {
    const lastRecord = rikishi.careerHistory?.[rikishi.careerHistory.length - 1];
    const divInfo = DIVISIONS.find(d => d.name === rikishi.rank.division);
    const boutsScheduled = divInfo ? divInfo.bouts : 15;
    const isKyujoEarly = (rikishi.boutsFoughtThisBasho !== undefined) && (rikishi.boutsFoughtThisBasho < boutsScheduled / 2);
    
    const result = performTrainingRoll(rikishi.bashosCompleted, lastRecord, isKyujoEarly);
    setRollResult(result);
    setLocalRikishi(prev => ({ 
      ...prev, 
      tpAvailable: prev.tpAvailable + result.tp,
      bashosCompleted: prev.bashosCompleted + 1 
    }));
    
    setPhase('roll_result');
  };

  const handleRest = () => {
    if (localRikishi.tpAvailable < 1) return;
    
    setLocalRikishi(prev => {
      const recovery = 40; // 40% Fatigue recovered
      // Fatigue cannot go below the baseFatigue floor
      const newFatigue = Math.max(prev.baseFatigue, prev.fatigue - recovery);
      return {
        ...prev,
        tpAvailable: prev.tpAvailable - 1,
        fatigue: newFatigue,
        energy: 100 - newFatigue 
      };
    });
  };

  const handleAssignTP = (attr: AttributeKey) => {
    if (localRikishi.tpAvailable < 1) return;

    setLocalRikishi(prev => {
      const cost = getStatUpgradeCost(prev.totalTpSpent[attr]);
      const currentAssigned = prev.tpAssigned[attr] + 1;
      
      let newStats = { ...prev.stats };
      let newTpAssigned = { ...prev.tpAssigned };
      let newTotalTpSpent = { ...prev.totalTpSpent };

      if (currentAssigned >= cost) {
        // Level up stat
        newStats[attr] += 1;
        newTpAssigned[attr] = 0;
        newTotalTpSpent[attr] += cost;
      } else {
        newTpAssigned[attr] = currentAssigned;
      }

      return {
        ...prev,
        tpAvailable: prev.tpAvailable - 1,
        stats: newStats,
        tpAssigned: newTpAssigned,
        totalTpSpent: newTotalTpSpent
      };
    });
  };

  const handleResetTP = () => {
    if (spendSnapshot) {
      setLocalRikishi({ ...spendSnapshot });
    }
  };

  const handleMomentumChoice = (attr: AttributeKey) => {
    setLocalRikishi(prev => ({
      ...prev,
      momentum: {
        ...prev.momentum,
        attribute: attr
      }
    }));
  };

  const handleSpecSelect = (kimarite: typeof MOCK_KIMARITE[0]) => {
    setLocalRikishi(prev => ({
      ...prev,
      specializations: [
        ...prev.specializations,
        {
          kimariteId: kimarite.id,
          stanceId: kimarite.stance,
          primaryAttr: kimarite.primary as AttributeKey,
          secondaryAttr: kimarite.secondary as AttributeKey
        }
      ]
    }));
  };

  const handleRenameSubmit = () => {
    if (!newName.trim()) return;
    setLocalRikishi(prev => ({
      ...prev,
      name: newName,
      hasRenamedAtCurrentRank: true
    }));
    
    if (phase === 'rename') {
      setPhase('momentum');
    }
  };

  const isComplete = localRikishi.tpAvailable === 0 && isStatLineLegal(localRikishi.stats);

  const handleFinalize = () => {
    let finalRikishi = { ...localRikishi };
    
    // Check for Base Fatigue threshold
    if (finalRikishi.baseFatigue >= 15) {
      finalRikishi.bashoProgressPenalty += 4; // Penalty of 4 bashos worth of progress
      finalRikishi.baseFatigue = 5; // Reset to 5
    }

    updateRikishi(finalRikishi);
    onFinish();
  };

  return (
    <div className="h-full flex flex-col bg-sumo-paper overflow-hidden">
      <div className="px-6 pt-10 pb-4 border-b border-sumo-earth/20">
        <h2 className="text-2xl font-serif font-black italic text-sumo-ink uppercase tracking-tighter">
          {phase === 'recovery' && "Stable Rest & Recovery"}
          {phase === 'roll' && "Post-Basho Training"}
          {phase === 'spend' && "Allocate Training"}
          {phase === 'specialization' && "Kimarite Specialization"}
          {phase === 'rename' && "Promotion Honor"}
          {phase === 'momentum' && "Choose Momentum"}
        </h2>
        {phase === 'spend' && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-sumo-accent">TP Available:</span>
            <div className="bg-sumo-accent text-white px-2 py-0.5 rounded text-xs font-mono font-bold tracking-tighter">
              {localRikishi.tpAvailable}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 no-scrollbar py-6">
        <AnimatePresence mode="wait">
          {phase === 'recovery' && (
            <motion.div
              key="recovery"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center text-center"
            >
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-sumo-earth mb-8">
                <Activity size={64} className="text-sumo-green" />
              </div>
              <h3 className="text-lg font-bold mb-4">Healing & Maintenance</h3>
              
              {recoveryLog.length > 0 ? (
                <div className="w-full space-y-2 bg-sumo-soft p-4 rounded-2xl border border-sumo-earth/10">
                  {recoveryLog.map((log, i) => (
                    <p key={i} className="text-[10px] font-medium opacity-60 text-left">• {log}</p>
                  ))}
                </div>
              ) : (
                <p className="text-xs opacity-60 max-w-[200px] mb-8">Let your rikishi recuperate from the grueling tourney schedule.</p>
              )}

              {recoveryLog.length === 0 && (
                <button
                  onClick={handleStartRecovery}
                  className="mt-8 bg-sumo-ink text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-[0.3em] text-sm shadow-xl active:scale-95 transition-all"
                >
                  Start Recovery
                </button>
              )}
            </motion.div>
          )}

          {phase === 'recovery_resolution' && (
            <RecoveryResolution 
               rikishi={localRikishi} 
               onComplete={handleRecoveryComplete} 
            />
          )}

          {phase === 'roll' && (
            <motion.div
              key="roll"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="h-full flex flex-col items-center justify-center text-center"
            >
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-sumo-earth mb-8">
                <Dice5 size={64} className="text-sumo-accent" />
              </div>
              <h3 className="text-lg font-bold mb-2">Preparation for the Next Tourney</h3>
              <p className="text-xs opacity-60 max-w-[200px] mb-8">Roll to determine how much progress your rikishi has made since the last basho.</p>
              
              <button
                onClick={handleRoll}
                className="bg-sumo-ink text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-[0.3em] text-sm shadow-xl active:scale-95 transition-all"
              >
                Perform Training Roll
              </button>
            </motion.div>
          )}

          {phase === 'roll_result' && rollResult && (
            <motion.div
              key="roll_result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="h-full flex flex-col items-center justify-center text-center"
            >
              <h3 className="text-sm font-bold uppercase tracking-widest opacity-50 mb-6">Outcome</h3>
              
              <div className="flex gap-2 mb-8 items-center justify-center">
                {rollResult.rolls.map((val, idx) => {
                  const threshold = getTrainingThreshold(localRikishi.bashosCompleted);
                  const isSuccess = val >= threshold;
                  return (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1, backgroundColor: isSuccess ? "#22c55e" : "#ef4444" }}
                      transition={{ delay: idx * 0.2 }}
                      className="w-12 h-12 text-white rounded-xl shadow-lg flex items-center justify-center text-xl font-mono font-bold"
                    >
                      {val}
                    </motion.div>
                  );
                })}
              </div>

              <div className="mb-12">
                 <span className="text-[10px] font-black uppercase text-sumo-accent tracking-widest">Total TP Granted</span>
                 <p className="text-6xl font-serif italic text-sumo-ink font-black">
                   +{rollResult.tp}
                 </p>
              </div>

              <button
                onClick={() => {
                  setSpendSnapshot({ ...localRikishi });
                  setPhase('spend');
                }}
                className="bg-sumo-green text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-[0.3em] text-sm shadow-xl active:scale-95 transition-all flex items-center gap-2"
              >
                Continue <ChevronRight size={16} />
              </button>
            </motion.div>
          )}

          {phase === 'spend' && (
            <motion.div
              key="spend"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Fatigue / Rest Section */}
              <div className="bg-white border border-sumo-beige rounded-3xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <Coffee size={14} className="text-sumo-green" />
                    <h3 className="text-xs font-bold uppercase tracking-widest opacity-60">Physical Rest</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold font-mono text-sumo-green">{localRikishi.fatigue}% Fatigue</div>
                    <div className="text-[8px] font-black uppercase tracking-widest opacity-30">Floor: {localRikishi.baseFatigue}%</div>
                  </div>
                </div>
                <button
                  onClick={handleRest}
                  disabled={localRikishi.tpAvailable < 1 || localRikishi.fatigue <= localRikishi.baseFatigue}
                  className="w-full bg-sumo-soft hover:bg-sumo-beige p-3 rounded-xl flex justify-between items-center transition-colors disabled:opacity-30"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    {localRikishi.fatigue <= localRikishi.baseFatigue ? "Maximum Recovery Reached" : "Rest for 40% Recovery"}
                  </span>
                  <span className="text-[10px] font-black text-sumo-accent">-1 TP</span>
                </button>
              </div>

              {/* Attributes Section */}
              <div className="space-y-4 pb-12">
                <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40 px-1">Attribute Training</h3>
                <div className="space-y-3">
                  {(Object.keys(STAT_LABELS) as AttributeKey[]).map(attr => {
                    const cost = getStatUpgradeCost(localRikishi.totalTpSpent[attr]);
                    const progress = localRikishi.tpAssigned[attr];
                    const val = localRikishi.stats[attr];
                    
                    return (
                      <div key={attr} className="bg-white border border-sumo-beige rounded-2xl p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{STAT_LABELS[attr]}</span>
                            <span className="text-[10px] opacity-40 uppercase font-bold tracking-tighter">Current: {val}</span>
                          </div>
                          <button
                            onClick={() => handleAssignTP(attr)}
                            disabled={localRikishi.tpAvailable < 1}
                            className="bg-sumo-soft px-3 py-1.5 rounded-lg text-[10px] font-black text-sumo-accent uppercase tracking-widest active:scale-95 disabled:opacity-30 flex items-center gap-1"
                          >
                            Add TP <span className="opacity-40">(1)</span>
                          </button>
                        </div>
                        
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest opacity-40">
                            <span>Progress to Level up</span>
                            <span>{progress} / {cost}</span>
                          </div>
                          <div className="h-1.5 bg-sumo-paper rounded-full overflow-hidden border border-sumo-beige/50">
                            <motion.div 
                              initial={false}
                              animate={{ width: `${(progress / cost) * 100}%` }}
                              className="h-full bg-sumo-accent"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {!isStatLineLegal(localRikishi.stats) && (
                <div className="p-3 bg-red-50 text-red-700 text-[10px] font-bold rounded-xl border border-red-200">
                  INVALID STAT LINE: Your attributes are too imbalanced. Use TP to fix the distribution.
                </div>
              )}
              
              {spendSnapshot && (localRikishi.tpAvailable < spendSnapshot.tpAvailable) && (
                <button
                  onClick={handleResetTP}
                  className="w-full mt-2 bg-sumo-earth/10 text-sumo-ink p-3 rounded-xl font-bold uppercase tracking-widest text-[10px] active:scale-95 transition-all"
                >
                  Reset Allocations
                </button>
              )}
            </motion.div>
          )}

          {phase === 'momentum' && (
            <motion.div
              key="momentum"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <p className="text-xs text-sumo-ink/60 italic leading-relaxed mb-6">
                Your performance in the last Basho has earned you Momentum. Choose one attribute to bolster for the upcoming tournament.
              </p>
              
              <div className="grid grid-cols-1 gap-3">
                {(Object.keys(STAT_LABELS) as AttributeKey[]).map(attr => (
                  <button
                    key={attr}
                    onClick={() => handleMomentumChoice(attr)}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex justify-between items-center ${localRikishi.momentum.attribute === attr ? 'border-sumo-accent bg-white shadow-md' : 'border-sumo-beige bg-sumo-soft opacity-60'}`}
                  >
                    <div>
                      <span className="font-black text-sm uppercase tracking-tight">{STAT_LABELS[attr]} Focus</span>
                      <p className="text-[10px] opacity-40 italic">Add +{localRikishi.momentum.value} for this Basho</p>
                    </div>
                    {localRikishi.momentum.attribute === attr && <div className="bg-sumo-accent p-1 rounded-full text-white"><Check size={14} /></div>}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {phase === 'specialization' && (
            <motion.div
              key="specialization"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="bg-sumo-accent/5 p-4 rounded-2xl border border-sumo-accent/10 mb-4">
                <p className="text-[10px] font-bold text-sumo-accent uppercase tracking-widest mb-1">Promotion Reward</p>
                <p className="text-xs italic opacity-60">You have earned a Kimarite Specialization. Choose a signature move to master.</p>
              </div>

              <div className="space-y-3">
                {MOCK_KIMARITE.map(k => {
                  const isStanceUsed = localRikishi.specializations.some(s => s.stanceId === k.stance);
                  const meetsAttr = localRikishi.stats[k.primary as AttributeKey] >= 8 && localRikishi.stats[k.secondary as AttributeKey] >= 5;
                  const isSelected = localRikishi.specializations.some(s => s.kimariteId === k.id);

                  return (
                    <button
                      key={k.id}
                      disabled={isStanceUsed || !meetsAttr || isSelected}
                      onClick={() => handleSpecSelect(k)}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex justify-between items-center ${isSelected ? 'border-sumo-accent bg-white' : 'border-sumo-beige bg-white shadow-sm disabled:opacity-30'}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-black text-sm uppercase tracking-tight">{k.name}</span>
                          <span className="text-[8px] bg-sumo-soft px-1.5 py-0.5 rounded opacity-50">{k.stance} Stance</span>
                        </div>
                        <div className="flex gap-2">
                          <span className={`text-[9px] font-bold ${localRikishi.stats[k.primary as AttributeKey] >= 8 ? 'text-sumo-green' : 'text-red-500'}`}>
                            {STAT_LABELS[k.primary as AttributeKey]} 8+
                          </span>
                          <span className={`text-[9px] font-bold ${localRikishi.stats[k.secondary as AttributeKey] >= 5 ? 'text-sumo-green' : 'text-red-500'}`}>
                            {STAT_LABELS[k.secondary as AttributeKey]} 5+
                          </span>
                        </div>
                      </div>
                      {isSelected && <Check className="text-sumo-accent" size={20} />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {phase === 'rename' && (
            <motion.div
              key="rename"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8 flex flex-col items-center justify-center text-center py-12"
            >
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl border-4 border-sumo-accent mb-6">
                <Award size={48} className="text-sumo-accent" />
              </div>
              <div>
                <h3 className="text-xl font-serif font-black italic mb-2 tracking-tight">Ascension to {typeof localRikishi.rank.title === 'string' ? localRikishi.rank.title : localRikishi.rank.division}</h3>
                <p className="text-xs opacity-60 max-w-[250px]">
                  Traditional honors allow you to adopt a new Shikona (Wrestling Name) upon your first promotion to this esteemed rank.
                </p>
              </div>

              <div className="w-full max-w-xs space-y-4">
                <div className="bg-white p-6 rounded-3xl shadow-sm border-2 border-sumo-beige">
                  <span className="block text-[8px] font-black uppercase tracking-[0.2em] opacity-30 mb-2">New Shikona</span>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full text-2xl font-serif font-black italic text-center text-sumo-accent focus:outline-none placeholder:opacity-20"
                    placeholder="Enter Name..."
                  />
                </div>
                <button
                  onClick={handleRenameSubmit}
                  className="w-full bg-sumo-ink text-white py-4 rounded-2xl font-bold uppercase tracking-[0.3em] text-xs shadow-xl active:scale-95 transition-all"
                >
                  Adopt Sacred Name
                </button>
                <button
                  onClick={() => setPhase('momentum')}
                  className="text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100"
                >
                  Keep Current Name
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-6 bg-sumo-soft/80 backdrop-blur-md border-t border-sumo-earth flex gap-3 pb-8">
        {phase === 'spend' && (
          <button 
            disabled={localRikishi.tpAvailable > 0 || !isStatLineLegal(localRikishi.stats)}
            onClick={() => {
              if (hasNewSpecSlot) setPhase('specialization');
              else if (showRename) setPhase('rename');
              else if (canSkipMomentum) handleFinalize();
              else setPhase('momentum');
            }}
            className="w-full bg-sumo-ink text-white p-4 rounded-2xl font-bold uppercase tracking-[0.2em] text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
          >
            Continue to Prep <ChevronRight size={16} />
          </button>
        )}
        {phase === 'specialization' && (
          <button 
            onClick={() => {
              if (showRename) setPhase('rename');
              else if (canSkipMomentum) handleFinalize();
              else setPhase('momentum');
            }}
            className="w-full bg-sumo-ink text-white p-4 rounded-2xl font-bold uppercase tracking-[0.2em] text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            Skip Specialization <ChevronRight size={16} />
          </button>
        )}
        {phase === 'momentum' && (
          <button 
            disabled={!localRikishi.momentum.attribute}
            onClick={handleFinalize}
            className="w-full bg-sumo-accent text-white p-4 rounded-2xl font-bold uppercase tracking-[0.3em] text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
          >
            Finalize Preparation <Check size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
