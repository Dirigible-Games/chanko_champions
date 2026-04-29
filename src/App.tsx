import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AttributeKey, Rikishi, GameView, WorldState, RankInfo } from "./types";
import Header from "./components/Header";
import Navigation from "./components/Navigation";
import {
  simulateAllBoutsForDay,
  simulateBashoEnd,
} from "./lib/bashoSimulation";
import Dashboard from "./components/Dashboard";
import NewsView from "./components/NewsView";
import CharacterCreation from "./components/CharacterCreation";
import MainMenu from "./components/MainMenu";
import SettingsModal from "./components/SettingsModal";
import BashoSummary from "./components/BashoSummary";
import InterBasho from "./components/InterBasho";
import Bout from "./components/Bout";
import InjuryResolution from "./components/InjuryResolution";
import HealthView from "./components/HealthView";
import WorldBrowser from "./components/WorldBrowser";
import Leaderboard from "./components/Leaderboard";
import DevRikishiEditor from "./components/DevRikishiEditor";
import { seedWorld } from "./lib/worldGeneration";
import { generateBashoSchedule } from "./lib/tournamentScheduler";
import { formatRank, abbreviateRank } from "./lib/rankLogic";
import { BASHO_NAMES, DIVISIONS } from "./constants/world";
import { Settings, Wrench } from "lucide-react";
import {
  secureRandomInt,
  performInjuryRoll,
  applyInjury,
} from "./lib/gameLogic";

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [isDevMode, setIsDevMode] = useState(() => localStorage.getItem('chanko_dev_mode') === 'true');
  const [showDevEditor, setShowDevEditor] = useState(false);
  const [view, setView] = useState<GameView>(() => {
    const saved = sessionStorage.getItem("chanko_current_view");
    if (saved) {
      // If the user was in a basho bout but the app reloaded, reset to dashboard
      // because opponent state is memory-only and is lost on refresh.
      if (saved === "basho") return "dashboard";
      return saved as GameView;
    }
    return "main-menu";
  });

  const [worldState, setWorldState] = useState<WorldState | null>(null);
  const [rikishi, setRikishi] = useState<Rikishi | null>(null);
  const [opponent, setOpponent] = useState<Rikishi | null>(null);
  const [oldRank, setOldRank] = useState<RankInfo | null>(null);
  const [pendingInjuryRikishi, setPendingInjuryRikishi] =
    useState<Rikishi | null>(null);

  // Sync view state to session storage to persist across iframe reloads
  useEffect(() => {
    sessionStorage.setItem("chanko_current_view", view);
  }, [view]);

  useEffect(() => {
    const handleDevModeChange = () => {
      setIsDevMode(localStorage.getItem('chanko_dev_mode') === 'true');
    };
    window.addEventListener('chanko_dev_mode_change', handleDevModeChange);
    return () => window.removeEventListener('chanko_dev_mode_change', handleDevModeChange);
  }, []);

  useEffect(() => {
    const savedWorld = localStorage.getItem("chanko_world_state");
    if (savedWorld) {
      try {
        const parsedWorld: WorldState = JSON.parse(savedWorld);
        
        let player = parsedWorld.rikishi.find(
          (r) => r.id === parsedWorld.playerRikishiId,
        );

        // --- SAVE PHYSICIAN RECOVERY LOGIC ---
        // Scenario 1: Player is missing from the world list (Orphaned)
        if (!player && parsedWorld.playerRikishiId) {
          console.warn("Save Physician: Player orphaned. Attempting reconstruction.");
          const legacyPlayer = localStorage.getItem("chanko_rikishi");
          if (legacyPlayer) {
            const recovered = JSON.parse(legacyPlayer);
            if (recovered && recovered.id === parsedWorld.playerRikishiId) {
              player = recovered;
              parsedWorld.rikishi.push(player);
            }
          }
        }

        // Scenario 2: World list was empty/corrupted
        if (!parsedWorld.rikishi || parsedWorld.rikishi.length === 0) {
          console.warn("Save Physician: World corrupt. Re-seeding.");
          const newWorldList = seedWorld();
          parsedWorld.rikishi = newWorldList;
          // Re-insert player if we have one
          if (player) parsedWorld.rikishi.push(player);
        }

        // Scenario 3: Player exists but rank data is corrupted
        if (player && (!player.rank || !player.rank.division)) {
          console.warn("Save Physician: Repairing player rank.");
          player.rank = { division: "Jonokuchi", title: 1, side: "East" };
        }
        // -------------------------------------

        setWorldState(parsedWorld);
        if (player) {
          setRikishi(player);
          // Update the world state back to storage with the repairs if any happened
          localStorage.setItem("chanko_world_state", JSON.stringify(parsedWorld));
        }
      } catch (e) {
        console.error("Save Physician: Failed to parse world state", e);
        localStorage.removeItem("chanko_world_state"); // Clear corrupted state
      }
    } else {
      // Backwards compatibility for older saves
      const saved = localStorage.getItem("chanko_rikishi");
      if (saved) {
        const parsedRikishi = JSON.parse(saved);
        handleCreationComplete(parsedRikishi); // Upgrade to world state
      }
    }
  }, []);

  // Initialize Basho Schedule and simulate NPC bouts for Day 1
  useEffect(() => {
    if (
      worldState &&
      rikishi &&
      view === "dashboard" &&
      (!worldState.bashoSchedule || worldState.currentBashoDay === undefined)
    ) {
      const schedule = generateBashoSchedule(worldState.rikishi);
      let day = 1;

      // Reset boutsFoughtThisBasho for all rikishi
      const resetRikishi = worldState.rikishi.map(r => ({ ...r, boutsFoughtThisBasho: 0 }));

      const updatedRikishiAfterNPCs = simulateAllBoutsForDay(
        schedule,
        resetRikishi,
        day,
        rikishi.id,
      );
      const configuredRikishiList = updatedRikishiAfterNPCs.map((r) =>
        r.id === rikishi.id ? { ...rikishi, boutsFoughtThisBasho: 0 } : r,
      );

      const nextWorld = {
        ...worldState,
        bashoSchedule: schedule,
        currentBashoDay: day,
        rikishi: configuredRikishiList,
      };

      setWorldState(nextWorld);
      setRikishi(prev => prev ? { ...prev, boutsFoughtThisBasho: 0 } : null);
      localStorage.setItem("chanko_world_state", JSON.stringify(nextWorld));
    }
  }, [worldState, rikishi, view]);

  const handleNewGame = () => {
    localStorage.removeItem("chanko_world_state");
    localStorage.removeItem("chanko_rikishi");
    setWorldState(null);
    setRikishi(null);
    setView("creation");
  };

  const createOpponent = () => {
    if (!worldState || !rikishi) return;

    // Pick an opponent near the player's rank
    // For now, just pick any random NPC from the same division if possible
    const sameDiv = worldState.rikishi.filter(
      (r) => r.isNPC && r.rank.division === rikishi.rank.division,
    );
    let mockOpp =
      sameDiv.length > 0
        ? sameDiv[secureRandomInt(sameDiv.length) - 1]
        : worldState.rikishi.filter((r) => r.isNPC)[0];

    if (!mockOpp) {
      // Fallback if somehow there are no NPCs
      mockOpp = { ...rikishi, id: "mock", name: "Mockoshin", isNPC: true };
    }
    setOpponent(mockOpp);
  };

  const handleCreationComplete = (newRikishi: Rikishi) => {
    const generatedWorld = seedWorld();
    const jonokuchiCount = generatedWorld.filter(
      (r) => r.rank.division === "Jonokuchi",
    ).length;

    // Calculate the absolute bottom of the generated division for the new player
    const playerIndex = jonokuchiCount; // Because it's 0-indexed, the next spot is exactly the count
    const isEast = playerIndex % 2 === 0;
    const bottomNumericalRank = Math.floor(playerIndex / 2) + 1;

    const configuredRikishi = {
      ...newRikishi,
      rank: {
        division: "Jonokuchi" as const,
        title: bottomNumericalRank,
        side: isEast ? ("East" as const) : ("West" as const),
      },
    };

    const newWorld: WorldState = {
      currentMonth: 0,
      currentYear: new Date().getFullYear(),
      rikishi: [...generatedWorld, configuredRikishi],
      playerRikishiId: configuredRikishi.id,
      news: [],
    };

    setWorldState(newWorld);
    setRikishi(configuredRikishi);
    localStorage.setItem("chanko_world_state", JSON.stringify(newWorld));
    setView("dashboard");
  };

  const saveRikishi = (updated: Rikishi) => {
    setRikishi(updated);
    if (worldState) {
      const updatedWorld = {
        ...worldState,
        rikishi: worldState.rikishi.map((r) =>
          r.id === updated.id ? updated : r,
        ),
      };
      setWorldState(updatedWorld);
      localStorage.setItem("chanko_world_state", JSON.stringify(updatedWorld));
    }
  };

  const handleAction = (action: string) => {
    console.log("handleAction fired:", action);
    if (action === "back") setView("dashboard");
    if (action === "leaderboard") setView("leaderboard");
    if (action === "end-basho") {
      if (rikishi && worldState) {
        try {
          setOldRank(rikishi.rank);
          const { updatedWorld, updatedPlayer } = simulateBashoEnd(
            worldState,
            rikishi,
          );
          
          if (!updatedPlayer || !updatedPlayer.rank) {
            throw new Error("Simulation failed to produce a valid player state.");
          }

          const finalPlayer = updatedPlayer;

          const finalWorld = {
            ...updatedWorld,
            rikishi: updatedWorld.rikishi.map(r => r.id === finalPlayer.id ? finalPlayer : r)
          };

          // Synchronous update of state to prevent inconsistent rendering
          setRikishi(finalPlayer);
          setWorldState(finalWorld);
          
          localStorage.setItem("chanko_rikishi", JSON.stringify(finalPlayer));
          localStorage.setItem("chanko_world_state", JSON.stringify(finalWorld));
          
          setView("basho-summary");
        } catch (error) {
          console.error("Basho End Simulation Failed:", error);
          setView("main-menu");
        }
      }
    }
    if (action === "kyujo") {
      if (rikishi && worldState) {
        try {
          const updatedPlayer = { ...rikishi, status: 'kyujo' as const };
          
          const maxDays = DIVISIONS.find(d => d.name === updatedPlayer.rank.division)?.bouts || 15;
          let currentDay = worldState.currentBashoDay || 1;
          
          let updatedRikishiList = worldState.rikishi.map(r => r.id === updatedPlayer.id ? updatedPlayer : r);
          
          // Simulate remaining days up to maxDays
          for (let d = currentDay; d <= maxDays; d++) {
             updatedRikishiList = simulateAllBoutsForDay(
               worldState.bashoSchedule || [],
               updatedRikishiList,
               d,
               updatedPlayer.id
             );
          }
          
          // Now fetch the updated player from the list to get applied losses
          const finalUpdatedPlayer = updatedRikishiList.find(r => r.id === updatedPlayer.id) || updatedPlayer;

          const updatedWorld = {
            ...worldState,
            currentBashoDay: maxDays + 1,
            rikishi: updatedRikishiList
          };
          
          setOldRank(finalUpdatedPlayer.rank);
          const result = simulateBashoEnd(updatedWorld, finalUpdatedPlayer);
          
          if (!result.updatedPlayer || !result.updatedPlayer.rank) {
            throw new Error("Simulation failed to produce a valid player state.");
          }

          const finalPlayer = result.updatedPlayer;

          const finalWorld = {
            ...result.updatedWorld,
            rikishi: result.updatedWorld.rikishi.map(r => r.id === finalPlayer.id ? finalPlayer : r)
          };

          setRikishi(finalPlayer);
          setWorldState(finalWorld);
          
          localStorage.setItem("chanko_rikishi", JSON.stringify(finalPlayer));
          localStorage.setItem("chanko_world_state", JSON.stringify(finalWorld));
          
          setView("basho-summary");
        } catch (error) {
          console.error("Basho End Simulation Failed:", error);
          alert("Error: " + (error as Error).message);
          setView("main-menu");
        }
      }
    }
    if (action === "fight") {
      const savedState = localStorage.getItem("chanko_world_state");
      const currentState = savedState ? JSON.parse(savedState) : worldState;

      if (currentState && rikishi) {
        let schedule = currentState.bashoSchedule;
        let day = currentState.currentBashoDay || 1;

        const pairing = schedule?.find(
          (p: any) =>
            p.day === day &&
            (p.rikishiId1 === rikishi?.id || p.rikishiId2 === rikishi?.id),
        );

        if (pairing) {
          const opponentId =
            pairing.rikishiId1 === rikishi?.id
              ? pairing.rikishiId2
              : pairing.rikishiId1;
          const opponent = currentState.rikishi.find(
            (r: any) => r.id === opponentId,
          ) || { ...rikishi, id: "mock", name: "Mockoshin", isNPC: true };
          
          setOpponent(opponent);
          setWorldState(currentState);
          localStorage.setItem(
            "chanko_world_state",
            JSON.stringify(currentState),
          );

          if (opponent.status === 'kyujo' || opponent.status === 'retired') {
             alert(`${opponent.name} is kyujo (withdrawn). You win by default (Fusen-sho).`);
             handleBoutFinish({
                playerWins: true,
                victoryKimarite: 'Fusen-sho',
                fatigueUsed: false,
                focusSpent: 0,
                finalRound: 1,
                hasInjuryTrigger: false
             });
          } else {
             setView("basho");
          }
        } else {
          createOpponent();
          setView("basho");
        }
      } else {
        createOpponent();
        setView("basho");
      }
    }
    if (action === "health") {
      setView("health");
    }
    // For testing: allow resetting character
    if (action === "reset") {
      localStorage.removeItem("chanko_world_state");
      localStorage.removeItem("chanko_rikishi");
      setWorldState(null);
      setRikishi(null);
      setView("creation");
    }
  };

  const handleBoutFinish = (result: {
    playerWins: boolean;
    victoryKimarite: string | null;
    fatigueUsed: boolean;
    focusSpent: number;
    finalRound: number;
    hasInjuryTrigger: boolean;
  }) => {
    if (rikishi && worldState) {
      const savedState = localStorage.getItem("chanko_world_state");
      const currentState = savedState ? JSON.parse(savedState) : worldState;

      let day = currentState.currentBashoDay || 1;

      // Round penalty: 1% for each round past round 3
      const roundPenalty = result.finalRound > 3 ? result.finalRound - 3 : 0;

      // Update player
      const updatedPlayer = {
        ...rikishi,
        wins: rikishi.wins + (result.playerWins ? 1 : 0),
        losses: rikishi.losses + (result.playerWins ? 0 : 1),
        boutsFoughtThisBasho: (rikishi.boutsFoughtThisBasho || 0) + 1,
        // Correctly deduct focus points
        focusPoints: Math.max(
          0,
          Math.min(
            40,
            rikishi.focusPoints -
              result.focusSpent +
              (result.playerWins ? 1 : 0),
          ),
        ),
        fatigue: Math.min(
          100,
          rikishi.fatigue + (result.fatigueUsed ? 7 : 0) + roundPenalty,
        ),
      };

      const nextDay = day + 1;
      const schedule = currentState.bashoSchedule;

      const divisionInfo = DIVISIONS.find(
        (d) => d.name === updatedPlayer.rank.division,
      );
      const maxDays = divisionInfo ? divisionInfo.bouts : 15;

      const currentBout = currentState.bashoSchedule?.find(
        (p: any) => p.day === day && (p.rikishiId1 === updatedPlayer.id || p.rikishiId2 === updatedPlayer.id)
      );
      const actualOpponentId = currentBout 
        ? (currentBout.rikishiId1 === updatedPlayer.id ? currentBout.rikishiId2 : currentBout.rikishiId1)
        : null;

      let updatedRikishiList = currentState.rikishi.map((r: any) => {
        if (r.id === updatedPlayer.id) return updatedPlayer;
        if (actualOpponentId && r.id === actualOpponentId) {
           return {
             ...r,
             wins: r.wins + (result.playerWins ? 0 : 1),
             losses: r.losses + (result.playerWins ? 1 : 0),
           };
        }
        return r;
      });

      if (schedule && nextDay <= maxDays) {
        updatedRikishiList = simulateAllBoutsForDay(
          schedule,
          updatedRikishiList,
          nextDay,
          updatedPlayer.id,
        );
      }

      const updatedWorld = {
        ...currentState,
        currentBashoDay: nextDay,
        rikishi: updatedRikishiList,
      };

      setWorldState(updatedWorld);
      localStorage.setItem("chanko_world_state", JSON.stringify(updatedWorld));

      if (result.hasInjuryTrigger) {
        setPendingInjuryRikishi(updatedPlayer);
        setView("injury-resolution");
      } else {
        setRikishi(updatedPlayer);
        if (nextDay > maxDays) {
          setView("dashboard");
        } else {
          setView("dashboard");
        }
      }
    }
  };

  const handleInjuryResolutionComplete = (updated: Rikishi) => {
    saveRikishi(updated);
    setPendingInjuryRikishi(null);
    if (worldState) {
      const divisionInfo = DIVISIONS.find(
        (d) => d.name === updated.rank.division,
      );
      const maxDays = divisionInfo ? divisionInfo.bouts : 15;
      if (worldState.currentBashoDay > maxDays) {
        setView("dashboard");
      } else {
        setView("dashboard");
      }
    } else {
      setView("dashboard");
    }
  };

  if (!rikishi && view !== "main-menu" && view !== "creation") {
    // If we're missing rikishi data but not on start screens, reset to safely recover
    setView("main-menu");
    return null;
  }

  return (
    <div className="flex justify-center h-[100dvh] bg-sumo-outer overflow-hidden select-none">
      <div className="relative w-full max-w-md h-full bg-sumo-paper shadow-2xl overflow-hidden flex flex-col border-x border-sumo-earth/20">
        
        {/* Dev Tools Render */}
        {isDevMode && rikishi && (
          <button 
            onClick={() => setShowDevEditor(true)}
            className="absolute bottom-24 left-4 z-50 p-3 bg-yellow-500 hover:bg-yellow-400 text-yellow-950 rounded-full shadow-lg transition shadow-yellow-500/20"
          >
            <Wrench size={24} />
          </button>
        )}
        <AnimatePresence>
          {showDevEditor && rikishi && (
            <DevRikishiEditor 
              rikishi={rikishi} 
              onSave={saveRikishi} 
              onClose={() => setShowDevEditor(false)} 
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSettings && (
            <SettingsModal
              onClose={() => setShowSettings(false)}
              onMainMenu={() => {
                setShowSettings(false);
                // Hard refresh to reload the application and return to main-menu (default state)
                window.location.reload();
              }}
              onExit={() => {
                setShowSettings(false);
                setView("main-menu");
                // Attempt to close window, but fallback to main menu is already handled above
                try {
                  window.close();
                } catch (e) {
                  // Ignore security block on window.close()
                }
              }}
            />
          )}
        </AnimatePresence>

        {view === "main-menu" ? (
          <MainMenu
            hasSave={!!worldState && !!rikishi}
            onNewGame={handleNewGame}
            onContinue={() => setView("dashboard")}
          />
        ) : rikishi ? (
          <>
            {/* Header */}
            {view !== "inter-basho" && view !== "basho" && view !== "world" && (
              <Header rikishi={rikishi} />
            )}

            {/* Main Content Area */}
            <main className="relative z-10 flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {view === "dashboard" && (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full"
                  >
                    <Dashboard rikishi={rikishi} worldState={worldState} onAction={handleAction} />
                  </motion.div>
                )}
                {view === "basho-summary" && rikishi && (
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
                      onContinue={() => setView("inter-basho")}
                    />
                  </motion.div>
                )}
                {view === "inter-basho" && (
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
                      onFinish={() => setView("dashboard")}
                    />
                  </motion.div>
                )}
                {view === "news" && (
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
                {view === "world" && (
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
                {view === "basho" && opponent && (
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
                {view === "injury-resolution" && pendingInjuryRikishi && (
                  <motion.div
                    key="injury-resolution"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full"
                  >
                    <InjuryResolution
                      rikishi={pendingInjuryRikishi}
                      onComplete={handleInjuryResolutionComplete}
                    />
                  </motion.div>
                )}
                {view === "health" && rikishi && (
                  <motion.div
                    key="health"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full"
                  >
                    <HealthView
                      rikishi={rikishi}
                      onBack={() => setView("dashboard")}
                    />
                  </motion.div>
                )}
                {view === "leaderboard" && worldState && (
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
                {view === "profile" && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-8 text-center h-full flex flex-col justify-center gap-6"
                  >
                    <h2 className="text-2xl font-serif font-bold text-sumo-earth">
                      Career Records
                    </h2>
                    {rikishi.careerHistory &&
                    rikishi.careerHistory.length > 0 ? (
                      <div className="space-y-4 w-full text-left max-h-[60vh] overflow-y-auto no-scrollbar">
                        {[...rikishi.careerHistory]
                          .reverse()
                          .map((record, i) => (
                            <div
                              key={i}
                              className="p-4 bg-white border border-sumo-earth/30 rounded-2xl shadow-sm text-center"
                            >
                              <p className="font-serif italic font-bold uppercase tracking-widest text-[10px] text-sumo-accent mb-1">
                                {BASHO_NAMES[
                                  parseInt(record.month as string)
                                ] || `Basho ${record.month}`}{" "}
                                {record.year}
                              </p>
                              <p className="text-xs uppercase font-bold tracking-widest text-sumo-ink/60 mb-2">
                                {formatRank(record.rank)}{" "}
                                <span className="font-serif italic ml-1">
                                  {abbreviateRank(record.rank)}
                                </span>
                              </p>
                              <div className="text-xl font-mono font-black text-sumo-ink">
                                {record.wins} - {record.losses}
                              </div>
                              {record.isYusho && (
                                <div className="text-[9px] uppercase font-bold text-yellow-600 mt-2 tracking-widest">
                                  Yusho Winner
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="p-12 border-2 border-dashed border-sumo-earth/30 rounded-3xl opacity-50">
                        <p className="font-serif italic font-bold uppercase tracking-widest text-xs">
                          No Records Found
                        </p>
                        <p className="text-[10px] mt-2 font-bold tracking-tight">
                          Complete your first tournament.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            {/* Navigation - Hidden during focused gameplay flows */}
            {!["basho", "basho-summary", "inter-basho", "creation"].includes(
              view,
            ) && (
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
