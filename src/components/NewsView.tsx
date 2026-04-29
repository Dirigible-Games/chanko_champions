import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WorldState, NewsItem } from '../types';
import { Newspaper, ArrowUpRight, ArrowDownRight, Trophy, ChevronDown } from 'lucide-react';
import { BASHO_NAMES } from '../constants/world';

interface NewsProps {
  worldState: WorldState | null;
}

export default function NewsView({ worldState }: NewsProps) {
  if (!worldState) return null;

  const getIcon = (type: NewsItem['type']) => {
    switch (type) {
      case 'promotion': return <ArrowUpRight className="text-sumo-green" size={24} />;
      case 'demotion': return <ArrowDownRight className="text-red-500" size={24} />;
      case 'yusho': return <Trophy className="text-yellow-500" size={24} />;
      case 'retirement': return <span className="text-xl font-serif text-sumo-ink opacity-40">--</span>;
      default: return <Newspaper className="text-sumo-accent" size={24} />;
    }
  };

  const sortedNews = [...(worldState.news || [])].reverse();

  // Group by Basho string
  const groupedNews = sortedNews.reduce((acc, item) => {
    const bashoName = BASHO_NAMES[item.month] || `Basho ${item.month + 1}`;
    const groupKey = `${bashoName} ${item.year}`;
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(item);
    return acc;
  }, {} as Record<string, NewsItem[]>);

  const groupKeys = Object.keys(groupedNews);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (groupKeys.length > 0) {
      initial[groupKeys[0]] = true; // Expand the most recent basho by default
    }
    return initial;
  });

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="h-full flex flex-col bg-sumo-paper overflow-hidden">
      <div className="px-6 pt-10 pb-4 border-b border-sumo-earth/20 bg-sumo-soft flex justify-between items-end relative overflow-hidden shrink-0 z-10">
         <div className="absolute top-0 right-0 opacity-5">
           <Newspaper size={120} className="transform translate-x-4 -translate-y-4" />
         </div>
         <div>
           <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">Sumo World</h2>
           <h1 className="text-3xl font-serif font-black italic tracking-tighter shadow-sm">NEWS & EVENTS</h1>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {groupKeys.length === 0 ? (
           <div className="text-center py-12 opacity-40">
             <Newspaper size={48} className="mx-auto mb-4" />
             <p className="font-serif italic text-lg">No news to report yet.</p>
             <p className="text-[10px] uppercase font-bold tracking-widest mt-2">Finish a Basho to generate world events.</p>
           </div>
        ) : (
          groupKeys.map(groupKey => {
            const isExpanded = !!expandedGroups[groupKey];
            return (
              <div key={groupKey} className="bg-white rounded-3xl border border-sumo-earth/20 overflow-hidden shadow-sm">
                <button 
                  onClick={() => toggleGroup(groupKey)}
                  className="w-full flex items-center justify-between p-5 bg-sumo-soft hover:bg-sumo-earth/5 transition-colors sticky top-0 z-10"
                >
                  <h3 className="font-serif font-bold italic text-xl text-sumo-ink">{groupKey}</h3>
                  <div className={`p-2 rounded-full bg-sumo-earth/10 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown size={20} className="text-sumo-ink/60" />
                  </div>
                </button>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 space-y-3 bg-white">
                        {groupedNews[groupKey].map((item) => (
                          <div 
                            key={item.id}
                            className="bg-sumo-paper rounded-2xl p-4 border border-sumo-earth/10 flex gap-4"
                          >
                             <div className="shrink-0 flex flex-col items-center justify-center w-12 h-12 bg-sumo-earth/5 rounded-xl border border-sumo-earth/10">
                               {getIcon(item.type)}
                             </div>
                             
                             <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                   <span className="text-[9px] uppercase font-bold tracking-widest text-sumo-accent">
                                     {item.division ? `${item.division}` : 'General'}
                                   </span>
                                </div>
                                <p className="text-sm font-medium leading-snug">{item.text}</p>
                             </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
