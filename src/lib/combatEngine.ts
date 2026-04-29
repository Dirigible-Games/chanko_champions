import { Rikishi, Kimarite } from "../types";
import {
  getEffectiveStats,
  getEffectiveBaseDie,
  decideNPCResources,
  calculateStatBonus,
  performCombatRoll,
  resolveTachiai,
  getBaseInjuryThreshold,
  getFatigueThresholdReduction,
  performMonoii,
  selectNPCMove,
  secureRandomInt,
  secureRandom,
} from "./gameLogic";
import {
  TACHIAI_MOVES,
  OFFENSIVE_MOVES,
  DEFENSIVE_MOVES,
} from "../constants/combat";

export function simulateFullBout(
  rikishi1: Rikishi,
  rikishi2: Rikishi,
): {
  winnerId: string;
  updatedR1: Rikishi;
  updatedR2: Rikishi;
  hasInjury1: boolean;
  hasInjury2: boolean;
} {
  let isFinished = false;
  let winnerId = "";
  let round = 1;
  let attackerId = "";
  let r1Stance: any = "Neutral";
  let r2Stance: any = "Neutral";

  let r1Focus = rikishi1.focusPoints;
  let r2Focus = rikishi2.focusPoints;
  let r1FatigueUsed = false;
  let r2FatigueUsed = false;

  let hasInjury1 = false;
  let hasInjury2 = false;

  const r1Stats = getEffectiveStats(rikishi1);
  const r2Stats = getEffectiveStats(rikishi2);
  const r1BaseDie = getEffectiveBaseDie(rikishi1);
  const r2BaseDie = getEffectiveBaseDie(rikishi2);

  const r1Elite =
    rikishi1.rank.title === "Ozeki" || rikishi1.rank.title === "Yokozuna";
  const r2Elite =
    rikishi2.rank.title === "Ozeki" || rikishi2.rank.title === "Yokozuna";

  let r1Move: Kimarite;
  let r2Move: Kimarite;

  while (!isFinished && round <= 20) {
    let r1Ir = 0;
    let r2Ir = 0;
    let r1Bonus = 0;
    let r2Bonus = 0;

    const r1Resources = decideNPCResources(rikishi1, rikishi2);
    const r2Resources = decideNPCResources(rikishi2, rikishi1);

    if (r1Resources.useFocus && r1Focus >= (r1Elite ? 5 : 4)) {
      r1Ir += r1Elite ? 4 : 3;
      r1Focus -= r1Elite ? 5 : 4;
    } else if (r1Resources.useFatigue && !r1FatigueUsed) {
      r1Ir += 4;
      r1FatigueUsed = true;
    }

    if (r2Resources.useFocus && r2Focus >= (r2Elite ? 5 : 4)) {
      r2Ir += r2Elite ? 4 : 3;
      r2Focus -= r2Elite ? 5 : 4;
    } else if (r2Resources.useFatigue && !r2FatigueUsed) {
      r2Ir += 4;
      r2FatigueUsed = true;
    }

    if (round === 1) {
      // Tachiai
      r1Move = selectNPCMove(rikishi1, TACHIAI_MOVES, true);
      r2Move = selectNPCMove(rikishi2, TACHIAI_MOVES, true);

      const r1SumR1 =
        r1Stats[r1Move.primaryAttr] + r1Stats[r1Move.secondaryAttr];
      const r1SumR2 =
        r2Stats[r1Move.primaryAttr] + r2Stats[r1Move.secondaryAttr];
      const r1StatBonus = calculateStatBonus(r1SumR1, r1SumR2, r1Elite);

      const r2SumR2 =
        r2Stats[r2Move.primaryAttr] + r2Stats[r2Move.secondaryAttr];
      const r2SumR1 =
        r1Stats[r2Move.primaryAttr] + r1Stats[r2Move.secondaryAttr];
      const r2StatBonus = calculateStatBonus(r2SumR2, r2SumR1, r2Elite);

      if (r1Move.counters?.includes(r2Move.id)) r1Ir = Math.max(r1Ir, 3);
      if (r2Move.counters?.includes(r1Move.id)) r2Ir = Math.max(r2Ir, 3);

      const r1Roll = performCombatRoll(r1BaseDie, r1StatBonus, r1Ir);
      const r2Roll = performCombatRoll(r2BaseDie, r2StatBonus, r2Ir);

      // Injuries Check
      const thresh1 =
        getBaseInjuryThreshold(rikishi1.bashosCompleted) -
        getFatigueThresholdReduction(rikishi1.fatigue);
      if (r2Roll.total > thresh1) hasInjury1 = true;
      const thresh2 =
        getBaseInjuryThreshold(rikishi2.bashosCompleted) -
        getFatigueThresholdReduction(rikishi2.fatigue);
      if (r1Roll.total > thresh2) hasInjury2 = true;

      const result = resolveTachiai(r1Roll.total, r2Roll.total);
      if (result === "matta") {
        // Restart Tachiai
        // Do NOT increment round on matta so we stay in Tachiai phase!
        continue;
      } else if (result.includes("critical")) {
        isFinished = true;
        winnerId = result === "player_critical" ? rikishi1.id : rikishi2.id;
      } else {
        const r1Won = result === "player_win";
        attackerId = r1Won ? rikishi1.id : rikishi2.id;
        const winnerObj = r1Won ? rikishi1 : rikishi2;
        const winnerMove = r1Won ? r1Move : r2Move;

        let nextStances: string[] = [];
        if (winnerMove.transitionsTo && winnerMove.transitionsTo.length > 0) {
          nextStances = winnerMove.transitionsTo;
        } else {
          nextStances = ["Neutral"];
        }
        const nextStance = nextStances[secureRandomInt(nextStances.length) - 1];
        if (r1Won) {
          r1Stance = nextStance;
          r2Stance = "Neutral";
        } else {
          r2Stance = nextStance;
          r1Stance = "Neutral";
        }

        round++;
      }
    } else {
      // Normal Round
      const r1Attacking = attackerId === rikishi1.id;

      const r1StanceMoves = r1Attacking
        ? OFFENSIVE_MOVES.filter((m) => r1Stance === "Neutral" || m.stanceRequirement === r1Stance)
        : DEFENSIVE_MOVES;
      const r2StanceMoves = !r1Attacking
        ? OFFENSIVE_MOVES.filter((m) => r2Stance === "Neutral" || m.stanceRequirement === r2Stance)
        : DEFENSIVE_MOVES;

      r1Move = selectNPCMove(rikishi1, r1StanceMoves, false);
      r2Move = selectNPCMove(rikishi2, r2StanceMoves, false);

      const pSumR1 =
        r1Stats[r1Move.primaryAttr] + r1Stats[r1Move.secondaryAttr];
      const pSumR2 =
        r2Stats[r1Move.primaryAttr] + r2Stats[r1Move.secondaryAttr];
      const r1StatBonus = calculateStatBonus(pSumR1, pSumR2, r1Elite);

      const oSumR2 =
        r2Stats[r2Move.primaryAttr] + r2Stats[r2Move.secondaryAttr];
      const oSumR1 =
        r1Stats[r2Move.primaryAttr] + r1Stats[r2Move.secondaryAttr];
      const r2StatBonus = calculateStatBonus(oSumR2, oSumR1, r2Elite);

      r1Bonus = r1Attacking ? round : 0;
      r2Bonus = !r1Attacking ? round : 0;

      if (r1Move.counters?.includes(r2Move.id)) r1Ir = Math.max(r1Ir, 3);
      if (r2Move.counters?.includes(r1Move.id)) r2Ir = Math.max(r2Ir, 3);

      // Specs
      const r1Spec = rikishi1.specializations?.find(
        (s) => s.kimariteId.toLowerCase() === r1Move.id.toLowerCase(),
      );
      if (
        r1Spec &&
        !r2Move.counters?.includes(r1Move.id) &&
        r1Stats[r1Spec.primaryAttr] >= 8 &&
        r1Stats[r1Spec.secondaryAttr] >= 5
      ) {
        r1Ir = Math.max(r1Ir, 4);
      }
      const r2Spec = rikishi2.specializations?.find(
        (s) => s.kimariteId.toLowerCase() === r2Move.id.toLowerCase(),
      );
      if (
        r2Spec &&
        !r1Move.counters?.includes(r2Move.id) &&
        r2Stats[r2Spec.primaryAttr] >= 8 &&
        r2Stats[r2Spec.secondaryAttr] >= 5
      ) {
        r2Ir = Math.max(r2Ir, 4);
      }

      const r1Roll = performCombatRoll(r1BaseDie, r1Bonus + r1StatBonus, r1Ir);
      const r2Roll = performCombatRoll(r2BaseDie, r2Bonus + r2StatBonus, r2Ir);

      // Injuries Check
      const thresh1 =
        getBaseInjuryThreshold(rikishi1.bashosCompleted) -
        getFatigueThresholdReduction(rikishi1.fatigue);
      if (r2Roll.total > thresh1) hasInjury1 = true;
      const thresh2 =
        getBaseInjuryThreshold(rikishi2.bashosCompleted) -
        getFatigueThresholdReduction(rikishi2.fatigue);
      if (r1Roll.total > thresh2) hasInjury2 = true;

      const attackerRoll = r1Attacking ? r1Roll : r2Roll;
      const defenderRoll = r1Attacking ? r2Roll : r1Roll;

      if (attackerRoll.total <= defenderRoll.total + 3) {
        const monoii = performMonoii().result;
        if (monoii === "rematch") {
          round++;
          continue;
        } else {
          isFinished = true;
          winnerId =
            monoii === "attacker"
              ? r1Attacking
                ? rikishi1.id
                : rikishi2.id
              : r1Attacking
                ? rikishi2.id
                : rikishi1.id;
        }
      } else if (attackerRoll.total > defenderRoll.total + 3) {
        // Attacker Wins
        isFinished = true;
        winnerId = r1Attacking ? rikishi1.id : rikishi2.id;
      } else {
        // Defender wins (Counter or block)
        const defenderMove = r1Attacking ? r2Move : r1Move;
        const attackerMove = r1Attacking ? r1Move : r2Move;

        if (
          defenderMove.type === "defense" ||
          defenderMove.counters?.includes(attackerMove.id)
        ) {
          // Counter
          isFinished = true;
          winnerId = r1Attacking ? rikishi2.id : rikishi1.id;
        } else {
          // Block
          attackerId = r1Attacking ? rikishi2.id : rikishi1.id;
          let nextStances: string[] = [];
          if (
            defenderMove.transitionsTo &&
            defenderMove.transitionsTo.length > 0
          ) {
            nextStances = defenderMove.transitionsTo;
          } else {
            nextStances = ["Neutral"];
          }
          const nextStance =
            nextStances[secureRandomInt(nextStances.length) - 1];
          if (r1Attacking) {
            r2Stance = nextStance;
            r1Stance = "Neutral";
          } else {
            r1Stance = nextStance;
            r2Stance = "Neutral";
          }
          round++;
        }
      }
    }
  }

  // Safety net
  if (!winnerId) {
    winnerId = secureRandom() > 0.5 ? rikishi1.id : rikishi2.id;
  }

  return {
    winnerId,
    hasInjury1,
    hasInjury2,
    updatedR1: {
      ...rikishi1,
      focusPoints: r1Focus,
      fatigue: Math.min(
        100,
        rikishi1.fatigue + (r1FatigueUsed ? 7 : 0) + Math.min(round, 10),
      ),
    },
    updatedR2: {
      ...rikishi2,
      focusPoints: r2Focus,
      fatigue: Math.min(
        100,
        rikishi2.fatigue + (r2FatigueUsed ? 7 : 0) + Math.min(round, 10),
      ),
    },
  };
}
