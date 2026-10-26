import { describe, expect, it } from 'vitest';
import { fitGameViewport, logicalPoint, GAME_WIDTH, GAME_HEIGHT } from '../../src/rendering/viewport';
import { titanPose, titanPresentationAge } from '../../src/exam/titanMotion';
import type { ExamEvent } from '../../src/exam/engine';
const event = (type: ExamEvent['type']): ExamEvent => ({ type, id: 'visual:1', intensity: 1, questionId: 'q1', streak: 1 });

describe('fixed logical battle composition', () => {
  it.each([[1920, 1080], [1600, 900], [1366, 768], [390, 260], [400, 900], [2560, 1080]])('fits %i × %i without stretching or cropping', (width, height) => {
    const fit = fitGameViewport(width, height);
    expect(fit.width / fit.height).toBeCloseTo(16 / 9, 10);
    expect(fit.width).toBeLessThanOrEqual(width + .001);
    expect(fit.height).toBeLessThanOrEqual(height + .001);
    expect(fit.left).toBeGreaterThanOrEqual(0);
    expect(fit.top).toBeGreaterThanOrEqual(0);
    const x = 1180, y = 340;
    expect(logicalPoint(fit.left + x * fit.scale, fit.top + y * fit.scale, width, height)).toEqual({ x: expect.closeTo(x, 8), y: expect.closeTo(y, 8) });
    expect(GAME_WIDTH / GAME_HEIGHT).toBe(16 / 9);
  });
  it('handles a hidden surface without invalid pointer coordinates', () => {
    expect(logicalPoint(0, 0, 0, 0)).toEqual({ x: 0, y: 0 });
  });
});

describe('cinematic physical response', () => {
  it('holds only presentation time at impact and leaves the committed event unchanged', () => {
    const hit = event('hit'), before = structuredClone(hit);
    expect(titanPresentationAge(.16, hit, false)).toBe(.14);
    expect(titanPresentationAge(.19, hit, false)).toBe(.14);
    expect(titanPresentationAge(.3, hit, false)).toBeCloseTo(.235);
    expect(titanPresentationAge(.19, hit, true)).toBe(.19);
    expect(hit).toEqual(before);
  });
  it('separates the ink lunge, beam channel, slam compression and terminal darkness', () => {
    const wrath = titanPose(1, 1.15, event('sweep'), false);
    expect(wrath.lunge).toBeGreaterThan(1);
    expect(wrath.darkness).toBeGreaterThan(0);
    expect(titanPose(1, .6, event('slam'), false).compression).toBeGreaterThan(.05);
    expect(titanPose(1, .6, event('beam'), false).lunge).toBe(0);
    expect(titanPose(1, .6, event('finisher'), false).fracture).toBe(0);
    expect(titanPose(1, 1.25, event('finisher'), false).fracture).toBeGreaterThan(.8);
    expect(titanPose(1, 3, event('hit'), false).darkness).toBe(0);
    expect(titanPose(1, 3, event('final'), false).darkness).toBeGreaterThan(.7);
  });
  it('breathes more heavily at low monster health and eliminates physical motion when reduced', () => {
    expect(Math.abs(titanPose(1, 0, null, false, .05).breath)).toBeGreaterThan(Math.abs(titanPose(1, 0, null, false, 1).breath));
    for (const type of ['slam', 'storm', 'sweep', 'beam', 'final', 'hit', 'victory'] as const) {
      const p = titanPose(3, .6, event(type), true, .05);
      expect([p.compression, p.lunge, p.yaw, p.headTurn, p.breath, p.tilt, p.recoil, p.raise, p.sweep]).toEqual(Array(9).fill(0));
    }
  });
});
