import { motion } from 'motion/react';
import { Rikishi, WorldState } from '../types';
import { Trophy, ChevronRight, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { calculateRankChange, formatRank, abbreviateRank } from '../lib/rankLogic';
import { simulateBashoEnd } from '../lib/bashoSimulation';
import { DIVISIONS } from '../constants/world';

interface BashoSummaryProps {
  rikishi: Rikishi;
  worldState: WorldState | null;
  onContinue: (updatedRikishi: Rikishi, updatedWorld: WorldState) => void;
}

export default function BashoSummary({ rikishi, worldState, onContinue }: BashoSummaryProps) {
  if (!worldState) return null;

  const divisionInfo = DIVISIONS.find(d => d.name === rikishi.rank.division);
  const totalBouts = divisionInfo ? divisionInfo.bouts : 15;
  const isKachiKoshi = rikishi.wins > totalBouts / 2;
  const netWins = rikishi.wins - rikishi.losses;

  const newRank = calculateRankChange(rikishi, rikishi.wins, totalBouts);
  const rankChanged = formatRank(newRank) !== formatRank(rikishi.rank);
  const promoted = rankChanged && netWins > 0;
  const demoted = rankChanged && netWins < 0;

  const handleAdvance = () => {
    // Run global simulation
    const { updatedWorld, updatedPlayer } = simulateBashoEnd(worldState, rikishi);
    
    onContinue(updatedPlayer, updatedWorld);
  };

  return (
    <div className="h-full flex flex-col bg-sumo-outer overflow-hidden">
      <div className="px-6 pt-8 pb-4 flex flex-col items-center justify-center bg-sumo-ink text-white shadow-sm relative overflow-hidden shrink-0 z-10">
        <div className="absolute top-0 right-0 opacity-10">
          <Trophy size={80} className="transform translate-x-2 -translate-y-2" />
        </div>
        
        <h2 className="text-[9px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">Tournament Conclusion</h2>
        <h1 className="text-2xl font-serif font-black italic tracking-tighter shadow-sm mb-4">
          {isKachiKoshi ? 'KACHI-KOSHI' : 'MAKE-KOSHI'}
        </h1>

        <div className="flex gap-6 items-center">
          <div className="text-center flex items-baseline gap-2">
             <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Wins</span>
             <div className="text-4xl font-mono font-black text-sumo-green">{rikishi.wins}</div>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="text-center flex items-baseline gap-2">
             <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Losses</span>
             <div className="text-4xl font-mono font-black text-red-400">{rikishi.losses}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-8 overflow-y-auto w-full bg-sumo-paper">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-sumo-ink/40 mb-4 text-center">Banzuke Movement</h3>
        
        <div className="bg-white border-2 border-sumo-earth/20 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center">
           <div className="text-sm font-bold opacity-50 uppercase tracking-widest mb-1">Previous Rank</div>
           <div className="text-xl font-serif font-black italic text-sumo-ink mb-6">{formatRank(rikishi.rank)} <span className="opacity-50 text-sm">{abbreviateRank(rikishi.rank)}</span></div>
           
           <div className="w-12 h-12 rounded-full flex items-center justify-center mb-6 shadow-inner bg-sumo-soft border border-sumo-earth/10">
             {promoted && <ArrowUpRight size={24} className="text-sumo-green" />}
             {demoted && <ArrowDownRight size={24} className="text-red-500" />}
             {!promoted && !demoted && <Minus size={24} className="text-sumo-ink/40" />}
           </div>

           <div className="text-sm font-bold opacity-50 uppercase tracking-widest mb-1">New Rank</div>
           <div className={`text-2xl font-serif font-black italic ${promoted ? 'text-sumo-green' : demoted ? 'text-red-600' : 'text-sumo-ink'}`}>
             {formatRank(newRank)} <span className="opacity-50 text-base">{abbreviateRank(newRank)}</span>
           </div>
        </div>
      </div>

      <div className="p-6 shrink-0 bg-sumo-paper">
         <button
            onClick={handleAdvance}
            className="w-full bg-sumo-ink text-white p-6 rounded-3xl font-serif font-black italic text-xl shadow-xl active:scale-95 transition-all flex items-center justify-between border-b-4 border-sumo-earth/20"
          >
            <div className="flex flex-col items-start gap-1">
              <span className="uppercase tracking-widest text-[9px] opacity-60 font-sans not-italic font-bold">Return to Stable</span>
              <span className="tracking-tight">INTER-BASHO REST</span>
            </div>
            <div className="bg-sumo-accent p-2 rounded-full shadow-inner">
              <ChevronRight size={24} />
            </div>
          </button>
      </div>
    </div>
  );
}
