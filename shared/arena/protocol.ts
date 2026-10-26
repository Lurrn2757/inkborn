import { z } from 'zod';

export const ARENA_PROTOCOL = 1;
export const modeSchema = z.enum(['standard', 'duel']);
export type ArenaMode = z.infer<typeof modeSchema>;
export const nameSchema = z.string().normalize('NFKC').trim().min(2).max(24).regex(/^[\p{L}\p{N} ._'’-]+$/u, 'Use letters, numbers, spaces or simple punctuation.');
export const choiceIdSchema = z.enum(['A', 'B', 'C', 'D']);
export const starterIdSchema = z.enum(['warden', 'wisp', 'oracle']);
export const monsterInputSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('starter'), id: starterIdSchema, name: nameSchema }).strict(),
  z.object({ kind: z.literal('drawing'), dataUrl: z.string().max(140_000).regex(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/), name: nameSchema }).strict(),
]);
export type MonsterInput = z.infer<typeof monsterInputSchema>;
export const monsterSchema = z.object({ appearance: monsterInputSchema, hash: z.string().min(1).max(80) }).strict();
export type ArenaMonster = z.infer<typeof monsterSchema>;
export const profileSchema = z.object({ nickname: nameSchema, monster: monsterInputSchema }).strict();
export type ArenaProfileInput = z.infer<typeof profileSchema>;
export const categorySchema = z.enum(['Science', 'History', 'Geography', 'Mathematics', 'Technology', 'Sports', 'Art and culture', 'General knowledge']);
export const publicQuestionSchema = z.object({
  id: z.string().min(1).max(100), category: categorySchema, difficulty: z.enum(['easy', 'medium']), text: z.string().min(1).max(500),
  choices: z.array(z.object({ id: choiceIdSchema, text: z.string().min(1).max(160) }).strict()).length(4),
}).strict();
export type ArenaQuestion = z.infer<typeof publicQuestionSchema>;
export const moveSchema = z.enum(['execution', 'hellfall', 'equation', 'fracture', 'mindstorm']);
export type ArenaMove = z.infer<typeof moveSchema>;
export const roundRecordSchema = z.object({
  roundId: z.string(), index: z.number().int().positive(), suddenDeath: z.boolean(), question: publicQuestionSchema,
  correctChoiceId: choiceIdSchema, explanation: z.string().min(1).max(1000), source: z.string().max(2000),
  winnerId: z.string().nullable(), reason: z.enum(['correct', 'both-wrong', 'timeout', 'interrupted']), closedAt: z.number(),
  answers: z.array(z.object({ playerId: z.string(), choiceId: choiceIdSchema, correct: z.boolean(), receivedAt: z.number(), order: z.number().int().positive() }).strict()).max(2),
}).strict();
export type ArenaRoundRecord = z.infer<typeof roundRecordSchema>;
export const arenaMatchSchema = z.object({
  id: z.string(), code: z.string().nullable(), visibility: z.enum(['private', 'quick']), mode: modeSchema,
  phase: z.enum(['lobby', 'intro', 'countdown', 'question', 'intermission', 'paused', 'completed', 'cancelled']),
  revision: z.number().int().nonnegative(), target: z.number().int().positive(), normalRoundLimit: z.number().int().positive(), suddenDeathLimit: z.number().int().positive(),
  players: z.array(z.object({ id: z.string(), nickname: nameSchema, monster: monsterSchema, connected: z.boolean(), ready: z.boolean(), score: z.number().int().nonnegative(), submitted: z.boolean(), wrong: z.boolean(), rematchAccepted: z.boolean() }).strict()).max(2),
  round: z.object({ id: z.string(), index: z.number().int().positive(), suddenDeath: z.boolean(), question: publicQuestionSchema, startsAt: z.number(), endsAt: z.number() }).strict().nullable(),
  phaseEndsAt: z.number().nullable(), reconnectDeadline: z.number().nullable(),
  history: z.array(roundRecordSchema).max(14), winnerId: z.string().nullable(),
  finishReason: z.enum(['target', 'round-cap', 'sudden-death', 'draw', 'forfeit', 'abandoned', 'left', 'shutdown']).nullable(),
  event: z.object({ id: z.string(), type: z.enum(['intro', 'backlash', 'round', 'finish']), actorId: z.string().nullable(), move: moveSchema, at: z.number() }).strict().nullable(),
}).strict();
export type ArenaMatch = z.infer<typeof arenaMatchSchema>;
export const snapshotSchema = z.object({
  protocol: z.literal(ARENA_PROTOCOL), serverId: z.string(), serverNow: z.number(), sequence: z.number().int().nonnegative(), selfId: z.string(),
  profile: z.object({ nickname: nameSchema, monster: monsterSchema }).strict(),
  queue: z.object({ mode: modeSchema, joinedAt: z.number(), expiresAt: z.number() }).strict().nullable(),
  match: arenaMatchSchema.nullable(), publicUrl: z.string().url().nullable(), notice: z.string().max(500).nullable(),
}).strict();
export type ArenaSnapshot = z.infer<typeof snapshotSchema>;
const matchId = z.string().min(1).max(100);
export const commandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('profile'), profile: profileSchema }).strict(),
  z.object({ type: z.literal('queue'), mode: modeSchema }).strict(),
  z.object({ type: z.literal('cancelQueue') }).strict(),
  z.object({ type: z.literal('create'), mode: modeSchema }).strict(),
  z.object({ type: z.literal('join'), code: z.string().trim().toUpperCase().regex(/^[A-HJ-NP-Z2-9]{6}$/) }).strict(),
  z.object({ type: z.literal('ready'), matchId, ready: z.boolean() }).strict(),
  z.object({ type: z.literal('answer'), matchId, roundId: z.string().min(1).max(100), choiceId: choiceIdSchema }).strict(),
  z.object({ type: z.literal('leave'), matchId }).strict(),
  z.object({ type: z.literal('rematch'), matchId, accept: z.boolean() }).strict(),
]);
export type ArenaCommand = z.infer<typeof commandSchema>;
export const ackSchema = z.object({ ok: z.boolean(), code: z.string().max(80), message: z.string().max(500), order: z.number().int().positive().optional() }).strict();
export type ArenaAck = z.infer<typeof ackSchema>;
export const sessionSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), snapshot: snapshotSchema }).strict();
export const arenaRules = (mode: ArenaMode) => ({ target: mode === 'duel' ? 3 : 5, normalRoundLimit: mode === 'duel' ? 5 : 9, suddenDeathLimit: 5 });
