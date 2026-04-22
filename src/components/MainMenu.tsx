import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Github, FileBox, AlertTriangle } from 'lucide-react';

interface MainMenuProps {
  hasSave: boolean;
  onNewGame: () => void;
  onContinue: () => void;
}

export default function MainMenu({ hasSave, onNewGame, onContinue }: MainMenuProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleNewGameClick = () => {
    if (hasSave) {
      setShowConfirm(true);
    } else {
      onNewGame();
    }
  };

  return (
    <div className="h-full bg-sumo-outer flex items-center justify-center p-8 text-center relative overflow-hidden">
      <div className="absolute inset-0 japanese-pattern opacity-5" />
      
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Logo / Title Area */}
        <motion.div
           initial={{ opacity: 0, y: -20, scale: 0.95 }}
           animate={{ opacity: 1, y: 0, scale: 1 }}
           transition={{ duration: 0.8, ease: "easeOut" }}
           className="mb-12 flex flex-col items-center"
        >
          <div className="w-24 h-24 bg-sumo-ink rounded-full flex items-center justify-center border-4 border-sumo-earth/30 shadow-2xl mb-6 relative">
            <Trophy className="text-white w-10 h-10" />
          </div>
          <h1 className="text-4xl font-serif font-black italic tracking-widest leading-none mb-1">
            <span className="text-[#1A1A1A]">CHANKO</span>
            <br />
            <span className="text-[#CC0000]">CHAMPIONS</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-sumo-earth opacity-60">The Sumo Simulator</p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          className="w-full relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <AnimatePresence mode="wait">
            {!showConfirm ? (
              <motion.div 
                key="menu"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <button 
                  onClick={handleNewGameClick}
                  className="w-full bg-sumo-ink text-white py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-xs shadow-xl active:scale-95 transition-all text-center flex justify-center items-center gap-2"
                >
                  <FileBox size={14} /> NEW CAREER
                </button>
                
                <button 
                  onClick={onContinue}
                  disabled={!hasSave}
                  className={`w-full py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-xs transition-all text-center flex justify-center items-center gap-2 border-2 ${
                    hasSave 
                      ? 'bg-white border-sumo-ink text-sumo-ink shadow-sm active:scale-95' 
                      : 'bg-transparent border-sumo-earth/20 text-sumo-earth/30 cursor-not-allowed'
                  }`}
                >
                  CONTINUE
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white p-6 rounded-2xl shadow-2xl border-2 border-red-100"
              >
                <div className="flex justify-center mb-3 text-red-500">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="font-serif font-black text-lg mb-2">OVERWRITE SAVE?</h3>
                <p className="text-xs opacity-60 mb-6 leading-relaxed">
                  Your current active career will be permanently deleted. This cannot be undone.
                </p>
                <div className="space-y-2">
                  <button 
                    onClick={() => {
                        setShowConfirm(false);
                        onNewGame();
                    }}
                    className="w-full bg-red-500 text-white py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-sm active:scale-95 transition-all"
                  >
                    Yes, Delete Career
                  </button>
                  <button 
                    onClick={() => setShowConfirm(false)}
                    className="w-full bg-transparent text-sumo-ink border border-sumo-earth/20 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] active:scale-95 transition-all hover:bg-sumo-earth/5"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        
      </div>

      {/* Footer Credit - Positioned Absolutely relative to the whole screen */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-2 pointer-events-none z-0"
      >
        <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#CC0000] flex items-center gap-1.5">
          <Github size={10} /> Chanko Engine v0.1
        </span>
      </motion.div>
    </div>
  );
}
