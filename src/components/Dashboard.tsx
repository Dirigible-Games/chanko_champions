import { useState } from 'react';
import { motion } from 'motion/react';
import { Rikishi } from '../types';
import { ChevronRight, Calendar, Trophy, Zap, Dumbbell, Activity, Target, ShieldAlert, Flag } from 'lucide-react';
import { getEffectiveBaseDie, getBaseInjuryThreshold, getFatigueThresholdReduction, getEffectiveStats } from '../lib/gameLogic';
import { AttributeIcon } from './AttributeIcon';
import type { AttributeKey, WorldState } from '../types';
import { DIVISIONS } from '../constants/world';

interface DashboardProps {
  rikishi: Rikishi;
  worldState?: WorldState | null;
  onAction?: (action: string) => void;
}

export default function Dashboard({ rikishi, onAction }: DashboardProps) {
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const baseDie = getEffectiveBaseDie(rikishi);
  const injuryThreshold = getBaseInjuryThreshold(rikishi.bashosCompleted) - getFatigueThresholdReduction(rikishi.fatigue);
  const effectiveStats = getEffectiveStats(rikishi);
  
  const divisionInfo = DIVISIONS.find(d => d.name === rikishi.rank.division);
  const totalBouts = divisionInfo ? divisionInfo.bouts : 15;
  const boutsPlayed = rikishi.wins + rikishi.losses;
  const isBashoComplete = boutsPlayed >= totalBouts;

  return (
    <div className="h-full flex flex-col pb-4">
      {/* Primary Status Bars - Compacted */}
      <div className="px-4 py-3 flex justify-around border-b border-sumo-earth bg-sumo-paper">
        <div className="text-center">
          <div className="text-[9px] uppercase font-bold opacity-30 mb-0.5 leading-none">Fatigue</div>
          <div className="w-16 h-1 bg-sumo-beige rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-red-500" style={{ width: `${rikishi.fatigue}%` }} />
          </div>
          <div className="text-[9px] font-bold mt-0.5 text-sumo-ink">{rikishi.fatigue}%</div>
        </div>
        <div className="text-center border-l border-sumo-earth/30 pl-4">
          <div className="text-[9px] uppercase font-bold opacity-30 mb-0.5 leading-none">Focus</div>
          <div className="w-16 h-1 bg-sumo-beige rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-blue-500" style={{ width: `${(rikishi.focusPoints / 40) * 100}%` }} />
          </div>
          <div className="text-[9px] font-bold mt-0.5 text-sumo-ink">{rikishi.focusPoints} / 40</div>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3 flex-1 overflow-hidden flex flex-col">
        {/* Core Mechanics Banner - Compacted */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-sumo-soft border border-sumo-earth/10 rounded-xl p-2 flex flex-col items-center justify-center text-center">
            <span className="text-[7px] font-black uppercase tracking-widest opacity-40 leading-none">Base Die</span>
            <div className="text-lg font-serif font-black italic text-sumo-accent">5d{baseDie}</div>
          </div>
          <div className="bg-sumo-soft border border-sumo-earth/10 rounded-xl p-2 flex flex-col items-center justify-center text-center">
            <span className="text-[7px] font-black uppercase tracking-widest opacity-40 leading-none">Injury Thresh</span>
            <div className="text-lg font-serif font-black italic text-sumo-ink">{injuryThreshold}</div>
          </div>
        </div>

        {/* Stats Grid - Compacted */}
        <div className="bg-white border border-sumo-beige rounded-xl p-3 shadow-sm">
          <h3 className="text-[7px] font-black uppercase tracking-[0.2em] opacity-30 mb-2 text-center">Attributes</h3>
          <div className="grid grid-cols-5 gap-0.5">
            {[
              { label: 'power' as AttributeKey, val: effectiveStats.power, base: rikishi.stats.power, penalty: rikishi.permanentPenalties.power + rikishi.injuries.power.severity },
              { label: 'balance' as AttributeKey, val: effectiveStats.balance, base: rikishi.stats.balance, penalty: rikishi.permanentPenalties.balance + rikishi.injuries.balance.severity },
              { label: 'footwork' as AttributeKey, val: effectiveStats.footwork, base: rikishi.stats.footwork, penalty: rikishi.permanentPenalties.footwork + rikishi.injuries.footwork.severity },
              { label: 'technique' as AttributeKey, val: effectiveStats.technique, base: rikishi.stats.technique, penalty: rikishi.permanentPenalties.technique + rikishi.injuries.technique.severity },
              { label: 'spirit' as AttributeKey, val: effectiveStats.spirit, base: rikishi.stats.spirit, penalty: rikishi.permanentPenalties.spirit + rikishi.injuries.spirit.severity }
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center relative">
                <AttributeIcon attr={s.label} size={12} className="mb-0.5 opacity-60" />
                <span className={`text-xs font-black font-mono ${s.val > s.base ? 'text-sumo-green' : s.val < s.base ? 'text-red-500' : ''}`}>
                  {s.val}
                </span>
                {s.penalty > 0 && (
                  <span className="absolute -top-1 -right-0.5 text-[6px] font-black text-white bg-red-600 px-0.5 rounded-sm scale-75">
                    -{s.penalty}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Momentum Banner - Compacted */}
        {rikishi.momentum.attribute && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-2 flex items-center justify-center gap-1.5 shadow-sm">
            <Zap size={14} className="fill-orange-500 text-orange-500" />
            <p className="text-[10px] font-bold text-orange-700 uppercase tracking-widest leading-none mt-0.5">
              Momentum: +{rikishi.momentum.value} {rikishi.momentum.attribute}
            </p>
          </div>
        )}

        {/* Status Negatives Banner - Compacted */}
        {(Object.values(rikishi.injuries).some(i => i.severity > 0) || Object.values(rikishi.permanentPenalties).some(p => p > 0)) && (
          <button 
            onClick={() => onAction?.('health')}
            className="w-full text-left bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl p-2 transition-colors active:scale-[0.98]"
          >
            <p className="text-[8px] font-bold text-red-700 uppercase tracking-widest flex items-center justify-between">
              <span className="flex items-center gap-1.5"><ShieldAlert size={10} /> Active Status Negatives</span>
              <span className="opacity-40">Tap for Details</span>
            </p>
          </button>
        )}

        {/* Specializations - Compacted */}
        {rikishi.specializations.length > 0 && (
          <div className="bg-sumo-accent/5 border border-sumo-accent/10 rounded-xl p-2">
            <h3 className="text-[7px] font-black uppercase tracking-[0.2em] opacity-30 mb-1 text-center">Specialized Moves</h3>
            <div className="flex flex-wrap gap-1 justify-center">
              {rikishi.specializations.map((spec, idx) => (
                <div key={idx} className="bg-white px-2 py-0.5 rounded border border-sumo-accent/20 text-[9px] font-bold uppercase tracking-tight shadow-sm">
                  {spec.kimariteId}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Primary Action - Compacted */}
        <div className="mt-auto space-y-2">
          <div className="flex gap-2">
            <button 
              onClick={() => onAction?.('torikumi')}
              className="flex-1 bg-sumo-earth/10 text-sumo-ink p-2 rounded-xl font-bold uppercase tracking-widest text-[10px] active:scale-95 transition-all text-center"
            >
              Torikumi
            </button>
            <button 
              onClick={() => onAction?.('leaderboard')}
              className="flex-1 bg-sumo-earth/10 text-sumo-ink p-2 rounded-xl font-bold uppercase tracking-widest text-[10px] active:scale-95 transition-all text-center"
            >
              Leaderboard
            </button>
            {!isBashoComplete && (
              <button 
                onClick={() => setShowWithdrawConfirm(true)}
                className="flex-1 bg-sumo-accent/10 text-sumo-accent p-2 rounded-xl font-bold uppercase tracking-widest text-[10px] active:scale-95 transition-all text-center border border-sumo-accent/20"
              >
                Withdraw
              </button>
            )}
          </div>
          
          <div className="text-center flex justify-between items-center bg-sumo-earth/5 px-3 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-widest text-sumo-ink/60">
            <span>Bouts</span>
            <span>{boutsPlayed} / {totalBouts}</span>
          </div>
          
          {!isBashoComplete ? (
            <button 
              onClick={() => onAction?.('fight')}
              className="w-full bg-sumo-ink text-white p-4 rounded-2xl font-serif font-black italic text-lg shadow-xl active:scale-95 transition-all flex items-center justify-between"
            >
              <span className="tracking-tight text-sm">ENTER THE DOHYO</span>
              <div className="bg-sumo-accent p-1.5 rounded-full shadow-inner">
                <ChevronRight size={18} />
              </div>
            </button>
          ) : (
            <button 
              onClick={() => onAction?.('end-basho')}
              className="w-full bg-sumo-green text-white p-4 rounded-2xl font-serif font-black italic text-lg shadow-xl active:scale-95 transition-all flex items-center justify-between"
            >
              <span className="tracking-tight text-sm text-shadow-sm">END TOURNAMENT</span>
              <div className="bg-white/20 p-1.5 rounded-full shadow-inner">
                <Flag size={18} />
              </div>
            </button>
          )}
        </div>
      </div>

      {showWithdrawConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-sumo-paper w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl relative border-2 border-sumo-earth/20"
          >
            <div className="p-8 pb-6">
              <div className="bg-sumo-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                 <ShieldAlert className="text-sumo-accent" size={32} />
              </div>
              
              <h2 className="text-2xl font-serif font-bold text-center text-sumo-ink mb-2">Withdraw?</h2>
              
              <p className="text-sumo-ink/70 text-sm text-center leading-relaxed">
                Are you sure you want to withdraw from the rest of the basho? You will forfeit all remaining bouts and take a loss for each one.
              </p>
            </div>

            <div className="grid grid-cols-2 divide-x divide-sumo-earth/20 border-t border-sumo-earth/20">
              <button 
                onClick={() => setShowWithdrawConfirm(false)}
                className="py-4 text-sm font-bold text-sumo-ink/60 uppercase tracking-widest hover:bg-sumo-ink/5 transition-colors active:bg-sumo-ink/10"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowWithdrawConfirm(false);
                  onAction?.('kyujo');
                }}
                className="py-4 text-sm font-bold text-sumo-accent uppercase tracking-widest hover:bg-sumo-accent/5 transition-colors active:bg-sumo-accent/10"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
