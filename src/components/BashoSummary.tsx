import { motion } from 'motion/react';
import { Rikishi, WorldState, RankInfo } from '../types';
import { Trophy, ChevronRight, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { calculateRankChange, formatRank, abbreviateRank } from '../lib/rankLogic';
import { simulateBashoEnd } from '../lib/bashoSimulation';
import { DIVISIONS } from '../constants/world';

interface BashoSummaryProps {
  rikishi: Rikishi;
  oldRank: RankInfo;
  worldState: WorldState | null;
  onContinue: () => void;
}

export default function BashoSummary({ rikishi, oldRank, worldState, onContinue }: BashoSummaryProps) {
  if (!worldState) return null;

  const divisionInfo = DIVISIONS.find(d => d.name === rikishi.rank.division);
  // We need to look back at career history to find wins/losses since they were reset by simulation
  const lastHistory = rikishi.careerHistory[rikishi.careerHistory.length - 1];
  const wins = lastHistory ? lastHistory.wins : 0;
  const losses = lastHistory ? lastHistory.losses : 0;
  
  const totalBouts = divisionInfo ? divisionInfo.bouts : 15;
  const isKachiKoshi = wins > totalBouts / 2;
  const netWins = wins - losses;

  const rankChanged = formatRank(rikishi.rank) !== formatRank(oldRank);
  const promoted = rankChanged && netWins > 0;
  const demoted = rankChanged && netWins < 0;

  const handleAdvance = () => {
    onContinue();
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
          className="text-2xl font-serif font-black italic tracking-tight mb-6"
        >
          {isKachiKoshi ? 'KACHI-KOSHI' : 'MAKE-KOSHI'}
        </motion.h1>

        <div className="flex gap-6 items-center bg-white/5 px-6 py-3 rounded-xl backdrop-blur-sm border border-white/10">
          <div className="text-center">
             <span className="text-[9px] uppercase font-bold tracking-widest opacity-40 block">Wins</span>
             <div className="text-2xl font-mono font-black text-sumo-green">{wins}</div>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="text-center">
             <span className="text-[9px] uppercase font-bold tracking-widest opacity-40 block">Losses</span>
             <div className="text-2xl font-mono font-black text-red-400">{losses}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-8 overflow-y-auto w-full bg-sumo-paper japanese-pattern-bg">
        <div className="max-w-sm mx-auto space-y-6">
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-sumo-ink/40 mb-4 text-center">Banzuke Performance</h3>
            
            <div className="bg-white border-2 border-sumo-earth/10 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-sumo-earth/10" />
               
               <div className="grid grid-cols-2 w-full gap-4 items-center">
                 <div className="space-y-1">
                   <div className="text-[9px] font-black opacity-30 uppercase tracking-widest">Entry Rank</div>
                   <div className="text-lg font-serif font-black italic text-sumo-ink/60">{formatRank(oldRank)}</div>
                   <div className="text-[10px] font-sans font-bold opacity-40 italic">{abbreviateRank(oldRank)}</div>
                 </div>

                 <div className="flex justify-center">
                   <motion.div 
                     initial={{ scale: 0 }}
                     animate={{ scale: 1 }}
                     transition={{ type: "spring", bounce: 0.5, delay: 0.3 }}
                     className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-2 ${
                       promoted ? 'bg-sumo-green/10 border-sumo-green/20' : 
                       demoted ? 'bg-red-50 border-red-100' : 
                       'bg-sumo-beige/10 border-sumo-earth/10'
                     }`}
                   >
                     {promoted && <ArrowUpRight size={28} className="text-sumo-green" />}
                     {demoted && <ArrowDownRight size={28} className="text-red-500" />}
                     {!promoted && !demoted && <Minus size={28} className="text-sumo-ink/40" />}
                   </motion.div>
                 </div>
               </div>

               <div className="w-full h-px bg-sumo-beige/30 my-4" />

               <div className="space-y-2 w-full">
                 <div className="text-[10px] font-black text-sumo-accent uppercase tracking-widest">New Banzuke Status</div>
                 <div className={`text-4xl font-serif font-black italic transition-colors leading-tight ${promoted ? 'text-sumo-green' : demoted ? 'text-red-600' : 'text-sumo-ink'}`}>
                   {formatRank(rikishi.rank)}
                 </div>
                 <div className="text-lg font-sans not-italic font-black text-sumo-ink/40 tracking-tighter">
                   {abbreviateRank(rikishi.rank)}
                 </div>
                 
                 {rankChanged && (
                   <div className={`mt-2 py-1 px-3 rounded-full text-[9px] font-black uppercase tracking-[0.2em] inline-block ${promoted ? 'bg-sumo-green text-white' : 'bg-red-600 text-white'}`}>
                     {promoted ? 'Promoted' : 'Demoted'}
                   </div>
                 )}
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
