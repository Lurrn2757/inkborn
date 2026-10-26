import { afterEach, describe, expect, it, vi } from 'vitest';
import { AWAKENING_DURATION, ENDING_DURATION, evaluatePose, evaluateTimeline, layoutArena, PresentationClock, visualCrystalState } from '../../src/rendering/motion';
import { evaluateInkFragment, sampleInkPixels } from '../../src/rendering/ink';
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

  it('starts the visual scene at actual renderer readiness without replaying its answer event', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000);
    const clock = new PresentationClock();
    const props = scene();
    props.event = { id: 'committed-answer', conceptId: 'c1', type: 'hit' };
    clock.sample(props);
    now.mockReturnValue(2300);
    clock.beginScene(props);
    const frame = clock.sample(props);
    expect(frame.sceneAge).toBe(0);
    expect(frame.eventAge).toBeCloseTo(1.3);
    now.mockReturnValue(9000);
    // Hidden-tab time settles naturally rather than accumulating particle updates.
    expect(evaluateTimeline(props, clock.sample(props)).burst).toBe(false);
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

  it('gives a newly selected crystal a brief shared-body focus response that settles', () => {
    const props = scene();
    const selected = evaluatePose(props, { time: 0, eventAge: 9, sceneAge: 9, selectionAge: .4 });
    const settled = evaluatePose(props, { time: 0, eventAge: 9, sceneAge: 9, selectionAge: 2 });
    expect(selected.scaleX).toBeGreaterThan(settled.scaleX);
    expect(Math.abs(selected.x)).toBeLessThan(4);
    expect(evaluatePose({ ...props, reducedMotion: true }, { time: 0, eventAge: 9, sceneAge: 9, selectionAge: .4 }).scaleX).toBe(1);
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

  it('expresses every performance state without introducing a battle state machine', () => {
    const props = scene();
    const at = (age: number) => ({ time: age, eventAge: age, sceneAge: age });
    const state = (next: Partial<ArenaViewProps>, age: number) => evaluateTimeline({ ...props, ...next }, at(age)).state;
    expect(state({ scene: 'preview' }, 0)).toBe('dormant');
    expect(state({ scene: 'awakening' }, 1)).toBe('awakening');
    expect(state({}, 0)).toBe('idle');
    const corruption = { id: 'wrong-answer', conceptId: 'c1', type: 'corrupt' as const };
    expect(state({ event: corruption }, .2)).toBe('charging');
    expect(state({ event: corruption }, .6)).toBe('attacking');
    expect(state({ event: corruption }, 1.3)).toBe('enraged');
    const hit = { id: 'correct-answer', conceptId: 'c1', type: 'hit' as const };
    expect(state({ event: hit }, .1)).toBe('damage');
    expect(state({ event: hit }, .8)).toBe('stunned');
    expect(state({ scene: 'victory' }, 1)).toBe('defeated');
    expect(state({ scene: 'retreat' }, 1)).toBe('retreating');
  });

  it('stages body gathering before staggered crystal materialization within the approved cinematic duration', () => {
    const props = { ...scene(), scene: 'awakening' as const };
    const at = (sceneAge: number) => evaluateTimeline(props, { time: sceneAge, eventAge: 0, sceneAge });
    expect(AWAKENING_DURATION).toBeGreaterThanOrEqual(5);
    expect(AWAKENING_DURATION).toBeLessThanOrEqual(7);
    expect(ENDING_DURATION).toBe(3);
    expect(at(.3).bodyReveal).toBe(0);
    expect(at(2.9).bodyReveal).toBe(1);
    expect(at(2.9).crystalReveal(0)).toBe(0);
    expect(at(4.4).crystalReveal(0)).toBeGreaterThan(at(4.4).crystalReveal(1));
    expect(at(4.4).crystalReveal(1)).toBeGreaterThan(at(4.4).crystalReveal(2));
    expect(at(AWAKENING_DURATION).state).toBe('idle');
    expect([0, 1, 2].map(index => at(AWAKENING_DURATION).crystalReveal(index))).toEqual([1, 1, 1]);
    const reduced = evaluateTimeline({ ...props, reducedMotion: true }, { time: .9, eventAge: 0, sceneAge: .9 });
    expect(reduced.bodyReveal).toBe(1);
    expect([0, 1, 2].map(index => reduced.crystalReveal(index))).toEqual([1, 1, 1]);
  });

  it('keeps the monster agitated at critical integrity even after corruption is reclaimed', () => {
    const props = scene();
    props.crystals[0]!.state = 'shattered';
    const settled = { time: 8, eventAge: 8, sceneAge: 8 };
    expect(evaluateTimeline({ ...props, ritualIntegrity: 5 }, settled).state).toBe('idle');
    expect(evaluateTimeline({ ...props, ritualIntegrity: 2 }, settled).state).toBe('enraged');
    const attack = { ...props, event: { id: 'strike', conceptId: 'c1', type: 'unresolved' as const } };
    const pose = evaluatePose(attack, { time: .7, eventAge: .7, sceneAge: 8 });
    expect(pose.scaleX).toBeGreaterThan(1.1);
    expect(pose.y).toBeGreaterThan(25);
    expect(visualCrystalState(props.crystals[0]!, { ...props, event: { id: 'first-cast', conceptId: 'c1', type: 'hit' } }, { time: 0, eventAge: 0, sceneAge: 8 })).toBe('shattered');
  });

  it('retracts corruption before a stronger recovery shatter and lets overdue effects settle', () => {
    const props = scene();
    props.crystals[0]!.state = 'shattered';
    props.event = { id: 'follow-up-answer', conceptId: 'c1', type: 'recovery' };
    const early = { time: .1, eventAge: .1, sceneAge: 9 };
    const after = { time: .5, eventAge: .5, sceneAge: 9 };
    expect(visualCrystalState(props.crystals[0]!, props, early)).toBe('corrupted');
    expect(evaluateTimeline(props, early).burst).toBe(false);
    expect(evaluateTimeline(props, early).corruption).toBeGreaterThan(evaluateTimeline(props, after).corruption);
    expect(visualCrystalState(props.crystals[0]!, props, after)).toBe('shattered');
    expect(evaluateTimeline(props, after).burst).toBe(true);
    expect(evaluateTimeline(props, after).burstStrength).toBeGreaterThan(1);
    expect(evaluateTimeline(props, { time: 90, eventAge: 90, sceneAge: 90 }).burst).toBe(false);
    expect(props.crystals[0]!.state).toBe('shattered');
  });
});

describe('actual drawing dispersal', () => {
  it('samples only visible source pixels with their exact colors and a hard fragment bound', () => {
    const pixels = new Uint8ClampedArray(4 * 3 * 4);
    pixels.set([233, 45, 80, 255], 1 * 4);
    pixels.set([20, 180, 165, 128], 7 * 4);
    pixels.set([70, 40, 210, 255], 9 * 4);
    const samples = sampleInkPixels(pixels, 4, 3, 2);
    expect(samples).toHaveLength(2);
    for (const sample of samples) {
      const index = (Math.floor(sample.y * 3) * 4 + Math.floor(sample.x * 4)) * 4;
      expect(pixels[index + 3]).toBeGreaterThan(0);
      expect(sample.color).toBe((pixels[index]! << 16) | (pixels[index + 1]! << 8) | pixels[index + 2]!);
    }
    expect(sampleInkPixels(new Uint8ClampedArray(48), 4, 3)).toEqual([]);
    expect(sampleInkPixels(new Uint8ClampedArray(1024 * 4).fill(255), 32, 32)).toHaveLength(144);
  });

  it('keeps reduced-motion ink at its source position while fading, without altering its sampled color', () => {
    const sample = { x: .25, y: .75, color: 0x14b4a5, alpha: .8 };
    const first = evaluateInkFragment(sample, 2, .2, 400, 300, true);
    const last = evaluateInkFragment(sample, 2, 1, 400, 300, true);
    expect([first.x, first.y]).toEqual([-100, 75]);
    expect([last.x, last.y]).toEqual([first.x, first.y]);
    expect(last.alpha).toBe(0);
    expect(sample.color).toBe(0x14b4a5);
    expect(evaluateInkFragment(sample, 2, .5, 400, 300, false).x).not.toBe(first.x);
  });
});
