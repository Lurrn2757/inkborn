import { randomBytes, randomInt, randomUUID, createHash } from 'node:crypto';
import { commandSchema, arenaRules, snapshotSchema, type ArenaAck, type ArenaCommand, type ArenaMode, type ArenaMonster, type ArenaMove, type ArenaProfileInput, type ArenaSnapshot, type ArenaMatch, type ArenaQuestion, type ArenaRoundRecord } from '../../shared/arena/protocol.js';
import { questionBank, bankQuestionSchema, type BankQuestion } from './questions.js';

export class ArenaError extends Error { constructor(public readonly code: string, message: string) { super(message); } }
type Phase = ArenaMatch['phase'];
type Session = { id: string; token: string; connectionId: string | null; nickname: string; monster: ArenaMonster; roomId: string | null; queue: { mode: ArenaMode; joinedAt: number; expiresAt: number } | null; lastSeen: number; notice: string | null; commandTimes: number[]; joinTimes: number[] };
type Round = { id: string; index: number; suddenDeath: boolean; question: ArenaQuestion; key: string; explanation: string; source: string; startsAt: number; endsAt: number; answers: ArenaRoundRecord['answers'] };
type Room = { id: string; code: string | null; visibility: 'private' | 'quick'; mode: ArenaMode; phase: Phase; revision: number; players: string[]; profiles: Map<string, { nickname: string; monster: ArenaMonster }>; scores: Record<string, number>; ready: Set<string>; rematch: Set<string>; departed: Set<string>; round: Round | null; history: ArenaRoundRecord[]; deck: BankQuestion[]; nextQuestion: number; phaseEndsAt: number | null; reconnectDeadline: number | null; pauseFrom: Phase | null; pauseRemaining: number; roundRemaining: number; winnerId: string | null; finishReason: ArenaMatch['finishReason']; event: ArenaMatch['event']; touched: number; disconnects: Map<string, number> };
export type ArenaAudit = { order: number; at: number; playerId: string; matchId: string | null; roundId: string | null; command: string; accepted: boolean; code: string };
export type ArenaOptions = { now?: () => number; onChange?: (playerIds: string[]) => void; publicUrl?: string | null; bank?: BankQuestion[]; timings?: Partial<{ intro: number; countdown: number; question: number; intermission: number; reconnect: number; queue: number; completed: number; lobby: number; session: number }>; limits?: Partial<{ sessions: number; rooms: number; audit: number }> };
const ok = (message = 'Accepted.', order?: number): ArenaAck => ({ ok: true, code: 'OK', message, ...(order ? { order } : {}) });
const active = (phase: Phase) => ['intro', 'countdown', 'question', 'intermission', 'paused'].includes(phase);
const moveFor = (category: string): ArenaMove => category === 'Mathematics' || category === 'Technology' ? 'equation' : category === 'Science' ? 'hellfall' : category === 'History' ? 'execution' : category === 'Art and culture' || category === 'General knowledge' ? 'mindstorm' : 'fracture';

/** All authoritative mutations are synchronous; no animation or client clock enters this state machine. */
export class ArenaManager {
  readonly serverId = randomUUID();
  private sessions = new Map<string, Session>();
  private tokens = new Map<string, string>();
  private rooms = new Map<string, Room>();
  private codes = new Map<string, string>();
  private records: ArenaAudit[] = [];
  private sequence = 0;
  private order = 0;
  private readonly clock: () => number;
  private lastNow = 0;
  private readonly change: (ids: string[]) => void;
  private readonly publicUrl: string | null;
  private readonly bank: BankQuestion[];
  readonly timing;
  readonly limits;
  constructor(options: ArenaOptions = {}) {
    const epoch = Date.now(), mono = performance.now();
    this.clock = options.now ?? (() => epoch + performance.now() - mono);
    this.change = options.onChange ?? (() => {}); this.publicUrl = options.publicUrl ?? null;
    this.bank = (options.bank ?? questionBank).map(q => bankQuestionSchema.parse(q));
    if (this.bank.length < 14 || new Set(this.bank.map(q => q.id)).size !== this.bank.length) throw new Error('Arena requires at least 14 distinct verified questions.');
    this.timing = { intro: 3200, countdown: 3000, question: 20000, intermission: 3400, reconnect: 20000, queue: 90000, completed: 600000, lobby: 900000, session: 1800000, ...options.timings };
    this.limits = { sessions: 256, rooms: 64, audit: 2048, ...options.limits };
  }
  now() { this.lastNow = Math.max(this.lastNow, Math.floor(this.clock())); return this.lastNow; }
  get audit(): readonly ArenaAudit[] { return this.records; }
  diagnostics() { return { sessions: this.sessions.size, rooms: this.rooms.size, queued: [...this.sessions.values()].filter(s => s.queue).length, audit: this.records.length, retainedProfiles: [...this.rooms.values()].reduce((sum, room) => sum + room.profiles.size, 0) }; }
  private notify(ids: string[]) { this.sequence++; this.change([...new Set(ids)].filter(id => this.sessions.has(id))); }
  private touch(room: Room) { room.revision++; room.touched = this.now(); this.notify(room.players.filter(id => !room.departed.has(id))); }
  private requireSession(id: string) { const session = this.sessions.get(id); if (!session) throw new ArenaError('SESSION_EXPIRED', 'This temporary guest session has expired. Connect as a new guest.'); return session; }
  connect(token: string | undefined, connectionId: string): { id: string; token: string; replacedConnectionId: string | null } {
    this.tick();
    let session: Session;
    if (token) { const id = this.tokens.get(token); if (!id) throw new ArenaError('SESSION_EXPIRED', 'The server no longer has this temporary session. A restart or expiry ended it; start a fresh guest session.'); session = this.requireSession(id); }
    else {
      if (this.sessions.size >= this.limits.sessions) throw new ArenaError('SERVER_FULL', 'The arena is at capacity. Try again later.');
      const id = randomUUID(); session = { id, token: randomBytes(32).toString('hex'), connectionId: null, nickname: `Guest ${randomBytes(3).toString('hex')}`, monster: { appearance: { kind: 'starter', id: 'warden', name: 'Stone Warden' }, hash: 'starter:warden' }, roomId: null, queue: null, lastSeen: this.now(), notice: null, commandTimes: [], joinTimes: [] };
      this.sessions.set(id, session); this.tokens.set(session.token, id);
    }
    const previous = session.connectionId; session.connectionId = connectionId; session.lastSeen = this.now();
    const room = session.roomId ? this.rooms.get(session.roomId) : null;
    if (room) {
      room.disconnects.delete(session.id);
      if (room.phase === 'paused' && this.allConnected(room)) this.resume(room);
      else this.touch(room);
    } else this.notify([session.id]);
    return { id: session.id, token: session.token, replacedConnectionId: previous };
  }
  disconnect(id: string, connectionId: string) {
    const s = this.sessions.get(id); if (!s || s.connectionId !== connectionId) return;
    s.connectionId = null; s.lastSeen = this.now(); s.queue = null;
    const room = s.roomId ? this.rooms.get(s.roomId) : null;
    if (!room) return;
    room.disconnects.set(id, this.now() + this.timing.reconnect);
    if (active(room.phase) && room.phase !== 'paused') {
      room.pauseFrom = room.phase; room.pauseRemaining = Math.max(0, (room.phaseEndsAt ?? this.now()) - this.now());
      room.roundRemaining = room.round ? Math.max(0, room.round.endsAt - this.now()) : this.timing.question;
      room.phase = 'paused'; room.reconnectDeadline = this.now() + this.timing.reconnect; room.phaseEndsAt = null;
    }
    if (room.phase === 'lobby') room.ready.delete(id);
    this.touch(room);
  }
  private allConnected(room: Room) { return room.players.length === 2 && room.players.every(id => !room.departed.has(id) && this.sessions.get(id)?.connectionId); }
  private shuffle<T>(items: readonly T[]): T[] { const copy = [...items]; for (let i = copy.length - 1; i > 0; i--) { const j = randomInt(i + 1); [copy[i], copy[j]] = [copy[j]!, copy[i]!]; } return copy; }
  private monster(input: ArenaProfileInput['monster']): ArenaMonster {
    if (input.kind === 'starter') return { appearance: input, hash: `starter:${input.id}` };
    const bytes = Buffer.from(input.dataUrl.slice('data:image/png;base64,'.length), 'base64');
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    if (bytes.length < 45 || bytes.length > 100_000 || !bytes.subarray(0, 8).equals(signature) || bytes.toString('ascii', 12, 16) !== 'IHDR' || bytes.readUInt32BE(8) !== 13) throw new ArenaError('INVALID_MONSTER', 'Use a genuine transparent PNG no larger than 100 KB.');
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    if (!width || !height || width > 384 || height > 384 || !bytes.includes(Buffer.from('IEND'))) throw new ArenaError('INVALID_MONSTER', 'Monster images must be PNGs at most 384 × 384 pixels.');
    return { appearance: input, hash: createHash('sha256').update(bytes).digest('hex') };
  }
  private roomFor(s: Session, id: string) {
    if (!s.roomId || s.roomId !== id) throw new ArenaError('NOT_A_MEMBER', 'This match does not belong to your guest session.');
    const room = this.rooms.get(id); if (!room || !room.players.includes(s.id) || room.departed.has(s.id)) throw new ArenaError('ROOM_EXPIRED', 'This room has ended or expired. Return to the lobby.');
    return room;
  }
  private idle(s: Session) { if (s.roomId || s.queue) throw new ArenaError('ALREADY_BUSY', 'Leave your current room or queue before doing that.'); }
  private makeRoom(players: Session[], mode: ArenaMode, visibility: 'private' | 'quick') {
    if (this.rooms.size >= this.limits.rooms) throw new ArenaError('SERVER_FULL', 'All ritual chambers are occupied. Try again shortly.');
    let code: string | null = null;
    if (visibility === 'private') { const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; do { code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join(''); } while (this.codes.has(code)); }
    const room: Room = { id: randomUUID(), code, visibility, mode, phase: 'lobby', revision: 0, players: players.map(s => s.id), profiles: new Map(players.map(s => [s.id, { nickname: s.nickname, monster: s.monster }])), scores: Object.fromEntries(players.map(s => [s.id, 0])), ready: new Set(), rematch: new Set(), departed: new Set(), round: null, history: [], deck: [], nextQuestion: 0, phaseEndsAt: null, reconnectDeadline: null, pauseFrom: null, pauseRemaining: 0, roundRemaining: 0, winnerId: null, finishReason: null, event: null, touched: this.now(), disconnects: new Map() };
    this.rooms.set(room.id, room); if (code) this.codes.set(code, room.id);
    for (const s of players) { s.roomId = room.id; s.queue = null; s.notice = null; }
    this.touch(room); return room;
  }
  command(id: string, raw: unknown): ArenaAck {
    const at = this.now(); this.tick();
    let s: Session;
    try { s = this.requireSession(id); } catch (e) { return this.failure(e); }
    if (!s.connectionId) return { ok: false, code: 'DISCONNECTED', message: 'Reconnect before sending an answer or room action.' };
    s.commandTimes = s.commandTimes.filter(t => at - t < 10_000);
    if (s.commandTimes.length >= 35) return { ok: false, code: 'RATE_LIMIT', message: 'Too many arena actions. Wait a few seconds.' };
    s.commandTimes.push(at); s.lastSeen = at;
    const parsed = commandSchema.safeParse(raw);
    if (!parsed.success) { this.record(s, 'invalid', false, 'INVALID_COMMAND'); return { ok: false, code: 'INVALID_COMMAND', message: 'Invalid arena command. Scores, identity and timestamps cannot be supplied by a client.' }; }
    const cmd = parsed.data;
    try {
      const answerOrder = this.apply(s, cmd);
      const order = answerOrder ?? this.record(s, cmd.type, true, 'OK');
      return ok('Accepted by the arena server.', order);
    } catch (error) { const result = this.failure(error); this.record(s, cmd.type, false, result.code); return result; }
  }
  private failure(error: unknown): ArenaAck { return error instanceof ArenaError ? { ok: false, code: error.code, message: error.message } : { ok: false, code: 'SERVER_ERROR', message: 'The arena could not accept that action. Please try again.' }; }
  private record(s: Session, command: string, accepted: boolean, code: string) {
    const order = ++this.order;
    this.records.push({ order, at: this.now(), playerId: s.id, matchId: s.roomId, roundId: s.roomId ? this.rooms.get(s.roomId)?.round?.id ?? null : null, command, accepted, code });
    if (this.records.length > this.limits.audit) this.records.splice(0, this.records.length - this.limits.audit);
    return order;
  }
  private apply(s: Session, cmd: ArenaCommand): number | undefined {
    if (cmd.type === 'profile') { this.idle(s); const monster = this.monster(cmd.profile.monster); s.nickname = cmd.profile.nickname; s.monster = monster; s.notice = null; this.notify([s.id]); return; }
    if (cmd.type === 'cancelQueue') { if (s.roomId) throw new ArenaError('ALREADY_MATCHED', 'A real opponent has already joined your room. Use Leave room if you want to leave.'); s.queue = null; s.notice = 'Matchmaking cancelled. No opponent was invented.'; this.notify([s.id]); return; }
    if (cmd.type === 'queue') {
      this.idle(s);
      const other = [...this.sessions.values()].find(p => p.id !== s.id && p.connectionId && !p.roomId && p.queue?.mode === cmd.mode && p.queue.expiresAt > this.now());
      if (other) this.makeRoom([other, s], cmd.mode, 'quick');
      else { s.queue = { mode: cmd.mode, joinedAt: this.now(), expiresAt: this.now() + this.timing.queue }; s.notice = null; this.notify([s.id]); }
      return;
    }
    if (cmd.type === 'create') { this.idle(s); this.makeRoom([s], cmd.mode, 'private'); return; }
    if (cmd.type === 'join') {
      this.idle(s); s.joinTimes = s.joinTimes.filter(t => this.now() - t < 60_000);
      if (s.joinTimes.length >= 8) throw new ArenaError('RATE_LIMIT', 'Too many room-code attempts. Try again in a minute.'); s.joinTimes.push(this.now());
      const room = this.rooms.get(this.codes.get(cmd.code) ?? '');
      if (!room) throw new ArenaError('ROOM_NOT_FOUND', 'No active room has that code. Check the invitation.');
      if (room.phase !== 'lobby' || room.players.length >= 2) throw new ArenaError('ROOM_FULL', 'That room is full or its match has already begun.');
      room.players.push(s.id); room.profiles.set(s.id, { nickname: s.nickname, monster: s.monster }); room.scores[s.id] = 0; room.ready.clear(); s.roomId = room.id; s.notice = null; this.touch(room); return;
    }
    const room = this.roomFor(s, cmd.matchId);
    if (cmd.type === 'leave') {
      if (active(room.phase)) { const other = room.players.find(id => id !== s.id) ?? null; this.finish(room, other, 'left'); room.departed.add(s.id); s.roomId = null; s.notice = 'You left the match. Leaving an active duel forfeits it.'; this.touch(room); this.notify([s.id]); }
      else this.removePlayer(room, s.id, 'You returned to the arena lobby.');
      return;
    }
    if (cmd.type === 'ready') {
      if (room.phase !== 'lobby') throw new ArenaError('MATCH_STARTED', 'Readiness cannot change during a match.');
      if (cmd.ready) room.ready.add(s.id); else room.ready.delete(s.id);
      if (this.allConnected(room) && room.players.every(id => room.ready.has(id))) this.begin(room); else this.touch(room);
      return;
    }
    if (cmd.type === 'rematch') {
      if (room.phase !== 'completed' && room.phase !== 'cancelled') throw new ArenaError('MATCH_ACTIVE', 'Finish the current match before requesting a rematch.');
      if (!this.allConnected(room)) throw new ArenaError('OPPONENT_UNAVAILABLE', 'Both players must still be connected to accept a rematch.');
      if (cmd.accept) room.rematch.add(s.id); else room.rematch.delete(s.id);
      if (room.players.every(id => room.rematch.has(id))) this.begin(room); else this.touch(room);
      return;
    }
    if (cmd.type === 'answer') {
      if (!room.round || room.round.id !== cmd.roundId) throw new ArenaError('STALE_ROUND', 'That question is no longer the active round.');
      if (room.phase !== 'question' || !this.allConnected(room)) throw new ArenaError(room.phase === 'paused' ? 'MATCH_PAUSED' : 'ROUND_CLOSED', 'The server is not accepting answers for this round.');
      const round = room.round, now = this.now();
      if (now < round.startsAt) throw new ArenaError('COUNTDOWN', 'Wait for the server countdown to finish.');
      if (now >= round.endsAt) { this.closeRound(room, null, 'timeout'); throw new ArenaError('ROUND_EXPIRED', 'This round has expired.'); }
      if (round.answers.some(a => a.playerId === s.id)) throw new ArenaError('ANSWER_LOCKED', 'Your first answer is already locked for this round.');
      if (!round.question.choices.some(c => c.id === cmd.choiceId)) throw new ArenaError('INVALID_CHOICE', 'Choose one of the four supplied answers.');
      const correct = cmd.choiceId === round.key, order = this.record(s, 'answer', true, correct ? 'CORRECT' : 'WRONG');
      round.answers.push({ playerId: s.id, choiceId: cmd.choiceId, correct, receivedAt: now, order });
      if (correct) this.closeRound(room, s.id, 'correct');
      else if (round.answers.length === 2) this.closeRound(room, null, 'both-wrong');
      else { room.event = { id: randomUUID(), type: 'backlash', actorId: s.id, move: moveFor(round.question.category), at: now }; this.touch(room); }
      return order;
    }
  }
  private begin(room: Room) {
    room.phase = 'intro'; room.scores = Object.fromEntries(room.players.map(id => [id, 0])); room.ready.clear(); room.rematch.clear(); room.history = []; room.round = null; room.deck = this.shuffle(this.bank); room.nextQuestion = 0; room.winnerId = null; room.finishReason = null; room.reconnectDeadline = null; room.pauseFrom = null;
    room.event = { id: randomUUID(), type: 'intro', actorId: null, move: 'mindstorm', at: this.now() }; room.phaseEndsAt = this.now() + this.timing.intro; this.touch(room);
  }
  private nextRound(room: Room) {
    const q = room.deck[room.nextQuestion++]!;
    if (!q) { this.finish(room, null, 'draw'); return; }
    const original = q.choices.find(c => c.id === q.correctChoiceId)!;
    const choices = this.shuffle(q.choices).map((c, i) => ({ id: ['A', 'B', 'C', 'D'][i]! as 'A' | 'B' | 'C' | 'D', text: c.text }));
    const { normalRoundLimit } = arenaRules(room.mode), startsAt = this.now() + this.timing.countdown;
    room.round = { id: randomUUID(), index: room.history.length + 1, suddenDeath: room.history.length >= normalRoundLimit, question: { id: q.id, category: q.category, difficulty: q.difficulty, text: q.text, choices }, key: choices.find(c => c.text === original.text)!.id, explanation: q.explanation, source: q.source, startsAt, endsAt: startsAt + this.timing.question, answers: [] };
    room.phase = 'countdown'; room.phaseEndsAt = startsAt; this.touch(room);
  }
  private closeRound(room: Room, winner: string | null, reason: ArenaRoundRecord['reason']) {
    const r = room.round; if (!r || room.history.some(h => h.roundId === r.id)) return;
    room.history.push({ roundId: r.id, index: r.index, suddenDeath: r.suddenDeath, question: r.question, correctChoiceId: r.key as 'A' | 'B' | 'C' | 'D', explanation: r.explanation, source: r.source, winnerId: winner, reason, closedAt: this.now(), answers: r.answers.map(a => ({ ...a })) });
    if (winner) room.scores[winner] = (room.scores[winner] ?? 0) + 1;
    room.event = { id: randomUUID(), type: 'round', actorId: winner, move: moveFor(r.question.category), at: this.now() };
    const rules = arenaRules(room.mode);
    if (winner && room.scores[winner]! >= rules.target) { this.finish(room, winner, 'target'); return; }
    if (r.suddenDeath && winner) { this.finish(room, winner, 'sudden-death'); return; }
    if (room.history.length >= rules.normalRoundLimit) {
      const [a, b] = room.players, first = room.scores[a!] ?? 0, second = room.scores[b!] ?? 0;
      if (first !== second) { this.finish(room, first > second ? a! : b!, 'round-cap'); return; }
      if (room.history.length >= rules.normalRoundLimit + rules.suddenDeathLimit) { this.finish(room, null, 'draw'); return; }
    }
    room.phase = 'intermission'; room.phaseEndsAt = this.now() + this.timing.intermission; this.touch(room);
  }
  private finish(room: Room, winner: string | null, reason: NonNullable<ArenaMatch['finishReason']>) {
    const interrupted = room.round;
    if (interrupted && !room.history.some(h => h.roundId === interrupted.id)) room.history.push({ roundId: interrupted.id, index: interrupted.index, suddenDeath: interrupted.suddenDeath, question: interrupted.question, correctChoiceId: interrupted.key as 'A' | 'B' | 'C' | 'D', explanation: interrupted.explanation, source: interrupted.source, winnerId: null, reason: 'interrupted', closedAt: this.now(), answers: interrupted.answers.map(a => ({ ...a })) });
    room.winnerId = winner; room.finishReason = reason; room.phase = reason === 'abandoned' || reason === 'shutdown' ? 'cancelled' : 'completed'; room.phaseEndsAt = null; room.reconnectDeadline = null; room.rematch.clear();
    room.event = { id: randomUUID(), type: 'finish', actorId: winner, move: 'execution', at: this.now() }; this.touch(room);
  }
  private resume(room: Room) {
    if (room.pauseFrom === 'question' || room.pauseFrom === 'countdown') {
      if (room.round) { room.round.startsAt = this.now() + this.timing.countdown; room.round.endsAt = room.round.startsAt + (room.pauseFrom === 'question' ? Math.max(1000, room.roundRemaining) : this.timing.question); }
      room.phase = 'countdown'; room.phaseEndsAt = room.round?.startsAt ?? this.now() + this.timing.countdown;
    } else { room.phase = room.pauseFrom ?? 'intro'; room.phaseEndsAt = this.now() + Math.max(1, room.pauseRemaining); }
    room.pauseFrom = null; room.reconnectDeadline = null; this.touch(room);
  }
  private removePlayer(room: Room, id: string, notice: string) {
    const session = this.sessions.get(id); if (session?.roomId === room.id) { session.roomId = null; session.notice = notice; }
    if (room.phase === 'lobby') { room.players = room.players.filter(p => p !== id); room.ready.clear(); room.disconnects.delete(id); room.profiles.delete(id); delete room.scores[id]; }
    else room.departed.add(id);
    if (!room.players.length || room.players.every(p => room.departed.has(p))) this.deleteRoom(room, 'The room has closed.'); else this.touch(room);
    this.notify([id]);
  }
  private deleteRoom(room: Room, notice: string) { this.rooms.delete(room.id); if (room.code) this.codes.delete(room.code); for (const id of room.players) { const s = this.sessions.get(id); if (s?.roomId === room.id) { s.roomId = null; s.notice = notice; } } this.notify(room.players); }
  tick() {
    const now = this.now();
    for (const room of [...this.rooms.values()]) {
      if (room.phase === 'paused' && room.reconnectDeadline !== null && now >= room.reconnectDeadline) { const connected = room.players.filter(id => this.sessions.get(id)?.connectionId && !room.departed.has(id)); this.finish(room, connected.length === 1 ? connected[0]! : null, connected.length === 1 ? 'forfeit' : 'abandoned'); }
      else if ((room.phase === 'intro' || room.phase === 'intermission') && room.phaseEndsAt !== null && now >= room.phaseEndsAt) this.nextRound(room);
      else if (room.phase === 'countdown' && room.phaseEndsAt !== null && now >= room.phaseEndsAt) { room.phase = 'question'; room.phaseEndsAt = room.round!.endsAt; this.touch(room); }
      else if (room.phase === 'question' && room.round && now >= room.round.endsAt) this.closeRound(room, null, 'timeout');
      if (room.phase === 'lobby') { for (const [id, deadline] of room.disconnects) if (now >= deadline) this.removePlayer(room, id, 'The disconnected lobby expired.'); }
      if (this.rooms.has(room.id) && (room.phase === 'completed' || room.phase === 'cancelled') && now - room.touched > this.timing.completed) this.deleteRoom(room, 'The completed room expired. Create a new match.');
      else if (this.rooms.has(room.id) && room.phase === 'lobby' && now - room.touched > this.timing.lobby) this.deleteRoom(room, 'This inactive lobby expired. Create a new room.');
    }
    for (const s of [...this.sessions.values()]) {
      if (s.queue && now >= s.queue.expiresAt) { s.queue = null; s.notice = 'Matchmaking timed out without a real opponent. Try again or invite a friend.'; this.notify([s.id]); }
      if (!s.connectionId && !s.roomId && now - s.lastSeen > this.timing.session) { this.sessions.delete(s.id); this.tokens.delete(s.token); }
    }
  }
  snapshot(id: string): ArenaSnapshot {
    const s = this.requireSession(id), room = s.roomId ? this.rooms.get(s.roomId) : null;
    const match: ArenaMatch | null = room ? { id: room.id, code: room.code, visibility: room.visibility, mode: room.mode, phase: room.phase, revision: room.revision, ...arenaRules(room.mode),
      players: room.players.map(id => { const p = room.profiles.get(id)!; const answer = room.round?.answers.find(a => a.playerId === id); return { id, nickname: p.nickname, monster: p.monster, connected: !!this.sessions.get(id)?.connectionId && !room.departed.has(id), ready: room.ready.has(id), score: room.scores[id] ?? 0, submitted: !!answer, wrong: answer?.correct === false, rematchAccepted: room.rematch.has(id) }; }),
      round: room.round ? { id: room.round.id, index: room.round.index, suddenDeath: room.round.suddenDeath, question: room.round.question, startsAt: room.round.startsAt, endsAt: room.round.endsAt } : null,
      phaseEndsAt: room.phaseEndsAt, reconnectDeadline: room.reconnectDeadline, history: room.history, winnerId: room.winnerId, finishReason: room.finishReason, event: room.event } : null;
    // Strict public projection is an executable boundary: key/explanation exist only in CLOSED history.
    return snapshotSchema.parse({ protocol: 1, serverId: this.serverId, serverNow: this.now(), sequence: this.sequence, selfId: s.id, profile: { nickname: s.nickname, monster: s.monster }, queue: s.queue, match, publicUrl: this.publicUrl, notice: s.notice });
  }
  shutdown() { for (const room of this.rooms.values()) if (active(room.phase)) this.finish(room, null, 'shutdown'); }
}
