import { describe, expect, it } from 'vitest';
import { ArenaManager } from '../../server/arena/engine.js';
import { questionBank } from '../../server/arena/questions.js';
import { commandSchema, snapshotSchema, type ArenaMode, type ArenaSnapshot } from '../../shared/arena/protocol.js';

function setup(mode: ArenaMode = 'standard', quick = false) {
  let clock = 1000;
  const manager = new ArenaManager({ now: () => clock, timings: { intro: 10, countdown: 20, question: 500, intermission: 30, reconnect: 50, queue: 100, completed: 1000, lobby: 2000, session: 3000 } });
  const first = manager.connect(undefined, 'socket-a'), second = manager.connect(undefined, 'socket-b');
  const state = (id = first.id) => manager.snapshot(id);
  const send = (id: string, raw: unknown) => manager.command(id, raw);
  const step = (ms: number) => { clock += ms; manager.tick(); };
  if (quick) { expect(send(first.id, { type: 'queue', mode }).ok).toBe(true); expect(state().queue).not.toBeNull(); expect(send(second.id, { type: 'queue', mode }).ok).toBe(true); }
  else { expect(send(first.id, { type: 'create', mode }).ok).toBe(true); expect(send(second.id, { type: 'join', code: state().match!.code }).ok).toBe(true); }
  const id = state().match!.id;
  const ready = () => { send(first.id, { type: 'ready', matchId: id, ready: true }); send(second.id, { type: 'ready', matchId: id, ready: true }); step(10); step(20); expect(state().match!.phase).toBe('question'); };
  const next = () => { step(30); step(20); expect(state().match!.phase).toBe('question'); };
  const choose = (who: string, correct: boolean, staleId?: string) => { const r = state().match!.round!; const bank = questionBank.find(q => q.id === r.question.id)!; const correctText = bank.choices.find(c => c.id === bank.correctChoiceId)!.text; const choice = r.question.choices.find(c => correct ? c.text === correctText : c.text !== correctText)!; return send(who, { type: 'answer', matchId: id, roundId: staleId ?? r.id, choiceId: choice.id }); };
  return { manager, first, second, state, send, step, ready, next, choose, id };
}
const total = (snapshot: ArenaSnapshot) => snapshot.match!.players.reduce((n, p) => n + p.score, 0);

describe('authoritative Arena state machine', () => {
  it('joins a private room with independent bearer identities and requires both ready', () => {
    const s = setup(); expect(s.first.token).not.toBe(s.second.token); expect(s.state().match!.players).toHaveLength(2);
    s.send(s.first.id, { type: 'ready', matchId: s.id, ready: true }); s.step(100);
    expect(s.state().match!.phase).toBe('lobby');
    s.send(s.second.id, { type: 'ready', matchId: s.id, ready: true });
    expect(s.state().match!.phase).toBe('intro');
  });
  it('pairs only real queued guests in the same mode and permits cancellation/timeout', () => {
    const s = setup('duel', true); expect(s.state().match!.id).toBe(s.state(s.second.id).match!.id);
    expect(s.send(s.first.id, { type: 'cancelQueue' }).code).toBe('ALREADY_MATCHED');
    const third = s.manager.connect(undefined, 'c'); s.send(third.id, { type: 'queue', mode: 'standard' });
    expect(s.state(third.id).match).toBeNull(); s.send(third.id, { type: 'cancelQueue' }); expect(s.state(third.id).queue).toBeNull();
    s.send(third.id, { type: 'queue', mode: 'standard' }); s.step(101); expect(s.state(third.id).queue).toBeNull(); expect(s.state(third.id).notice).toContain('without a real opponent');
  });
  it('keeps answer keys/explanations off the active public question and accepts no countdown answers', () => {
    const s = setup(); s.send(s.first.id, { type: 'ready', matchId: s.id, ready: true }); s.send(s.second.id, { type: 'ready', matchId: s.id, ready: true }); s.step(10);
    expect(s.state().match!.phase).toBe('countdown'); expect(s.choose(s.first.id, true).ok).toBe(false);
    expect(Object.keys(s.state().match!.round!.question).sort()).toEqual(['category', 'choices', 'difficulty', 'id', 'text']);
    expect(JSON.stringify(s.state().match!.round)).not.toContain('correctChoiceId'); expect(s.state().match!.history).toEqual([]);
    expect(snapshotSchema.safeParse(s.state()).success).toBe(true);
  });
  it('awards exactly one point to the first valid correct server-received answer, even at the same timestamp', () => {
    const s = setup(); s.ready();
    const first = s.choose(s.first.id, true), second = s.choose(s.second.id, true);
    expect(first.ok).toBe(true); expect(second.ok).toBe(false); expect(total(s.state())).toBe(1);
    expect(s.state().match!.history[0]!.winnerId).toBe(s.first.id);
    expect(s.state().match!.history[0]!.answers).toHaveLength(1);
    expect(s.manager.audit.filter(a => a.command === 'answer').map(a => a.order)).toEqual([...s.manager.audit.filter(a => a.command === 'answer').map(a => a.order)].sort((a, b) => a - b));
  });
  it('locks an incorrect first answer without winning, and lets the opponent answer correctly', () => {
    const s = setup(); s.ready(); const before = total(s.state());
    expect(s.choose(s.first.id, false).ok).toBe(true); expect(total(s.state())).toBe(before);
    expect(s.state().match!.event!.type).toBe('backlash'); expect(s.state().match!.players[0]!.wrong).toBe(true);
    expect(s.choose(s.first.id, true).code).toBe('ANSWER_LOCKED'); expect(s.choose(s.second.id, true).ok).toBe(true);
    expect(s.state().match!.history[0]!.answers.map(a => a.correct)).toEqual([false, true]);
    expect(s.state().match!.history[0]!.answers[0]!.order).toBeLessThan(s.state().match!.history[0]!.answers[1]!.order);
    expect(total(s.state())).toBe(1);
  });
  it('closes both-wrong and expired rounds without any score and reveals the correct answer only afterwards', () => {
    const s = setup(); s.ready(); s.choose(s.first.id, false); s.choose(s.second.id, false);
    expect(s.state().match!.history[0]!.reason).toBe('both-wrong'); expect(total(s.state())).toBe(0);
    expect(s.state().match!.history[0]!.explanation.length).toBeGreaterThan(10);
    const stale = s.state().match!.round!.id; s.next(); expect(s.choose(s.first.id, true, stale).code).toBe('STALE_ROUND');
    s.step(500); expect(s.state().match!.history[1]!.reason).toBe('timeout'); expect(s.choose(s.first.id, true).ok).toBe(false); expect(total(s.state())).toBe(0);
  });
  it('rejects forged scores, timestamps, player IDs, unknown events, invalid names and nonmember control', () => {
    const s = setup(); s.ready(); const r = s.state().match!.round!;
    for (const extra of [{ score: 50 }, { playerId: s.second.id }, { timestamp: 0 }, { correct: true }]) expect(s.send(s.first.id, { type: 'answer', matchId: s.id, roundId: r.id, choiceId: 'A', ...extra }).code).toBe('INVALID_COMMAND');
    expect(s.send(s.first.id, { type: 'animation', damage: 999 }).code).toBe('INVALID_COMMAND');
    const outsider = s.manager.connect(undefined, 'outsider');
    expect(s.send(outsider.id, { type: 'ready', matchId: s.id, ready: false }).code).toBe('NOT_A_MEMBER');
    expect(s.send(outsider.id, { type: 'profile', profile: { nickname: '<script>alert(1)</script>', monster: { kind: 'starter', id: 'wisp', name: 'Wisp' } } }).code).toBe('INVALID_COMMAND');
    expect(total(s.state())).toBe(0);
  });
  it('uses unpredictable invitation codes and rejects nonexistent/full rooms', () => {
    const s = setup(); expect(s.state().match!.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    const outsider = s.manager.connect(undefined, 'outsider');
    expect(s.send(outsider.id, { type: 'join', code: s.state().match!.code }).code).toBe('ROOM_FULL');
    expect(s.send(outsider.id, { type: 'join', code: 'AAAAAA' }).ok).toBe(false);
    expect(s.send(outsider.id, { type: 'join', code: '../../etc' }).code).toBe('INVALID_COMMAND');
  });
  it('pauses temporary disconnects, restores the same token and answer lock, and guards replacement sockets', () => {
    const s = setup(); s.ready(); s.choose(s.first.id, false);
    s.manager.disconnect(s.first.id, 'socket-a'); expect(s.state(s.second.id).match!.phase).toBe('paused');
    expect(s.choose(s.second.id, true).code).toBe('MATCH_PAUSED');
    const resumed = s.manager.connect(s.first.token, 'socket-new'); expect(resumed.id).toBe(s.first.id);
    expect(s.state().match!.phase).toBe('countdown'); s.step(20);
    expect(s.choose(s.first.id, true).code).toBe('ANSWER_LOCKED');
    s.manager.disconnect(s.first.id, 'socket-a'); expect(s.state().match!.players[0]!.connected).toBe(true);
    expect(s.choose(s.second.id, true).ok).toBe(true);
  });
  it('forfeits after the grace window without inventing round points; records the interrupted question', () => {
    const s = setup(); s.ready(); s.manager.disconnect(s.first.id, 'socket-a'); s.step(51);
    const match = s.state(s.second.id).match!;
    expect(match.phase).toBe('completed'); expect(match.winnerId).toBe(s.second.id); expect(match.finishReason).toBe('forfeit'); expect(total(s.state(s.second.id))).toBe(0);
    expect(match.history[0]!.reason).toBe('interrupted'); expect(match.history[0]!.winnerId).toBeNull();
    s.manager.connect(s.first.token, 'late'); expect(s.state().match!.phase).toBe('completed');
  });
  it('abandons a match honestly if both guests stay disconnected', () => {
    const s = setup(); s.ready(); s.manager.disconnect(s.first.id, 'socket-a'); s.manager.disconnect(s.second.id, 'socket-b'); s.step(51);
    expect(s.state().match).toMatchObject({ phase: 'cancelled', winnerId: null, finishReason: 'abandoned' }); expect(total(s.state())).toBe(0);
  });
  it('reaches five points, keeps full history and unique questions, and requires two rematch accepts', () => {
    const s = setup(); s.ready();
    for (let i = 0; i < 5; i++) { expect(s.choose(s.first.id, true).ok).toBe(true); if (i < 4) s.next(); }
    const match = s.state().match!; expect(match.phase).toBe('completed'); expect(match.winnerId).toBe(s.first.id); expect(match.players.map(p => p.score)).toEqual([5, 0]); expect(match.history).toHaveLength(5);
    expect(new Set(match.history.map(h => h.question.id)).size).toBe(5);
    s.send(s.first.id, { type: 'rematch', matchId: s.id, accept: true }); expect(s.state().match!.phase).toBe('completed');
    s.send(s.second.id, { type: 'rematch', matchId: s.id, accept: true }); expect(s.state().match!.phase).toBe('intro'); expect(total(s.state())).toBe(0); expect(s.state().match!.history).toEqual([]);
  });
  it('plays Quick Duel to three points and declares a score leader at the bounded normal cap', () => {
    const s = setup('duel'); s.ready();
    for (let i = 0; i < 5; i++) { if (i === 0) s.choose(s.first.id, true); else { s.choose(s.first.id, false); s.choose(s.second.id, false); } if (i < 4) s.next(); }
    expect(s.state().match).toMatchObject({ phase: 'completed', winnerId: s.first.id, finishReason: 'round-cap', target: 3 });
  });
  it('uses bounded sudden death after a tie and an honest draw after five scoreless extras', () => {
    const s = setup('duel'); s.ready();
    for (let i = 0; i < 10; i++) { s.step(500); if (i < 9) s.next(); }
    expect(s.state().match).toMatchObject({ phase: 'completed', winnerId: null, finishReason: 'draw' }); expect(s.state().match!.history).toHaveLength(10);
    expect(s.state().match!.history.slice(5).every(h => h.suddenDeath)).toBe(true);
    const other = setup('duel'); other.ready(); for (let i = 0; i < 5; i++) { other.step(500); other.next(); }
    other.choose(other.second.id, true); expect(other.state().match).toMatchObject({ winnerId: other.second.id, finishReason: 'sudden-death' });
  });
  it('cleans bounded idle state and rejects old tokens after a server restart', () => {
    const s = setup(); const fresh = new ArenaManager(); expect(() => fresh.connect(s.first.token, 'new-server')).toThrow('no longer has');
    s.manager.disconnect(s.first.id, 'socket-a'); s.manager.disconnect(s.second.id, 'socket-b'); s.step(51); s.step(3001);
    expect(s.manager.diagnostics().rooms).toBe(0); expect(s.manager.diagnostics().sessions).toBe(0);
    expect(commandSchema.safeParse({ type: 'score', score: 100 }).success).toBe(false);
  });
  it('releases drawing/profile references when guests churn through an open private lobby', () => {
    const s = setup(); s.send(s.second.id, { type: 'leave', matchId: s.id });
    for (let i = 0; i < 50; i++) {
      const guest = s.manager.connect(undefined, `churn-${i}`);
      expect(s.send(guest.id, { type: 'join', code: s.state().match!.code }).ok).toBe(true);
      s.send(guest.id, { type: 'leave', matchId: s.id }); s.manager.disconnect(guest.id, `churn-${i}`);
    }
    expect(s.manager.diagnostics().retainedProfiles).toBe(1);
  });
  it('bounds action rate and leaves score invariant under arbitrary cosmetic requests', () => {
    const s = setup(); s.ready();
    for (let i = 0; i < 45; i++) s.send(s.first.id, { type: 'animation', actorId: s.second.id });
    expect(s.choose(s.first.id, true).code).toBe('RATE_LIMIT'); expect(total(s.state())).toBe(0); expect(s.manager.audit.length).toBeLessThanOrEqual(s.manager.limits.audit);
  });
});
