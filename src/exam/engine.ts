import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max);
const draftText = (max: number) => z.string().trim().max(max);
const hundredths = (value: number) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7;
const draftQuestionSchema = z.object({
  id: text(100), number: draftText(40), text: draftText(16000),
  options: z.array(z.object({ id: draftText(80), text: draftText(3000) }).strict()).max(100),
  correctAnswer: draftText(3000).nullable(), marks: z.number().finite().min(-10000).max(10000),
  topic: draftText(160).nullable(), topicReviewed: z.boolean(), explanation: draftText(12000).nullable(),
  source: z.object({ page: z.number().int().min(1).max(500).nullable(), evidence: z.string().max(24000), label: text(500) }).strict(),
  keyStatus: z.enum(['missing', 'confirmed', 'curated']), excluded: z.boolean(),
}).strict();
export const examQuestionSchema = draftQuestionSchema.superRefine((q, ctx) => {
  const add = (message: string) => ctx.addIssue({ code: 'custom', message });
  // Excluded extraction drafts are retained for review, but never reach grading.
  if (q.excluded) return;
  if (!q.number) add('An included question needs a question number.');
  if (!q.text) add('An included question needs question text.');
  if (q.marks <= 0 || !hundredths(q.marks)) add('Use positive marks with at most two decimal places.');
  if (q.options.length > 12) add('Use at most 12 answer options per question.');
  if (q.options.some(option => !option.id || !option.text)) add('Every included option needs an ID and text.');
  if (q.options.length === 1) add('Provide at least two options, or no options for an exact-text question.');
  if (new Set(q.options.map(o => o.id)).size !== q.options.length) add('Option IDs must be unique.');
  if (new Set(q.options.map(o => normalizeAnswer(o.text))).size !== q.options.length) add('Option texts must be distinct.');
  if (q.correctAnswer !== null && q.options.length && !q.options.some(o => o.id === q.correctAnswer)) add('The answer key must name an existing option ID.');
  if (q.correctAnswer !== null && !q.correctAnswer) add('An answer key cannot be empty.');
  if (q.keyStatus !== 'missing' && !q.correctAnswer) add('A confirmed key requires a correct answer.');
  if (q.topicReviewed && !q.topic) add('A reviewed topic requires a topic label.');
});
export const examDraftSchema = z.object({
  id: text(100), title: draftText(300), questions: z.array(draftQuestionSchema).max(300),
  passThreshold: z.number().finite().min(-10000).max(10000), marking: z.literal('positive-only'),
}).strict().superRefine((exam, ctx) => {
  if (new Set(exam.questions.map(q => q.id)).size !== exam.questions.length) ctx.addIssue({ code: 'custom', message: 'Question IDs must be unique.' });
});
export const examSchema = z.object({
  id: text(100), title: text(300), questions: z.array(examQuestionSchema).min(1).max(300),
  passThreshold: z.number().finite().min(1).max(100).refine(hundredths, 'Use at most two decimal places for the threshold.'),
  marking: z.literal('positive-only'),
}).strict().superRefine((exam, ctx) => {
  if (new Set(exam.questions.map(q => q.id)).size !== exam.questions.length) ctx.addIssue({ code: 'custom', message: 'Question IDs must be unique.' });
  if (!exam.questions.some(q => !q.excluded)) ctx.addIssue({ code: 'custom', message: 'Include at least one question.' });
});
export type ExamQuestion = z.infer<typeof examQuestionSchema>;
export type Exam = z.infer<typeof examSchema>;
export type ExamAnswer = { questionId: string; answer: string; correct: boolean; marks: number; submittedAt: string; sequence: number };
export type ExamEvent = { id: string; type: 'hit' | 'slam' | 'storm' | 'beam' | 'sweep' | 'final' | 'victory' | 'finisher'; intensity: number; questionId: string; streak: number };
export type ExamState = { examId: string; revision: number; index: number; phase: 'question' | 'feedback' | 'ended'; answers: ExamAnswer[]; finisherUsed: boolean; event: ExamEvent | null };
export type ExamAction = { type: 'submit'; questionId: string; answer: string; expectedRevision: number; now: string } | { type: 'advance'; expectedRevision: number } | { type: 'finisher'; expectedRevision: number };
export type ExamEnding = 'conquest' | 'scarred' | 'shattering';
export function normalizeAnswer(value: string): string { return value.normalize('NFKC').trim().toLocaleLowerCase('en').replace(/\s+/g, ' '); }
export function validateExam(input: unknown): Exam { return examSchema.parse(input); }
/** Preparation may be incomplete, but must stay bounded and structurally safe. */
export function validateExamDraft(input: unknown): Exam { return examDraftSchema.parse(input); }
export function activeQuestions(exam: Exam): ExamQuestion[] { return exam.questions.filter(q => !q.excluded); }
export function hasConfirmedKey(exam: Exam): boolean { return activeQuestions(exam).every(q => q.keyStatus !== 'missing' && q.correctAnswer !== null); }
export function createExam(input: Exam): ExamState {
  const exam = validateExam(input);
  if (!hasConfirmedKey(exam)) throw new Error('Confirm every included answer key before graded play.');
  return { examId: exam.id, revision: 0, index: 0, phase: 'question', answers: [], finisherUsed: false, event: null };
}
export function getExamQuestion(state: ExamState, exam: Exam): ExamQuestion | null {
  return state.examId === exam.id && state.phase === 'question' ? activeQuestions(exam)[state.index] ?? null : null;
}
const units = (marks: number): number => Math.round(marks * 100);
export function examMetrics(state: ExamState, exam: Exam) {
  const questions = activeQuestions(exam), byId = new Map(questions.map(q => [q.id, q]));
  let earnedUnits = 0, lostUnits = 0, correct = 0, incorrect = 0;
  const totalUnits = questions.reduce((sum, q) => sum + units(q.marks), 0);
  for (const answer of state.answers) {
    const q = byId.get(answer.questionId);
    if (!q) continue;
    if (answer.correct) { earnedUnits += units(q.marks); correct += 1; }
    else { lostUnits += units(q.marks); incorrect += 1; }
  }
  const potentialUnits = totalUnits - lostUnits, unansweredUnits = totalUnits - earnedUnits - lostUnits;
  const thresholdBps = Math.round(exam.passThreshold * 100);
  const complete = state.answers.length === questions.length;
  const failedEarly = !complete && potentialUnits * 10000 < totalUnits * thresholdBps;
  const ended = failedEarly || complete;
  const passed = ended && !failedEarly && earnedUnits * 10000 >= totalUnits * thresholdBps;
  const percentage = earnedUnits / totalUnits * 100;
  const ending: ExamEnding | null = ended ? passed ? percentage >= 80 ? 'conquest' : 'scarred' : 'shattering' : null;
  const bossProgress = passed ? 1 : Math.min(.95, earnedUnits * 10000 / (totalUnits * thresholdBps) * .95);
  return {
    total: totalUnits / 100, earned: earnedUnits / 100, lost: lostUnits / 100,
    unansweredMarks: unansweredUnits / 100, maximumPossible: potentialUnits / 100,
    hp: potentialUnits / totalUnits * 100, percentage, passMarks: totalUnits / 100 * exam.passThreshold / 100,
    correct, incorrect, unattempted: questions.length - state.answers.length, count: questions.length,
    failedEarly, complete, ended, passed, ending, bossProgress,
    coreExposed: earnedUnits * 10000 >= totalUnits * thresholdBps,
  };
}
export function examReducer(state: ExamState, action: ExamAction, exam: Exam): ExamState {
  if (state.examId !== exam.id || state.revision !== action.expectedRevision || state.phase === 'ended') return state;
  if (action.type === 'finisher') {
    const metrics = examMetrics(state, exam);
    if (!metrics.coreExposed || metrics.ended || state.finisherUsed) return state;
    return { ...state, revision: state.revision + 1, finisherUsed: true, event: { id: `${exam.id}:finisher:${state.revision + 1}`, type: 'finisher', questionId: activeQuestions(exam)[state.index]!.id, streak: 0, intensity: 1 } };
  }
  if (action.type === 'advance') {
    if (state.phase !== 'feedback') return state;
    return { ...state, revision: state.revision + 1, phase: examMetrics(state, exam).ended ? 'ended' : 'question', index: state.answers.length, event: null };
  }
  if (state.phase !== 'question' || examMetrics(state, exam).ended) return state;
  const q = getExamQuestion(state, exam);
  if (!q || q.id !== action.questionId || q.keyStatus === 'missing' || q.correctAnswer === null || state.answers.some(a => a.questionId === q.id)) return state;
  if (!action.answer.trim() || action.answer.length > 3000 || !z.iso.datetime().safeParse(action.now).success) return state;
  if (q.options.length && !q.options.some(o => o.id === action.answer)) return state;
  const correct = q.options.length ? action.answer === q.correctAnswer : normalizeAnswer(action.answer) === normalizeAnswer(q.correctAnswer);
  const answer: ExamAnswer = { questionId: q.id, answer: action.answer, correct, marks: correct ? q.marks : 0, submittedAt: action.now, sequence: state.answers.length + 1 };
  const next: ExamState = { ...state, revision: state.revision + 1, phase: 'feedback', answers: [...state.answers, answer] };
  const metrics = examMetrics(next, exam);
  let streak = 0;
  for (let i = next.answers.length - 1; i >= 0 && !next.answers[i]!.correct; i--) streak += 1;
  const attacks = ['slam', 'storm', 'beam', 'sweep'] as const;
  const type = metrics.ending === 'shattering' ? 'final' : metrics.passed ? 'victory' : correct ? 'hit' : attacks[(next.answers.length - 1) % attacks.length]!;
  next.event = { id: `${exam.id}:${next.revision}`, type, questionId: q.id, streak, intensity: Math.min(1, .25 + q.marks / metrics.total * 2 + streak * .1 + (metrics.hp <= exam.passThreshold + 15 ? .2 : 0)) };
  return next;
}

/** Persist the whole snapshot, but reconstruct every grading field from immutable committed input. */
export function restoreExam(input: unknown, exam: Exam): ExamState {
  const saved = z.object({ examId: z.string(), phase: z.enum(['question', 'feedback', 'ended']), finisherUsed: z.boolean().optional().default(false), answers: z.array(z.object({ questionId: z.string(), answer: z.string(), submittedAt: z.string() }).passthrough()).max(300) }).passthrough().parse(input);
  if (saved.examId !== exam.id) throw new Error('The saved exam does not match this paper.');
  let state = createExam(exam);
  for (const [index, answer] of saved.answers.entries()) {
    const next = examReducer(state, { type: 'submit', questionId: answer.questionId, answer: answer.answer, now: answer.submittedAt, expectedRevision: state.revision }, exam);
    if (next === state) throw new Error('The saved answer order is invalid.');
    state = next;
    if (index < saved.answers.length - 1 || saved.phase !== 'feedback') state = examReducer(state, { type: 'advance', expectedRevision: state.revision }, exam);
  }
  if (state.phase !== saved.phase) throw new Error('The saved examination stage is invalid.');
  if (saved.finisherUsed) {
    if (!examMetrics(state, exam).coreExposed) throw new Error('The saved special move was not earned.');
    state = { ...state, finisherUsed: true, revision: state.revision + 1 };
  }
  return state;
}

export function examReport(state: ExamState, exam: Exam) {
  const metrics = examMetrics(state, exam);
  const records = activeQuestions(exam).map(question => ({ question, answer: state.answers.find(a => a.questionId === question.id) ?? null }));
  const topics = new Map<string, { topic: string; lost: number; earned: number; total: number; mistakes: number; unattempted: number }>();
  for (const { question: q, answer } of records) {
    const topic = q.topicReviewed && q.topic ? q.topic : 'Unclassified';
    const item = topics.get(topic) ?? { topic, lost: 0, earned: 0, total: 0, mistakes: 0, unattempted: 0 };
    item.total += units(q.marks);
    if (!answer) item.unattempted += 1;
    else if (answer.correct) item.earned += units(q.marks);
    else { item.lost += units(q.marks); item.mistakes += 1; }
    topics.set(topic, item);
  }
  return { ...metrics, records, topics: [...topics.values()].map(t => ({ ...t, lost: t.lost / 100, earned: t.earned / 100, total: t.total / 100 })).sort((a, b) => b.lost - a.lost || b.mistakes - a.mistakes || b.total - a.total), highestImpact: records.filter(r => r.answer && !r.answer.correct).sort((a, b) => b.question.marks - a.question.marks) };
}
