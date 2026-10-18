import type { BattleState, Answer } from './reducer.js';

export interface BattleSummary {
  first: number;
  corrected: number;
  unresolved: number;
  correct: number;
  total: number;
}

/** Concept categories and question accuracy are separate counts from committed answers. */
export function summarizeBattle(state: BattleState): BattleSummary {
  const summary: BattleSummary = { first: 0, corrected: 0, unresolved: 0, correct: 0, total: state.answers.length };
  const concepts = new Map<string, Answer[]>();
  for (const answer of state.answers) {
    if (answer.correct) summary.correct += 1;
    const answers = concepts.get(answer.conceptId) ?? [];
    answers.push(answer);
    concepts.set(answer.conceptId, answers);
  }
  for (const answers of concepts.values()) {
    const initial = answers.find((answer) => answer.kind === 'initial');
    const followup = answers.find((answer) => answer.kind === 'followup');
    if (initial?.correct) summary.first += 1;
    else if (initial && followup) {
      if (followup.correct) summary.corrected += 1;
      else summary.unresolved += 1;
    }
  }
  return summary;
}
