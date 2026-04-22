import { motion } from 'motion/react';
import { LayoutDashboard, Newspaper, Trophy, User, BookOpen, Settings } from 'lucide-react';
import { GameView } from '../types';

interface NavigationProps {
  currentView: GameView;
  setView: (view: GameView) => void;
  onSettingsClick: () => void;
}

export default function Navigation({ currentView, setView, onSettingsClick }: NavigationProps) {
  const navTabs = [
    { id: 'dashboard', label: 'Stable', icon: LayoutDashboard },
    { id: 'news', label: 'News', icon: Newspaper },
    { id: 'world', label: 'World', icon: BookOpen },
    { id: 'profile', label: 'Profile', icon: User },
  ] as const;

  return (
    <nav className="bg-sumo-soft border-t border-sumo-earth px-4 py-4 flex justify-between items-center relative z-50">
      {navTabs.map((tab) => {
        const isActive = currentView === tab.id;
        const Icon = tab.icon;
        
        return (
          <button
            key={tab.id}
            onClick={() => setView(tab.id as GameView)}
            className={`flex flex-col flex-1 items-center group transition-all active:scale-90 ${isActive ? 'text-sumo-accent' : 'opacity-40 text-sumo-ink'}`}
          >
            <div className="mb-1">
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className="text-[8px] font-bold uppercase tracking-wider">
              {tab.label}
            </span>
          </button>
        );
      })}
      
      {/* Settings Button treated like a tab that triggers overlay */}
      <button
        onClick={onSettingsClick}
        className="flex flex-col flex-1 items-center group transition-all active:scale-90 opacity-40 text-sumo-ink"
      >
        <div className="mb-1">
          <Settings size={20} strokeWidth={2} />
        </div>
        <span className="text-[8px] font-bold uppercase tracking-wider">
          Settings
        </span>
      </button>
    </nav>
  );
}
