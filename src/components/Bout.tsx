import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Rikishi, BoutState, Kimarite, Stance, AttributeKey } from '../types';
import { TACHIAI_MOVES, OFFENSIVE_MOVES, DEFENSIVE_MOVES, STANCE_DESCRIPTIONS } from '../constants/combat';
import { 
  performCombatRoll, 
  resolveTachiai, 
  getEffectiveBaseDie, 
  getEffectiveStats, 
  calculateStatBonus,
  performMonoii,
  selectNPCMove,
  decideNPCResources,
  secureRandomInt,
  secureRandom,
  getBaseInjuryThreshold,
  getFatigueThresholdReduction
} from '../lib/gameLogic';
import { Shield, Swords, Zap, AlertCircle, ChevronRight, Check, Trophy, Award, Info } from 'lucide-react';
import { AttributeIcon } from './AttributeIcon';
import { BonusTooltip } from './BonusTooltip';
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

interface BoutProps {
  rikishi: Rikishi;
  opponent: Rikishi; // Mock opponent for now
  onFinish: (result: { 
    playerWins: boolean, 
    victoryKimarite: string | null, 
    fatigueUsed: boolean,
    focusSpent: number,
    finalRound: number,
    hasInjuryTrigger: boolean
  }) => void;
}

export default function Bout({ rikishi, opponent, onFinish }: BoutProps) {
  const [state, setState] = useState<BoutState>({
    round: 1,
    focusPoints: rikishi.focusPoints,
    attackerId: 'player', // Will be decided after Tachiai
    playerStance: 'Neutral',
    opponentStance: 'Neutral',
    logs: ['Stallions enter the ring...', 'Hands reaching for the clay...'],
    isFinished: false,
    winnerId: null,
    victoryKimarite: null,
    isMonoii: false,
    fatigueDieUsed: false,
    hasInjuryTrigger: false
  });

  const [monoiiData, setMonoiiData] = useState<{result: 'attacker'|'rematch'|'defender', roll: number, winnerId: 'player'|'opponent'} | null>(null);
  const [phase, setPhase] = useState<'tachiai' | 'stance_selection' | 'combat' | 'monoii' | 'result'>('tachiai');
  const [animStep, setAnimStep] = useState<'idle' | 'names' | 'stats' | 'bonuses' | 'dice_info' | 'rolling' | 'done'>('idle');
  const [playerTally, setPlayerTally] = useState(0);
  const [opponentTally, setOpponentTally] = useState(0);
  const [diceRevealed, setDiceRevealed] = useState<{player: number, opponent: number}>({player: 0, opponent: 0});
  
  const [pendingStanceSelection, setPendingStanceSelection] = useState<{
    availableStances: Stance[];
    nextAttackerId: 'player' | 'opponent';
  } | null>(null);
  const [selectedMove, setSelectedMove] = useState<Kimarite | null>(null);
  const [opponentMove, setOpponentMove] = useState<Kimarite | null>(null);
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
    
    const rikishiName = pendingStanceSelection.nextAttackerId === 'player' ? rikishi.name : opponent.name;
    addLog(`${rikishiName} transitions into ${stance} stance.`);
    
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
    setOpponentMove(null);
  };

  const executeTachiai = (move: Kimarite) => {
    if (isRolling) return;
    setIsRolling(true);
    setShowDice(null);
    setAnimStep('idle');
    setPlayerTally(0);
    setOpponentTally(0);
    setDiceRevealed({ player: 0, opponent: 0 });
    
    setSelectedMove(move);
    setState(prev => ({ ...prev, logs: [] }));

    // Opponent picks AI Tachiai
    const opponentMove = selectNPCMove(opponent, TACHIAI_MOVES, true);
    setOpponentMove(opponentMove);
    
    // NPC Resources
    const oResources = decideNPCResources(opponent, rikishi);
    
    // Calculate Bonuses Immediately to start the animation sequence
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

    // Check for Specialization
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

    // Injury Trigger Check
    const baseThreshold = getBaseInjuryThreshold(rikishi.bashosCompleted);
    const thresholdReduction = getFatigueThresholdReduction(rikishi.fatigue);
    const currentThreshold = baseThreshold - thresholdReduction;
    
    if (oRoll.total > currentThreshold) {
      setState(prev => ({ ...prev, hasInjuryTrigger: true }));
    }

    setShowDice({ 
      id: secureRandom().toString(),
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
        setOpponentMove(null);
        setShowDice(null);
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
          const nextStance = nextStances[secureRandomInt(nextStances.length) - 1];
          const winnerName = winner === 'player' ? rikishi.name : opponent.name;
          addLog(`${winnerName} transitions into ${nextStance} stance.`);
          
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
          setOpponentMove(null);
          setShowDice(null);
        }
      }
    }, 8500); // Wait for the sequence
  };

  // Combat Animation Sequence
  useEffect(() => {
    if (showDice) {
      setAnimStep('names');
      const timer1 = setTimeout(() => setAnimStep('stats'), 800);
      const timer2 = setTimeout(() => setAnimStep('bonuses'), 1600);
      const timer3 = setTimeout(() => setAnimStep('dice_info'), 2400);
      const timer4 = setTimeout(() => setAnimStep('rolling'), 3200);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    } else {
      setAnimStep('idle');
      setPlayerTally(0);
      setOpponentTally(0);
      setDiceRevealed({ player: 0, opponent: 0 });
    }
  }, [showDice]);

  // Dice Reveal Tally Logic
  useEffect(() => {
    if (animStep === 'rolling' && showDice) {
      // Player Dice Sequence
      const pTimers = showDice.player.rolls.map((val, i) => {
        return setTimeout(() => {
          setDiceRevealed(prev => ({ ...prev, player: i + 1 }));
          setPlayerTally(prev => prev + val);
        }, i * 400);
      });

      // Opponent Dice Sequence
      const oStartDelay = showDice.player.rolls.length * 400 + 400; // Slight gap after player
      const oTimers = showDice.opponent.rolls.map((val, i) => {
        return setTimeout(() => {
          setDiceRevealed(prev => ({ ...prev, opponent: i + 1 }));
          setOpponentTally(prev => prev + val);
          if (i === showDice.opponent.rolls.length - 1) {
            setAnimStep('done');
          }
        }, oStartDelay + (i * 400));
      });

      return () => {
        pTimers.forEach(t => clearTimeout(t));
        oTimers.forEach(t => clearTimeout(t));
      };
    }
  }, [animStep, showDice]);

  const executeCombatRound = (playerMove: Kimarite) => {
    if (isRolling) return;
    setIsRolling(true);
    setShowDice(null);
    setAnimStep('idle');
    setPlayerTally(0);
    setOpponentTally(0);
    setDiceRevealed({ player: 0, opponent: 0 });
    
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
    setOpponentMove(opponentMove);

    // Calculate Bonuses Immediately to start the animation sequence
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

    // Injury Trigger Check
    const baseThreshold = getBaseInjuryThreshold(rikishi.bashosCompleted);
    const thresholdReduction = getFatigueThresholdReduction(rikishi.fatigue);
    const currentThreshold = baseThreshold - thresholdReduction;
    
    if (oRoll.total > currentThreshold) {
      setState(prev => ({ ...prev, hasInjuryTrigger: true }));
    }

    setShowDice({ 
      id: secureRandom().toString(),
      player: { ...pRoll, usedFocus: useFocus, usedFatigue: useFatigueDie, maxVal: playerBaseDie + pBonus + pStatBonus, irVal: pIr, moveName: playerMove.name, statBonus: pStatBonus, roundBonus: pBonus, counterVal: pCounterVal, primaryAttr: playerMove.primaryAttr, secondaryAttr: playerMove.secondaryAttr, primaryVal: playerStats[playerMove.primaryAttr], secondaryVal: playerStats[playerMove.secondaryAttr] }, 
      opponent: { ...oRoll, usedFocus: oResources.useFocus, usedFatigue: oUseFatigue, maxVal: opponentBaseDie + oBonus + oStatBonus, irVal: oIr, moveName: opponentMove.name, statBonus: oStatBonus, roundBonus: oBonus, counterVal: oCounterVal, primaryAttr: opponentMove.primaryAttr, secondaryAttr: opponentMove.secondaryAttr, primaryVal: opponentStats[opponentMove.primaryAttr], secondaryVal: opponentStats[opponentMove.secondaryAttr] } 
    });

    setTimeout(() => {
      setUseFocus(false);
      setUseFatigueDie(false);
      const attackerRoll = isPlayerAttacking ? pRoll.total : oRoll.total;
      const defenderRoll = isPlayerAttacking ? oRoll.total : pRoll.total;

      if (attackerRoll > defenderRoll) {
        const isMonoiiEligible = attackerRoll <= defenderRoll + 3;
        
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
          setMonoiiData({ result: monoiiResult.result, roll: monoiiResult.roll, winnerId: isPlayerAttacking ? 'player' : 'opponent' });
          setPhase('monoii');
        } else {
          resolveVictory();
        }
      } else {
        // Defender logic
        const dRoll = isPlayerAttacking ? oRoll.total : pRoll.total;
        const aRoll = isPlayerAttacking ? pRoll.total : oRoll.total;
        
        if (dRoll >= aRoll + 50) {
           addLog("CRITICAL DEFENSE! Defender earns momentum for next round (+4).");
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
          const nextStance = nextStances[secureRandomInt(nextStances.length) - 1];
          const defenderName = isPlayerAttacking ? opponent.name : rikishi.name;
          addLog(`${defenderName} transitions into ${nextStance} stance.`);
          
          setState(prev => ({
            ...prev,
            attackerId: prev.attackerId === 'player' ? 'opponent' : 'player',
            playerStance: isPlayerAttacking ? 'Neutral' : nextStance,
            opponentStance: isPlayerAttacking ? nextStance : 'Neutral',
            round: prev.round + 1
          }));
          setIsRolling(false);
          setSelectedMove(null);
          setOpponentMove(null);
          setShowDice(null);
        }
      }
    }, 8500); // 8500ms timeout to wait for the sequence
  };

  const handleMonoiiResolution = () => {
    if (!monoiiData) return;
    const isPlayerAttacking = monoiiData.winnerId === 'player';
    
    if (monoiiData.result === 'attacker') {
       addLog("Ruling stands.");
       setState(prev => ({
         ...prev,
         isFinished: true,
         winnerId: monoiiData.winnerId,
         victoryKimarite: isPlayerAttacking ? selectedMove!.name : opponentMove!.name,
         logs: [...prev.logs, `${monoiiData.winnerId === 'player' ? rikishi.name : opponent.name} wins by ${isPlayerAttacking ? selectedMove!.name : opponentMove!.name}!`]
       }));
       setPhase('result');
    } else if (monoiiData.result === 'rematch') {
       addLog("TORINAOSHI!");
       setState(prev => ({ ...prev, round: prev.round + 1 }));
       setPhase('tachiai');
       setIsRolling(false);
       setSelectedMove(null);
       setOpponentMove(null);
       setShowDice(null);
    } else {
       addLog("Ruling reversed!");
       const reversedWinnerId = monoiiData.winnerId === 'player' ? 'opponent' : 'player';
       setState(prev => ({
         ...prev,
         isFinished: true,
         winnerId: reversedWinnerId,
         victoryKimarite: 'Sashichigae',
         logs: [...prev.logs, `${reversedWinnerId === 'player' ? rikishi.name : opponent.name} wins by reversal!`]
       }));
       setPhase('result');
    }
    setMonoiiData(null);
  };

  return (
    <div className="h-full flex flex-col bg-sumo-paper overflow-hidden relative">
      <div className="absolute inset-0 bg-[url('/clay-texture.png')] opacity-5 pointer-events-none" />
      
      {/* Mono-ii Modal Overlay */}
      <AnimatePresence>
        {phase === 'monoii' && monoiiData && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-sumo-dark/80 backdrop-blur-sm p-4"
          >
            <motion.div 
                 initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
                 className="w-full max-w-sm bg-sumo-soft rounded-2xl shadow-2xl border border-sumo-earth/30 flex flex-col pt-6 pb-6 px-4 text-center"
             >
                 <div className="flex flex-col items-center">
                   <div className="bg-red-800 text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-md">
                     MONO-II
                   </div>
                   <h3 className="text-xl font-serif font-black italic tracking-wide uppercase text-sumo-ink mt-3">
                     Shinpan Deliberation
                   </h3>
                   <p className="text-xs text-sumo-ink/70 mt-1 max-w-[260px]">
                     The judges have gathered to review the outcome of the exchange.
                   </p>
                 </div>

                 <div className="flex flex-col items-center justify-center my-4 bg-white/70 py-4 rounded-xl border border-sumo-earth/40 shadow-inner">
                    <div className="text-[10px] font-black uppercase tracking-widest text-sumo-ink/50 mb-2">Shinpan's Roll (1d10)</div>
                    <div className="w-16 h-16 bg-white border-2 border-sumo-ink rounded-lg shadow-md flex items-center justify-center font-serif text-3xl font-black text-sumo-ink">
                      {monoiiData.roll}
                    </div>
                    <div className="mt-3 text-sm font-bold uppercase tracking-widest text-red-800">
                      {monoiiData.result === 'attacker' && "Ruling Stands"}
                      {monoiiData.result === 'defender' && "Ruling Reversed"}
                      {monoiiData.result === 'rematch' && "Torinaoshi (Rematch)"}
                    </div>
                 </div>

                 <div className="w-full max-w-[280px] mx-auto">
                    <button
                     onClick={handleMonoiiResolution}
                     className="w-full bg-[#362624] text-white py-3.5 rounded-lg font-bold uppercase tracking-[0.15em] text-xs shadow-md shadow-black/20 hover:bg-black active:scale-95 transition-all outline-none"
                   >
                     Acknowledge
                   </button>
                 </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
      <div className="flex-1 min-h-[220px] flex flex-col items-center p-4 bg-sumo-paper shadow-inner border-y border-sumo-earth/10 relative">
        <div className="absolute inset-0 bg-[url('/clay-texture.png')] opacity-5 pointer-events-none" />
        
        {/* Dice Area (Fixed Height Stage) */}
        <div className="w-full flex-shrink-0 h-[220px] mb-4 relative flex items-center justify-center">
          <div className="flex gap-4 justify-center items-center py-4 bg-white/90 rounded-2xl border border-sumo-earth/30 w-full max-w-sm z-10 shadow-md px-4 h-full">
             {/* Player Side */}
             <div className="text-center flex flex-col items-center flex-1 h-full">
                <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1 text-sumo-ink">You</p>
                
                <div className="h-[75px] w-full flex flex-col items-center justify-start overflow-hidden">
                   <AnimatePresence>
                     {animStep !== 'idle' && (
                       <motion.div 
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         className="flex flex-col items-center w-full"
                       >
                         {/* Name - Step: names */}
                         <motion.div 
                           className="text-sm font-black text-sumo-ink leading-tight text-center truncate w-full h-5"
                           initial={{ opacity: 0 }}
                           animate={{ opacity: ['names', 'stats', 'bonuses', 'dice_info', 'rolling', 'done'].includes(animStep) ? 1 : 0 }}
                         >
                            {showDice?.player.moveName || selectedMove?.name}
                         </motion.div>
                         
                         {/* Stats - Step: stats */}
                         <motion.div 
                           initial={{ opacity: 0 }}
                           animate={{ opacity: ['stats', 'bonuses', 'dice_info', 'rolling', 'done'].includes(animStep) ? 1 : 0 }}
                           className="flex gap-2 mt-1 justify-center items-center h-[14px]"
                         >
                            <div className="flex items-center gap-1">
                              <AttributeIcon attr={showDice?.player.primaryAttr || selectedMove?.primaryAttr} size={10}/>
                              <span className="text-[10px] font-mono font-bold leading-none text-sumo-ink">
                                {showDice?.player.primaryVal || (selectedMove && playerStats[selectedMove.primaryAttr]) || '-'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <AttributeIcon attr={showDice?.player.secondaryAttr || selectedMove?.secondaryAttr} size={10}/>
                              <span className="text-[10px] font-mono font-bold leading-none text-sumo-ink">
                                {showDice?.player.secondaryVal || (selectedMove && playerStats[selectedMove.secondaryAttr]) || '-'}
                              </span>
                            </div>
                         </motion.div>

                         {/* Bonuses - Step: bonuses */}
                         <motion.div 
                           initial={{ opacity: 0 }}
                           animate={{ opacity: ['bonuses', 'dice_info', 'rolling', 'done'].includes(animStep) ? 1 : 0 }}
                           className="flex gap-1 mt-1.5 h-[14px] items-center justify-center opacity-0 animate-in fade-in fill-mode-forwards"
                         >
                            {showDice?.player.statBonus > 0 && <BonusTooltip label={`+${showDice.player.statBonus} Stat`} content="The two attributes for the chosen technique are added together, and compared to the same attributes for the opponent. If there is a large difference between these sums, a bonus to the max dice value is added. Ex: 5d20 with a +1 stat bonus becomes 5d21." />}
                            {showDice?.player.roundBonus > 0 && <BonusTooltip label={`+${showDice.player.roundBonus} Off.`} content="A bonus equal to the current round number is added to the maximum value for each die rolled by the rikishi currently on the offense. Ex: 5d20 on round 6 becomes 5d26." />}
                            {showDice?.player.counterVal > 0 && <BonusTooltip label={`+ir${showDice.player.counterVal} Ctr.`} content="When a technique is chosen which counters another technique, the minimum value for each die rolled is boosted to the +IR number." />}
                         </motion.div>
                       </motion.div>
                     )}
                   </AnimatePresence>
                </div>

                {/* Recessed Dice Slots */}
                <div className="h-[30px] flex items-center justify-center w-full">
                  <div className="flex gap-1 justify-center w-full">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={`p-slot-${i}`} className="relative w-5 h-5">
                        <div className="absolute inset-0 bg-sumo-earth/10 rounded shadow-inner border border-sumo-earth/5" />
                        {diceRevealed.player > i && showDice && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.5, rotateX: 180 }}
                            animate={{ 
                              opacity: 1, 
                              scale: 1, 
                              rotateX: 0, 
                              backgroundColor: ["#ffffff", getFlashColor(showDice.player.rolls[i], showDice.player.maxVal, "#1a1a1a"), "#1a1a1a"] 
                            }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 text-white rounded text-[9px] flex items-center justify-center font-mono font-bold shadow-sm z-10"
                          >
                            {showDice.player.rolls[i]}
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dice Info & Tally */}
                <div className="h-[55px] flex flex-col items-center justify-end">
                   <AnimatePresence>
                     {['dice_info', 'rolling', 'done'].includes(animStep) && showDice && (
                       <motion.div
                         initial={{ opacity: 0, y: -5 }} 
                         animate={{ opacity: 1, y: 0 }}
                         className="flex flex-col items-center w-full"
                       >
                         {/* Dice Info - visible from dice_info step */}
                         <div className="text-[8px] font-bold opacity-40 mb-1 whitespace-nowrap">
                            (5d{showDice.player.maxVal}{showDice.player.irVal > 0 ? ` ir${showDice.player.irVal}` : ''})
                         </div>

                         {/* Tally - visible from rolling step */}
                         <div className="text-xl font-serif italic font-black text-sumo-ink leading-none h-6 flex items-center justify-center">
                            {['rolling', 'done'].includes(animStep) ? playerTally : ''}
                         </div>
                       </motion.div>
                     )}
                   </AnimatePresence>
                </div>
             </div>
             
             <div className="text-xl font-black italic opacity-20 text-sumo-ink px-2 shrink-0">VS</div>
             
             {/* Enemy Side */}
             <div className="text-center flex flex-col items-center flex-1 h-full">
                <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1 text-sumo-ink">Enemy</p>
                
                <div className="h-[75px] w-full flex flex-col items-center justify-start overflow-hidden">
                   <AnimatePresence>
                     {animStep !== 'idle' && (
                       <motion.div 
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         className="flex flex-col items-center w-full"
                       >
                         {/* Name */}
                         <motion.div 
                           className="text-sm font-black text-sumo-ink leading-tight text-center truncate w-full h-5"
                           initial={{ opacity: 0 }}
                           animate={{ opacity: ['names', 'stats', 'bonuses', 'dice_info', 'rolling', 'done'].includes(animStep) ? 1 : 0 }}
                         >
                            {showDice?.opponent.moveName || opponentMove?.name}
                         </motion.div>
                         
                         {/* Stats */}
                         <motion.div 
                           initial={{ opacity: 0 }}
                           animate={{ opacity: ['stats', 'bonuses', 'dice_info', 'rolling', 'done'].includes(animStep) ? 1 : 0 }}
                           className="flex gap-2 mt-1 justify-center items-center h-[14px]"
                         >
                            <div className="flex items-center gap-1">
                              <AttributeIcon attr={showDice?.opponent.primaryAttr || opponentMove?.primaryAttr} size={10}/>
                              <span className="text-[10px] font-mono font-bold leading-none text-sumo-ink">
                                {showDice?.opponent.primaryVal || (opponentMove && opponentStats[opponentMove.primaryAttr]) || '-'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <AttributeIcon attr={showDice?.opponent.secondaryAttr || opponentMove?.secondaryAttr} size={10}/>
                              <span className="text-[10px] font-mono font-bold leading-none text-sumo-ink">
                                {showDice?.opponent.secondaryVal || (opponentMove && opponentStats[opponentMove.secondaryAttr]) || '-'}
                              </span>
                            </div>
                         </motion.div>

                         {/* Bonuses */}
                         <motion.div 
                           initial={{ opacity: 0 }}
                           animate={{ opacity: ['bonuses', 'dice_info', 'rolling', 'done'].includes(animStep) ? 1 : 0 }}
                           className="flex gap-1 mt-1.5 h-[14px] items-center justify-center opacity-0 animate-in fade-in fill-mode-forwards"
                         >
                            {showDice?.opponent.statBonus > 0 && <BonusTooltip label={`+${showDice.opponent.statBonus} Stat`} content="The two attributes for the chosen technique are added together, and compared to the same attributes for the opponent. If there is a large difference between these sums, a bonus to the max dice value is added. Ex: 5d20 with a +1 stat bonus becomes 5d21." />}
                            {showDice?.opponent.roundBonus > 0 && <BonusTooltip label={`+${showDice.opponent.roundBonus} Off.`} content="A bonus equal to the current round number is added to the maximum value for each die rolled by the rikishi currently on the offense. Ex: 5d20 on round 6 becomes 5d26." />}
                            {showDice?.opponent.counterVal > 0 && <BonusTooltip label={`+ir${showDice.opponent.counterVal} Ctr.`} content="When a technique is chosen which counters another technique, the minimum value for each die rolled is boosted to the +IR number." />}
                         </motion.div>
                       </motion.div>
                     )}
                   </AnimatePresence>
                </div>

                {/* Recessed Dice Slots */}
                <div className="h-[30px] flex items-center justify-center w-full">
                  <div className="flex gap-1 justify-center w-full">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={`o-slot-${i}`} className="relative w-5 h-5">
                        <div className="absolute inset-0 bg-sumo-earth/10 rounded shadow-inner border border-sumo-earth/5" />
                        {diceRevealed.opponent > i && showDice && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.5, rotateX: 180 }}
                            animate={{ 
                              opacity: 1, 
                              scale: 1, 
                              rotateX: 0, 
                              backgroundColor: ["#ffffff", getFlashColor(showDice.opponent.rolls[i], showDice.opponent.maxVal, "#991b1b"), "#991b1b"] 
                            }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 text-white rounded text-[9px] flex items-center justify-center font-mono font-bold shadow-sm z-10"
                          >
                            {showDice.opponent.rolls[i]}
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dice Info & Tally */}
                <div className="h-[55px] flex flex-col items-center justify-end">
                   <AnimatePresence>
                     {['dice_info', 'rolling', 'done'].includes(animStep) && showDice && (
                       <motion.div
                         initial={{ opacity: 0, y: -5 }} 
                         animate={{ opacity: 1, y: 0 }}
                         className="flex flex-col items-center w-full"
                       >
                         {/* Dice Info */}
                         <div className="text-[8px] font-bold opacity-40 mb-1 whitespace-nowrap text-red-800/80">
                            (5d{showDice.opponent.maxVal}{showDice.opponent.irVal > 0 ? ` ir${showDice.opponent.irVal}` : ''})
                         </div>

                         {/* Tally */}
                         <div className="text-xl font-serif italic font-black text-red-800 leading-none h-6 flex items-center justify-center">
                            {['rolling', 'done'].includes(animStep) ? opponentTally : ''}
                         </div>
                       </motion.div>
                     )}
                   </AnimatePresence>
                </div>
             </div>
          </div>
        </div>

        {/* Action Text Area (Anchored below dice) */}
        <div className="w-full flex-1 flex items-center justify-center text-center mt-auto relative z-10">
          <AnimatePresence>
            {state.logs.length > 0 && (
              <motion.div 
                key={state.logs.length}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full absolute"
              >
                <p className="text-sm font-serif italic text-sumo-ink font-bold leading-snug px-4">
                  {state.logs[state.logs.length - 1]}
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
                        disabled={state.focusPoints < focusCost || isRolling || useFatigueDie}
                        className={`flex items-center gap-1 transition-all ${useFocus ? 'opacity-100 scale-110' : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100'} ${state.focusPoints < focusCost ? 'opacity-10' : ''}`}
                      >
                        <Zap size={10} className={`${useFocus ? 'text-orange-500 fill-orange-500' : 'text-sumo-ink'}`} />
                        <span className="text-[9px] font-bold uppercase">Focus ({state.focusPoints})</span>
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
                     <div
                        key={move.id}
                        onClick={(e) => { 
                          if (isRolling) return;
                          if ((e.target as HTMLElement).closest('.tooltip-trigger') || (e.target as HTMLElement).closest('.tooltip-portal')) return;
                          executeTachiai(move); 
                        }}
                        className={`bg-sumo-soft border border-sumo-earth/10 shadow-sm hover:border-sumo-accent p-2 rounded-xl flex-1 min-w-[45%] text-left active:scale-95 transition-all flex justify-between items-center group relative cursor-pointer ${isRolling ? 'opacity-50 grayscale pointer-events-none' : ''}`}
                      >
                       <div className="flex flex-col overflow-hidden flex-1 mr-2">
                         <div className="flex items-center gap-1">
                           <div className="text-[10px] font-bold text-sumo-ink truncate">{move.name}</div>
                           {move.description && (
                             <BonusTooltip 
                               title={move.name}
                               content={move.description} 
                               icon={<Info size={8} className="stroke-[3px]" />} 
                             />
                           )}
                         </div>
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
                     </div>
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
                     <div key={stance} className="flex-1 flex flex-col items-center">
                       <div
                         onClick={(e) => {
                           if ((e.target as HTMLElement).closest('.tooltip-trigger') || (e.target as HTMLElement).closest('.tooltip-portal')) return;
                           handleStanceSelected(stance);
                         }}
                         className="w-full bg-sumo-ink text-white border-2 border-sumo-earth/20 py-6 rounded-xl text-center active:scale-95 transition-all shadow-md font-bold uppercase tracking-widest text-xs hover:bg-sumo-accent hover:border-sumo-accent cursor-pointer"
                       >
                         {stance}
                       </div>
                       <div className="mt-2 group flex items-center justify-center">
                          <BonusTooltip 
                            title={stance}
                            content={STANCE_DESCRIPTIONS[stance]} 
                            icon={
                              <div className="flex items-center gap-1">
                                <Info size={10} className="stroke-[3px]" />
                                <span className="text-[8px] font-black uppercase tracking-tighter opacity-70">What is {stance}?</span>
                              </div>
                            } 
                          />
                       </div>
                     </div>
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
                        disabled={state.focusPoints < focusCost || isRolling || useFatigueDie}
                        className={`flex items-center gap-1 transition-all ${useFocus ? 'opacity-100 scale-110' : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100'} ${state.focusPoints < focusCost ? 'opacity-10' : ''}`}
                      >
                        <Zap size={10} className={`${useFocus ? 'text-orange-500 fill-orange-500' : 'text-sumo-ink'}`} />
                        <span className="text-[9px] font-bold uppercase">Focus ({state.focusPoints})</span>
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
                <div className="grid grid-cols-2 gap-1.5 overflow-hidden">
                   {(state.attackerId === 'player' ? 
                     OFFENSIVE_MOVES.filter(m => m.stanceRequirement === state.playerStance) : 
                     DEFENSIVE_MOVES
                   ).map(move => (
                     <div
                        key={move.id}
                        onClick={(e) => { 
                          if (isRolling) return;
                          if ((e.target as HTMLElement).closest('.tooltip-trigger') || (e.target as HTMLElement).closest('.tooltip-portal')) return;
                          executeCombatRound(move); 
                        }}
                        className={`bg-white border border-sumo-beige shadow-sm hover:border-sumo-accent p-2 rounded-xl text-left active:scale-95 transition-all flex justify-between items-center group relative cursor-pointer ${isRolling ? 'opacity-50 grayscale pointer-events-none' : ''}`}
                      >
                       <div className="flex flex-col overflow-hidden flex-1 mr-2">
                         <div className="flex items-center gap-1">
                           <div className="text-[10px] font-bold text-sumo-ink truncate">{move.name}</div>
                           {move.description && (
                             <BonusTooltip 
                               title={move.name}
                               content={move.description} 
                               icon={<Info size={8} className="stroke-[3px]" />} 
                             />
                           )}
                         </div>
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
                     </div>
                   ))}
                </div>
             </motion.div>
          )}

          {phase === 'monoii' && (
             <motion.div 
               key="monoii_bg" 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }}
               className="flex items-center justify-center h-full opacity-50"
             >
                <div className="text-center font-serif italic uppercase tracking-widest text-sm text-sumo-ink animate-pulse">
                   Shinpan Deliberation...
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
                      fatigueUsed: !!state.fatigueDieUsed,
                      focusSpent: rikishi.focusPoints - state.focusPoints,
                      finalRound: state.round,
                      hasInjuryTrigger: state.hasInjuryTrigger
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
