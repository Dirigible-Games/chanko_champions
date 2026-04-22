import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

export function BonusTooltip({ label, content, icon, title, className }: { label?: string, content: string, icon?: React.ReactNode, title?: string, className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  // Use a capturing listener for the portal to kill all events before they bubble to React parents
  const stopAll = (e: React.SyntheticEvent | React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      <span 
        role="button"
        tabIndex={0}
        onClick={(e) => { 
          e.stopPropagation(); 
          e.preventDefault();
          setIsOpen(true); 
        }}
        onMouseDown={stopAll}
        onPointerDown={stopAll}
        onTouchStart={stopAll}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        className={className || (label ? 
          "text-[7.5px] font-mono font-bold text-sumo-ink/50 uppercase tracking-widest cursor-pointer border-b border-sumo-ink/20 border-dotted mt-0.5 tooltip-trigger inline-block" : 
          "tooltip-trigger cursor-pointer opacity-100 hover:scale-110 transition-all p-1.5 text-orange-600 bg-orange-50 border border-orange-200 rounded-full shadow-sm flex items-center justify-center m-0.5 inline-flex")
        }
      >
        {label || icon}
      </span>
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <div 
              className="tooltip-portal fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto"
              onClick={stopAll}
              onMouseDown={stopAll}
              onPointerDown={stopAll}
              onTouchStart={stopAll}
              onTouchEnd={stopAll}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 bg-sumo-earth/80 backdrop-blur-sm tooltip-portal"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsOpen(false);
                }}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, type: "spring", bounce: 0.4 }}
                className="relative bg-white text-sumo-ink p-6 rounded-2xl shadow-xl max-w-[280px] w-full font-sans text-center border-t-4 border-t-red-700 tooltip-portal"
                onClick={stopAll}
              >
                {(title || label) && (
                  <div className="font-black text-lg mb-2 capitalize tracking-tight">
                    {(title || label || "").replace('+', '').trim()}
                  </div>
                )}
                <div className="opacity-80 leading-relaxed text-sm font-medium">{content}</div>
                <div className="mt-5 text-[10px] font-black tracking-widest opacity-30 uppercase">Tap anywhere to close</div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
