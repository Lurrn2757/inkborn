import { openDB } from 'idb';
import { z } from 'zod';
import { validateExam, validateExamDraft, restoreExam, examMetrics, type Exam, type ExamState } from './engine.js';
import { emptyDrawing, type CreatureAsset, type DrawingDocument } from '../drawing/types.js';
export type RigPoint = { x: number; y: number };
export type Rig = { leftShoulder: RigPoint; leftHand: RigPoint; rightShoulder: RigPoint; rightHand: RigPoint };
export type SiegeSave = {
  version: 1; stage: 'prepare' | 'draw' | 'rig' | 'awakening' | 'battle' | 'report';
  exam: Exam; drawing: DrawingDocument; sprite: CreatureAsset | null; battle: ExamState | null;
  rig: Rig | null; keyConfirmed: boolean; markingConfirmed: boolean; warnings: string[];
};
const database = () => openDB('inkborn-exam-siege', 1, { upgrade(db) { db.createObjectStore('sessions'); } });
export const newSiegeSave = (exam: Exam): SiegeSave => ({ version: 1, stage: 'prepare', exam: structuredClone(exam), drawing: emptyDrawing(), sprite: null, battle: null, rig: null, keyConfirmed: false, markingConfirmed: true, warnings: [] });
const fraction = z.number().finite().min(0).max(1);
const point = z.object({ x: fraction, y: fraction }).strict();
const png = z.string().max(8_000_000).regex(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/);
const drawingSchema = z.object({
  base: png.nullable(), cursor: z.number().int().min(0),
  actions: z.array(z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('clear') }).strict(),
    z.object({ kind: z.literal('stroke'), tool: z.enum(['pen', 'eraser']), color: z.string().regex(/^#[0-9a-f]{6}$/i), width: z.number().finite().positive().max(100), points: z.array(z.object({ x: fraction, y: fraction, pressure: fraction }).strict()).max(2048) }).strict(),
  ])).max(1000),
}).strict().refine(drawing => drawing.cursor <= drawing.actions.length, 'The saved drawing cursor is invalid.');
const size = z.number().int().positive().max(1104);
const spriteSchema = z.object({
  id: z.string().min(1).max(100), dataUrl: png, width: size, height: size, hash: z.string().min(1).max(100),
  mask: z.object({ width: z.number().int().positive().max(128), height: z.number().int().positive().max(128), cells: z.array(z.number().int().min(0)).min(1).max(16384), points: z.array(point).max(16384).optional() }).strict().superRefine((mask, ctx) => {
    if (mask.cells.some(cell => cell >= mask.width * mask.height) || new Set(mask.cells).size !== mask.cells.length || mask.points && mask.points.length !== mask.cells.length) ctx.addIssue({ code: 'custom', message: 'The saved ink mask is invalid.' });
  }),
  anchors: z.array(z.object({ conceptId: z.string().min(1).max(100), x: fraction, y: fraction, attachmentX: fraction, attachmentY: fraction }).strict()).max(12),
  bounds: z.object({ x: z.number().int().min(0).max(1024), y: z.number().int().min(0).max(768), width: z.number().int().positive().max(1024), height: z.number().int().positive().max(768) }).strict(),
}).strict();
const saveSchema = z.object({
  version: z.literal(1), stage: z.enum(['prepare', 'draw', 'rig', 'awakening', 'battle', 'report']),
  exam: z.unknown(), drawing: drawingSchema, sprite: spriteSchema.nullable(), battle: z.unknown(),
  rig: z.object({ leftShoulder: point, leftHand: point, rightShoulder: point, rightHand: point }).strict().nullable(),
  keyConfirmed: z.boolean(), markingConfirmed: z.boolean(), warnings: z.array(z.string().max(4000)).max(2000),
}).strict();

/** Revalidate all saved presentation inputs before passing them to a renderer. */
export function restoreSiege(raw: unknown): SiegeSave {
  const save = saveSchema.parse(raw);
  const exam = save.stage === 'prepare' ? validateExamDraft(save.exam) : validateExam(save.exam);
  const battle = save.battle ? restoreExam(save.battle, exam) : null;
  if (['rig', 'awakening', 'battle', 'report'].includes(save.stage) && !save.sprite) throw new Error('The saved creature is missing.');
  if (['awakening', 'battle', 'report'].includes(save.stage)) {
    if (!battle) throw new Error('The saved answers are missing.');
    if (!save.keyConfirmed || !save.markingConfirmed) throw new Error('The saved grading settings were not confirmed.');
    if (save.stage === 'report' && !examMetrics(battle, exam).ended) throw new Error('An unfinished examination cannot have a final report.');
  }
  const sprite: CreatureAsset | null = save.sprite ? {
    ...save.sprite,
    mask: { width: save.sprite.mask.width, height: save.sprite.mask.height, cells: save.sprite.mask.cells, ...(save.sprite.mask.points ? { points: save.sprite.mask.points } : {}) },
  } : null;
  return { ...save, exam, battle, sprite, stage: save.stage === 'awakening' ? 'battle' : save.stage };
}

// Queue snapshots in invocation order. A delayed database open must not overwrite
// a newer committed answer with an earlier snapshot.
let pendingWrite: Promise<void> = Promise.resolve();
export async function loadSiege(): Promise<SiegeSave | null> {
  await pendingWrite;
  const db = await database();
  try { const raw: unknown = await db.get('sessions', 'active'); return raw ? restoreSiege(raw) : null; }
  finally { db.close(); }
}
export function saveSiege(save: SiegeSave): Promise<void> {
  const snapshot = structuredClone(save);
  const operation = pendingWrite.then(async () => {
    const db = await database();
    try { await db.put('sessions', snapshot, 'active'); }
    finally { db.close(); }
  });
  pendingWrite = operation.catch(() => {});
  return operation;
}
export function clearSiege(): Promise<void> {
  const operation = pendingWrite.then(async () => {
    const db = await database();
    try { await db.delete('sessions', 'active'); }
    finally { db.close(); }
  });
  pendingWrite = operation.catch(() => {});
  return operation;
}
