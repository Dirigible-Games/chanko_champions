import { RikishiStats, AttributeKey, Rikishi, Specialization, RankInfo, CareerRecord } from '../types';
import { TACHIAI_MOVES, OFFENSIVE_MOVES } from '../constants/combat';

/**
 * Validates the Rikishi stat line based on the rule: 
 * The strongest attribute cannot be more than 5 points higher than the third weakest attribute.
 * NOTE: Weight is excluded from this calculation.
 */
export function isStatLineLegal(stats: Omit<RikishiStats, 'weight'>): boolean {
  const values = Object.values(stats);
  const sorted = [...values].sort((a, b) => a - b);
  
  const strongest = sorted[4];
  const thirdWeakest = sorted[2];
  
  return strongest <= thirdWeakest + 5;
}

/**
 * Calculates the cost in TP to raise an attribute by 1 point.
 */
export function getStatUpgradeCost(tpSpent: number): number {
  if (tpSpent <= 12) return 1;
  if (tpSpent <= 36) return 2;
  return 3;
}

/**
 * Gets the training roll threshold (X) based on bashos completed.
 */
export function getTrainingThreshold(bashos: number): number {
  if (bashos <= 1) return 10;
  if (bashos <= 3) return 11;
  if (bashos <= 5) return 13;
  if (bashos <= 7) return 15;
  if (bashos <= 10) return 18;
  if (bashos <= 13) return 21;
  if (bashos <= 16) return 25;
  if (bashos <= 19) return 30;
  return 36;
}

/**
 * Gets the base die value based on net basho progress.
 */
export function getBaseDieValue(bashosCompleted: number, penalty: number = 0): number {
  const net = Math.max(0, bashosCompleted - penalty);
  if (net === 0) return 20;
  if (net <= 2) return 21;
  if (net <= 4) return 22;
  if (net <= 6) return 23;
  if (net <= 9) return 24;
  if (net <= 12) return 25;
  if (net <= 15) return 26;
  if (net <= 19) return 27;
  return 28;
}

/**
 * Gets the division cap for base die.
 */
export function getBaseDieCap(rank: string): number {
  if (rank === 'Yokozuna' || rank === 'Ozeki' || rank === 'Sekiwake' || rank === 'Komusubi' || rank === 'Maegashira') return Infinity;
  if (rank === 'Juryo') return 24;
  if (rank === 'Makushita') return 22;
  if (rank === 'Sandanme') return 21;
  return 20;
}

/**
 * Gets the effective base die (clamped by division).
 */
export function getEffectiveBaseDie(rikishi: Rikishi): number {
  const base = getBaseDieValue(rikishi.bashosCompleted, rikishi.bashoProgressPenalty);
  let rankStr = 'Jonokuchi';
  if (typeof rikishi.rank.title === 'string') {
    rankStr = rikishi.rank.title;
  } else {
    rankStr = rikishi.rank.division;
  }
  const cap = getBaseDieCap(rankStr);
  return Math.min(base, cap);
}

/**
 * Gets the injury threshold base based on bashos completed.
 */
export function getBaseInjuryThreshold(bashos: number): number {
  if (bashos <= 20) return 99;
  if (bashos <= 40) return 96;
  if (bashos <= 60) return 92;
  if (bashos <= 80) return 88;
  if (bashos <= 100) return 84;
  return 79;
}

/**
 * Calculates reduction in injury threshold based on fatigue.
 */
export function getFatigueThresholdReduction(fatigue: number): number {
  if (fatigue < 20) return 0;
  if (fatigue < 25) return 0; // Doc says 20/0, then 25/3.
  if (fatigue < 30) return 3;
  if (fatigue < 35) return 5;
  if (fatigue < 40) return 7;
  if (fatigue < 45) return 10;
  if (fatigue < 50) return 12;
  if (fatigue < 55) return 14;
  if (fatigue < 60) return 16;
  if (fatigue < 65) return 19;
  if (fatigue < 70) return 21;
  if (fatigue < 75) return 23;
  if (fatigue < 80) return 25;
  if (fatigue < 85) return 28;
  if (fatigue < 90) return 30;
  if (fatigue < 95) return 32;
  if (fatigue < 100) return 35;
  return 37;
}

/**
 * Evaluates whether an NPC should go Kyujo.
 */
export function evaluateKyujo(rikishi: Rikishi): boolean {
  if (rikishi.status === 'kyujo' || rikishi.status === 'retired') return true;
  if (!rikishi.isNPC) return false; // Players must explicitly withdraw

  const injuries = Object.values(rikishi.injuries);
  const maxSeverity = Math.max(0, ...injuries.map(i => i.severity));

  if (maxSeverity >= 3) return true;
  if (maxSeverity === 2 && secureRandom() < 0.25) return true;
  
  // High fatigue increases chance of opting for rest
  if (rikishi.fatigue > 95 && secureRandom() < 0.8) return true;
  if (rikishi.fatigue > 85 && maxSeverity > 0 && secureRandom() < 0.3) return true;

  return false;
}

/**
 * Evaluates whether an NPC should retire.
 */
export function evaluateRetirement(rikishi: Rikishi): boolean {
  if (!rikishi.isNPC) return false;
  
  const injuries = Object.values(rikishi.injuries);
  const maxSeverity = Math.max(0, ...injuries.map(i => i.severity));
  
  const isSekitori = ['Makuuchi', 'Juryo'].includes(rikishi.rank.division);
  const totalPermPenalties = Object.values(rikishi.permanentPenalties).reduce((a, b) => a + b, 0);

  // High number of bashos + dropping rank + major injuries = retirement
  if (rikishi.bashosCompleted > 30) {
     if (!isSekitori) {
        // Non-sekitori are much more likely to retire if severely injured
        if (maxSeverity >= 3 && secureRandom() < 0.4) return true;
        
        // 10 years+ and stuck in low division
        if (rikishi.bashosCompleted > 60 && secureRandom() < 0.1) return true;
        
        // Too many permanent penalties
        if (totalPermPenalties > 8 && secureRandom() < 0.2) return true;
     } else {
        // Sekitori will fight through injuries, but might retire if they are extremely veteran
        // and severely injured, though less commonly than lower rankers.
        if (rikishi.bashosCompleted > 60 && maxSeverity >= 3 && secureRandom() < 0.15) return true;
        if (totalPermPenalties > 10 && secureRandom() < 0.1) return true;
        
        // Very old veterans might just retire if hurt
        if (rikishi.bashosCompleted > 90 && maxSeverity >= 1 && secureRandom() < 0.2) return true;
     }
  }
  return false;
}

/**
 * Securely generates a random decimal between 0 and 1 using Web Crypto API.
 */
export function secureRandom(): number {
  if (typeof window === 'undefined' || !window.crypto) {
    return Math.random();
  }
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return array[0] / (0xffffffff + 1);
}

/**
 * Securely generates a random integer between 1 and max (inclusive) using Web Crypto API.
 */
export function secureRandomInt(max: number): number {
  return Math.floor(secureRandom() * max) + 1;
}

/**
 * Performs an injury roll based on current fatigue.
 * Formula: 3d54 t33 with tier-based modifiers.
 */
export interface InjuryEvent {
  rolls: number[];
  baseSuccesses: number;
  finalSuccesses: number;
  severity: number;
}

export function performInjuryRoll(fatigue: number, hits: number): { 
  events: InjuryEvent[], 
  results: { attr: AttributeKey, severity: number }[] 
} {
  const events: InjuryEvent[] = [];
  const threshold = 33;

  for (let i = 0; i < hits; i++) {
    const rolls = Array.from({ length: 3 }, () => secureRandomInt(54));
    const baseSuccesses = rolls.filter(r => r >= threshold).length;
    let finalSuccesses = baseSuccesses;

    if (fatigue < 40) {
      finalSuccesses = Math.max(0, baseSuccesses - 1);
    } else if (fatigue >= 80) {
      // One die is automatically counted as a success (add +1)
      finalSuccesses = Math.min(3, baseSuccesses + 1);
    } else {
      finalSuccesses = baseSuccesses;
    }
    
    events.push({
      rolls,
      baseSuccesses,
      finalSuccesses,
      severity: finalSuccesses
    });
  }

  let results: { attr: AttributeKey, severity: number }[] = [];
  const attrs: AttributeKey[] = ['power', 'balance', 'footwork', 'technique', 'spirit'];

  if (fatigue < 60) {
    const maxSeverity = Math.max(...events.map(e => e.severity), 0);
    if (maxSeverity > 0) {
      const selectedAttr = attrs[secureRandomInt(attrs.length) - 1];
      results.push({ attr: selectedAttr, severity: maxSeverity });
    }
  } else {
    events.forEach(e => {
      if (e.severity > 0) {
        const selectedAttr = attrs[secureRandomInt(attrs.length) - 1];
        results.push({ attr: selectedAttr, severity: e.severity });
      }
    });
  }

  return { events, results };
}

/**
 * Applies an injury to a rikishi, handling severity, hits, base fatigue, and stat minimums.
 */
export function applyInjury(rikishi: Rikishi, severity: number, attr: AttributeKey): Rikishi {
  const newInjuries = { ...rikishi.injuries };
  const newPermanent = { ...rikishi.permanentPenalties };
  const injury = { ...newInjuries[attr] };
  
  const isNewInjury = injury.severity === 0;

  // Each unique (new attribute) temporary injury adds +1 base Fatigue
  let baseFatigueBonus = 0;
  if (isNewInjury) {
    baseFatigueBonus = 1;
  }
  
  // Increase severity (clamped at 3)
  injury.severity = Math.min(3, injury.severity + severity);
  
  // Track "hits": 5 temporary injuries (events) = 1 permanent penalty
  // User: "every 5 temporary injuries sustained to a single attribute result in an additional permanent injury"
  injury.hits += 1; 

  if (injury.hits >= 5) {
    const perms = Math.floor(injury.hits / 5);
    
    // Applying permanent penalty -1 to stat
    let remainingPerms = perms;
    while (remainingPerms > 0) {
      if (rikishi.stats[attr] - newPermanent[attr] > 2) {
        newPermanent[attr] += 1;
      } else {
        // Stat at 2, overflow adds to base fatigue floor
        baseFatigueBonus += 1;
      }
      remainingPerms--;
    }
    
    injury.hits = injury.hits % 5;
  }
  
  newInjuries[attr] = injury;
  
  return {
    ...rikishi,
    injuries: newInjuries,
    permanentPenalties: newPermanent,
    baseFatigue: rikishi.baseFatigue + baseFatigueBonus,
    totalUniqueInjuries: rikishi.totalUniqueInjuries + (isNewInjury ? 1 : 0)
  };
}

/**
 * Performs a recovery roll for a severity 2+ injury.
 * Formula: 2d50 t33, 1 die guaranteed to recover 1 level.
 */
export function performRecoveryRoll(): { recoveryPoints: number, rolls: number[] } {
  const rolls = Array.from({ length: 2 }, () => secureRandomInt(50));
  const threshold = 33;
  const successes = rolls.filter(r => r >= threshold).length;
  
  // One die guaranteed to recover a level, second success adds another.
  // Wait, "one die guaranteed to recover a level" usually means rolls[0] is treated as success?
  // User: "2d50, with a target value of 33, with one die guaranteed to recover a level of the injury."
  // Example: "if both die meet target... recovered from 3 down to 1. if no dice, or only 1... recovered down to 2."
  // This means:
  // 1 success (or 0 successes if one is guaranteed) = 1 level recovery.
  // 2 successes = 2 levels recovery.
  
  const recoveryPoints = successes === 2 ? 2 : 1;
  
  return { recoveryPoints, rolls };
}

/**
 * Performs a training roll: 4d40 t(X) + 3 + Bonuses
 */
export function performTrainingRoll(bashos: number, lastBashoRecord?: CareerRecord, isKyujoEarly?: boolean): { successes: number, tp: number, rolls: number[] } {
  if (bashos >= 20) return { successes: 0, tp: 2, rolls: [] };
  
  if (isKyujoEarly) return { successes: 0, tp: 0, rolls: [] };
  
  let dieBonus = 3;
  if (lastBashoRecord) {
    if (lastBashoRecord.rank.division === 'Makuuchi') {
      if (lastBashoRecord.isYusho) {
        dieBonus += 2;
      } else if (lastBashoRecord.isJunYusho || lastBashoRecord.isSpecialPrize) {
        dieBonus += 1;
      }
    } else if (['Juryo', 'Makushita', 'Sandanme', 'Jonidan', 'Jonokuchi'].includes(lastBashoRecord.rank.division)) {
      if (lastBashoRecord.isYusho) {
        dieBonus += 1;
      }
    }
  }

  const threshold = getTrainingThreshold(bashos);
  const rolls = Array.from({ length: 4 }, () => secureRandomInt(40) + dieBonus);
  const successes = rolls.filter(r => r >= threshold).length;
  const tp = successes + 3;
  
  return { successes, tp, rolls };
}

/**
 * Calculates the stat bonus based on difference between selected move attributes.
 */
export function calculateStatBonus(playerStat: number, opponentStat: number, isElite: boolean): number {
  const diff = playerStat - opponentStat;
  if (diff <= 3) return 0;
  
  if (isElite) { // Ozeki or Yokozuna
    if (diff <= 8) return 2;
    return 3;
  } else {
    if (diff <= 8) return 1;
    return 2;
  }
}

/**
 * Calculates momentum points based on Basho performance.
 * Non-stacking: returns the highest applicable value.
 */
export function calculateMomentumPoints(
  rikishi: Rikishi, 
  wins: number, 
  losses: number, 
  totalBouts: number, 
  oldRank: RankInfo, 
  newRank: RankInfo, 
  isYusho: boolean, 
  isJunYusho: boolean,
  isSpecialPrize: boolean = false
): number {
  const isKachiKoshi = wins > totalBouts / 2;
  if (!isKachiKoshi) return 0;

  let points = 0;

  const isJuryoOrHigher = ['Makuuchi', 'Juryo'].includes(newRank.division);
  const isFirstJuryoPromotion = newRank.division === 'Juryo' && !rikishi.careerHistory.some(r => r.rank.division === 'Juryo');
  const isFirstMakushitaPromotion = newRank.division === 'Makushita' && !rikishi.careerHistory.some(r => r.rank.division === 'Makushita');
  const isFirstOzekiPromotion = newRank.title === 'Ozeki' && !rikishi.careerHistory.some(r => r.rank.title === 'Ozeki');
  const isFirstYokozunaPromotion = newRank.title === 'Yokozuna' && !rikishi.careerHistory.some(r => r.rank.title === 'Yokozuna');
  const isRePromotionToOzeki = newRank.title === 'Ozeki' && rikishi.careerHistory.some(r => r.rank.title === 'Ozeki');

  // +4
  if (isFirstOzekiPromotion || isFirstYokozunaPromotion) points = Math.max(points, 4);
  // +3
  if (points < 3 && (isFirstJuryoPromotion || isFirstMakushitaPromotion || isYusho)) points = Math.max(points, 3);
  // +2
  if (points < 2 && (
      (wins >= 10 && ['Makushita', 'Sandanme', 'Jonidan', 'Jonokuchi'].includes(newRank.division)) ||
      newRank.title === 'Sekiwake' || 
      isRePromotionToOzeki || 
      isSpecialPrize || 
      isJunYusho
    )) points = Math.max(points, 2);
  // +1
  if (points < 1 && isKachiKoshi) points = Math.max(points, 1);

  return points;
}

/**
 * Performs a standard combat roll 5d(BaseDie + Bonuses) with an optional 'ir' (minimum floor) per die.
 */
export function performCombatRoll(baseDie: number, bonuses: number = 0, ir: number = 0): { total: number, rolls: number[] } {
  const dieValue = baseDie + bonuses;
  const rolls = Array.from({ length: 5 }, () => {
    const r = secureRandomInt(dieValue);
    return Math.max(r, ir);
  });
  const total = rolls.reduce((sum, val) => sum + val, 0);
  return { total, rolls };
}

/**
 * Resolves a Tachiai clash. 
 * Returns result type and required transitions.
 */
export function resolveTachiai(playerRoll: number, opponentRoll: number): 'matta' | 'player_critical' | 'opponent_critical' | 'player_win' | 'opponent_win' {
  if (Math.abs(playerRoll - opponentRoll) <= 2) return 'matta';
  if (playerRoll >= opponentRoll + 38) return 'player_critical';
  if (opponentRoll >= playerRoll + 38) return 'opponent_critical';
  return playerRoll > opponentRoll ? 'player_win' : 'opponent_win';
}

/**
 * Performs Mono-ii if applicable.
 */
export function performMonoii(): { result: 'attacker' | 'rematch' | 'defender', roll: number } {
  const roll = secureRandomInt(10);
  if (roll <= 7) return { result: 'attacker', roll };
  if (roll === 8) return { result: 'rematch', roll };
  return { result: 'defender', roll };
}

/**
 * Calculates the effective stats of a rikishi including momentum and permanent penalties.
 */
export function getEffectiveStats(rikishi: Rikishi): RikishiStats {
  const stats = { ...rikishi.stats };
  (Object.keys(stats) as Array<keyof RikishiStats>).forEach(key => {
    if (key === 'weight') return;
    
    const attr = key as AttributeKey;
    
    // Applying momentum
    if (rikishi.momentum.attribute === attr) {
      stats[attr] += rikishi.momentum.value;
    }
    
    // Applying permanent penalties
    stats[attr] = Math.max(2, stats[attr] - (rikishi.permanentPenalties[attr] || 0));
    
    // Applying temporary injury severity penalty (Assuming 1 severity = -1 stat)
    stats[attr] = Math.max(2, stats[attr] - (rikishi.injuries[attr]?.severity || 0));
  });
  
  return stats;
}

/**
 * Checks if a specific specialization is currently active based on current effective stats.
 */
export function isSpecializationActive(rikishi: Rikishi, spec: Specialization): boolean {
  const effectiveStats = getEffectiveStats(rikishi);
  return effectiveStats[spec.primaryAttr] >= 8 && effectiveStats[spec.secondaryAttr] >= 5;
}

/**
 * Checks if a rank allows a specialization slot.
 */
export function getSpecializationSlots(rank: RankInfo): number {
  if (rank.division === 'Juryo') return 1;
  if (rank.division === 'Makuuchi') {
    if (rank.title === 'Maegashira' || typeof rank.title === 'number') return 2; // Maegashira is numerical but division is Makuuchi
    if (rank.title === 'Komusubi' || rank.title === 'Sekiwake') return 2;
    if (rank.title === 'Ozeki' || rank.title === 'Yokozuna') return 3;
  }
  return 0; // Jonokuchi, Jonidan, Sandanme, Makushita
}

/**
 * Basic AI selection for NPC rikishi during a bout phase.
 */
export function selectNPCMove(npc: Rikishi, availableMoves: import('../types').Kimarite[], isTachiai: boolean = false): import('../types').Kimarite {
  const npcStats = getEffectiveStats(npc);
  
  // Safe Fallback!
  if (!availableMoves || availableMoves.length === 0) {
      if (isTachiai) {
          availableMoves = TACHIAI_MOVES;
      } else {
          availableMoves = OFFENSIVE_MOVES;
      }
  }

  let bestMove = availableMoves[0];
  let bestScore = -1;

  for (const move of availableMoves) {
    const statSum = npcStats[move.primaryAttr] + npcStats[move.secondaryAttr];
    // Add high-quality randomness
    const score = statSum + (secureRandomInt(500) / 100);
    
    // Check if they have an active specialization for this
    const spec = npc.specializations.find(s => s.kimariteId === move.id);
    const specBonus = (spec && npcStats[spec.primaryAttr] >= 8 && npcStats[spec.secondaryAttr] >= 5) ? 4 : 0;
    
    const finalScore = score + specBonus;

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestMove = move;
    }
  }

  return bestMove;
}

/**
 * AI logic to decide if the NPC should spend Focus Points or use a Fatigue Die.
 */
export function decideNPCResources(npc: Rikishi, opponent: Rikishi): { useFocus: boolean, useFatigue: boolean } {
  const isElite = npc.rank.title === 'Ozeki' || npc.rank.title === 'Yokozuna';
  const focusCost = isElite ? 5 : 4;
  
  // Players cannot use fatigue in lower divisions
  const isLowerDiv = ['Jonokuchi', 'Jonidan', 'Sandanme', 'Makushita'].includes(npc.rank.division);
  
  let useFocus = false;
  let useFatigue = false;

  // AI Strategic Assessment
  const totalBouts = 15; // Assume 15 for calculation
  const wins = npc.wins;
  const losses = npc.losses;
  const isMakeKoshiDanger = losses >= 7 && wins < 8; // On the verge of a losing record
  const isKachiKoshiChance = wins === 7 && losses < 8; // On verge of winning record
  const isYushoThreat = wins >= 10; // High performance
  
  const isSanyakuOpponent = typeof opponent.rank.title === 'string' && ['Yokozuna', 'Ozeki', 'Sekiwake', 'Komusubi'].includes(opponent.rank.title as string);
  const isMakuuchi = npc.rank.division === 'Makuuchi';

  // Base desire to use focus (starts low)
  let focusProbability = 10; // 10 / 100 
  
  // Context-aware adjustments
  if (isMakeKoshiDanger) focusProbability += 30;     // Desperation
  if (isKachiKoshiChance) focusProbability += 20;    // Achievement
  if (isYushoThreat) focusProbability += 30;         // High stakes
  if (isSanyakuOpponent) focusProbability += 20;     // Tough match
  if (isMakuuchi) focusProbability += 10;            // Elite level
  
  // Cap probability at 80%
  focusProbability = Math.min(80, focusProbability);

  // Use focus if they can afford it AND pass the context-aware probability check
  if (npc.focusPoints >= focusCost && secureRandomInt(100) <= focusProbability) {
    useFocus = true;
  } else if (!isLowerDiv && npc.fatigue < 85 && secureRandomInt(100) <= 25) {
    // Only use fatigue if focus is not being used to maintain mutual exclusivity
    // AND if not in a lower division
    useFatigue = true;
  }

  return { useFocus, useFatigue };
}
