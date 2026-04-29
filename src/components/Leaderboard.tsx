import { Rikishi } from '../types';
import { abbreviateRank } from '../lib/rankLogic';
import { ChevronRight } from 'lucide-react';

interface LeaderboardProps {
  rikishi: Rikishi;
  allRikishi: Rikishi[];
  onAction?: (view: string) => void;
}

export default function Leaderboard({ rikishi, allRikishi, onAction }: LeaderboardProps) {
  console.log('Leaderboard receiving allRikishi:', allRikishi.slice(0, 5));
  // Filter for the player's division and sort by wins
  const board = allRikishi
    .filter(r => r.rank.division === rikishi.rank.division)
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
    .slice(0, 10);

  return (
    <div className="h-full flex flex-col p-6 bg-sumo-paper">
      <h2 className="text-xl font-serif font-black italic text-sumo-ink mb-6 text-center">Division Top 10</h2>
      
      <div className="bg-white border border-sumo-earth/20 rounded-2xl shadow-sm flex-1 overflow-y-auto">
        {board.map((r, i) => (
          <div key={r.id} className={`flex items-center justify-between p-4 ${i % 2 === 0 ? 'bg-sumo-earth/5' : ''} ${r.id === rikishi.id ? 'bg-sumo-accent/10 border-l-4 border-sumo-accent' : ''}`}>
             <div className="flex items-center gap-4">
                <span className="font-mono font-bold text-sumo-ink/30 w-4">{i + 1}</span>
                <div>
                   <div className="font-bold text-sumo-ink">{r.name} {r.nameKanji && <span className="opacity-60 ml-1 font-serif text-sm">({r.nameKanji})</span>}</div>
                   <div className="text-[10px] opacity-60">{abbreviateRank(r.rank)}</div>
                </div>
             </div>
             <div className="font-mono font-black text-sumo-ink">{r.wins} - {r.losses}</div>
          </div>
        ))}
      </div>
      
      <button 
        onClick={() => onAction?.('back')}
        className="mt-6 w-full bg-sumo-ink text-white p-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
      >
        Return to Dashboard <ChevronRight size={14} />
      </button>
    </div>
  );
}
