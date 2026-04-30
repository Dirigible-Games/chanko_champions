import { useState, useMemo } from 'react';
import { Rikishi, WorldState, Division } from '../types';
import { formatRank, abbreviateRank } from '../lib/rankLogic';
import { DIVISIONS } from '../constants/world';
import { ChevronLeft, ChevronDown, ChevronUp, ShieldAlert, Award } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface BashoResultsProps {
  worldState: WorldState;
  rikishi: Rikishi;
  onAction?: (view: string) => void;
}

export default function BashoResults({ worldState, rikishi, onAction }: BashoResultsProps) {
  const [selectedDivision, setSelectedDivision] = useState<string>(rikishi.rank.division);
  const [expandedRikishiId, setExpandedRikishiId] = useState<string | null>(null);
  
  const allRikishi = worldState.rikishi;
  const schedule = worldState.bashoSchedule || [];
  
  // Filter for the selected division and sort by wins
  const board = useMemo(() => {
    return allRikishi
      .filter(r => r.rank.division === selectedDivision)
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  }, [allRikishi, selectedDivision]);

  const toggleExpand = (id: string) => {
    setExpandedRikishiId(prev => prev === id ? null : id);
  };

  const renderMatches = (rId: string) => {
    const matches = schedule.filter(p => p.rikishiId1 === rId || p.rikishiId2 === rId);
    matches.sort((a, b) => a.day - b.day);

    if (matches.length === 0) {
      return (
        <div className="p-4 text-center flex flex-col items-center justify-center opacity-40 text-sumo-ink">
          <ShieldAlert size={20} className="mb-2 text-sumo-ink/50" />
          <span className="font-bold uppercase tracking-widest text-[10px]">No Bouts Scheduled</span>
        </div>
      );
    }

    return (
      <div className="mt-4 space-y-1">
        {matches.map(m => {
          const oppId = m.rikishiId1 === rId ? m.rikishiId2 : m.rikishiId1;
          const opp = allRikishi.find(x => x.id === oppId);
          
          let outcomeClass = "bg-sumo-ink/5 text-sumo-ink/50 border border-sumo-ink/10";
          let outcomeLabel = "?";
          
          if (m.result) {
            const isWin = (m.result === 'rikishiId1' && m.rikishiId1 === rId) || 
                          (m.result === 'rikishiId2' && m.rikishiId2 === rId);
            
            if (isWin) {
                outcomeClass = "bg-sumo-green/20 text-sumo-green font-bold border border-sumo-green/30";
                outcomeLabel = "W";
            } else if (m.result === 'draw') {
                outcomeClass = "bg-yellow-500/20 text-yellow-500 font-bold border border-yellow-500/30";
                outcomeLabel = "D";
            } else {
                outcomeClass = "bg-sumo-accent/20 text-sumo-accent font-bold border border-sumo-accent/30";
                outcomeLabel = "L";
            }
          } else {
              if (opp?.status === 'kyujo' || opp?.status === 'retired') {
                outcomeLabel = "-";
              }
          }

          return (
            <div key={m.day} className="flex items-center text-sumo-ink px-3 py-2 bg-white rounded shadow-sm text-sm border border-sumo-beige/50">
              <div className="w-14 text-sumo-ink/40 font-bold uppercase tracking-widest text-[10px]">Day {m.day}</div>
              
              <div className={`w-6 h-6 mr-3 rounded shadow-inner flex items-center justify-center ${outcomeClass}`}>
                <span className="text-[10px] scale-110">{outcomeLabel}</span>
              </div>
              
              <div className="flex-1 font-medium truncate flex items-center gap-2">
                {opp ? opp.name : 'Unknown'}
                {opp && (opp.status === 'kyujo' || opp.status === 'retired') && (
                    <span className="bg-sumo-accent/20 text-sumo-accent text-[8px] font-bold uppercase tracking-widest px-1 py-0.5 rounded border border-sumo-accent/30">Kyujo</span>
                )}
              </div>
              <div className="w-10 text-right opacity-50 font-mono text-[10px] sm:text-xs">
                {opp ? abbreviateRank(opp.rank) : ''}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-sumo-outer">
      {/* Header element to align with UI */}
      <header className="bg-sumo-soft pt-4 pb-4 px-4 sm:px-6 border-b border-sumo-earth flex items-center gap-4">
        <button 
          onClick={() => onAction?.('back')} 
          className="p-2 rounded-lg text-sumo-ink border border-sumo-earth/40 bg-white shadow-sm hover:bg-sumo-earth/10 transition-colors active:scale-95 flex items-center"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-2xl font-serif font-black italic text-sumo-ink uppercase tracking-tighter m-0 flex-1">
          Torikumi
        </h1>
      </header>

      {/* Filter Header */}
      <div className="px-4 pt-4 pb-3 bg-sumo-outer shadow-[0_4px_10px_rgba(0,0,0,0.03)] z-10 shrink-0">
        <div className="relative">
          <select
            value={selectedDivision}
            onChange={(e) => {
              setSelectedDivision(e.target.value);
              setExpandedRikishiId(null);
            }}
            className="w-full p-4 rounded-xl text-sm font-bold text-sumo-ink bg-white shadow-sm border-none focus:ring-2 focus:ring-sumo-accent appearance-none"
          >
            {DIVISIONS.map(div => (
              <option key={div.name} value={div.name}>{div.name} Division</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-sumo-ink/40">
            <ChevronDown size={16} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar bg-sumo-outer p-4 space-y-2 pb-24">
        {board.map((r, i) => (
          <div key={r.id} className="bg-white rounded-2xl border border-sumo-beige overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleExpand(r.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-sumo-soft/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`text-center font-bold text-sm w-12 font-serif flex-shrink-0 ${expandedRikishiId === r.id ? 'text-sumo-accent' : 'text-sumo-ink'}`}>
                  {formatRank(r.rank)}
                </div>
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{r.name} {r.nameKanji && <span className="opacity-60 ml-1 font-serif">({r.nameKanji})</span>}</span>
                    {!r.isNPC && (
                      <span className="text-[8px] bg-sumo-accent text-white px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                        You
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-sumo-ink/40">
                    {r.beya}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="font-mono font-black text-sumo-ink text-sm sm:text-base">
                  {r.wins} - {r.losses}
                </div>
                <div className="text-sumo-ink/40">
                  {expandedRikishiId === r.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
            </button>
            <AnimatePresence>
              {expandedRikishiId === r.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-sumo-soft/50 border-t border-sumo-beige px-4 overflow-hidden"
                >
                  <div className="py-4">
                    <div className="font-bold flex items-center gap-1 mb-2 opacity-80 text-xs text-sumo-ink">
                      <Award size={14} /> Schedule & Results
                    </div>
                    {renderMatches(r.id)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
        {board.length === 0 && (
          <div className="flex justify-center p-8 text-xs font-bold text-sumo-ink/40 uppercase tracking-widest">
            No matches found
          </div>
        )}
      </div>
    </div>
  );
}
