import type { Lesson } from '../../shared/schema.js';
import { getCurrentQuestion, isTerminalOutcome, type BattleState, type ConceptOutcome } from './reducer.js';

/** Semantic checks for tests and, later, validating a restored battle snapshot. */
export function getBattleInvariantErrors(state: BattleState, lesson: Lesson): string[] {
  const errors: string[] = [];
  if (state.lessonId !== lesson.id) errors.push('Battle belongs to a different lesson.');
  if (!Number.isInteger(state.revision) || state.revision < 0) errors.push('Revision must be a nonnegative integer.');
  const conceptIds = new Set(lesson.concepts.map((concept) => concept.id));
  const outcomeIds = Object.keys(state.outcomes);
  if (outcomeIds.length !== conceptIds.size || outcomeIds.some((id) => !conceptIds.has(id))) {
    errors.push('Outcome identities must match the lesson concepts exactly.');
  }
  const questionIds = new Set<string>();
  for (const [index, answer] of state.answers.entries()) {
    const concept = lesson.concepts.find((candidate) => candidate.id === answer.conceptId);
    const question = concept?.[answer.kind];
    if (!question || question.id !== answer.questionId) errors.push('Answer refers to a different question or concept.');
    else {
      if (!question.options.some((option) => option.id === answer.selectedOptionId)) errors.push('Selected answer does not exist.');
      if (answer.correct !== (question.correctOptionId === answer.selectedOptionId)) errors.push('Recorded correctness does not match the lesson.');
    }
    if (questionIds.has(answer.questionId)) errors.push('A question was answered more than once.');
    questionIds.add(answer.questionId);
    if (answer.sequence !== index + 1) errors.push('Answer sequences must be contiguous and ordered.');
    if (!Number.isFinite(Date.parse(answer.submittedAt))) errors.push('Answer timestamp is invalid.');
  }
  for (const concept of lesson.concepts) {
    const answers = state.answers.filter((answer) => answer.conceptId === concept.id);
    const initial = answers.find((answer) => answer.kind === 'initial');
    const followup = answers.find((answer) => answer.kind === 'followup');
    let expected: ConceptOutcome = 'stable';
    if (initial) expected = initial.correct ? 'first' : followup ? followup.correct ? 'corrected' : 'unresolved' : 'corrupted';
    if (answers.length > 2 || (followup && (!initial || initial.correct || followup.sequence < initial.sequence))) {
      errors.push('A follow-up requires one preceding initial mistake and at most two answers per concept.');
    }
    if (state.outcomes[concept.id] !== expected) errors.push('Concept outcome does not match its committed answers.');
  }
  if (state.phase === 'question' || state.phase === 'feedback') {
    const question = getCurrentQuestion(state, lesson);
    if (!question) errors.push('An active encounter requires a matching question.');
    if (state.phase === 'question' && question) {
      const expected = state.questionKind === 'initial' ? 'stable' : 'corrupted';
      if (state.outcomes[question.conceptId] !== expected || questionIds.has(question.id)) errors.push('Question is no longer available.');
    }
    if (state.phase === 'feedback') {
      const last = state.answers.at(-1);
      if (!last || last.questionId !== question?.id || last.conceptId !== state.activeConceptId) errors.push('Feedback must describe the latest committed answer.');
      const expectedType = last?.kind === 'initial' ? last.correct ? 'hit' : 'corrupt' : last?.correct ? 'recovery' : 'unresolved';
      if (!state.event || state.event.type !== expectedType || state.event.conceptId !== state.activeConceptId) errors.push('Feedback event must match the committed answer.');
    }
  } else if (state.activeConceptId !== null) errors.push('No concept can remain active outside an encounter.');
  const complete = lesson.concepts.every((concept) => isTerminalOutcome(state.outcomes[concept.id]));
  if (state.phase === 'choosing' && !lesson.concepts.some((concept) => state.outcomes[concept.id] === 'stable')) {
    errors.push('Choosing requires an available stable concept.');
  }
  if (state.phase === 'ending' || state.phase === 'results') {
    if (!complete || state.answers.length < 3 || state.answers.length > 6) errors.push('A completed battle requires three terminal concepts and three to six answers.');
    const ending = lesson.concepts.some((concept) => state.outcomes[concept.id] === 'unresolved') ? 'retreat' : 'victory';
    if (state.event?.type !== ending || state.event.conceptId !== null) errors.push('Ending must reflect all recorded outcomes.');
  }
  if ((state.phase === 'choosing' || state.phase === 'question') && state.event !== null) errors.push('A fresh selection or question cannot retain a presentation event.');
  return errors;
}

export function assertBattleInvariants(state: BattleState, lesson: Lesson): void {
  const errors = getBattleInvariantErrors(state, lesson);
  if (errors.length > 0) throw new Error(errors.join('\n'));
}
