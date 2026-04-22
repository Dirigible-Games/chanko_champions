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
      <div className="px-6 pt-10 pb-8 flex flex-col items-center justify-center bg-sumo-ink text-white shadow-lg relative overflow-hidden shrink-0 z-10">
        <div className="absolute top-0 right-0 opacity-10">
          <Trophy size={100} className="transform translate-x-4 -translate-y-4" />
        </div>
        
        <motion.h2 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] font-black uppercase tracking-[0.4em] text-sumo-accent mb-2"
        >
          Basho Conclusion
        </motion.h2>
        
        <motion.h1 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-4xl font-serif font-black italic tracking-tight mb-8"
        >
          {isKachiKoshi ? 'KACHI-KOSHI' : 'MAKE-KOSHI'}
        </motion.h1>

        <div className="flex gap-8 items-center bg-white/5 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
          <div className="text-center">
             <span className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-1">Wins</span>
             <div className="text-4xl font-mono font-black text-sumo-green">{rikishi.wins}</div>
          </div>
          <div className="w-px h-10 bg-white/20" />
          <div className="text-center">
             <span className="text-[10px] uppercase font-bold tracking-widest opacity-40 block mb-1">Losses</span>
             <div className="text-4xl font-mono font-black text-red-400">{rikishi.losses}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-10 overflow-y-auto w-full bg-sumo-paper japanese-pattern-bg">
        <div className="max-w-xs mx-auto space-y-8">
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-sumo-ink/40 mb-6 text-center">Banzuke Performance</h3>
            
            <div className="bg-white border-2 border-sumo-earth/10 rounded-3xl p-8 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-sumo-earth/10" />
               
               <div className="space-y-1 mb-8">
                 <div className="text-[10px] font-black opacity-30 uppercase tracking-widest">Entry Rank</div>
                 <div className="text-xl font-serif font-black italic text-sumo-ink/60">{formatRank(rikishi.rank)} <span className="opacity-40 text-sm font-sans not-italic font-bold ml-1">{abbreviateRank(rikishi.rank)}</span></div>
               </div>
               
               <motion.div 
                 initial={{ scale: 0 }}
                 animate={{ scale: 1 }}
                 transition={{ type: "spring", bounce: 0.5, delay: 0.3 }}
                 className={`w-16 h-16 rounded-full flex items-center justify-center mb-8 shadow-lg border-2 ${
                   promoted ? 'bg-sumo-green/10 border-sumo-green/20' : 
                   demoted ? 'bg-red-50 border-red-100' : 
                   'bg-sumo-beige/10 border-sumo-earth/10'
                 }`}
               >
                 {promoted && <ArrowUpRight size={32} className="text-sumo-green" />}
                 {demoted && <ArrowDownRight size={32} className="text-red-500" />}
                 {!promoted && !demoted && <Minus size={32} className="text-sumo-ink/40" />}
               </motion.div>

               <div className="space-y-1">
                 <div className="text-[10px] font-black text-sumo-accent uppercase tracking-widest">Current Banzuke</div>
                 <div className={`text-3xl font-serif font-black italic transition-colors ${promoted ? 'text-sumo-green' : demoted ? 'text-red-600' : 'text-sumo-ink'}`}>
                   {formatRank(newRank)} <span className="opacity-40 text-lg font-sans not-italic font-bold ml-1">{abbreviateRank(newRank)}</span>
                 </div>
               </div>
            </div>
          </section>

          {/* Additional Stats can be added here if needed */}
        </div>
      </div>

      <div className="p-6 pb-10 bg-sumo-paper border-t border-sumo-earth/5">
         <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAdvance}
            className="w-full bg-[#1A1A1A] text-white p-6 rounded-3xl font-serif font-black italic text-xl shadow-xl transition-all flex items-center justify-between border-b-4 border-black"
          >
            <div className="flex flex-col items-start gap-1">
              <span className="uppercase tracking-[0.2em] text-[9px] opacity-40 font-sans not-italic font-bold">Return to Stable</span>
              <span className="tracking-tight text-white/90">INTER-BASHO REST</span>
            </div>
            <div className="bg-sumo-accent p-2 rounded-full shadow-inner text-sumo-ink">
              <ChevronRight size={24} />
            </div>
          </motion.button>
      </div>
    </div>
  );
}
