import { RikishiStats, AttributeKey, Rikishi, Specialization, RankInfo } from '../types';

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
 * Performs an injury roll based on current fatigue.
 */
export function performInjuryRoll(fatigue: number): { successes: number, severities: number[], rolls: number[] } {
  const rolls = Array.from({ length: 3 }, () => Math.floor(Math.random() * 54) + 1);
  const threshold = 33;
  let successes = rolls.filter(r => r >= threshold).length;
  let severities: number[] = [];

  if (fatigue < 40) {
    const rawSuccesses = successes;
    const finalSeverity = Math.max(0, rawSuccesses - 1);
    if (finalSeverity > 0) severities = [finalSeverity];
  } else if (fatigue < 60) {
    if (successes > 0) severities = [successes];
  } else if (fatigue < 80) {
    severities = Array(successes).fill(1); // Not correct, doc says "each successful injury is applied", implying severity is successes or each roll that succeeds adds severity?
    // "All dice rolled that meet or exceed threshold add +1 severity to that attribute"
    // At 60-79: "each successful Injury is applied. For each injury attempt, one attribute is selected at random."
    // This implies if 3 dice succeed, we pick 3 random attributes and add +1 severity to each.
    severities = Array(successes).fill(1);
  } else {
    // 80%+ severity 1 guaranteed per roll
    successes = 3;
    severities = rolls.map(r => (r >= threshold ? 2 : 1)); // "+1 is guaranteed for each roll" -> success adds to it? 
    // Wait: "(3d54 t33 + 1) (AKA a Severity 1 Injury is guaranteed for each roll)"
    // This means severity starts at 1, and if roll >= 33, it becomes 2.
    severities = rolls.map(r => r >= threshold ? 2 : 1);
  }

  return { successes, severities, rolls };
}

/**
 * Performs a training roll: 4d40 t(X) + 3 + Bonuses
 */
export function performTrainingRoll(bashos: number, bonus: number = 0): { successes: number, tp: number, rolls: number[] } {
  if (bashos >= 20) return { successes: 0, tp: 2, rolls: [] };
  
  const threshold = getTrainingThreshold(bashos);
  const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 40) + 1);
  const successes = rolls.filter(r => r >= threshold).length;
  const tp = successes + 3 + bonus;
  
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
    const r = Math.floor(Math.random() * dieValue) + 1;
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
  if (playerRoll >= opponentRoll + 50) return 'player_critical';
  if (opponentRoll >= playerRoll + 50) return 'opponent_critical';
  return playerRoll > opponentRoll ? 'player_win' : 'opponent_win';
}

/**
 * Performs Mono-ii if applicable.
 */
export function performMonoii(): 'attacker' | 'rematch' | 'defender' {
  const roll = Math.floor(Math.random() * 10) + 1;
  if (roll <= 7) return 'attacker';
  if (roll === 8) return 'rematch';
  return 'defender';
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
  
  let bestMove = availableMoves[0];
  let bestScore = -1;

  for (const move of availableMoves) {
    const statSum = npcStats[move.primaryAttr] + npcStats[move.secondaryAttr];
    // Add randomness so it isn't literally 100% deterministic, but weights towards strongest moves
    const score = statSum + (Math.random() * 5);
    
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
  let focusProbability = 0.1;
  
  // Context-aware adjustments
  if (isMakeKoshiDanger) focusProbability += 0.3;     // Desperation
  if (isKachiKoshiChance) focusProbability += 0.2;    // Achievement
  if (isYushoThreat) focusProbability += 0.3;         // High stakes
  if (isSanyakuOpponent) focusProbability += 0.2;     // Tough match
  if (isMakuuchi) focusProbability += 0.1;            // Elite level
  
  // Cap probability
  focusProbability = Math.min(0.8, focusProbability);

  // Use focus if they can afford it AND pass the context-aware probability check
  if (npc.focusPoints >= focusCost && Math.random() < focusProbability) {
    useFocus = true;
  } else if (!isLowerDiv && npc.fatigue < 85 && Math.random() < 0.25) {
    // Only use fatigue if focus is not being used to maintain mutual exclusivity
    // AND if not in a lower division
    useFatigue = true;
  }

  return { useFocus, useFatigue };
}

/**
 * Performs recovery roll: 2d50 t33 + 1
 */
export function performRecoveryRoll(): { recoveryPoints: number, rolls: number[] } {
  const rolls = [Math.floor(Math.random() * 50) + 1, Math.floor(Math.random() * 50) + 1];
  const successes = rolls.filter(r => r >= 33).length;
  return { recoveryPoints: successes + 1, rolls };
}
