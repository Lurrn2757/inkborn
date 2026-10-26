import { describe, expect, it } from 'vitest';
import { createEvidence, hashNotes, isExactEvidence, segmentSourceBlocks } from '../../shared/evidence.js';
import { sampleLessons } from '../../shared/samples.js';
import { validateLesson, type Lesson, type Question } from '../../shared/schema.js';
import { assertBattleInvariants, getBattleInvariantErrors } from '../../src/battle/invariants.js';
import { battleReducer, createBattle, getCurrentQuestion, type BattleAction, type BattleState } from '../../src/battle/reducer.js';
import { battleEnding, ritualIntegrity } from '../../src/battle/ritual.js';
import { summarizeBattle } from '../../src/battle/results.js';

const lesson = sampleLessons[0];
if (!lesson) throw new Error('The curated electrical-circuits sample must exist.');
const circuits: Lesson = lesson;
const now = '2026-10-18T12:00:00.000Z';

function requireQuestion(state: BattleState): Question {
  const question = getCurrentQuestion(state, circuits);
  if (!question) throw new Error('Expected an active question.');
  return question;
}

function reduce(state: BattleState, action: BattleAction): BattleState {
  const next = battleReducer(state, action, circuits);
  assertBattleInvariants(next, circuits);
  return next;
}

function submit(state: BattleState, correct: boolean): BattleState {
  const question = requireQuestion(state);
  const optionId = correct ? question.correctOptionId : question.options.find((option) => option.id !== question.correctOptionId)?.id;
  if (!optionId) throw new Error('A question must have an incorrect option.');
  return reduce(state, {
    type: 'submit', questionId: question.id, conceptId: question.conceptId,
    optionId, expectedRevision: state.revision, now,
  });
}

function mutableLesson(): Lesson {
  return structuredClone(circuits);
}

describe('curated lesson and evidence validation', () => {
  it('ships one honestly labeled original sample with exactly three distinct concept encounters', () => {
    expect(sampleLessons).toHaveLength(1);
    expect(validateLesson(circuits)).toEqual(circuits);
    expect(circuits).toMatchObject({ mode: 'sample', sampleId: 'electrical-circuits', provider: null, model: null });
    expect(circuits.concepts.map((concept) => concept.id)).toEqual(['closed-path', 'ohms-law', 'series-parallel']);
    expect(circuits.concepts.map((concept) => concept.initial.options.find((option) => option.id === concept.initial.correctOptionId)?.text)).toEqual([
      'It stops throughout the loop.', '2 amperes.', 'It can continue carrying current.',
    ]);
    for (const concept of circuits.concepts) {
      expect(concept.initial.hint?.trim()).toBeTruthy();
      expect(concept.initial.prompt).not.toBe(concept.followup.prompt);
      for (const evidence of [...concept.evidence, ...concept.initial.evidence, ...concept.followup.evidence]) {
        expect(isExactEvidence(circuits.notes, evidence)).toBe(true);
      }
    }
  });

  it('resolves repeated Unicode quotes inside the named block with UTF-16 offsets', () => {
    const notes = '⚡ same 🐉 same\r\n\r\nsame 🐉 same';
    const blocks = segmentSourceBlocks(notes);
    expect(blocks.map((block) => block.text)).toEqual(['⚡ same 🐉 same', 'same 🐉 same']);
    const evidence = createEvidence(notes, 'block-2', '🐉 same', 'source');
    expect(evidence.start).toBe(notes.lastIndexOf('🐉'));
    expect(notes.slice(evidence.start, evidence.end)).toBe('🐉 same');
    expect(isExactEvidence(notes, evidence)).toBe(true);
    expect(isExactEvidence(notes, { ...evidence, blockId: 'block-1' })).toBe(false);
    expect(createEvidence('echo echo', 'block-1', 'echo', 'first').start).toBe(0);
    expect(() => createEvidence(notes, 'block-1', 'absent', 'bad')).toThrow();
    expect(() => createEvidence(notes, 'missing-block', 'same', 'bad')).toThrow();
  });

  it.each([
    ['extra keys', (value: Lesson) => Object.assign(value, { invented: true })],
    ['wrong concept count', (value: Lesson) => value.concepts.pop()],
    ['duplicate concepts', (value: Lesson) => { value.concepts[1]!.id = value.concepts[0]!.id; }],
    ['duplicate question IDs', (value: Lesson) => { value.concepts[1]!.initial.id = value.concepts[0]!.initial.id; }],
    ['wrong question concept', (value: Lesson) => { value.concepts[0]!.initial.conceptId = 'other'; }],
    ['wrong question kind', (value: Lesson) => { value.concepts[0]!.initial.kind = 'followup'; }],
    ['duplicate prompts', (value: Lesson) => { value.concepts[0]!.followup.prompt = value.concepts[0]!.initial.prompt; }],
    ['too few options', (value: Lesson) => value.concepts[0]!.initial.options.pop()],
    ['duplicate option IDs', (value: Lesson) => { value.concepts[0]!.initial.options[1]!.id = value.concepts[0]!.initial.options[0]!.id; }],
    ['duplicate option text', (value: Lesson) => { value.concepts[0]!.initial.options[1]!.text = ` ${value.concepts[0]!.initial.options[0]!.text.toUpperCase()} `; }],
    ['missing correct option', (value: Lesson) => { value.concepts[0]!.initial.correctOptionId = 'missing'; }],
    ['null initial hint', (value: Lesson) => { value.concepts[0]!.initial.hint = null; }],
    ['blank initial hint', (value: Lesson) => { value.concepts[0]!.initial.hint = '  '; }],
    ['missing initial hint', (value: Lesson) => { Reflect.deleteProperty(value.concepts[0]!.initial, 'hint'); }],
    ['missing question evidence', (value: Lesson) => { value.concepts[0]!.followup.evidence = []; }],
    ['invented quote', (value: Lesson) => { value.concepts[0]!.initial.evidence[0]!.quote = 'A fabricated explanation.'; }],
    ['incorrect source block', (value: Lesson) => { value.concepts[0]!.initial.evidence[0]!.blockId = 'block-2'; }],
    ['incorrect offsets', (value: Lesson) => { value.concepts[0]!.initial.evidence[0]!.start += 1; }],
    ['altered notes', (value: Lesson) => { value.notes += ' Changed.'; }],
    ['AI provenance on sample', (value: Lesson) => { value.provider = 'openai'; }],
    ['missing sample identity', (value: Lesson) => { value.sampleId = null; }],
    ['missing AI provenance', (value: Lesson) => { value.mode = 'ai'; value.sampleId = null; }],
  ] as const)('rejects %s before a battle is created', (_name, mutate) => {
    const invalid = mutableLesson();
    mutate(invalid);
    expect(() => validateLesson(invalid)).toThrow();
  });

  it('rejects conflicting evidence identities even when both passages match the notes', () => {
    const invalid = mutableLesson();
    const first = invalid.concepts[0]!;
    const second = invalid.concepts[1]!;
    second.evidence[0]!.id = first.evidence[0]!.id;
    expect(() => validateLesson(invalid)).toThrow(/different passages/);
  });

  it('fingerprints exact notes and accepts complete AI provenance through the same validator', () => {
    expect(hashNotes('same')).toBe(hashNotes('same'));
    expect(hashNotes('same')).not.toBe(hashNotes('same '));
    const candidate = mutableLesson();
    candidate.mode = 'ai'; candidate.sampleId = null; candidate.provider = 'openai'; candidate.model = 'example-model';
    expect(validateLesson(candidate).mode).toBe('ai');
  });
});

describe('deterministic finite battle', () => {
  it('commits an initial mistake before any animation and permits only its follow-up', () => {
    const concept = circuits.concepts[1]!;
    const initial = createBattle(circuits);
    expect(getCurrentQuestion(initial, circuits)).toBeNull();
    let state = reduce(initial, { type: 'select', conceptId: concept.id });
    state = submit(state, false);
    expect(state.phase).toBe('feedback');
    expect(state.answers).toHaveLength(1);
    expect(state.answers[0]).toMatchObject({ questionId: concept.initial.id, correct: false, sequence: 1, submittedAt: now });
    expect(state.outcomes[concept.id]).toBe('corrupted');
    expect(state.event).toMatchObject({ type: 'corrupt', conceptId: concept.id });
    expect(reduce(state, { type: 'select', conceptId: circuits.concepts[0]!.id })).toBe(state);
    state = reduce(state, { type: 'continue' });
    expect(requireQuestion(state).id).toBe(concept.followup.id);
    expect(state.event).toBeNull();
    state = submit(state, true);
    expect(state.outcomes[concept.id]).toBe('corrected');
    expect(state.event?.type).toBe('recovery');
    state = reduce(state, { type: 'continue' });
    expect(state.phase).toBe('choosing');
    expect(reduce(state, { type: 'select', conceptId: concept.id })).toBe(state);
    expect(initial.answers).toEqual([]);
    expect(initial.outcomes[concept.id]).toBe('stable');
  });

  it('ignores wrong-phase, stale, duplicate, wrong-question, wrong-concept and unknown-option commands', () => {
    let state = createBattle(circuits);
    expect(reduce(state, { type: 'continue' })).toBe(state);
    expect(reduce(state, { type: 'finish' })).toBe(state);
    expect(reduce(state, { type: 'select', conceptId: 'missing' })).toBe(state);
    state = reduce(state, { type: 'select', conceptId: circuits.concepts[0]!.id });
    const question = requireQuestion(state);
    const action: Extract<BattleAction, { type: 'submit' }> = {
      type: 'submit', questionId: question.id, conceptId: question.conceptId,
      optionId: question.correctOptionId, expectedRevision: state.revision, now,
    };
    for (const invalid of [
      { ...action, expectedRevision: state.revision - 1 },
      { ...action, questionId: circuits.concepts[1]!.initial.id },
      { ...action, conceptId: circuits.concepts[1]!.id },
      { ...action, optionId: 'missing' },
      { ...action, now: 'not-a-timestamp' },
    ]) expect(reduce(state, invalid)).toBe(state);
    const answered = reduce(state, action);
    expect(reduce(answered, action)).toBe(answered);
    expect(answered.answers).toHaveLength(1);
    expect(battleReducer(state, action, { ...circuits, id: 'different-lesson' })).toBe(state);
    expect(getCurrentQuestion(state, { ...circuits, id: 'different-lesson' })).toBeNull();
    expect(battleReducer(state, action, circuits)).toEqual(battleReducer(state, action, circuits));
  });

  const orders = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  for (const order of orders) {
    it(`keeps identities and exact totals for every outcome combination in order ${order.join(',')}`, () => {
      for (let combination = 0; combination < 27; combination += 1) {
        const expected = [combination % 3, Math.floor(combination / 3) % 3, Math.floor(combination / 9) % 3];
        let state = createBattle(circuits);
        let skippedFollowups = 0;
        for (const index of order) {
          const concept = circuits.concepts[index]!;
          const outcome = expected[index]; // 0 = first; 1 = corrected; 2 = unresolved
          state = reduce(state, { type: 'select', conceptId: concept.id });
          expect(requireQuestion(state).id).toBe(concept.initial.id);
          state = submit(state, outcome === 0);
          expect(state.event).toMatchObject({ type: outcome === 0 ? 'hit' : 'corrupt', conceptId: concept.id });
          state = reduce(state, { type: 'continue' });
          if (outcome !== 0 && state.phase === 'ending') skippedFollowups += 1;
          if (outcome !== 0 && state.phase !== 'ending') {
            expect(requireQuestion(state).id).toBe(concept.followup.id);
            state = submit(state, outcome === 1);
            expect(state.event).toMatchObject({ type: outcome === 1 ? 'recovery' : 'unresolved', conceptId: concept.id });
            state = reduce(state, { type: 'continue' });
          }
          if (ritualIntegrity(state) === 0) expected[index] = 2;
          expect(state.outcomes[concept.id]).toBe(expected[index] === 0 ? 'first' : expected[index] === 1 ? 'corrected' : 'unresolved');
          expect(Object.keys(state.outcomes)).toEqual(circuits.concepts.map((entry) => entry.id));
        }
        expect(state.phase).toBe('ending');
        expect(state.event?.type).toBe(expected.includes(2) ? 'retreat' : 'victory');
        const first = expected.filter((outcome) => outcome === 0).length;
        const corrected = expected.filter((outcome) => outcome === 1).length;
        const unresolved = expected.filter((outcome) => outcome === 2).length;
        expect(summarizeBattle(state)).toEqual({ first, corrected, unresolved, correct: first + corrected, total: 6 - first - skippedFollowups });
        expect(state.answers.length).toBeGreaterThanOrEqual(3);
        expect(state.answers.length).toBeLessThanOrEqual(6);
        expect(new Set(state.answers.map((answer) => answer.questionId)).size).toBe(state.answers.length);
        state = reduce(state, { type: 'finish' });
        expect(state.phase).toBe('results');
        expect(reduce(state, { type: 'finish' })).toBe(state);
        expect(reduce(state, { type: 'continue' })).toBe(state);
      }
    });
  }

  it('does not label a pending follow-up unresolved and derives results from answer history', () => {
    let state = reduce(createBattle(circuits), { type: 'select', conceptId: circuits.concepts[0]!.id });
    state = submit(state, false);
    expect(summarizeBattle(state)).toEqual({ first: 0, corrected: 0, unresolved: 0, correct: 0, total: 1 });
    expect(summarizeBattle({ ...state, outcomes: { ...state.outcomes, 'closed-path': 'first' } }).first).toBe(0);
  });

  it('spends one ward per committed mistake, keeps recovery scars, and preserves feedback before an exhausted retreat', () => {
    let state = createBattle(circuits);
    expect(ritualIntegrity(state)).toBe(5);
    expect(battleEnding(state)).toBe('dominant');
    state = reduce(state, { type: 'select', conceptId: circuits.concepts[0]!.id });
    const pending = state;
    state = submit(state, false);
    expect(ritualIntegrity(state)).toBe(4);
    expect(submit(state, false)).toBe(state); // repeated submission during feedback
    expect(ritualIntegrity(state)).toBe(4);
    expect(ritualIntegrity(pending)).toBe(5);
    state = reduce(state, { type: 'continue' });
    state = submit(state, true);
    expect(ritualIntegrity(state)).toBe(4);
    expect(state.event?.type).toBe('recovery');
    expect(battleEnding(state)).toBe('scarred');

    state = createBattle(circuits);
    for (const concept of circuits.concepts) {
      state = reduce(state, { type: 'select', conceptId: concept.id });
      state = submit(state, false);
      if (ritualIntegrity(state) === 0) {
        expect(state.phase).toBe('feedback');
        expect(state.outcomes[concept.id]).toBe('corrupted');
        expect(summarizeBattle(state).unresolved).toBe(2);
      }
      state = reduce(state, { type: 'continue' });
      if (state.phase === 'ending') break;
      state = submit(state, false);
      state = reduce(state, { type: 'continue' });
    }
    expect(state.phase).toBe('ending');
    expect(ritualIntegrity(state)).toBe(0);
    expect(battleEnding(state)).toBe('retreat');
    expect(state.answers).toHaveLength(5);
    expect(summarizeBattle(state)).toEqual({ first: 0, corrected: 0, unresolved: 3, correct: 0, total: 5 });
    expect(Object.values(state.outcomes)).toEqual(['unresolved', 'unresolved', 'unresolved']);
    expect(reduce(state, { type: 'select', conceptId: circuits.concepts[2]!.id })).toBe(state);
    expect(reduce(state, { type: 'continue' })).toBe(state);
  });

  it('detects fabricated outcomes and duplicated history in restored snapshots', () => {
    let state = reduce(createBattle(circuits), { type: 'select', conceptId: circuits.concepts[0]!.id });
    state = submit(state, true);
    expect(getBattleInvariantErrors(state, circuits)).toEqual([]);
    expect(() => assertBattleInvariants({ ...state, outcomes: { ...state.outcomes, 'closed-path': 'unresolved' } }, circuits)).toThrow(/outcome/);
    expect(() => assertBattleInvariants({ ...state, answers: [...state.answers, ...state.answers] }, circuits)).toThrow(/more than once/);
  });
});
