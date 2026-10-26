import { createServer } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { createApp } from '../../server/app.js';
import { readConfig } from '../../server/config.js';
import { attachArena, readArenaConfig } from '../../server/arena/socket.js';
import { sessionSchema, snapshotSchema, type ArenaSnapshot, type ArenaAck } from '../../shared/arena/protocol.js';
import { questionBank } from '../../server/arena/questions.js';

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanups.splice(0)) await close(); });
async function service() {
  const server = createServer(createApp(readConfig({}), undefined, { publicUrl: null }));
  const arena = attachArena(server, { origins: ['http://127.0.0.1'], publicUrl: null }, { timings: { intro: 10, countdown: 10, question: 3000, intermission: 20, reconnect: 500, queue: 5000 } });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port, origin = `http://127.0.0.1:${port}`;
  const sockets: Socket[] = [];
  cleanups.push(async () => { sockets.forEach(s => s.disconnect()); await arena.close(); });
  async function connect(token?: string, originHeader = 'http://127.0.0.1') {
    const client = io(origin, { path: '/arena/socket.io', transports: ['websocket'], autoConnect: false, reconnection: false, extraHeaders: { Origin: originHeader }, auth: token ? { token } : {} }); sockets.push(client);
    let state: ArenaSnapshot | null = null;
    client.on('arena:state', raw => { state = snapshotSchema.parse(raw); });
    const session = await new Promise<{ token: string; snapshot: ArenaSnapshot }>((resolve, reject) => { client.once('arena:session', raw => { const value = sessionSchema.parse(raw); state = value.snapshot; resolve(value); }); client.once('connect_error', reject); client.connect(); });
    return { client, token: session.token, get state() { return state!; }, send: (command: unknown) => new Promise<ArenaAck>((resolve, reject) => client.timeout(2000).emit('arena:command', command, (error: Error | null, ack: ArenaAck) => error ? reject(error) : resolve(ack))) };
  }
  return { arena, origin, connect };
}
function answer(snapshot: ArenaSnapshot, correct: boolean) {
  const r = snapshot.match!.round!, q = questionBank.find(q => q.id === r.question.id)!, text = q.choices.find(c => c.id === q.correctChoiceId)!.text;
  return { type: 'answer', matchId: snapshot.match!.id, roundId: r.id, choiceId: r.question.choices.find(c => (c.text === text) === correct)!.id };
}

describe('real Socket.IO authoritative Arena transport', () => {
  it('gives two independent TCP guests one private room, one question and exactly one simultaneous winner', async () => {
    const svc = await service(), a = await svc.connect(), b = await svc.connect();
    expect(a.state.selfId).not.toBe(b.state.selfId); expect(a.token).not.toBe(b.token);
    await a.send({ type: 'create', mode: 'duel' }); await b.send({ type: 'join', code: a.state.match!.code });
    await expect.poll(() => a.state.match!.players.length).toBe(2);
    const id = a.state.match!.id; expect(b.state.match!.id).toBe(id);
    await a.send({ type: 'ready', matchId: id, ready: true }); await b.send({ type: 'ready', matchId: id, ready: true });
    await expect.poll(() => a.state.match!.phase).toBe('question'); await expect.poll(() => b.state.match!.phase).toBe('question');
    expect(a.state.match!.round).toEqual(b.state.match!.round); expect(JSON.stringify(a.state.match!.round)).not.toContain('correctChoiceId');
    const responses = await Promise.all([a.send(answer(a.state, true)), b.send(answer(b.state, true))]);
    expect(responses.filter(r => r.ok)).toHaveLength(1);
    await expect.poll(() => b.state.match!.history.length).toBe(1);
    expect(a.state.match!.history).toEqual(b.state.match!.history);
    expect(a.state.match!.players.reduce((n, p) => n + p.score, 0)).toBe(1);
    expect(a.state.match!.history[0]!.answers).toHaveLength(1);
    expect(svc.arena.manager.audit.filter(item => item.command === 'answer' && item.accepted)).toHaveLength(1);
  }, 15000);
  it('matches real queue clients, permits later correct answers after backlash and reconnects the same locked guest', async () => {
    const svc = await service(), a = await svc.connect(), b = await svc.connect();
    await a.send({ type: 'queue', mode: 'duel' }); expect(a.state.match).toBeNull();
    await b.send({ type: 'queue', mode: 'duel' }); await expect.poll(() => a.state.match?.players.length).toBe(2);
    const id = a.state.match!.id; await a.send({ type: 'ready', matchId: id, ready: true }); await b.send({ type: 'ready', matchId: id, ready: true });
    await expect.poll(() => a.state.match!.phase).toBe('question');
    expect((await a.send(answer(a.state, false))).ok).toBe(true); expect(a.state.match!.players[0]!.score).toBe(0);
    const token = a.token, playerId = a.state.selfId; a.client.disconnect();
    await expect.poll(() => b.state.match!.phase).toBe('paused');
    const resumed = await svc.connect(token); expect(resumed.state.selfId).toBe(playerId);
    await expect.poll(() => resumed.state.match!.phase).toBe('question');
    expect((await resumed.send(answer(resumed.state, true))).code).toBe('ANSWER_LOCKED');
    expect((await b.send(answer(b.state, true))).ok).toBe(true);
    expect(b.state.match!.history[0]!.answers.map(a => a.correct)).toEqual([false, true]);
  }, 15000);
  it('resolves a real lost connection as a forfeit without manufacturing five points', async () => {
    const svc = await service(), a = await svc.connect(), b = await svc.connect();
    await a.send({ type: 'create', mode: 'standard' }); await b.send({ type: 'join', code: a.state.match!.code });
    const id = a.state.match!.id; await a.send({ type: 'ready', matchId: id, ready: true }); await b.send({ type: 'ready', matchId: id, ready: true });
    await expect.poll(() => b.state.match!.phase).toBe('question'); a.client.disconnect();
    await expect.poll(() => b.state.match!.finishReason, { timeout: 3000 }).toBe('forfeit');
    expect(b.state.match!.winnerId).toBe(b.state.selfId); expect(b.state.match!.players.reduce((n, p) => n + p.score, 0)).toBe(0);
  }, 15000);
  it('rejects invalid room codes and forged authoritative fields over the network', async () => {
    const svc = await service(), a = await svc.connect();
    expect((await a.send({ type: 'join', code: 'AAAAAA' })).code).toBe('ROOM_NOT_FOUND');
    expect((await a.send({ type: 'queue', mode: 'duel', score: 5, winnerId: a.state.selfId })).code).toBe('INVALID_COMMAND');
    expect(a.state.queue).toBeNull(); expect(a.state.match).toBeNull();
    expect((await a.send({ type: 'profile', profile: { nickname: '<img src=x onerror=1>', monster: { kind: 'starter', id: 'wisp', name: 'Wisp' } } })).ok).toBe(false);
  });
  it('rejects another origin and an unknown bearer token, including after restart', async () => {
    const svc = await service();
    await expect(svc.connect(undefined, 'https://untrusted.invalid')).rejects.toThrow();
    await expect(svc.connect('a'.repeat(64))).rejects.toThrow('no longer has');
    const guest = await svc.connect(), next = await service();
    await expect(next.connect(guest.token)).rejects.toThrow('no longer has');
    expect(() => readArenaConfig({ ARENA_ALLOWED_ORIGINS: '*' })).toThrow();
    expect(() => readArenaConfig({ ARENA_ALLOWED_ORIGINS: 'https://example.test/path' })).toThrow();
    expect(() => readArenaConfig({ ARENA_PUBLIC_URL: 'javascript:alert(1)' })).toThrow();
  }, 15000);
  it('replaces a duplicate bearer connection without letting its old disconnect pause the new one', async () => {
    const svc = await service(), a = await svc.connect();
    const resumed = await svc.connect(a.token);
    expect(resumed.state.selfId).toBe(a.state.selfId);
    await expect.poll(() => a.client.connected).toBe(false);
    expect((await resumed.send({ type: 'queue', mode: 'duel' })).ok).toBe(true);
    expect(resumed.state.queue).not.toBeNull();
  });
  it('enforces the transport message-size limit', async () => {
    const svc = await service(), a = await svc.connect();
    a.client.emit('arena:command', { type: 'profile', oversized: 'x'.repeat(220_000) });
    await expect.poll(() => a.client.connected, { timeout: 3000 }).toBe(false);
    expect(svc.arena.manager.diagnostics().rooms).toBe(0);
  });
});
