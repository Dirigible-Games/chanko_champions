import { motion } from 'motion/react';
import { Rikishi } from '../types';
import { ChevronRight, Calendar, Trophy, Zap, Dumbbell, Activity, Target, ShieldAlert, Flag } from 'lucide-react';
import { getEffectiveBaseDie, getBaseInjuryThreshold, getFatigueThresholdReduction, getEffectiveStats } from '../lib/gameLogic';
import { AttributeIcon } from './AttributeIcon';
import type { AttributeKey } from '../types';
import { DIVISIONS } from '../constants/world';

interface DashboardProps {
  rikishi: Rikishi;
  onAction?: (action: string) => void;
}

export default function Dashboard({ rikishi, onAction }: DashboardProps) {
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
              { label: 'power' as AttributeKey, val: effectiveStats.power, base: rikishi.stats.power },
              { label: 'balance' as AttributeKey, val: effectiveStats.balance, base: rikishi.stats.balance },
              { label: 'footwork' as AttributeKey, val: effectiveStats.footwork, base: rikishi.stats.footwork},
              { label: 'technique' as AttributeKey, val: effectiveStats.technique, base: rikishi.stats.technique },
              { label: 'spirit' as AttributeKey, val: effectiveStats.spirit, base: rikishi.stats.spirit }
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center">
                <AttributeIcon attr={s.label} size={12} className="mb-0.5 opacity-60" />
                <span className={`text-xs font-black font-mono ${s.val > s.base ? 'text-sumo-green' : s.val < s.base ? 'text-red-500' : ''}`}>
                  {s.val}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Negatives Banner - Compacted */}
        {(Object.values(rikishi.injuries).some(i => i.severity > 0) || Object.values(rikishi.permanentPenalties).some(p => p > 0)) && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-2">
            <p className="text-[8px] font-bold text-red-700 uppercase tracking-widest flex items-center gap-1.5"><ShieldAlert size={10} /> Active Status Negatives</p>
          </div>
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
          <button 
            onClick={() => onAction?.('leaderboard')}
            className="w-full bg-sumo-earth/10 text-sumo-ink p-2 rounded-xl font-bold uppercase tracking-widest text-[10px] active:scale-95 transition-all text-center"
          >
            Check Division Leaderboard
          </button>
          
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
    </div>
  );
}
