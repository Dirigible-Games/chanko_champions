import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Rikishi, BoutState, Kimarite, Stance, AttributeKey } from '../types';
import { TACHIAI_MOVES, OFFENSIVE_MOVES, DEFENSIVE_MOVES } from '../constants/combat';
import { 
  performCombatRoll, 
  resolveTachiai, 
  getEffectiveBaseDie, 
  getEffectiveStats, 
  calculateStatBonus,
  performMonoii,
  selectNPCMove,
  decideNPCResources
} from '../lib/gameLogic';
import { Shield, Swords, Zap, AlertCircle, ChevronRight, Check, Trophy, Award } from 'lucide-react';
import { AttributeIcon } from './AttributeIcon';
import { abbreviateRank } from '../lib/rankLogic';

const VICTORY_DESCRIPTIONS: Record<string, string> = {
  'Yorikiri': '{winner} forced {loser} out of the ring while maintaining a steady belt grip.',
  'Uwatehineri': '{winner} twisted {loser} down to the clay with a powerful overarm grip.',
  'Uwatenage': '{winner} executed a massive overarm throw, sending {loser} to the dirt.',
  'Shitatenage': '{winner} used an underarm throw to swing {loser} out of balance and down.',
  'Kakenage': '{winner} hooked {loser}\'s leg and threw them down in a single motion.',
  'Kotenage': '{winner} applied an armlock and threw {loser} across the ring.',
  'Sukuinage': '{winner} scooped {loser} off balance and threw them without needing a belt grip.',
  'Kubinage': '{winner} secured a neck-lock and threw {loser} to the ground.',
  'Sotogake': '{winner} hooked {loser}\'s leg from the outside and tripped them backwards.',
  'Ashitori': '{winner} reached down for {loser}\'s leg and snatched it, causing them to collapse.',
  'Kekaeshi': '{winner} kicked out {loser}\'s supporting foot, sending them tumbling.',
  'Kirikaeshi': '{winner} twisted {loser} over their leg, tripping them onto the clay.',
  'Tsuridashi': '{winner} lifted the massive {loser} off the ground and carried them out of the ring.',
  'Katasukashi': '{winner} grabbed {loser}\'s underarm and swung them down by the shoulder.',
  'Hikiotoshi': '{winner} pulled {loser} forward and down by the shoulders, using their own weight against them.',
  'Kimedashi': '{winner} clamped {loser}\'s arms and marched them out over the straw.',
  'Hatakikomi': '{winner} slapped {loser} down to the ring floor as they charged in.',
  'Okuridashi': '{winner} circled behind {loser} and pushed them out from the rear.',
  'Tsukidashi': '{winner} delivered a series of rapid thrusts, knocking {loser} clean out of the ring.',
  'Oshidashi': '{winner} kept low and pushed {loser} backwards across the boundary.',
  'Sashichigae': 'The Gyo-ji\'s decision was reversed; {winner} is declared the rightful winner.',
};

function getVictoryFlavor(kimarite: string | null, winnerName: string, loserName: string): string {
  if (!kimarite) return `${winnerName} has won the match.`;
  const description = VICTORY_DESCRIPTIONS[kimarite];
  if (!description) return `${winnerName} has defeated ${loserName} via ${kimarite}.`;
  return description.replace('{winner}', winnerName).replace('{loser}', loserName);
}

function BonusTooltip({ label, content }: { label: string, content: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <span 
        onClick={() => setIsOpen(true)}
        className="text-[7.5px] font-mono font-bold text-sumo-ink/50 uppercase tracking-widest cursor-pointer border-b border-sumo-ink/20 border-dotted mt-0.5"
      >
        {label}
      </span>
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 bg-sumo-earth/80 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, type: "spring", bounce: 0.4 }}
                className="relative bg-white text-sumo-ink p-5 rounded-2xl shadow-xl max-w-[280px] w-full font-sans text-center border-t-4 border-t-red-700"
              >
                <div className="font-black text-lg mb-2 capitalize tracking-tight">{label.replace('+', '').trim()}</div>
                <div className="opacity-80 leading-relaxed text-sm">{content.split(': ')[1] || content}</div>
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

interface BoutProps {
  rikishi: Rikishi;
  opponent: Rikishi; // Mock opponent for now
  onFinish: (result: { playerWins: boolean, victoryKimarite: string | null, fatigueUsed: boolean }) => void;
}

export default function Bout({ rikishi, opponent, onFinish }: BoutProps) {
  const [state, setState] = useState<BoutState>({
    round: 1,
    attackerId: 'player', // Will be decided after Tachiai
    playerStance: 'Neutral',
    opponentStance: 'Neutral',
    logs: ['Stallions enter the ring...', 'Hands reaching for the clay...'],
    isFinished: false,
    winnerId: null,
    victoryKimarite: null,
    isMonoii: false,
    fatigueDieUsed: false
  });

  const [phase, setPhase] = useState<'tachiai' | 'stance_selection' | 'combat' | 'result'>('tachiai');
  const [pendingStanceSelection, setPendingStanceSelection] = useState<{
    availableStances: Stance[];
    nextAttackerId: 'player' | 'opponent';
  } | null>(null);
  const [selectedMove, setSelectedMove] = useState<Kimarite | null>(null);
  const [showDice, setShowDice] = useState<{ 
    id: string, 
    player: { rolls: number[], total: number, usedFocus: boolean, usedFatigue: boolean, maxVal: number, irVal: number, moveName: string, statBonus: number, roundBonus: number, counterVal: number, primaryAttr: AttributeKey, secondaryAttr: AttributeKey, primaryVal: number, secondaryVal: number }, 
    opponent: { rolls: number[], total: number, usedFocus: boolean, usedFatigue: boolean, maxVal: number, irVal: number, moveName: string, statBonus: number, roundBonus: number, counterVal: number, primaryAttr: AttributeKey, secondaryAttr: AttributeKey, primaryVal: number, secondaryVal: number } 
  } | null>(null);

  const getMoveName = (id: string) => [...TACHIAI_MOVES, ...OFFENSIVE_MOVES, ...DEFENSIVE_MOVES].find(m => m.id === id)?.name || id;

  // Helper for flash animation color
  const getFlashColor = (val: number, max: number, finalColor: string) => {
    // Treat < 35% of max as low (red), > 80% as high (green), else neutral slight flash
    if (val <= max * 0.35) return "#ef4444"; // red-500
    if (val >= max * 0.8) return "#22c55e"; // green-500
    return "#e5e7eb"; // gray-200
  };
  const [isRolling, setIsRolling] = useState(false);
  const [useFocus, setUseFocus] = useState(false);
  const [useFatigueDie, setUseFatigueDie] = useState(false);

  const playerStats = getEffectiveStats(rikishi);
  const opponentStats = getEffectiveStats(opponent);
  const playerBaseDie = getEffectiveBaseDie(rikishi);
  const opponentBaseDie = getEffectiveBaseDie(opponent);

  const isElite = rikishi.rank.title === 'Ozeki' || rikishi.rank.title === 'Yokozuna';
  const focusCost = isElite ? 5 : 4;
  const focusAdd = isElite ? 4 : 3;

  const addLog = (msg: string) => {
    setState(prev => ({ ...prev, logs: [...prev.logs, msg] }));
  };

  const handleStanceSelected = (stance: Stance) => {
    if (!pendingStanceSelection) return;
    
    addLog(`Transitions into ${stance} stance.`);
    
    const isPlayerNextAttacker = pendingStanceSelection.nextAttackerId === 'player';
    
    setState(prev => ({
      ...prev,
      attackerId: pendingStanceSelection.nextAttackerId,
      playerStance: isPlayerNextAttacker ? stance : 'Neutral',
      opponentStance: !isPlayerNextAttacker ? stance : 'Neutral',
    }));
    
    setPhase('combat');
    setPendingStanceSelection(null);
    setIsRolling(false);
    setSelectedMove(null);
  };

  const executeTachiai = (move: Kimarite) => {
    if (isRolling) return;
    setIsRolling(true);
    setSelectedMove(move);
    setState(prev => ({ ...prev, logs: [] }));

    // Opponent picks AI Tachiai
    const opponentMove = selectNPCMove(opponent, TACHIAI_MOVES, true);
    
    // NPC Resources
    const oResources = decideNPCResources(opponent, rikishi);
    
    setTimeout(() => {
      // Calculate Bonuses
      const pMoveSumPlayer = playerStats[move.primaryAttr] + playerStats[move.secondaryAttr];
      const pMoveSumOpponent = opponentStats[move.primaryAttr] + opponentStats[move.secondaryAttr];
      const playerBonus = calculateStatBonus(
        pMoveSumPlayer,
        pMoveSumOpponent,
        isElite
      );
      
      const oMoveSumOpponent = opponentStats[opponentMove.primaryAttr] + opponentStats[opponentMove.secondaryAttr];
      const oMoveSumPlayer = playerStats[opponentMove.primaryAttr] + playerStats[opponentMove.secondaryAttr];
      const opponentBonus = calculateStatBonus(
        oMoveSumOpponent,
        oMoveSumPlayer,
        opponent.rank.title === 'Ozeki' || opponent.rank.title === 'Yokozuna'
      );

      // IR Bonuses
      let playerIr = 0;
      let opponentIr = 0;
      let pCounterVal = 0;
      let oCounterVal = 0;

      // Check Counters
      if (move.counters?.includes(opponentMove.id)) {
        playerIr = isElite ? 8 : 6;
        pCounterVal = playerIr;
        addLog(`${move.name} counters ${opponentMove.name}!`);
      }
      if (opponentMove.counters?.includes(move.id)) {
        opponentIr = (opponent.rank.title === 'Ozeki' || opponent.rank.title === 'Yokozuna') ? 8 : 6;
        oCounterVal = opponentIr;
        addLog(`${opponentMove.name} counters ${move.name}!`);
      }

      // Check for Specialization (Tachiai usually doesn't have spec, but following rule)
      const isSpecActive = rikishi.specializations.some(s => s.kimariteId.toLowerCase() === move.id.toLowerCase());
      if (isSpecActive && !opponentMove.counters?.includes(move.id)) {
        playerIr = Math.max(playerIr, 4);
      }

      const oSpecActive = opponent.specializations.some(s => s.kimariteId.toLowerCase() === opponentMove.id.toLowerCase());
      if (oSpecActive && !move.counters?.includes(opponentMove.id)) {
        opponentIr = Math.max(opponentIr, 4);
      }

      // Focus / Fatigue Die
      if (useFocus) {
        playerIr = Math.max(playerIr, focusAdd);
        setState(prev => ({ ...prev, focusPoints: prev.focusPoints - focusCost }));
        addLog(`Spent ${focusCost} Focus Points for ir${focusAdd}.`);
      }
      if (useFatigueDie) {
        playerIr = Math.max(playerIr, 4);
        setState(prev => ({ ...prev, fatigueDieUsed: true }));
        addLog("Using Fatigue Die! +ir4 at the cost of your stamina.");
      }

      let oUseFatigue = false;
      if (oResources.useFocus) {
        const oFocusAdd = (opponent.rank.title === 'Ozeki' || opponent.rank.title === 'Yokozuna') ? 4 : 3;
        opponentIr = Math.max(opponentIr, oFocusAdd);
        addLog(`${opponent.name} channels deep focus! (+ir${oFocusAdd})`);
      }
      if (oResources.useFatigue) {
        opponentIr = Math.max(opponentIr, 4);
        oUseFatigue = true;
        addLog(`${opponent.name} pushes their stamina to the limit! (+ir4)`);
      }

      const pRoll = performCombatRoll(playerBaseDie, playerBonus, playerIr);
      const oRoll = performCombatRoll(opponentBaseDie, opponentBonus, opponentIr);

      setShowDice({ 
        id: Math.random().toString(),
        player: { ...pRoll, usedFocus: useFocus, usedFatigue: useFatigueDie, maxVal: playerBaseDie + playerBonus, irVal: playerIr, moveName: move.name, statBonus: playerBonus, roundBonus: 0, counterVal: pCounterVal, primaryAttr: move.primaryAttr, secondaryAttr: move.secondaryAttr, primaryVal: playerStats[move.primaryAttr], secondaryVal: playerStats[move.secondaryAttr] }, 
        opponent: { ...oRoll, usedFocus: oResources.useFocus, usedFatigue: oUseFatigue, maxVal: opponentBaseDie + opponentBonus, irVal: opponentIr, moveName: opponentMove.name, statBonus: opponentBonus, roundBonus: 0, counterVal: oCounterVal, primaryAttr: opponentMove.primaryAttr, secondaryAttr: opponentMove.secondaryAttr, primaryVal: opponentStats[opponentMove.primaryAttr], secondaryVal: opponentStats[opponentMove.secondaryAttr] } 
      });
      
      const result = resolveTachiai(pRoll.total, oRoll.total);

      setTimeout(() => {
        setUseFocus(false);
        setUseFatigueDie(false);
        if (result === 'matta') {
          addLog('MATTA! A false start! The rikishi reset...');
          setIsRolling(false);
          setSelectedMove(null);
        } else if (result.includes('critical')) {
          const winner = result === 'player_critical' ? 'player' : 'opponent';
          setState(prev => ({
            ...prev,
            isFinished: true,
            winnerId: winner,
            victoryKimarite: winner === 'player' ? move.name : opponentMove.name,
            logs: [...prev.logs, `${winner === 'player' ? rikishi.name : opponent.name} wins by CRITICAL TACHIAI!`]
          }));
          setPhase('result');
        } else {
          const winner = result === 'player_win' ? 'player' : 'opponent';
          const winnerMove = winner === 'player' ? move : opponentMove;
          const nextStances = winnerMove.transitionsTo || ['Neutral'];
          
          addLog(`${winner === 'player' ? rikishi.name : opponent.name} wins the Tachiai!`);
          
          if (winner === 'player' && nextStances.length > 1) {
            setPendingStanceSelection({
              availableStances: nextStances,
              nextAttackerId: 'player'
            });
            setState(prev => ({ ...prev, round: 2 }));
            setPhase('stance_selection');
          } else {
            const nextStance = nextStances[Math.floor(Math.random() * nextStances.length)];
            addLog(`Transitions into ${nextStance} stance.`);
            
            setState(prev => ({
              ...prev,
              attackerId: winner,
              playerStance: winner === 'player' ? nextStance : 'Neutral',
              opponentStance: winner === 'opponent' ? nextStance : 'Neutral',
              round: 2
            }));
            setPhase('combat');
            setIsRolling(false);
            setSelectedMove(null);
          }
        }
      }, 4500); // Wait for the sequenced dice animation (Player 5 -> total, Opponent 5 -> total)
    }, 500);
  };

  const executeCombatRound = (playerMove: Kimarite) => {
    if (isRolling) return;
    setIsRolling(true);
    setSelectedMove(playerMove);
    setState(prev => ({ ...prev, logs: [] }));

    const isPlayerAttacking = state.attackerId === 'player';
    
    // Opponent Move Selection via AI
    let opponentMove: Kimarite;
    if (isPlayerAttacking) {
      opponentMove = selectNPCMove(opponent, DEFENSIVE_MOVES, false);
    } else {
      const stanceMoves = OFFENSIVE_MOVES.filter(m => m.stanceRequirement === state.opponentStance);
      opponentMove = selectNPCMove(opponent, stanceMoves, false);
    }

    const oResources = decideNPCResources(opponent, rikishi);

    setTimeout(() => {
      const roundBonus = state.round;
      
      const pMoveSumPlayer = playerStats[playerMove.primaryAttr] + playerStats[playerMove.secondaryAttr];
      const pMoveSumOpponent = opponentStats[playerMove.primaryAttr] + opponentStats[playerMove.secondaryAttr];
      
      const oMoveSumOpponent = opponentStats[opponentMove.primaryAttr] + opponentStats[opponentMove.secondaryAttr];
      const oMoveSumPlayer = playerStats[opponentMove.primaryAttr] + playerStats[opponentMove.secondaryAttr];

      const pBonus = isPlayerAttacking ? roundBonus : 0;
      const oBonus = !isPlayerAttacking ? roundBonus : 0;
      
      const pStatBonus = calculateStatBonus(pMoveSumPlayer, pMoveSumOpponent, isElite);
      const oStatBonus = calculateStatBonus(oMoveSumOpponent, oMoveSumPlayer, opponent.rank.title === 'Ozeki' || opponent.rank.title === 'Yokozuna');

      let pIr = 0;
      let oIr = 0;
      let pCounterVal = 0;
      let oCounterVal = 0;

      if (playerMove.counters?.includes(opponentMove.id)) {
        pIr = isElite ? 8 : 6;
        pCounterVal = pIr;
        addLog(`${playerMove.name} counters ${opponentMove.name}!`);
      }
      if (opponentMove.counters?.includes(playerMove.id)) {
        oIr = (opponent.rank.title === 'Ozeki' || opponent.rank.title === 'Yokozuna') ? 8 : 6;
        oCounterVal = oIr;
        addLog(`${opponentMove.name} counters ${playerMove.name}!`);
      }

      const isSpecActive = rikishi.specializations.some(s => s.kimariteId.toLowerCase() === playerMove.id.toLowerCase());
      if (isSpecActive && !opponentMove.counters?.includes(playerMove.id)) {
        // Specialization checks current stats: logic should check if specialization is ACTIVE
        // But doc says "+ir4 when using that specific kimarite"
        // And "if rikishi gets injured... specialization becomes inactive".
        // My getEffectiveStats already handles injury penalties. 
        // I should verify if effective stats meet 8/5.
        const spec = rikishi.specializations.find(s => s.kimariteId.toLowerCase() === playerMove.id.toLowerCase());
        if (spec && playerStats[spec.primaryAttr] >= 8 && playerStats[spec.secondaryAttr] >= 5) {
          pIr = Math.max(pIr, 4);
          addLog("SPECIALIZATION BONUS ACTIVE (+ir4)");
        }
      }

      const oSpec = opponent.specializations?.find(s => s.kimariteId.toLowerCase() === opponentMove.id.toLowerCase());
      if (oSpec && !playerMove.counters?.includes(opponentMove.id)) {
        if (opponentStats[oSpec.primaryAttr] >= 8 && opponentStats[oSpec.secondaryAttr] >= 5) {
          oIr = Math.max(oIr, 4);
        }
      }

      if (useFocus) {
        pIr = Math.max(pIr, focusAdd);
        setState(prev => ({ ...prev, focusPoints: prev.focusPoints - focusCost }));
        addLog(`Focus Die used (+ir${focusAdd})`);
      }
      if (useFatigueDie) {
        pIr = Math.max(pIr, 4);
        setState(prev => ({ ...prev, fatigueDieUsed: true }));
        addLog("Fatigue Die used (+ir4)");
      }

      let oUseFatigue = false;
      if (oResources.useFocus) {
        const oFocusAdd = (opponent.rank.title === 'Ozeki' || opponent.rank.title === 'Yokozuna') ? 4 : 3;
        oIr = Math.max(oIr, oFocusAdd);
        addLog(`${opponent.name} focuses their attacks! (+ir${oFocusAdd})`);
      }
      if (oResources.useFatigue) {
        oIr = Math.max(oIr, 4);
        oUseFatigue = true;
        addLog(`${opponent.name} burns stamina pushing the attack! (+ir4)`);
      }

      const pRoll = performCombatRoll(playerBaseDie, pBonus + pStatBonus, pIr);
      const oRoll = performCombatRoll(opponentBaseDie, oBonus + oStatBonus, oIr);

      setShowDice({ 
        id: Math.random().toString(),
        player: { ...pRoll, usedFocus: useFocus, usedFatigue: useFatigueDie, maxVal: playerBaseDie + pBonus + pStatBonus, irVal: pIr, moveName: playerMove.name, statBonus: pStatBonus, roundBonus: pBonus, counterVal: pCounterVal, primaryAttr: playerMove.primaryAttr, secondaryAttr: playerMove.secondaryAttr, primaryVal: playerStats[playerMove.primaryAttr], secondaryVal: playerStats[playerMove.secondaryAttr] }, 
        opponent: { ...oRoll, usedFocus: oResources.useFocus, usedFatigue: oUseFatigue, maxVal: opponentBaseDie + oBonus + oStatBonus, irVal: oIr, moveName: opponentMove.name, statBonus: oStatBonus, roundBonus: oBonus, counterVal: oCounterVal, primaryAttr: opponentMove.primaryAttr, secondaryAttr: opponentMove.secondaryAttr, primaryVal: opponentStats[opponentMove.primaryAttr], secondaryVal: opponentStats[opponentMove.secondaryAttr] } 
      });

      setTimeout(() => {
        setUseFocus(false);
        setUseFatigueDie(false);
        const attackerRoll = isPlayerAttacking ? pRoll.total : oRoll.total;
        const defenderRoll = isPlayerAttacking ? oRoll.total : pRoll.total;

        if (attackerRoll > defenderRoll) {
          const isMonoiiEligible = isPlayerAttacking && attackerRoll <= defenderRoll + 3;
          
          const resolveVictory = () => {
             const winnerId = isPlayerAttacking ? 'player' : 'opponent';
             setState(prev => ({
               ...prev,
               isFinished: true,
               winnerId,
               victoryKimarite: isPlayerAttacking ? playerMove.name : opponentMove.name,
               logs: [...prev.logs, `${winnerId === 'player' ? rikishi.name : opponent.name} wins by ${isPlayerAttacking ? playerMove.name : opponentMove.name}!`]
             }));
             setPhase('result');
          };

          if (isMonoiiEligible) {
            addLog("MONO-II!");
            const monoiiResult = performMonoii();
            if (monoiiResult === 'attacker') {
              addLog("Ruling stands.");
              resolveVictory();
            } else if (monoiiResult === 'rematch') {
              addLog("TORINAOSHI!");
              setState(prev => ({ ...prev, round: prev.round + 1 }));
              setPhase('tachiai');
              setIsRolling(false);
              setSelectedMove(null);
            } else {
              addLog("Ruling reversed!");
              const winnerId = 'opponent';
               setState(prev => ({
               ...prev,
               isFinished: true,
               winnerId,
               victoryKimarite: 'Sashichigae',
               logs: [...prev.logs, `${opponent.name} wins by reversal!`]
             }));
             setPhase('result');
            }
          } else {
            resolveVictory();
          }
        } else {
          // Defender logic
          const dRoll = isPlayerAttacking ? oRoll.total : pRoll.total;
          const aRoll = isPlayerAttacking ? pRoll.total : oRoll.total;
          
          if (dRoll >= aRoll + 50) {
             addLog("CRITICAL DEFENSE! Defender earns momentum for next round (+4).");
             // Add bonus logic for next round if needed
          }

          const defenderMove = isPlayerAttacking ? opponentMove : playerMove;
          const nextStances = defenderMove.transitionsTo || ['Neutral'];
          
          addLog(`${isPlayerAttacking ? opponent.name : rikishi.name} defends with ${defenderMove.name}!`);
          
          if (!isPlayerAttacking && nextStances.length > 1) {
            setPendingStanceSelection({
              availableStances: nextStances,
              nextAttackerId: 'player'
            });
            setState(prev => ({ ...prev, round: prev.round + 1 }));
            setPhase('stance_selection');
          } else {
            const nextStance = nextStances[Math.floor(Math.random() * nextStances.length)];
            addLog(`Transitions into ${nextStance} stance.`);
            
            setState(prev => ({
              ...prev,
              attackerId: prev.attackerId === 'player' ? 'opponent' : 'player',
              playerStance: isPlayerAttacking ? 'Neutral' : nextStance,
              opponentStance: isPlayerAttacking ? nextStance : 'Neutral',
              round: prev.round + 1
            }));
            setIsRolling(false);
            setSelectedMove(null);
          }
        }
      }, 4500); // 4500ms timeout to wait for the staggered sequential dice UI animation to fully complete
    }, 500);
  };

  return (
    <div className="h-full flex flex-col bg-sumo-paper overflow-hidden relative">
      <div className="absolute inset-0 bg-[url('/clay-texture.png')] opacity-5 pointer-events-none" />
      
      {/* Combat Info Bar (Moved above Dohyo) */}
      <div className="bg-sumo-ink p-3 flex justify-between items-center text-white shrink-0 z-10 shadow-md">
        {/* Left Side: Player */}
        <div className="flex flex-col items-start w-[38%]">
           <span className="font-bold font-serif text-sm truncate w-full">{rikishi.name} <span className="opacity-60 italic text-xs ml-0.5">{abbreviateRank(rikishi.rank)}</span></span>
           <div className="flex gap-1.5 mt-1 flex-wrap">
             <div className="flex items-center gap-0.5"><AttributeIcon attr="power" className="text-white opacity-80" size={10} /><span className="text-[10px] font-mono">{playerStats.power}</span></div>
             <div className="flex items-center gap-0.5"><AttributeIcon attr="balance" className="text-white opacity-80" size={10} /><span className="text-[10px] font-mono">{playerStats.balance}</span></div>
             <div className="flex items-center gap-0.5"><AttributeIcon attr="footwork" className="text-white opacity-80" size={10} /><span className="text-[10px] font-mono">{playerStats.footwork}</span></div>
             <div className="flex items-center gap-0.5"><AttributeIcon attr="technique" className="text-white opacity-80" size={10} /><span className="text-[10px] font-mono">{playerStats.technique}</span></div>
             <div className="flex items-center gap-0.5"><AttributeIcon attr="spirit" className="text-white opacity-80" size={10} /><span className="text-[10px] font-mono">{playerStats.spirit}</span></div>
           </div>
        </div>

        {/* Middle: Round Indicator */}
        <div className="text-center shrink-0 flex flex-col items-center">
          <div className="text-[10px] font-black uppercase tracking-widest text-sumo-accent">Round {state.round}</div>
          <div className="text-[8px] opacity-60 mt-0.5 italic">{phase === 'tachiai' ? 'TACHIAI' : (state.attackerId === 'player' ? 'OFFENSIVE' : 'DEFENSIVE')}</div>
        </div>

        {/* Right Side: Opponent */}
        <div className="flex flex-col items-end w-[38%]">
           <span className="font-bold font-serif text-sm truncate w-full text-right"><span className="opacity-60 italic text-xs mr-0.5">{abbreviateRank(opponent.rank)}</span> {opponent.name}</span>
           <div className="flex gap-1.5 mt-1 flex-wrap flex-row-reverse">
             <div className="flex items-center gap-0.5"><AttributeIcon attr="power" className="text-white opacity-80" size={10} /><span className="text-[10px] font-mono">{opponentStats.power}</span></div>
             <div className="flex items-center gap-0.5"><AttributeIcon attr="balance" className="text-white opacity-80" size={10} /><span className="text-[10px] font-mono">{opponentStats.balance}</span></div>
             <div className="flex items-center gap-0.5"><AttributeIcon attr="footwork" className="text-white opacity-80" size={10} /><span className="text-[10px] font-mono">{opponentStats.footwork}</span></div>
             <div className="flex items-center gap-0.5"><AttributeIcon attr="technique" className="text-white opacity-80" size={10} /><span className="text-[10px] font-mono">{opponentStats.technique}</span></div>
             <div className="flex items-center gap-0.5"><AttributeIcon attr="spirit" className="text-white opacity-80" size={10} /><span className="text-[10px] font-mono">{opponentStats.spirit}</span></div>
           </div>
        </div>
      </div>

      {/* Dohyo Visualization (Simplified) */}
      <div className="h-32 shrink-0 relative flex items-center justify-center p-4 mt-2">
        <div className="w-28 h-28 border-4 border-sumo-earth rounded-full flex items-center justify-center relative bg-sumo-soft/30 shadow-inner">
           {/* Player */}
           <motion.div 
             animate={{ x: phase === 'tachiai' ? -30 : (state.attackerId === 'player' ? 15 : -40) }}
             className="absolute w-8 h-8 bg-sumo-dark rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-lg text-xs"
           >
             {rikishi.name[0]}
           </motion.div>
           {/* Opponent */}
           <motion.div 
             animate={{ x: phase === 'tachiai' ? 30 : (state.attackerId === 'opponent' ? -15 : 40) }}
             className="absolute w-8 h-8 bg-red-800 rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-lg text-xs"
           >
             {opponent.name[0]}
           </motion.div>
        </div>
      </div>

      {/* Action Logs & Dice Visualizer */}
      <div className="flex-1 min-h-[140px] overflow-y-auto flex flex-col justify-center items-center p-4 bg-sumo-paper shadow-inner border-y border-sumo-earth/10 relative">
        <div className="absolute inset-0 bg-[url('/clay-texture.png')] opacity-5 pointer-events-none" />
        
        {/* Dice Area (Takes up top half of the log area when active) */}
        <div className="w-full flex flex-col items-center justify-end flex-shrink-0 mb-2">
          {(isRolling || showDice) && (
            <AnimatePresence mode="wait">
              <motion.div 
                key={showDice ? showDice.id : 'rolling'}
                className="flex gap-4 justify-center items-center py-4 bg-white/80 rounded-2xl border border-sumo-earth/30 w-full max-w-md relative z-10 shadow-sm px-4 min-h-[160px]"
              >
                 <div className="text-center flex flex-col items-center flex-1 h-full justify-between">
                   <div className="flex flex-col items-center justify-end mb-2 h-[60px] w-full">
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1 text-sumo-ink">You</p>
                     {showDice && (
                       <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center w-full">
                         <div className="text-sm font-black text-sumo-ink leading-tight text-center">{showDice.player.moveName}</div>
                         <div className="flex gap-2 mt-1 justify-center items-center">
                           <div className="flex items-center gap-1"><AttributeIcon attr={showDice.player.primaryAttr} size={10}/><span className="text-[10px] font-mono font-bold leading-none text-sumo-ink">{showDice.player.primaryVal}</span></div>
                           <div className="flex items-center gap-1"><AttributeIcon attr={showDice.player.secondaryAttr} size={10}/><span className="text-[10px] font-mono font-bold leading-none text-sumo-ink">{showDice.player.secondaryVal}</span></div>
                         </div>
                         <div className="flex gap-1.5 mt-1 min-h-[14px]">
                           {showDice.player.statBonus > 0 && <BonusTooltip label={`+${showDice.player.statBonus} Stat Adv.`} content={`Stat Advantage: Bonus added to your roll from having higher attributes than your opponent for this specific move.`} />}
                           {showDice.player.roundBonus > 0 && <BonusTooltip label={`+${showDice.player.roundBonus} Offense Bonus`} content={`Offense Bonus: Bonus points added to the attacker's roll equal to the current round number.`} />}
                           {showDice.player.counterVal > 0 && <BonusTooltip label={`+ir${showDice.player.counterVal} Counter`} content={`Counter: By choosing a move that counters the opponent's move, any individual die you roll below ${showDice.player.counterVal} is automatically raised to ${showDice.player.counterVal}.`} />}
                         </div>
                       </motion.div>
                     )}
                   </div>
                   
                   {showDice ? (
                     <>
                       <div className="flex gap-1 mb-1 justify-center w-full">
                         {showDice.player.rolls.map((d, i) => (
                           <motion.div 
                             key={i} 
                             initial={{ opacity: 0, y: -20, rotateX: 180, backgroundColor: "#ffffff" }}
                             animate={{ 
                               opacity: 1, y: 0, rotateX: 0, 
                               backgroundColor: ["#ffffff", getFlashColor(d, showDice.player.maxVal, "#1a1a1a"), "#1a1a1a"] 
                             }}
                             transition={{ 
                               duration: 0.5, 
                               delay: i * 0.3, 
                               type: "spring",
                               backgroundColor: { duration: 0.8, delay: i * 0.3 }
                             }}
                             className="w-6 h-6 text-white rounded text-[10px] flex items-center justify-center font-mono font-bold shadow-md"
                           >
                             {d}
                           </motion.div>
                         ))}
                       </div>
                       <motion.div 
                         initial={{ opacity: 0, scale: 0.5 }}
                         animate={{ opacity: 1, scale: 1 }}
                         transition={{ delay: 1.5, type: "spring", bounce: 0.6 }} // After player dice (5 * 0.3 = 1.5s delay)
                         className="flex flex-col items-center mt-2 min-h-[32px]"
                       >
                         <span className="text-xl font-serif italic font-bold text-sumo-ink leading-none">
                           {showDice.player.total}
                         </span>
                         <span className="text-[9px] font-bold opacity-40 mt-1 tracking-tighter">
                           (5d{showDice.player.maxVal}{showDice.player.irVal > 0 ? ` ir${showDice.player.irVal}` : ''})
                         </span>
                       </motion.div>
                       {/* Player Resource Badges */}
                       {(showDice.player.usedFocus || showDice.player.usedFatigue) && (
                         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }} className="flex gap-1 mt-1 justify-center">
                           {showDice.player.usedFocus && <div className="text-[8px] bg-orange-500 text-white px-1.5 py-0.5 rounded uppercase font-black flex items-center shadow-sm"><Zap size={8} className="mr-0.5" />Focus</div>}
                           {showDice.player.usedFatigue && <div className="text-[8px] bg-red-600 text-white px-1.5 py-0.5 rounded uppercase font-black flex items-center shadow-sm"><AlertCircle size={8} className="mr-0.5" />Fatigue</div>}
                         </motion.div>
                       )}
                     </>
                   ) : (
                      <div className="animate-pulse flex gap-1 mb-4 h-[64px] items-center justify-center">
                        {[1,2,3,4,5].map(i => <div key={i} className="w-6 h-6 bg-sumo-beige/50 rounded" />)}
                      </div>
                   )}
                 </div>
                 
                 <div className="text-2xl font-black italic opacity-10 mx-[-4px] text-sumo-ink">VS</div>
                 
                 <div className="text-center flex flex-col items-center flex-1 h-full justify-between">
                   <div className="flex flex-col items-center justify-end mb-2 h-[60px] w-full">
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1 text-sumo-ink">Enemy</p>
                     {showDice && (
                       <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.0 }} className="flex flex-col items-center w-full">
                         <div className="text-sm font-black text-sumo-ink leading-tight text-center">{showDice.opponent.moveName}</div>
                         <div className="flex gap-2 mt-1 justify-center items-center">
                           <div className="flex items-center gap-1"><AttributeIcon attr={showDice.opponent.primaryAttr} size={10}/><span className="text-[10px] font-mono font-bold leading-none text-sumo-ink">{showDice.opponent.primaryVal}</span></div>
                           <div className="flex items-center gap-1"><AttributeIcon attr={showDice.opponent.secondaryAttr} size={10}/><span className="text-[10px] font-mono font-bold leading-none text-sumo-ink">{showDice.opponent.secondaryVal}</span></div>
                         </div>
                         <div className="flex gap-1.5 mt-1 min-h-[14px]">
                           {showDice.opponent.statBonus > 0 && <BonusTooltip label={`+${showDice.opponent.statBonus} Stat Adv.`} content={`Stat Advantage: Bonus added to the roll from having higher attributes than the target for this specific move.`} />}
                           {showDice.opponent.roundBonus > 0 && <BonusTooltip label={`+${showDice.opponent.roundBonus} Offense Bonus`} content={`Offense Bonus: Bonus points added to the attacker's roll equal to the current round number.`} />}
                           {showDice.opponent.counterVal > 0 && <BonusTooltip label={`+ir${showDice.opponent.counterVal} Counter`} content={`Counter: By choosing a move that counters the opponent's move, any individual die the opponent rolls below ${showDice.opponent.counterVal} is automatically raised to ${showDice.opponent.counterVal}.`} />}
                         </div>
                       </motion.div>
                     )}
                   </div>
                   
                   {showDice ? (
                     <>
                       <div className="flex gap-1 mb-1 justify-center w-full">
                         {showDice.opponent.rolls.map((d, i) => (
                           <motion.div 
                             key={i} 
                             initial={{ opacity: 0, y: -20, rotateX: 180, backgroundColor: "#ffffff" }}
                             animate={{ 
                               opacity: 1, y: 0, rotateX: 0,
                               backgroundColor: ["#ffffff", getFlashColor(d, showDice.opponent.maxVal, "#991b1b"), "#991b1b"]
                             }}
                             transition={{ 
                               duration: 0.5, 
                               delay: 2.0 + (i * 0.3), // Wait for player sequence to finish before starting
                               type: "spring",
                               backgroundColor: { duration: 0.8, delay: 2.0 + (i * 0.3) }
                             }}
                             className="w-6 h-6 text-white rounded text-[10px] flex items-center justify-center font-mono font-bold shadow-md"
                           >
                             {d}
                           </motion.div>
                         ))}
                       </div>
                       <motion.div 
                         initial={{ opacity: 0, scale: 0.5 }}
                         animate={{ opacity: 1, scale: 1 }}
                         transition={{ delay: 3.5, type: "spring", bounce: 0.6 }} // After opponent dice sequence finishes
                         className="flex flex-col items-center mt-2 min-h-[32px]"
                       >
                         <span className="text-xl font-serif italic text-red-800 font-bold leading-none">
                           {showDice.opponent.total}
                         </span>
                         <span className="text-[9px] font-bold opacity-40 mt-1 tracking-tighter text-red-800/80">
                           (5d{showDice.opponent.maxVal}{showDice.opponent.irVal > 0 ? ` ir${showDice.opponent.irVal}` : ''})
                         </span>
                       </motion.div>
                       {/* Opponent Resource Badges */}
                       {(showDice.opponent.usedFocus || showDice.opponent.usedFatigue) && (
                         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.6 }} className="flex gap-1 mt-1 justify-center">
                           {showDice.opponent.usedFocus && <div className="text-[8px] bg-orange-500 text-white px-1.5 py-0.5 rounded uppercase font-black flex items-center shadow-sm"><Zap size={8} className="mr-0.5" />Focus</div>}
                           {showDice.opponent.usedFatigue && <div className="text-[8px] bg-red-600 text-white px-1.5 py-0.5 rounded uppercase font-black flex items-center shadow-sm"><AlertCircle size={8} className="mr-0.5" />Fatigue</div>}
                         </motion.div>
                       )}
                     </>
                   ) : (
                      <div className="animate-pulse flex gap-1 mb-4 h-[64px] items-center justify-center">
                        {[1,2,3,4,5].map(i => <div key={i} className="w-6 h-6 bg-sumo-beige/50 rounded" />)}
                      </div>
                   )}
                 </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Action Text Area */}
        <div className="w-full flex items-center justify-center text-center mt-2 relative z-10 flex-shrink-0">
          <AnimatePresence mode="wait">
            {state.logs.length > 0 && (
              <motion.div 
                key={state.logs.length}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <p className="text-sm font-serif italic text-sumo-ink font-bold leading-snug px-2">
                  {state.logs.join(' ')}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Move Selection Area */}
      <div className="p-4 bg-white border-t border-sumo-earth/20 shrink-0 h-[240px] overflow-hidden">
        <AnimatePresence mode="wait">
          {phase === 'tachiai' && (
             <motion.div 
               key="tachiai" 
               initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
               className={`grid grid-cols-1 gap-2 transition-opacity ${isRolling ? 'opacity-30 pointer-events-none' : ''}`}
             >
                <div className="flex justify-between items-center mb-2 px-1">
                   <div className="text-[10px] font-black uppercase tracking-widest opacity-30">Choose Tachiai</div>
                   <div className="flex items-center gap-4">
                      {/* Focus button */}
                      <button 
                        onClick={() => { setUseFocus(!useFocus); if (!useFocus) setUseFatigueDie(false); }}
                        disabled={rikishi.focusPoints < focusCost || isRolling || useFatigueDie}
                        className={`flex items-center gap-1 transition-all ${useFocus ? 'opacity-100 scale-110' : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100'} ${rikishi.focusPoints < focusCost ? 'hidden' : ''}`}
                      >
                        <Zap size={10} className={`${useFocus ? 'text-orange-500 fill-orange-500' : 'text-sumo-ink'}`} />
                        <span className="text-[9px] font-bold uppercase">Focus</span>
                      </button>

                      {/* Fatigue button */}
                      {rikishi.rank.division !== 'Jonokuchi' && rikishi.rank.division !== 'Jonidan' && rikishi.rank.division !== 'Sandanme' && rikishi.rank.division !== 'Makushita' && (
                        <button 
                          onClick={() => { setUseFatigueDie(!useFatigueDie); if (!useFatigueDie) setUseFocus(false); }}
                          disabled={state.fatigueDieUsed || isRolling || useFocus}
                          className={`flex items-center gap-1 transition-all ${useFatigueDie ? 'opacity-100 scale-110' : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100'} ${state.fatigueDieUsed ? 'hidden' : ''}`}
                        >
                          <AlertCircle size={10} className={`${useFatigueDie ? 'text-red-500' : 'text-sumo-ink'}`} />
                          <span className="text-[9px] font-bold uppercase">Fatigue</span>
                        </button>
                      )}
                   </div>
                </div>
                <div className="flex flex-wrap gap-2">
                   {TACHIAI_MOVES.map(move => (
                     <button
                       key={move.id}
                       onClick={() => executeTachiai(move)}
                       disabled={isRolling}
                       className="bg-sumo-soft border border-sumo-earth/10 hover:border-sumo-accent p-2 rounded-xl flex-1 min-w-[45%] text-left active:scale-95 transition-all flex justify-between items-center"
                     >
                       <div className="flex flex-col overflow-hidden flex-1 mr-2">
                         <div className="text-[10px] font-bold text-sumo-ink truncate">{move.name}</div>
                         {move.counters && move.counters.length > 0 && (
                           <div className="text-[8px] font-mono opacity-60 text-sumo-ink truncate flex items-center mt-0.5">
                             <Swords size={8} className="mr-1 shrink-0 text-red-600" />
                             {move.counters.map((c, idx) => (
                               <span key={c}>{idx > 0 && ', '}{getMoveName(c)}</span>
                             ))}
                           </div>
                         )}
                       </div>
                       <div className="flex gap-1 opacity-70 shrink-0 self-center">
                         <AttributeIcon attr={move.primaryAttr} size={12} />
                         <AttributeIcon attr={move.secondaryAttr} size={12} />
                       </div>
                     </button>
                   ))}
                </div>
             </motion.div>
          )}

          {phase === 'stance_selection' && pendingStanceSelection && (
             <motion.div 
               key="stance_selection" 
               initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
               className="grid grid-cols-1 gap-2 border-t border-sumo-accent/20 pt-2"
             >
                <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2 px-1 text-sumo-accent">Initiative Won! Choose Stance</div>
                <div className="flex gap-2">
                   {pendingStanceSelection.availableStances.map(stance => (
                     <button
                       key={stance}
                       onClick={() => handleStanceSelected(stance)}
                       className="bg-sumo-ink text-white border-2 border-sumo-earth/20 py-6 rounded-xl flex-1 text-center active:scale-95 transition-all shadow-md font-bold uppercase tracking-widest text-xs hover:bg-sumo-accent hover:border-sumo-accent"
                     >
                       {stance}
                     </button>
                   ))}
                </div>
             </motion.div>
          )}

          {phase === 'combat' && (
             <motion.div 
               key="combat" 
               initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
               className={`grid grid-cols-1 gap-2 transition-opacity ${isRolling ? 'opacity-30 pointer-events-none' : ''}`}
             >
                <div className="flex justify-between items-center mb-2 px-1">
                   <div className="text-[10px] font-black uppercase tracking-widest opacity-30">
                     {state.attackerId === 'player' ? 'Choose Offense' : 'Choose Defense'}
                   </div>
                    <div className="flex items-center gap-4">
                      {/* Focus button */}
                      <button 
                        onClick={() => { setUseFocus(!useFocus); if (!useFocus) setUseFatigueDie(false); }}
                        disabled={rikishi.focusPoints < focusCost || isRolling || useFatigueDie}
                        className={`flex items-center gap-1 transition-all ${useFocus ? 'opacity-100 scale-110' : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100'} ${rikishi.focusPoints < focusCost ? 'hidden' : ''}`}
                      >
                        <Zap size={10} className={`${useFocus ? 'text-orange-500 fill-orange-500' : 'text-sumo-ink'}`} />
                        <span className="text-[9px] font-bold uppercase">Focus</span>
                      </button>

                      {/* Fatigue button */}
                      {rikishi.rank.division !== 'Jonokuchi' && rikishi.rank.division !== 'Jonidan' && rikishi.rank.division !== 'Sandanme' && rikishi.rank.division !== 'Makushita' && (
                        <button 
                          onClick={() => { setUseFatigueDie(!useFatigueDie); if (!useFatigueDie) setUseFocus(false); }}
                          disabled={state.fatigueDieUsed || isRolling || useFocus}
                          className={`flex items-center gap-1 transition-all ${useFatigueDie ? 'opacity-100 scale-110' : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100'} ${state.fatigueDieUsed ? 'hidden' : ''}`}
                        >
                          <AlertCircle size={10} className={`${useFatigueDie ? 'text-red-500' : 'text-sumo-ink'}`} />
                          <span className="text-[9px] font-bold uppercase">Fatigue</span>
                        </button>
                      )}
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto no-scrollbar pb-4">
                   {(state.attackerId === 'player' ? 
                     OFFENSIVE_MOVES.filter(m => m.stanceRequirement === state.playerStance) : 
                     DEFENSIVE_MOVES
                   ).map(move => (
                     <button
                       key={move.id}
                       onClick={() => executeCombatRound(move)}
                       disabled={isRolling}
                       className="bg-white border border-sumo-beige shadow-sm hover:border-sumo-accent p-2 rounded-xl text-left active:scale-95 transition-all flex justify-between items-center"
                     >
                       <div className="flex flex-col overflow-hidden flex-1 mr-2">
                         <div className="text-[10px] font-bold text-sumo-ink truncate">{move.name}</div>
                         {move.counters && move.counters.length > 0 && (
                           <div className="text-[8px] font-mono opacity-60 text-sumo-ink truncate flex items-center mt-0.5">
                             <Swords size={8} className="mr-1 shrink-0 text-red-600" />
                             {move.counters.map((c, idx) => (
                               <span key={c}>{idx > 0 && ', '}{getMoveName(c)}</span>
                             ))}
                           </div>
                         )}
                       </div>
                       <div className="flex gap-1 opacity-70 shrink-0 self-center">
                         <AttributeIcon attr={move.primaryAttr} size={12} />
                         <AttributeIcon attr={move.secondaryAttr} size={12} />
                       </div>
                     </button>
                   ))}
                </div>
             </motion.div>
          )}

           {phase === 'result' && (
             <motion.div 
                key="result" 
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4 px-4 pt-6 pb-6 h-full flex flex-col justify-center bg-sumo-soft border-t border-sumo-earth/30"
             >
                <div className="flex-1 flex flex-col justify-center space-y-3">
                  <h3 className="text-xl font-serif font-black italic tracking-wide uppercase text-sumo-ink">
                    {state.winnerId === 'player' ? `${rikishi.name} no kachi` : `${opponent.name} no kachi`}
                  </h3>
                  <p className="text-sm opacity-70 text-sumo-ink mx-auto max-w-[280px]">
                     {getVictoryFlavor(
                       state.victoryKimarite, 
                       state.winnerId === 'player' ? rikishi.name : opponent.name,
                       state.winnerId === 'player' ? opponent.name : rikishi.name
                     )}
                  </p>
                </div>
                <div className="pt-4 pb-2 w-full max-w-[280px] mx-auto">
                  <button
                    onClick={() => onFinish({ 
                      playerWins: state.winnerId === 'player', 
                      victoryKimarite: state.victoryKimarite,
                      fatigueUsed: state.fatigueDieUsed
                    })}
                    className="w-full bg-[#362624] text-white py-3.5 rounded-lg font-bold uppercase tracking-[0.15em] text-xs shadow-md shadow-black/20 hover:bg-black active:scale-95 transition-all outline-none"
                  >
                    Bow and Exit Ring
                  </button>
                </div>
             </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
