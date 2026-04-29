import { useState, useEffect } from 'react';
import { NamePart, KANJI_PARTS, BEYA_CONVENTIONS } from '../lib/nameGenerator';
import { Minus, Plus, Search } from 'lucide-react';

interface ShikonaBuilderProps {
  initialName?: string;
  initialKanji?: string;
  beya?: string;
  onChange: (name: string, kanji: string) => void;
}

export default function ShikonaBuilder({ initialName, initialKanji, beya, onChange }: ShikonaBuilderProps) {
  const [parts, setParts] = useState<NamePart[]>([]);
  const [isTypingManual, setIsTypingManual] = useState(false);
  const [manualName, setManualName] = useState(initialName || '');

  // Extract relevant specific conventions
  const convention = beya ? BEYA_CONVENTIONS[beya] : null;

  const currentName = parts.map(p => p.romaji).join('');
  const currentKanji = parts.map(p => p.kanji).join('');

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  useEffect(() => {
    if (isTypingManual) {
      onChange(capitalize(manualName.trim()), '');
    } else {
      onChange(capitalize(currentName), currentKanji);
    }
  }, [parts, manualName, isTypingManual]);

  const handleAddPart = (part: NamePart) => {
    if (parts.length >= 4) return;
    setParts([...parts, part]);
  };

  const handleRemovePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-sumo-paper p-4 rounded-2xl border border-sumo-earth/20 flex flex-col h-[500px] space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-sumo-earth text-center">
        {!isTypingManual ? (
          <div className="flex-1">
            <h2 className="text-3xl font-serif font-black italic tracking-tight text-sumo-ink min-h-[40px]">
              {parts.length > 0 ? capitalize(currentName) : '...'}
            </h2>
            <div className="text-xl font-serif text-sumo-ink/60 min-h-[30px] mt-1 space-x-1">
              {parts.length > 0 ? (
                parts.map((p, i) => (
                  <span key={i} className="inline-block relative group cursor-pointer" onClick={() => handleRemovePart(i)}>
                    {p.kanji}
                    <div className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Minus size={12} />
                    </div>
                  </span>
                ))
              ) : (
                <span className="text-sm opacity-50">Select kanji below</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <input
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="Enter name manually..."
              className="w-full text-center text-3xl font-serif font-black italic tracking-tight text-sumo-ink bg-transparent focus:outline-none placeholder:text-sumo-ink/30"
              autoFocus
            />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setIsTypingManual(false)}
          className={`flex-1 py-2 px-3 text-sm font-bold uppercase tracking-widest rounded-lg transition-colors ${!isTypingManual ? 'bg-sumo-ink text-white' : 'bg-sumo-earth/10 text-sumo-ink/60 hover:bg-sumo-earth/20'}`}
        >
          Kanji Builder
        </button>
        <button
          onClick={() => setIsTypingManual(true)}
          className={`flex-1 py-2 px-3 text-sm font-bold uppercase tracking-widest rounded-lg transition-colors ${isTypingManual ? 'bg-sumo-ink text-white' : 'bg-sumo-earth/10 text-sumo-ink/60 hover:bg-sumo-earth/20'}`}
        >
          Manual Entry
        </button>
      </div>

      {!isTypingManual && (
        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          {convention && (convention.prefixes?.length || convention.suffixes?.length) ? (
             <div className="shrink-0 space-y-2">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{beya} Stable Terms</h3>
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                 {convention.prefixes?.map((p, i) => (
                   <button key={`pref-${i}`} onClick={() => handleAddPart(p)} className="bg-sumo-accent/10 border border-sumo-accent/20 text-sumo-accent p-2 rounded-lg flex flex-col items-center justify-center hover:bg-sumo-accent/20 active:scale-95 transition-all">
                     <span className="text-3xl font-serif leading-none">{p.kanji}</span>
                     <span className="text-[10px] font-mono font-bold opacity-80 truncate w-full text-center mt-1">{p.romaji}</span>
                   </button>
                 ))}
                 {convention.suffixes?.map((p, i) => (
                   <button key={`suff-${i}`} onClick={() => handleAddPart(p)} className="bg-sumo-accent/10 border border-sumo-accent/20 text-sumo-accent p-2 rounded-lg flex flex-col items-center justify-center hover:bg-sumo-accent/20 active:scale-95 transition-all">
                     <span className="text-3xl font-serif leading-none">{p.kanji}</span>
                     <span className="text-[10px] font-mono font-bold opacity-80 truncate w-full text-center mt-1">{p.romaji}</span>
                   </button>
                 ))}
               </div>
             </div>
          ) : null}

          <div className="flex-1 flex flex-col min-h-0 space-y-1.5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Kanji Library</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto pr-2 pb-2 border border-sumo-earth/20 p-2 rounded-xl bg-white/50 flex-1">
              {KANJI_PARTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleAddPart(p)}
                  className="bg-white border border-sumo-earth shadow-sm text-sumo-ink p-2 rounded-lg flex flex-col items-center justify-center hover:bg-sumo-earth/10 active:scale-95 transition-all w-full min-h-[72px]"
                >
                  <span className="text-3xl font-serif leading-none">{p.kanji}</span>
                  <span className="text-xs font-mono font-bold opacity-80 truncate w-full text-center mt-1">{p.romaji}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
