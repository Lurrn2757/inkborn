import { describe, expect, it } from 'vitest';
import type { ArenaMatch } from '../../shared/arena/protocol';
import { arenaPerformance, arenaPlayerPose } from '../../src/arena/arenaMotion';

function fixture(type: 'round' | 'backlash' | 'finish' = 'round'): ArenaMatch {
  return {
    id: 'test-arena', code: null, visibility: 'quick', mode: 'standard', phase: type === 'finish' ? 'completed' : 'intermission', revision: 2,
    target: 5, normalRoundLimit: 9, suddenDeathLimit: 5,
    players: [0, 1].map(i => ({ id: `p${i}`, nickname: `Player ${i}`, monster: { appearance: { kind: 'starter' as const, id: 'warden' as const, name: 'Ink Warden' }, hash: `starter-${i}` }, connected: true, ready: true, score: i ? 0 : 1, submitted: true, wrong: false, rematchAccepted: false })),
    round: null, phaseEndsAt: null, reconnectDeadline: null, history: [], winnerId: type === 'finish' ? 'p0' : null, finishReason: type === 'finish' ? 'target' : null,
    event: { id: 'cosmetic-1', type, actorId: 'p0', move: 'execution', at: 1000 },
  };
}
describe('authoritative Arena presentation projection', () => {
  it('telegraphs every move before release, impact and recovery without modifying the match', () => {
    for (const move of ['execution','hellfall','equation','fracture','mindstorm'] as const) {
      const match = fixture(); match.event!.move = move; const before = structuredClone(match);
      expect(arenaPerformance(match, .3).phase).toBe('anticipation');
      expect(arenaPerformance(match, .9).phase).toBe('release');
      expect(arenaPerformance(match, 1.2).phase).toBe('impact');
      expect(arenaPerformance(match, 2).phase).toBe('recovery');
      expect(arenaPerformance(match, 4).done).toBe(true);
      arenaPlayerPose(match, 0, 1, .9, false); arenaPlayerPose(match, 1, 1, 1.2, false);
      expect(match).toEqual(before);
    }
  });
  it('derives each monster condition exclusively from the opponent score', () => {
    const match = fixture();
    expect(arenaPlayerPose(match, 0, 2, 2, false).condition).toBe(1);
    expect(arenaPlayerPose(match, 1, 2, 2, false).condition).toBe(.8);
    match.players[0]!.score = 4;
    expect(arenaPlayerPose(match, 1, 2, 2, false).condition).toBeCloseTo(.2);
    expect(arenaPlayerPose(match, 1, 2, 2, false).low).toBe(true);
    expect(arenaPlayerPose(match, 0, 2, 2, false).matchPoint).toBe(true);
  });
  it('makes backlash affect its caster rather than an opponent or score', () => {
    const match = fixture('backlash'), before = structuredClone(match);
    expect(arenaPlayerPose(match, 0, 1, .25, false).damaged).toBe(true);
    expect(arenaPlayerPose(match, 1, 1, .25, false).damaged).toBe(false);
    expect(arenaPlayerPose(match, 0, 1, .25, false).condition).toBe(1);
    expect(match).toEqual(before);
  });
  it('removes joint, camera-driving and ink-scale motion under reduced motion or a paused match', () => {
    for (const paused of [false, true]) {
      const match = fixture(); if (paused) match.phase = 'paused';
      const pose = arenaPlayerPose(match, 0, 2, .9, !paused);
      expect([pose.x, pose.y, pose.tilt, pose.arm, pose.elbow]).toEqual([0, 0, 0, 0, 0]);
      expect([pose.scaleX, pose.scaleY]).toEqual([1, 1]);
    }
  });
  it('celebrates the declared winner and collapses only the declared loser at completion', () => {
    const match = fixture('finish');
    expect(arenaPlayerPose(match, 0, 3, 3, false).celebration).toBe(true);
    expect(arenaPlayerPose(match, 0, 3, 3, false).dissolve).toBe(0);
    expect(arenaPlayerPose(match, 1, 3, 3, false).dissolve).toBeGreaterThan(.9);
    match.winnerId = null; match.event!.actorId = null;
    expect(arenaPlayerPose(match, 0, 3, 3, false).dissolve).toBe(0);
    expect(arenaPlayerPose(match, 1, 3, 3, false).dissolve).toBe(0);
  });
});
