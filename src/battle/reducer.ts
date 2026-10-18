import type { Lesson, Question } from '../../shared/schema.js';

export type ConceptOutcome = 'stable' | 'corrupted' | 'first' | 'corrected' | 'unresolved';
export interface Answer {
  questionId: string;
  conceptId: string;
  kind: 'initial' | 'followup';
  selectedOptionId: string;
  correct: boolean;
  sequence: number;
  submittedAt: string;
}
export interface BattleEvent {
  id: string;
  type: 'hit' | 'corrupt' | 'recovery' | 'unresolved' | 'victory' | 'retreat';
  conceptId: string | null;
}
export interface BattleState {
  lessonId: string;
  revision: number;
  phase: 'choosing' | 'question' | 'feedback' | 'ending' | 'results';
  activeConceptId: string | null;
  questionKind: 'initial' | 'followup';
  answers: Answer[];
  outcomes: Record<string, ConceptOutcome>;
  event: BattleEvent | null;
}
export type BattleAction =
  | { type: 'select'; conceptId: string }
  | { type: 'submit'; questionId: string; conceptId: string; optionId: string; expectedRevision: number; now: string }
  | { type: 'continue' }
  | { type: 'finish' };

export function isTerminalOutcome(outcome: ConceptOutcome | undefined): boolean {
  return outcome === 'first' || outcome === 'corrected' || outcome === 'unresolved';
}

export function createBattle(lesson: Lesson): BattleState {
  return {
    lessonId: lesson.id, revision: 0, phase: 'choosing', activeConceptId: null,
    questionKind: 'initial', answers: [],
    outcomes: Object.fromEntries(lesson.concepts.map((concept) => [concept.id, 'stable' as const])),
    event: null,
  };
}

export function getCurrentQuestion(state: BattleState, lesson: Lesson): Question | null {
  if (state.lessonId !== lesson.id || (state.phase !== 'question' && state.phase !== 'feedback')) return null;
  const concept = lesson.concepts.find((candidate) => candidate.id === state.activeConceptId);
  return concept?.[state.questionKind] ?? null;
}

function event(state: BattleState, type: BattleEvent['type'], conceptId: string | null): BattleEvent {
  return { id: `${state.lessonId}-${state.revision + 1}-${type}`, type, conceptId };
}

/** All mutations are committed here, before presentation. Invalid/stale commands are no-ops. */
export function battleReducer(state: BattleState, action: BattleAction, lesson: Lesson): BattleState {
  if (state.lessonId !== lesson.id) return state;
  switch (action.type) {
    case 'select': {
      if (state.phase !== 'choosing' || state.outcomes[action.conceptId] !== 'stable'
        || !lesson.concepts.some((concept) => concept.id === action.conceptId)) return state;
      return { ...state, revision: state.revision + 1, phase: 'question', activeConceptId: action.conceptId, questionKind: 'initial', event: null };
    }
    case 'submit': {
      if (state.phase !== 'question' || action.expectedRevision !== state.revision || action.conceptId !== state.activeConceptId) return state;
      const question = getCurrentQuestion(state, lesson);
      if (!question || question.id !== action.questionId || question.conceptId !== action.conceptId
        || state.answers.some((answer) => answer.questionId === question.id)
        || !question.options.some((option) => option.id === action.optionId)
        || !Number.isFinite(Date.parse(action.now))) return state;
      const correct = action.optionId === question.correctOptionId;
      const outcome: ConceptOutcome = question.kind === 'initial'
        ? correct ? 'first' : 'corrupted'
        : correct ? 'corrected' : 'unresolved';
      const type: BattleEvent['type'] = question.kind === 'initial'
        ? correct ? 'hit' : 'corrupt'
        : correct ? 'recovery' : 'unresolved';
      const answer: Answer = {
        questionId: question.id, conceptId: question.conceptId, kind: question.kind,
        selectedOptionId: action.optionId, correct, sequence: state.answers.length + 1, submittedAt: action.now,
      };
      return {
        ...state, revision: state.revision + 1, phase: 'feedback',
        answers: [...state.answers, answer], outcomes: { ...state.outcomes, [question.conceptId]: outcome },
        event: event(state, type, question.conceptId),
      };
    }
    case 'continue': {
      if (state.phase !== 'feedback' || state.activeConceptId === null) return state;
      if (state.questionKind === 'initial' && state.outcomes[state.activeConceptId] === 'corrupted') {
        return { ...state, revision: state.revision + 1, phase: 'question', questionKind: 'followup', event: null };
      }
      if (!isTerminalOutcome(state.outcomes[state.activeConceptId])) return state;
      const complete = lesson.concepts.every((concept) => isTerminalOutcome(state.outcomes[concept.id]));
      return {
        ...state, revision: state.revision + 1, phase: complete ? 'ending' : 'choosing',
        activeConceptId: null, questionKind: 'initial',
        event: complete ? event(state, lesson.concepts.some((concept) => state.outcomes[concept.id] === 'unresolved') ? 'retreat' : 'victory', null) : null,
      };
    }
    case 'finish':
      return state.phase === 'ending' ? { ...state, revision: state.revision + 1, phase: 'results' } : state;
  }
}
