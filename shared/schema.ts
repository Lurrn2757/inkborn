import { z } from 'zod';
import { hashNotes, isExactEvidence } from './evidence.js';

const id = z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/);
const text = (max: number) => z.string().min(1).max(max).refine((value) => value.trim().length > 0, 'Text must not be blank.');

export const evidenceSchema = z.strictObject({
  id,
  blockId: id,
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  quote: text(12_000),
});

export const questionSchema = z.strictObject({
  id,
  conceptId: id,
  kind: z.enum(['initial', 'followup']),
  prompt: text(1_000),
  options: z.array(z.strictObject({ id, text: text(500) })).length(4),
  correctOptionId: id,
  explanation: text(2_000),
  hint: text(1_000).nullable(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  evidence: z.array(evidenceSchema).min(1).max(12),
}).superRefine((question, context) => {
  if (new Set(question.options.map((option) => option.id)).size !== question.options.length) {
    context.addIssue({ code: 'custom', path: ['options'], message: 'Option IDs must be unique within a question.' });
  }
  if (new Set(question.options.map((option) => option.text.trim().toLocaleLowerCase('en'))).size !== question.options.length) {
    context.addIssue({ code: 'custom', path: ['options'], message: 'Option texts must be distinct.' });
  }
  if (!question.options.some((option) => option.id === question.correctOptionId)) {
    context.addIssue({ code: 'custom', path: ['correctOptionId'], message: 'The correct answer must name an existing option.' });
  }
  if (question.kind === 'initial' && question.hint === null) {
    context.addIssue({ code: 'custom', path: ['hint'], message: 'Every initial question requires a grounded hint.' });
  }
});

export const conceptSchema = z.strictObject({
  id,
  label: text(120),
  evidence: z.array(evidenceSchema).min(1).max(12),
  initial: questionSchema,
  followup: questionSchema,
});

export const lessonSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id,
  mode: z.enum(['sample', 'ai']),
  sampleId: id.nullable(),
  title: text(160),
  notes: text(12_000).refine((value) => value.length >= 120, 'Notes require at least 120 UTF-16 code units.'),
  notesHash: text(100),
  preparedAt: z.iso.datetime(),
  provider: text(100).nullable(),
  model: text(100).nullable(),
  concepts: z.array(conceptSchema).length(3),
}).superRefine((lesson, context) => {
  const issue = (path: (string | number)[], message: string) => context.addIssue({ code: 'custom', path, message });
  if (lesson.notesHash !== hashNotes(lesson.notes)) issue(['notesHash'], 'The notes fingerprint does not match the exact notes.');
  if (lesson.mode === 'sample' && (lesson.sampleId === null || lesson.provider !== null || lesson.model !== null)) {
    issue(['mode'], 'A curated sample needs a sample ID and no AI provenance.');
  }
  if (lesson.mode === 'ai' && (lesson.sampleId !== null || lesson.provider === null || lesson.model === null)) {
    issue(['mode'], 'An AI lesson needs provider/model provenance and no sample ID.');
  }
  const conceptIds = new Set<string>();
  const questionIds = new Set<string>();
  const evidenceById = new Map<string, string>();
  for (const [index, concept] of lesson.concepts.entries()) {
    const base = ['concepts', index];
    if (conceptIds.has(concept.id)) issue([...base, 'id'], 'Concept IDs must be unique.');
    conceptIds.add(concept.id);
    if (concept.initial.prompt.trim().toLocaleLowerCase('en') === concept.followup.prompt.trim().toLocaleLowerCase('en')) {
      issue([...base, 'followup', 'prompt'], 'The follow-up must have a distinct prompt.');
    }
    const groups = [{ path: [...base, 'evidence'], entries: concept.evidence }];
    for (const kind of ['initial', 'followup'] as const) {
      const question = concept[kind];
      if (question.kind !== kind) issue([...base, kind, 'kind'], 'Question kind must match its encounter position.');
      if (question.conceptId !== concept.id) issue([...base, kind, 'conceptId'], 'Question belongs to a different concept.');
      if (questionIds.has(question.id)) issue([...base, kind, 'id'], 'Question IDs must be unique across the lesson.');
      questionIds.add(question.id);
      groups.push({ path: [...base, kind, 'evidence'], entries: question.evidence });
    }
    for (const group of groups) {
      for (const [evidenceIndex, evidence] of group.entries.entries()) {
        if (!isExactEvidence(lesson.notes, evidence)) {
          issue([...group.path, evidenceIndex], 'Evidence must exactly match its original source block and offsets.');
        }
        const signature = JSON.stringify([evidence.blockId, evidence.start, evidence.end, evidence.quote]);
        const previous = evidenceById.get(evidence.id);
        if (previous !== undefined && previous !== signature) {
          issue([...group.path, evidenceIndex, 'id'], 'An evidence ID cannot refer to different passages.');
        }
        evidenceById.set(evidence.id, signature);
      }
    }
  }
});

export type Evidence = z.infer<typeof evidenceSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Concept = z.infer<typeof conceptSchema>;
export type Lesson = z.infer<typeof lessonSchema>;

/** Reject invalid structure and references before content reaches the battle. */
export function validateLesson(input: unknown): Lesson {
  return lessonSchema.parse(input);
}
