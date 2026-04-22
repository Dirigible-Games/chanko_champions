import { motion } from 'motion/react';
import { X, Volume2, Music, Home, LogOut, Maximize, Minimize } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SettingsModalProps {
  onClose: () => void;
  onMainMenu: () => void;
  onExit: () => void;
}

export default function SettingsModal({ onClose, onMainMenu, onExit }: SettingsModalProps) {
  const [soundVolume, setSoundVolume] = useState(80);
  const [musicVolume, setMusicVolume] = useState(60);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen API not available or blocked in this environment");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-sumo-ink/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-sm bg-sumo-paper border-2 border-sumo-earth/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="bg-sumo-soft px-6 py-4 border-b border-sumo-earth/20 flex justify-between items-center">
          <h2 className="font-serif font-black italic text-xl text-sumo-ink">SETTINGS</h2>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-sumo-earth/10 text-sumo-ink/60 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6 flex-1">
          {/* Sound Volume */}
          <div>
            <div className="flex justify-between items-center mb-2 text-sumo-ink">
              <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-widest opacity-80">
                <Volume2 size={16} /> Sound
              </div>
              <span className="text-xs font-mono font-bold opacity-60">{soundVolume}%</span>
            </div>
            <input 
              type="range" 
              min="0" max="100" 
              value={soundVolume}
              onChange={(e) => setSoundVolume(Number(e.target.value))}
              className="w-full accent-sumo-accent"
            />
          </div>

          {/* Music Volume */}
          <div>
            <div className="flex justify-between items-center mb-2 text-sumo-ink">
              <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-widest opacity-80">
                <Music size={16} /> Music
              </div>
              <span className="text-xs font-mono font-bold opacity-60">{musicVolume}%</span>
            </div>
            <input 
              type="range" 
              min="0" max="100" 
              value={musicVolume}
              onChange={(e) => setMusicVolume(Number(e.target.value))}
              className="w-full accent-sumo-accent"
            />
          </div>

          <div className="pt-4 space-y-3 border-t border-sumo-earth/20 mt-4">
            <button 
              onClick={toggleFullscreen}
              className="w-full py-4 px-4 bg-white border border-sumo-earth/20 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-sumo-soft shadow-sm transition-colors text-sumo-ink active:scale-95"
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />} 
              {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            </button>
            <button 
              onClick={onMainMenu}
              className="w-full py-4 px-4 bg-white border border-sumo-earth/20 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-sumo-soft shadow-sm transition-colors text-sumo-ink active:scale-95"
            >
              <Home size={16} /> Main Menu
            </button>
            <button 
              onClick={onExit}
              className="w-full py-4 px-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors active:scale-95"
            >
              <LogOut size={16} /> Exit Game
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
