import { useState, useMemo } from 'react';
import { Rikishi, WorldState, Division } from '../types';
import { formatRank, abbreviateRank, compareRanks } from '../lib/rankLogic';
import { DIVISIONS, BASHO_NAMES } from '../constants/world';
import { BEYAS } from '../types';
import { Search, ChevronDown, ChevronUp, User, Award, History } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface WorldBrowserProps {
  worldState: WorldState | null;
}

export default function WorldBrowser({ worldState }: WorldBrowserProps) {
  const [activeTab, setActiveTab] = useState<'banzuke' | 'beya'>('banzuke');
  const [selectedDivision, setSelectedDivision] = useState<Division | null>('Makuuchi');
  const [selectedBeya, setSelectedBeya] = useState<string | null>(BEYAS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRikishiId, setExpandedRikishiId] = useState<string | null>(null);

  if (!worldState) {
    return (
      <div className="flex items-center justify-center h-full p-6 text-center text-sumo-ink/60">
        <p>No world data available. Create a character first.</p>
      </div>
    );
  }

  const { rikishi: allRikishi } = worldState;

  // Filter and sort for Banzuke
  const banzukeRikishi = useMemo(() => {
    if (!selectedDivision) return [];
    let filtered = allRikishi.filter(r => r.rank.division === selectedDivision);
    if (searchQuery) {
      filtered = filtered.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return filtered.sort((a, b) => compareRanks(a.rank, b.rank));
  }, [allRikishi, selectedDivision, searchQuery]);

  // Filter and sort for Beya
  const beyaRikishi = useMemo(() => {
    if (!selectedBeya) return [];
    let filtered = allRikishi.filter(r => r.beya === selectedBeya);
    if (searchQuery) {
      filtered = filtered.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return filtered.sort((a, b) => compareRanks(a.rank, b.rank));
  }, [allRikishi, selectedBeya, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedRikishiId(prev => prev === id ? null : id);
  };

  const renderRikishiList = (rikishiList: Rikishi[]) => {
    if (rikishiList.length === 0) {
      return (
        <div className="flex justify-center p-8 text-xs font-bold text-sumo-ink/40 uppercase tracking-widest">
          No matches found
        </div>
      );
    }

    return (
      <div className="space-y-2 pb-24">
        {rikishiList.map((r, i) => (
          <div key={r.id} className="bg-white rounded-2xl border border-sumo-beige overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleExpand(r.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-sumo-soft/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="text-center font-bold text-sumo-accent text-sm w-12 font-serif flex-shrink-0">
                  {formatRank(r.rank)}
                </div>
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{r.name}</span>
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
              <div className="text-sumo-ink/40">
                {expandedRikishiId === r.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
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
                  <div className="py-4 space-y-4">
                    <div className="flex justify-between items-start gap-4 text-xs">
                      <div>
                        <div className="font-bold flex items-center gap-1 mb-1 opacity-60">
                          <User size={12} /> Stats
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <span>PWR: {r.stats.power}</span>
                          <span>TEC: {r.stats.technique}</span>
                          <span>BAL: {r.stats.balance}</span>
                          <span>SPR: {r.stats.spirit}</span>
                          <span>FTW: {r.stats.footwork}</span>
                          <span>WGT: {r.stats.weight}kg</span>
                        </div>
                      </div>
                      <div className="text-right">
                         <div className="font-bold flex items-center justify-end gap-1 mb-1 opacity-60">
                          <Award size={12} /> Record
                        </div>
                        <div className="font-bold text-lg text-sumo-accent">{r.wins} - {r.losses}</div>
                        <div className="opacity-60">{r.bashosCompleted} Basho</div>
                      </div>
                    </div>
                    {/* Career History could go here if implemented, for now it's empty to preserve space */}
                    {r.careerHistory.length > 0 && (
                      <div className="pt-2 border-t border-sumo-beige/50">
                         <div className="font-bold flex items-center gap-1 mb-2 opacity-60 text-xs">
                          <History size={12} /> Career History
                        </div>
                        <div className="text-[10px] space-y-1 max-h-24 overflow-y-auto no-scrollbar">
                          {r.careerHistory.map((h, i) => (
                            <div key={i} className="flex justify-between opacity-80">
                              <span>{h.year} {BASHO_NAMES[parseInt(h.month)] || `Basho ${h.month}`}</span>
                              <span className="font-serif italic">{abbreviateRank(h.rank)}</span>
                              <span className="font-bold">{h.wins}-{h.losses}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-sumo-outer">
      {/* Header element to align with UI */}
      <header className="bg-sumo-soft pt-12 pb-4 px-6 border-b border-sumo-earth">
        <h1 className="text-2xl font-serif font-black italic text-sumo-ink uppercase tracking-tighter mb-4">
          The Sumo World
        </h1>

        {/* Tab Toggle */}
        <div className="flex bg-sumo-earth/20 rounded-xl p-1 mb-4">
          <button
            onClick={() => setActiveTab('banzuke')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
              activeTab === 'banzuke' ? 'bg-white text-sumo-ink shadow-sm' : 'text-sumo-ink/50 hover:text-sumo-ink/80'
            }`}
          >
            Banzuke
          </button>
          <button
            onClick={() => setActiveTab('beya')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
              activeTab === 'beya' ? 'bg-white text-sumo-ink shadow-sm' : 'text-sumo-ink/50 hover:text-sumo-ink/80'
            }`}
          >
            Beya Roster
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30 text-sumo-ink" />
          <input
            type="text"
            placeholder="Search Rikishi by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-3 rounded-xl bg-white text-sm font-bold placeholder:font-medium placeholder:opacity-40 border-none shadow-sm focus:ring-2 focus:ring-sumo-accent"
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar bg-sumo-outer p-4">
        {activeTab === 'banzuke' && (
          <div className="mb-4 overflow-x-auto no-scrollbar flex gap-2 pb-2">
            {DIVISIONS.map((div) => (
              <button
                key={div.name}
                onClick={() => setSelectedDivision(div.name)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  selectedDivision === div.name
                    ? 'bg-sumo-ink text-white shadow-md'
                    : 'bg-white/50 text-sumo-ink/60 hover:bg-white'
                }`}
              >
                {div.name}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'beya' && (
           <div className="mb-4">
            <select
              value={selectedBeya || ''}
              onChange={(e) => setSelectedBeya(e.target.value)}
              className="w-full p-4 rounded-xl text-sm font-bold text-sumo-ink bg-white shadow-sm border-none focus:ring-2 focus:ring-sumo-accent appearance-none relative"
            >
              {BEYAS.map(beya => (
                <option key={beya} value={beya}>{beya} Stable</option>
              ))}
            </select>
           </div>
        )}

        {renderRikishiList(activeTab === 'banzuke' ? banzukeRikishi : beyaRikishi)}
      </div>
    </div>
  );
}
