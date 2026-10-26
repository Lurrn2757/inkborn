import { describe, expect, it } from 'vitest';
import { activeQuestions, createExam, examMetrics, examReducer, examReport, getExamQuestion, hasConfirmedKey, restoreExam, validateExam, type Exam, type ExamAction, type ExamState } from '../../src/exam/engine.js';
import { makeSampleExam, quickExam, sampleExams } from '../../src/exam/samples.js';

const now = '2026-10-26T12:00:00.000Z';
function submit(state: ExamState, exam: Exam, correct = true) {
  const q = getExamQuestion(state, exam);
  if (!q) throw new Error('Expected active question');
  const answer = correct ? q.correctAnswer! : q.options.find(o => o.id !== q.correctAnswer)!.id;
  return examReducer(state, { type: 'submit', questionId: q.id, answer, expectedRevision: state.revision, now }, exam);
}
function advance(state: ExamState, exam: Exam) { return examReducer(state, { type: 'advance', expectedRevision: state.revision }, exam); }
function solve(exam: Exam, correct: (i: number) => boolean) {
  let state = createExam(exam);
  for (let i = 0; i < activeQuestions(exam).length && state.phase === 'question'; i++) state = advance(submit(state, exam, correct(i)), exam);
  return state;
}

describe('Exam Siege exact positive weighted grading', () => {
  it.each([10, 30, 50, 100])('finishes a %i-question paper without a crystal-per-question assumption', count => {
    const exam = makeSampleExam(count), state = solve(exam, () => true), metrics = examMetrics(state, exam);
    expect(metrics).toMatchObject({ count, correct: count, incorrect: 0, total: count, earned: count, hp: 100, percentage: 100, unattempted: 0, passed: true, ending: 'conquest', bossProgress: 1 });
    expect(state.phase).toBe('ended');
    expect(new Set(state.answers.map(a => a.questionId)).size).toBe(count);
  });

  it('uses actual marks for unequal weighted losses and preserves health after correct answers', () => {
    const exam = structuredClone(quickExam);
    let state = submit(createExam(exam), exam, false);
    expect(examMetrics(state, exam)).toMatchObject({ earned: 0, lost: 1, total: 10, hp: 90, maximumPossible: 9 });
    state = submit(advance(state, exam), exam, true);
    expect(examMetrics(state, exam)).toMatchObject({ earned: 2, lost: 1, hp: 90, unansweredMarks: 7 });
    state = submit(advance(state, exam), exam, false);
    expect(examMetrics(state, exam)).toMatchObject({ earned: 2, lost: 2, hp: 80 });
  });

  it('loses exactly one thirtieth per wrong answer on a 30-mark paper', () => {
    const exam = makeSampleExam(30);
    let state = submit(createExam(exam), exam, false);
    expect(examMetrics(state, exam).hp).toBeCloseTo(96.6666666667, 7);
    state = submit(advance(state, exam), exam, false);
    expect(examMetrics(state, exam).hp).toBeCloseTo(93.3333333333, 7);
    expect(examMetrics(state, exam).ended).toBe(false);
  });

  it('continues at exactly 30% potential even with no earned marks; completes at exactly 30% as a pass', () => {
    const exam = makeSampleExam(10);
    let state = createExam(exam);
    for (let i = 0; i < 7; i++) state = advance(submit(state, exam, false), exam);
    expect(examMetrics(state, exam)).toMatchObject({ earned: 0, hp: 30, failedEarly: false, ended: false });
    expect(state.phase).toBe('question');
    for (let i = 0; i < 3; i++) state = advance(submit(state, exam, true), exam);
    expect(examMetrics(state, exam)).toMatchObject({ earned: 3, hp: 30, percentage: 30, passed: true, ending: 'scarred', bossProgress: 1 });
  });

  it('fails just below 30% without using rounded UI values', () => {
    const exam = makeSampleExam(10);
    exam.questions[0]!.marks = 7.01;
    for (let i = 1; i < 10; i++) exam.questions[i]!.marks = i === 9 ? .35 : .33;
    // total = 10; losing 7.01 leaves 2.99, below the exact 3-mark target.
    const state = submit(createExam(exam), exam, false);
    expect(examMetrics(state, exam)).toMatchObject({ total: 10, maximumPossible: 2.99, failedEarly: true, ended: true, unattempted: 9, ending: 'shattering' });
    expect(state.event?.type).toBe('final');
    expect(examReducer(state, { type: 'submit', questionId: exam.questions[1]!.id, answer: 'A', expectedRevision: state.revision, now }, exam)).toBe(state);
  });

  it('stops an unwinnable exam and does not classify unattempted questions as incorrect', () => {
    const exam = makeSampleExam(10), state = solve(exam, () => false), report = examReport(state, exam);
    expect(report).toMatchObject({ earned: 0, incorrect: 8, correct: 0, unattempted: 2, lost: 8, unansweredMarks: 2, hp: 20, failedEarly: true });
    expect(report.records.filter(r => r.answer === null)).toHaveLength(2);
    expect(state.phase).toBe('ended');
    expect(advance(state, exam)).toBe(state);
  });

  it('exposes the core at the passing goal but requires all remaining questions', () => {
    const exam = makeSampleExam(10);
    let state = createExam(exam);
    for (let i = 0; i < 3; i++) state = advance(submit(state, exam, true), exam);
    expect(examMetrics(state, exam)).toMatchObject({ coreExposed: true, bossProgress: .95, ended: false, complete: false });
    for (let i = 3; i < 10; i++) state = advance(submit(state, exam, false), exam);
    expect(examMetrics(state, exam)).toMatchObject({ percentage: 30, passed: true, ending: 'scarred', complete: true });
  });

  it('supports a 67.25% passing target and decimal weighted marks with integer arithmetic', () => {
    const exam = makeSampleExam(10, 67.25);
    exam.questions.forEach(q => { q.marks = .25; });
    const state = solve(exam, i => i < 7);
    expect(examMetrics(state, exam)).toMatchObject({ total: 2.5, earned: 1.75, passed: true, percentage: 70 });
  });

  it('uses a grade-based 80% boundary for conquest versus scarred victory', () => {
    const exam = makeSampleExam(10);
    expect(examMetrics(solve(exam, i => i < 8), exam).ending).toBe('conquest');
    expect(examMetrics(solve(exam, i => i < 7), exam).ending).toBe('scarred');
  });
});

describe('Exam Siege command, save and key safeguards', () => {
  it('rejects duplicates, stale revisions, wrong IDs, unknown options and invalid dates', () => {
    const exam = makeSampleExam(10), state = createExam(exam), q = getExamQuestion(state, exam)!;
    const action: Extract<ExamAction, { type: 'submit' }> = { type: 'submit', questionId: q.id, answer: q.correctAnswer!, expectedRevision: state.revision, now };
    for (const bad of [{ ...action, questionId: 'missing' }, { ...action, questionId: exam.questions[1]!.id }, { ...action, answer: 'missing' }, { ...action, expectedRevision: 9 }, { ...action, now: 'bad' }]) expect(examReducer(state, bad, exam)).toBe(state);
    expect(advance(state, exam)).toBe(state);
    const next = examReducer(state, action, exam);
    expect(examReducer(next, action, exam)).toBe(next);
    expect(next.answers).toHaveLength(1);
    expect(examReducer(state, action, exam)).toEqual(next);
    expect(state.answers).toEqual([]);
  });

  it('resumes from question, feedback and ending with scores recalculated from inputs', () => {
    const exam = makeSampleExam(30);
    let state = submit(createExam(exam), exam, true);
    expect(restoreExam(JSON.parse(JSON.stringify(state)), exam)).toEqual(state);
    state = advance(state, exam);
    expect(restoreExam({ ...state, revision: 999, index: 20, event: { type: 'victory' }, answers: state.answers.map(a => ({ ...a, marks: 999, correct: false })) }, exam)).toEqual(state);
    state = solve(exam, () => false);
    expect(restoreExam(state, exam)).toEqual(state);
    expect(examMetrics(restoreExam(state, exam), exam).unattempted).toBe(8);
  });

  it('rejects saves with duplicate or skipped questions, extra answers after failure and broken phases', () => {
    const exam = makeSampleExam(10), answered = submit(createExam(exam), exam, true);
    expect(() => restoreExam({ ...answered, answers: [...answered.answers, ...answered.answers] }, exam)).toThrow(/order/);
    expect(() => restoreExam({ ...answered, answers: [{ ...answered.answers[0]!, questionId: exam.questions[1]!.id }] }, exam)).toThrow(/order/);
    expect(() => restoreExam({ ...answered, phase: 'ended' }, exam)).toThrow(/stage/);
    expect(() => restoreExam({ ...answered, examId: 'other' }, exam)).toThrow(/match/);
    const failed = solve(exam, () => false);
    expect(() => restoreExam({ ...failed, answers: [...failed.answers, { ...failed.answers[0]!, questionId: exam.questions[8]!.id }] }, exam)).toThrow(/order/);
  });

  it('requires a supplied confirmed key; allows draft review and question exclusion', () => {
    const exam = structuredClone(quickExam);
    exam.questions[0]!.correctAnswer = null; exam.questions[0]!.keyStatus = 'missing';
    expect(validateExam(exam)).toEqual(exam);
    expect(hasConfirmedKey(exam)).toBe(false);
    expect(() => createExam(exam)).toThrow(/Confirm/);
    exam.questions[0]!.excluded = true;
    expect(hasConfirmedKey(exam)).toBe(true);
    expect(examMetrics(createExam(exam), exam).total).toBe(9);
  });

  it('lets the player exclude malformed extraction drafts without preventing valid questions from being graded', () => {
    const exam = structuredClone(quickExam);
    Object.assign(exam.questions[0]!, { text: '', marks: 0, options: [{ id: 'A', text: '' }], correctAnswer: null, keyStatus: 'missing', excluded: true });
    const checked = validateExam(exam);
    expect(checked.questions).toHaveLength(5);
    expect(examMetrics(createExam(checked), checked)).toMatchObject({ count: 4, total: 9 });
    checked.questions[0]!.excluded = false;
    expect(() => validateExam(checked)).toThrow();
  });

  it('supports explicitly confirmed normalized exact text answers without pretending semantic grading', () => {
    const exam = structuredClone(quickExam);
    exam.questions[0]!.options = []; exam.questions[0]!.correctAnswer = 'Volt per ampere'; exam.questions[0]!.keyStatus = 'confirmed';
    const state = createExam(exam);
    const result = examReducer(state, { type: 'submit', questionId: exam.questions[0]!.id, answer: '  VOLT   per ampere ', expectedRevision: 0, now }, exam);
    expect(result.answers[0]?.correct).toBe(true);
    expect(examReducer(state, { type: 'submit', questionId: exam.questions[0]!.id, answer: 'V/A', expectedRevision: 0, now }, exam).answers[0]?.correct).toBe(false);
  });

  it.each([
    ['negative marks', (e: Exam) => { e.questions[0]!.marks = -1; }],
    ['zero marks', (e: Exam) => { e.questions[0]!.marks = 0; }],
    ['excess precision', (e: Exam) => { e.questions[0]!.marks = .001; }],
    ['nonfinite marks', (e: Exam) => { e.questions[0]!.marks = Infinity; }],
    ['duplicate question IDs', (e: Exam) => { e.questions[1]!.id = e.questions[0]!.id; }],
    ['missing text', (e: Exam) => { e.questions[0]!.text = ''; }],
    ['wrong key', (e: Exam) => { e.questions[0]!.correctAnswer = 'unknown'; }],
    ['key inconsistency', (e: Exam) => { e.questions[0]!.correctAnswer = null; }],
    ['duplicate option IDs', (e: Exam) => { e.questions[0]!.options[1]!.id = e.questions[0]!.options[0]!.id; }],
    ['duplicate option text', (e: Exam) => { e.questions[0]!.options[1]!.text = e.questions[0]!.options[0]!.text; }],
    ['all excluded', (e: Exam) => { e.questions.forEach(q => { q.excluded = true; }); }],
    ['bad threshold', (e: Exam) => { e.passThreshold = 0; }],
  ] as const)('rejects malformed exam: %s', (_, change) => {
    const exam = structuredClone(quickExam); change(exam); expect(() => validateExam(exam)).toThrow();
  });

  it('does not fabricate topic classification; reports supported topics and high-impact mistakes', () => {
    const exam = structuredClone(quickExam);
    exam.questions[0]!.topicReviewed = false;
    const state = solve(exam, i => i !== 0 && i !== 4), report = examReport(state, exam);
    expect(report.topics.find(t => t.topic === 'Unclassified')).toMatchObject({ lost: 1, mistakes: 1 });
    expect(report.highestImpact.map(r => r.question.marks)).toEqual([4, 1]);
    expect(report.topics.reduce((sum, t) => sum + t.lost, 0)).toBe(report.lost);
    expect(sampleExams.every(e => hasConfirmedKey(e))).toBe(true);
  });
});

describe('earned player special preserves examination rules', () => {
  it('unlocks at the exact passing target, casts once and never changes marks or question progress', () => {
    const exam = structuredClone(quickExam);
    let state = createExam(exam);
    const locked = examReducer(state, { type: 'finisher', expectedRevision: state.revision }, exam);
    expect(locked).toBe(state);
    state = advance(submit(state, exam, true), exam);
    expect(examMetrics(state, exam).earned).toBe(1);
    expect(examReducer(state, { type: 'finisher', expectedRevision: state.revision }, exam)).toBe(state);
    state = submit(state, exam, true);
    expect(examMetrics(state, exam)).toMatchObject({ earned: 3, coreExposed: true, ended: false });
    const snapshot = structuredClone(state), metrics = examMetrics(state, exam);
    const cast = examReducer(state, { type: 'finisher', expectedRevision: state.revision }, exam);
    expect(cast).toMatchObject({ phase: 'feedback', index: state.index, finisherUsed: true, event: { type: 'finisher' } });
    expect(cast.answers).toEqual(state.answers);
    expect(examMetrics(cast, exam)).toEqual(metrics);
    expect(state).toEqual(snapshot);
    expect(examReducer(cast, { type: 'finisher', expectedRevision: cast.revision }, exam)).toBe(cast);
    expect(examReducer(cast, { type: 'finisher', expectedRevision: state.revision }, exam)).toBe(cast);
    const restored = restoreExam(cast, exam);
    expect(restored.finisherUsed).toBe(true);
    expect(examMetrics(restored, exam)).toEqual(metrics);
    expect(examReducer(restored, { type: 'finisher', expectedRevision: restored.revision }, exam)).toBe(restored);
    let completed = advance(restored, exam);
    while (completed.phase === 'question') completed = advance(submit(completed, exam, true), exam);
    expect(examMetrics(completed, exam)).toMatchObject({ earned: 10, correct: 5, complete: true, passed: true });
    expect(examReducer(completed, { type: 'finisher', expectedRevision: completed.revision }, exam)).toBe(completed);
    expect(restoreExam(completed, exam)).toEqual(completed);
  });
  it('supports casting during a question without committing it, and rejects invented saved unlocks', () => {
    const exam = structuredClone(quickExam);
    let state = createExam(exam);
    expect(() => restoreExam({ ...state, finisherUsed: true }, exam)).toThrow(/not earned/);
    state = advance(submit(state, exam), exam);
    state = advance(submit(state, exam), exam);
    const cast = examReducer(state, { type: 'finisher', expectedRevision: state.revision }, exam);
    expect(cast).toMatchObject({ phase: 'question', index: 2, finisherUsed: true });
    expect(getExamQuestion(cast, exam)?.id).toBe(exam.questions[2]!.id);
    const restored = restoreExam(cast, exam);
    expect(restored.finisherUsed).toBe(true);
    expect(restored.answers).toHaveLength(2);
    const legacy = { ...state } as Partial<ExamState>; delete legacy.finisherUsed;
    expect(restoreExam(legacy, exam).finisherUsed).toBe(false);
  });
});
