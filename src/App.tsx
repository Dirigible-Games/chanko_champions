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
import { seedWorld } from "./lib/worldGeneration";
import { generateBashoSchedule } from "./lib/tournamentScheduler";
import { formatRank, abbreviateRank } from "./lib/rankLogic";
import { BASHO_NAMES, DIVISIONS } from "./constants/world";
import { Settings } from "lucide-react";
import {
  secureRandomInt,
  performInjuryRoll,
  applyInjury,
} from "./lib/gameLogic";

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
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
    const savedWorld = localStorage.getItem("chanko_world_state");
    if (savedWorld) {
      const parsedWorld: WorldState = JSON.parse(savedWorld);
      setWorldState(parsedWorld);
      const player = parsedWorld.rikishi.find(
        (r) => r.id === parsedWorld.playerRikishiId,
      );
      if (player) {
        setRikishi(player);
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

      const updatedRikishiAfterNPCs = simulateAllBoutsForDay(
        schedule,
        worldState.rikishi,
        day,
        rikishi.id,
      );
      const configuredRikishiList = updatedRikishiAfterNPCs.map((r) =>
        r.id === rikishi.id ? rikishi : r,
      );

      const nextWorld = {
        ...worldState,
        bashoSchedule: schedule,
        currentBashoDay: day,
        rikishi: configuredRikishiList,
      };

      setWorldState(nextWorld);
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

          const finalPlayer = {
            ...updatedPlayer,
            momentum: { attribute: null, value: 1 },
          };

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
          setView("basho");
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

      let updatedRikishiList = currentState.rikishi.map((r: any) =>
        r.id === updatedPlayer.id ? updatedPlayer : r,
      );

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
                    <Dashboard rikishi={rikishi} onAction={handleAction} />
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
