import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rikishi, GameView, WorldState, RankInfo } from './types';
import Header from './components/Header';
import Navigation from './components/Navigation';
import { simulateDailyNPCBouts, simulateBashoEnd } from './lib/bashoSimulation';
import Dashboard from './components/Dashboard';
import NewsView from './components/NewsView';
import CharacterCreation from './components/CharacterCreation';
import MainMenu from './components/MainMenu';
import SettingsModal from './components/SettingsModal';
import BashoSummary from './components/BashoSummary';
import InterBasho from './components/InterBasho';
import Bout from './components/Bout';
import WorldBrowser from './components/WorldBrowser';
import Leaderboard from './components/Leaderboard';
import { seedWorld } from './lib/worldGeneration';
import { generateBashoSchedule } from './lib/tournamentScheduler';
import { formatRank, abbreviateRank } from './lib/rankLogic';
import { BASHO_NAMES, DIVISIONS } from './constants/world';
import { Settings } from 'lucide-react';
import { secureRandomInt } from './lib/gameLogic';

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [view, setView] = useState<GameView>(() => {
    const saved = sessionStorage.getItem('chanko_current_view');
    if (saved) {
      // If the user was in a basho bout but the app reloaded, reset to dashboard
      // because opponent state is memory-only and is lost on refresh.
      if (saved === 'basho') return 'dashboard';
      return saved as GameView;
    }
    return 'main-menu';
  });
  
  const [worldState, setWorldState] = useState<WorldState | null>(null);
  const [rikishi, setRikishi] = useState<Rikishi | null>(null);
  const [opponent, setOpponent] = useState<Rikishi | null>(null);
  const [oldRank, setOldRank] = useState<RankInfo | null>(null);

  // Sync view state to session storage to persist across iframe reloads
  useEffect(() => {
    sessionStorage.setItem('chanko_current_view', view);
  }, [view]);
  
  useEffect(() => {
    const savedWorld = localStorage.getItem('chanko_world_state');
    if (savedWorld) {
      const parsedWorld: WorldState = JSON.parse(savedWorld);
      setWorldState(parsedWorld);
      const player = parsedWorld.rikishi.find(r => r.id === parsedWorld.playerRikishiId);
      if (player) {
        setRikishi(player);
      }
    } else {
      // Backwards compatibility for older saves
      const saved = localStorage.getItem('chanko_rikishi');
      if (saved) {
        const parsedRikishi = JSON.parse(saved);
        handleCreationComplete(parsedRikishi); // Upgrade to world state
      }
    }
  }, []);

  // Initialize Basho Schedule and simulate NPC bouts for Day 1
  useEffect(() => {
    if (worldState && rikishi && view === 'dashboard' && (!worldState.bashoSchedule || worldState.currentBashoDay === undefined)) {
      const schedule = generateBashoSchedule(worldState.rikishi);
      let day = 1;

      const updatedRikishiAfterNPCs = worldState.rikishi.map(r => {
         if (r.id === rikishi.id) return r;
         const pair = schedule.find(p => p.day === day && (p.rikishiId1 === r.id || p.rikishiId2 === r.id));
         if (pair && pair.rikishiId1 !== rikishi.id && pair.rikishiId2 !== rikishi.id) {
           return simulateDailyNPCBouts(r, day, schedule, worldState.rikishi, 30);
         }
         return r;
      });

      const nextWorld = {
         ...worldState,
         bashoSchedule: schedule,
         currentBashoDay: day,
         rikishi: updatedRikishiAfterNPCs
      };

      setWorldState(nextWorld);
      localStorage.setItem('chanko_world_state', JSON.stringify(nextWorld));
    }
  }, [worldState, rikishi, view]);

  const handleNewGame = () => {
    localStorage.removeItem('chanko_world_state');
    localStorage.removeItem('chanko_rikishi');
    setWorldState(null);
    setRikishi(null);
    setView('creation');
  };

  const createOpponent = () => {
    if (!worldState || !rikishi) return;
    
    // Pick an opponent near the player's rank
    // For now, just pick any random NPC from the same division if possible
    const sameDiv = worldState.rikishi.filter(r => r.isNPC && r.rank.division === rikishi.rank.division);
    let mockOpp = sameDiv.length > 0 
      ? sameDiv[secureRandomInt(sameDiv.length) - 1]
      : worldState.rikishi.filter(r => r.isNPC)[0];
      
    if (!mockOpp) {
      // Fallback if somehow there are no NPCs
      mockOpp = { ...rikishi, id: 'mock', name: 'Mockoshin', isNPC: true };
    }
    setOpponent(mockOpp);
  };

  const handleCreationComplete = (newRikishi: Rikishi) => {
    const generatedWorld = seedWorld();
    const jonokuchiCount = generatedWorld.filter(r => r.rank.division === 'Jonokuchi').length;
    
    // Calculate the absolute bottom of the generated division for the new player
    const playerIndex = jonokuchiCount; // Because it's 0-indexed, the next spot is exactly the count
    const isEast = playerIndex % 2 === 0;
    const bottomNumericalRank = Math.floor(playerIndex / 2) + 1;
    
    const configuredRikishi = {
      ...newRikishi, 
      rank: { 
        division: 'Jonokuchi' as const, 
        title: bottomNumericalRank, 
        side: isEast ? ('East' as const) : ('West' as const) 
      }
    };

    const newWorld: WorldState = {
      currentMonth: 0,
      currentYear: new Date().getFullYear(),
      rikishi: [...generatedWorld, configuredRikishi],
      playerRikishiId: configuredRikishi.id,
      news: []
    };
    
    setWorldState(newWorld);
    setRikishi(configuredRikishi);
    localStorage.setItem('chanko_world_state', JSON.stringify(newWorld));
    setView('dashboard');
  };

  const saveRikishi = (updated: Rikishi) => {
    setRikishi(updated);
    if (worldState) {
      const updatedWorld = {
        ...worldState,
        rikishi: worldState.rikishi.map(r => r.id === updated.id ? updated : r)
      };
      setWorldState(updatedWorld);
      localStorage.setItem('chanko_world_state', JSON.stringify(updatedWorld));
    }
  };

  const handleAction = (action: string) => {
    if (action === 'back') setView('dashboard');
    if (action === 'leaderboard') setView('leaderboard');
    if (action === 'end-basho') {
      if (rikishi && worldState) {
        setOldRank(rikishi.rank);
        const { updatedWorld, updatedPlayer } = simulateBashoEnd(worldState, rikishi);
        saveRikishi({ ...updatedPlayer, momentum: { attribute: null, value: 1 } });
        setWorldState(updatedWorld);
        localStorage.setItem('chanko_world_state', JSON.stringify(updatedWorld));
      }
      setView('basho-summary');
    }
    if (action === 'fight') {
        const savedState = localStorage.getItem('chanko_world_state');
        const currentState = savedState ? JSON.parse(savedState) : worldState;

        if (currentState && rikishi) {
          let schedule = currentState.bashoSchedule;
          let day = currentState.currentBashoDay || 1;

          const pairing = schedule?.find((p: any) => p.day === day && (p.rikishiId1 === rikishi?.id || p.rikishiId2 === rikishi?.id));
          
          if (pairing) {
             const opponentId = pairing.rikishiId1 === rikishi?.id ? pairing.rikishiId2 : pairing.rikishiId1;
             const opponent = currentState.rikishi.find((r: any) => r.id === opponentId) || { ...rikishi, id: 'mock', name: 'Mockoshin', isNPC: true };
             setOpponent(opponent);
             setWorldState(currentState);
             localStorage.setItem('chanko_world_state', JSON.stringify(currentState));
             setView('basho');
          } else {
            createOpponent();
            setView('basho');
          }
        } else {
          createOpponent();
          setView('basho');
        }
    }
    // For testing: allow resetting character
    if (action === 'reset') {
      localStorage.removeItem('chanko_world_state');
      localStorage.removeItem('chanko_rikishi');
      setWorldState(null);
      setRikishi(null);
      setView('creation');
    }
  };

  const handleBoutFinish = (result: { 
    playerWins: boolean, 
    victoryKimarite: string | null, 
    fatigueUsed: boolean,
    focusSpent: number,
    finalRound: number
  }) => {
     if (rikishi && worldState) {
        const savedState = localStorage.getItem('chanko_world_state');
        const currentState = savedState ? JSON.parse(savedState) : worldState;
        
        let day = currentState.currentBashoDay || 1;

        // Round penalty: 1% for each round past round 3
        const roundPenalty = result.finalRound > 3 ? (result.finalRound - 3) : 0;

        // Update player
        const updatedPlayer = { 
          ...rikishi, 
          wins: rikishi.wins + (result.playerWins ? 1 : 0),
          losses: rikishi.losses + (result.playerWins ? 0 : 1),
          // Correctly deduct focus points
          focusPoints: Math.max(0, Math.min(40, rikishi.focusPoints - result.focusSpent + (result.playerWins ? 1 : 0))),
          fatigue: Math.min(100, rikishi.fatigue + (result.fatigueUsed ? 7 : 0) + roundPenalty)
        };
        
        const nextDay = day + 1;
        const schedule = currentState.bashoSchedule;
        
        const divisionInfo = DIVISIONS.find(d => d.name === updatedPlayer.rank.division);
        const maxDays = divisionInfo ? divisionInfo.bouts : 15;

        let updatedRikishiList = currentState.rikishi.map((r: any) => r.id === updatedPlayer.id ? updatedPlayer : r);

        if (schedule && nextDay <= maxDays) {
          updatedRikishiList = updatedRikishiList.map((r: any) => {
             if (r.id === updatedPlayer.id) return r;
             const pair = schedule.find((p: any) => p.day === nextDay && (p.rikishiId1 === r.id || p.rikishiId2 === r.id));
             if (pair && pair.rikishiId1 !== updatedPlayer.id && pair.rikishiId2 !== updatedPlayer.id) {
               return simulateDailyNPCBouts(r, nextDay, schedule, updatedRikishiList, 30);
             }
             return r;
          });
        }

        const updatedWorld = {
          ...currentState,
          currentBashoDay: nextDay,
          rikishi: updatedRikishiList
        };

        setWorldState(updatedWorld);
        setRikishi(updatedPlayer);
        localStorage.setItem('chanko_world_state', JSON.stringify(updatedWorld));
     }
     setView('dashboard');
  };

  return (
    <div className="flex justify-center h-[100dvh] bg-sumo-outer overflow-hidden select-none">
      <div className="relative w-full max-w-md h-full bg-sumo-paper shadow-2xl overflow-hidden flex flex-col border-x border-sumo-earth/20">
        
        <AnimatePresence>
          {showSettings && (
            <SettingsModal 
              onClose={() => setShowSettings(false)}
              onMainMenu={() => {
                setShowSettings(false);
                setView('main-menu');
              }}
              onExit={() => {
                window.close();
              }}
            />
          )}
        </AnimatePresence>

        {view === 'main-menu' ? (
          <MainMenu 
             hasSave={!!worldState && !!rikishi}
             onNewGame={handleNewGame}
             onContinue={() => setView('dashboard')}
          />
        ) : rikishi ? (
          <>
            {/* Header */}
            {view !== 'inter-basho' && view !== 'basho' && view !== 'world' && <Header rikishi={rikishi} />}
            
            {/* Main Content Area */}
            <main className="relative z-10 flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {view === 'dashboard' && (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full"
                  >
                    <Dashboard 
                      rikishi={rikishi} 
                      onAction={handleAction} 
                    />
                  </motion.div>
                )}
                {view === 'basho-summary' && rikishi && (
                  <motion.div
                    key="basho-summary"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full z-20 relative bg-sumo-outer"
                  >
                     <BashoSummary 
                       rikishi={rikishi} 
                       oldRank={oldRank || rikishi.rank}
                       worldState={worldState} 
                       onContinue={() => setView('inter-basho')}
                     />
                  </motion.div>
                )}
                {view === 'inter-basho' && (
                  <motion.div
                    key="inter-basho"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full"
                  >
                    <InterBasho 
                      rikishi={rikishi} 
                      updateRikishi={saveRikishi}
                      onFinish={() => setView('dashboard')}
                    />
                  </motion.div>
                )}
                {view === 'news' && (
                  <motion.div
                    key="news"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full"
                  >
                    <NewsView worldState={worldState} />
                  </motion.div>
                )}
                {view === 'world' && (
                  <motion.div
                    key="world"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full z-20 relative bg-sumo-outer"
                  >
                    <WorldBrowser worldState={worldState} />
                  </motion.div>
                )}
                {view === 'basho' && opponent && (
                  <motion.div 
                    key="basho" 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full"
                  >
                    <Bout 
                      rikishi={rikishi}
                      opponent={opponent}
                      onFinish={handleBoutFinish}
                    />
                  </motion.div>
                )}
                {view === 'leaderboard' && worldState && (
                  <motion.div
                    key="leaderboard"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full"
                  >
                    <Leaderboard
                      rikishi={rikishi}
                      allRikishi={worldState.rikishi}
                      onAction={handleAction}
                    />
                  </motion.div>
                )}
                {view === 'profile' && (
                  <motion.div 
                    key="profile" 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-8 text-center h-full flex flex-col justify-center gap-6"
                  >
                    <h2 className="text-2xl font-serif font-bold text-sumo-earth">Career Records</h2>
                    {rikishi.careerHistory && rikishi.careerHistory.length > 0 ? (
                      <div className="space-y-4 w-full text-left max-h-[60vh] overflow-y-auto no-scrollbar">
                        {[...rikishi.careerHistory].reverse().map((record, i) => (
                          <div key={i} className="p-4 bg-white border border-sumo-earth/30 rounded-2xl shadow-sm text-center">
                            <p className="font-serif italic font-bold uppercase tracking-widest text-[10px] text-sumo-accent mb-1">{BASHO_NAMES[parseInt(record.month as string)] || `Basho ${record.month}`} {record.year}</p>
                            <p className="text-xs uppercase font-bold tracking-widest text-sumo-ink/60 mb-2">{formatRank(record.rank)} <span className="font-serif italic ml-1">{abbreviateRank(record.rank)}</span></p>
                            <div className="text-xl font-mono font-black text-sumo-ink">{record.wins} - {record.losses}</div>
                            {record.isYusho && <div className="text-[9px] uppercase font-bold text-yellow-600 mt-2 tracking-widest">Yusho Winner</div>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-12 border-2 border-dashed border-sumo-earth/30 rounded-3xl opacity-50">
                        <p className="font-serif italic font-bold uppercase tracking-widest text-xs">No Records Found</p>
                        <p className="text-[10px] mt-2 font-bold tracking-tight">Complete your first tournament.</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            {/* Navigation - Hidden during focused gameplay flows */}
            {!['basho', 'basho-summary', 'inter-basho', 'creation'].includes(view) && (
              <Navigation 
                currentView={view} 
                setView={setView} 
                onSettingsClick={() => setShowSettings(true)} 
              />
            )}
          </>
        ) : (
          <CharacterCreation onComplete={handleCreationComplete} />
        )}
      </div>
    </div>
  );
}

