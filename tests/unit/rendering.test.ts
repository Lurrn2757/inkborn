import { afterEach, describe, expect, it, vi } from 'vitest';
import { evaluatePose, layoutArena, PresentationClock } from '../../src/rendering/motion';
import type { ArenaViewProps } from '../../src/rendering/types';

function scene(): ArenaViewProps {
  return {
    sprite: { dataUrl: 'data:image/png;base64,actual-user-ink', width: 700, height: 300, anchors: [{ conceptId: 'c1', x: .2, y: .3, attachmentX: .24, attachmentY: .32 }] },
    crystals: [{ id: 'c1', label: 'Current', state: 'stable' }],
    selectedId: 'c1', event: null, scene: 'battle', reducedMotion: false, onSelect: () => undefined,
  };
}

afterEach(() => vi.restoreAllMocks());

describe('arena presentation boundaries', () => {
  it('preserves the actual image proportions while fitting both viewport dimensions', () => {
    for (const [width, height] of [[320, 260], [1200, 700], [600, 1000]]) {
      const props = scene();
      const layout = layoutArena(width!, height!, props.sprite);
      expect(layout.width / layout.height).toBeCloseTo(7 / 3);
      expect(layout.width).toBeLessThanOrEqual(width! * .57 + .001);
      expect(layout.height).toBeLessThanOrEqual(height! * .49 + .001);
      expect(props.sprite.dataUrl).toBe('data:image/png;base64,actual-user-ink');
    }
  });

  it('keeps an event timeline continuous across prop snapshots and renderer replacement', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000);
    const clock = new PresentationClock();
    const props = scene();
    props.event = { id: 'committed-answer-1', conceptId: 'c1', type: 'hit' };
    expect(clock.sample(props).eventAge).toBe(0);
    now.mockReturnValue(1650);
    expect(clock.sample({ ...props, event: { ...props.event } }).eventAge).toBeCloseTo(.65);
    // A 2D fallback reuses this clock; it does not replay the committed answer.
    now.mockReturnValue(2900);
    expect(clock.sample(props).eventAge).toBeCloseTo(1.9);
    props.event = { id: 'committed-answer-2', conceptId: 'c1', type: 'recovery' };
    expect(clock.sample(props).eventAge).toBe(0);
  });

  it('suppresses recoil, bobbing and squash under reduced motion', () => {
    const props = scene();
    props.reducedMotion = true;
    props.event = { id: 'answer', conceptId: 'c1', type: 'corrupt' };
    for (const time of [.1, .4, .9, 3]) {
      const pose = evaluatePose(props, { time, eventAge: time, sceneAge: time });
      expect([pose.x, pose.y, pose.rotation, pose.scaleX, pose.scaleY]).toEqual([0, 0, 0, 1, 1]);
    }
  });

  it('settles a stale answer effect without changing crystal or question state', () => {
    const props = scene();
    props.event = { id: 'answer', conceptId: 'c1', type: 'hit' };
    const snapshot = structuredClone({ sprite: props.sprite, crystals: props.crystals, event: props.event });
    const pose = evaluatePose(props, { time: 90, eventAge: 89, sceneAge: 90 });
    expect(pose.impulse).toBe(0);
    expect({ sprite: props.sprite, crystals: props.crystals, event: props.event }).toEqual(snapshot);
  });

  it('gives victory and retreat visibly distinct endings with a recognizable retreat silhouette', () => {
    const props = scene();
    const frame = { time: 4, eventAge: 4, sceneAge: 4 };
    const victory = evaluatePose({ ...props, scene: 'victory' }, frame);
    const retreat = evaluatePose({ ...props, scene: 'retreat' }, frame);
    expect(victory.alpha).toBeLessThan(retreat.alpha);
    expect(retreat.alpha).toBeGreaterThanOrEqual(.2);
    expect(retreat.endingScale).toBeLessThan(victory.endingScale);
  });
});
