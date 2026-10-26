import type { BattleState } from './reducer.js';

export const RITUAL_SEALS = 5;
export type BattleEnding = 'dominant' | 'scarred' | 'retreat';

/** Damage comes from committed answers, so duplicate commands and graphics cannot spend wards. */
export function ritualIntegrity(state: Pick<BattleState, 'answers'>): number {
  return Math.max(0, RITUAL_SEALS - state.answers.filter(answer => !answer.correct).length);
}

export function battleEnding(state: BattleState): BattleEnding {
  if (ritualIntegrity(state) === 0 || Object.values(state.outcomes).some(outcome => outcome === 'unresolved')) return 'retreat';
  return state.answers.some(answer => !answer.correct) ? 'scarred' : 'dominant';
}

export const endingCopy = {
  dominant: { label: 'DOMINANT VICTORY', title: 'You held every seal.', description: 'Three crystals shattered. Five wards still burning. The creature dissolves before a ritual it could never breach.' },
  scarred: { label: 'SCARRED VICTORY', title: 'Scarred. Still standing.', description: 'The creature broke your wards, but you reclaimed every concept. The corruption burns away; the scars remain as proof of your return.' },
  retreat: { label: 'RETREAT · UNRESOLVED', title: 'The ink will remember.', description: 'The creature slips beyond the circle with corruption still inside it. Your answers and discoveries are preserved. Review the open concepts before your next encounter.' },
} as const;
