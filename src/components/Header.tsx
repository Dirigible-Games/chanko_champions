import { Rikishi } from '../types';
import { Heart, Zap } from 'lucide-react';
import { formatRank } from '../lib/rankLogic';

interface HeaderProps {
  rikishi: Rikishi;
}

export default function Header({ rikishi }: HeaderProps) {
  return (
    <header className="bg-sumo-soft pt-12 pb-6 px-6 border-b border-sumo-earth">
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold tracking-widest uppercase opacity-60">
            Current Rank
          </span>
          <span className="text-xl font-serif font-black italic">
            {formatRank(rikishi.rank)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold tracking-widest uppercase opacity-60">
            Record
          </span>
          <span className="block text-lg font-bold text-sumo-accent">
            {rikishi.wins} — {rikishi.losses}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-4 bg-white/50 p-3 rounded-2xl border border-white">
        <div className="w-14 h-14 bg-sumo-beige rounded-full border-2 border-sumo-accent flex items-center justify-center font-serif text-2xl font-bold">
          {rikishi.name[0]}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold leading-tight uppercase tracking-tight">{rikishi.name}</h1>
            {rikishi.momentum.attribute && (
              <span className="text-[8px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200 uppercase tracking-tighter flex items-center gap-0.5">
                <Zap size={8} className="fill-orange-500" />
                Momentum: {rikishi.momentum.attribute}
              </span>
            )}
          </div>
          <p className="text-xs opacity-70 italic">{rikishi.beya} Stable • {rikishi.stats.weight}kg</p>
        </div>
      </div>
    </header>
  );
}
