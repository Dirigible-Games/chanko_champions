import { useState } from 'react';
import { motion } from 'motion/react';
import { Rikishi, AttributeKey } from '../types';
import { X, Save, AlertTriangle } from 'lucide-react';

interface DevRikishiEditorProps {
  rikishi: Rikishi;
  onSave: (updated: Rikishi) => void;
  onClose: () => void;
}

export default function DevRikishiEditor({ rikishi, onSave, onClose }: DevRikishiEditorProps) {
  const [localRikishi, setLocalRikishi] = useState<Rikishi>(JSON.parse(JSON.stringify(rikishi)));

  const handleUpdate = (field: string, value: any) => {
    setLocalRikishi(prev => ({ ...prev, [field]: value }));
  };

  const handleStatUpdate = (stat: AttributeKey | 'weight', value: number) => {
    setLocalRikishi(prev => ({
      ...prev,
      stats: { ...prev.stats, [stat]: value }
    }));
  };

  const handleSave = () => {
    onSave(localRikishi);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-sumo-paper rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[90vh]"
      >
        <div className="bg-sumo-ink p-4 flex justify-between items-center whitespace-nowrap overflow-hidden">
          <div className="flex items-center gap-2 text-yellow-500 font-bold tracking-widest text-sm uppercase">
            <AlertTriangle size={16} /> Dev Editor
          </div>
          <button onClick={onClose} className="p-2 -mr-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-white text-sumo-ink">
          
          <div className="space-y-4">
            <h3 className="font-bold border-b border-sumo-earth/20 pb-1 text-sm uppercase tracking-widest text-sumo-ink/60">Core State</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1 opacity-70">Focus Points</label>
                <input 
                  type="number" min="0" max="40"
                  value={localRikishi.focusPoints}
                  onChange={e => handleUpdate('focusPoints', parseInt(e.target.value) || 0)}
                  className="w-full bg-sumo-soft p-2 rounded-lg text-sm font-mono border border-sumo-earth/30"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 opacity-70">Fatigue (%)</label>
                <input 
                  type="number" min="0" max="100"
                  value={localRikishi.fatigue}
                  onChange={e => handleUpdate('fatigue', parseInt(e.target.value) || 0)}
                  className="w-full bg-sumo-soft p-2 rounded-lg text-sm font-mono border border-sumo-earth/30"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 opacity-70">Base Fatigue</label>
                <input 
                  type="number" min="0" max="50"
                  value={localRikishi.baseFatigue}
                  onChange={e => handleUpdate('baseFatigue', parseInt(e.target.value) || 0)}
                  className="w-full bg-sumo-soft p-2 rounded-lg text-sm font-mono border border-sumo-earth/30"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 opacity-70">TP Available</label>
                <input 
                  type="number" min="0" max="1000"
                  value={localRikishi.tpAvailable}
                  onChange={e => handleUpdate('tpAvailable', parseInt(e.target.value) || 0)}
                  className="w-full bg-sumo-soft p-2 rounded-lg text-sm font-mono border border-sumo-earth/30"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-bold mb-1 opacity-70">Total Unique Injuries</label>
                <input 
                  type="number" min="0" max="100"
                  value={localRikishi.totalUniqueInjuries}
                  onChange={e => handleUpdate('totalUniqueInjuries', parseInt(e.target.value) || 0)}
                  className="w-full bg-sumo-soft p-2 rounded-lg text-sm font-mono border border-sumo-earth/30"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 opacity-70">Bashos Completed</label>
                <input 
                  type="number" min="0" max="999"
                  value={localRikishi.bashosCompleted}
                  onChange={e => handleUpdate('bashosCompleted', parseInt(e.target.value) || 0)}
                  className="w-full bg-sumo-soft p-2 rounded-lg text-sm font-mono border border-sumo-earth/30"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="font-bold border-b border-sumo-earth/20 pb-1 text-sm uppercase tracking-widest text-sumo-ink/60">Stats (1-99)</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {(['power', 'balance', 'footwork', 'technique', 'spirit'] as AttributeKey[]).map(attr => (
                <div key={attr}>
                  <label className="block text-xs font-bold mb-1 opacity-70 uppercase tracking-widest">{attr}</label>
                  <input 
                    type="number" min="1" max="99"
                    value={localRikishi.stats[attr]}
                    onChange={e => handleStatUpdate(attr, parseInt(e.target.value) || 1)}
                    className="w-full bg-sumo-soft p-2 rounded-lg text-sm font-mono border border-sumo-earth/30 border-blue-200 focus:border-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold mb-1 opacity-70 uppercase tracking-widest">Weight (kg)</label>
                <input 
                  type="number" min="65" max="300"
                  value={localRikishi.stats.weight}
                  onChange={e => handleStatUpdate('weight', parseInt(e.target.value) || 65)}
                  className="w-full bg-sumo-soft p-2 rounded-lg text-sm font-mono border border-sumo-earth/30 border-blue-200 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="font-bold border-b border-sumo-earth/20 pb-1 text-sm uppercase tracking-widest text-sumo-ink/60">Record</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1 opacity-70">Wins</label>
                <input 
                  type="number" min="0" max="999"
                  value={localRikishi.wins}
                  onChange={e => handleUpdate('wins', parseInt(e.target.value) || 0)}
                  className="w-full bg-sumo-soft p-2 rounded-lg text-sm font-mono border border-sumo-earth/30"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 opacity-70">Losses</label>
                <input 
                  type="number" min="0" max="999"
                  value={localRikishi.losses}
                  onChange={e => handleUpdate('losses', parseInt(e.target.value) || 0)}
                  className="w-full bg-sumo-soft p-2 rounded-lg text-sm font-mono border border-sumo-earth/30"
                />
              </div>
            </div>
          </div>

        </div>

        <div className="p-4 bg-sumo-soft border-t border-sumo-earth/20">
          <button 
            onClick={handleSave}
            className="w-full py-4 bg-sumo-ink text-white font-black uppercase tracking-widest text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-black transition-colors"
          >
            <Save size={18} /> Apply Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}
