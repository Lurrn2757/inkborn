import { describe, expect, it } from 'vitest';
import { deformInk, titanEventDuration, titanPose } from '../../src/exam/titanMotion.js';
import type { ExamEvent } from '../../src/exam/engine.js';
const event = (type: ExamEvent['type']): ExamEvent => ({ type, id: 'exam:1', intensity: .8, questionId: 'q1', streak: 1 });
describe('crystal titan presentation', () => {
  it('telegraphs every boss attack before impact and settles after recovery', () => {
    for (const type of ['slam', 'storm', 'beam', 'sweep', 'final', 'finisher'] as const) {
      const e = event(type), snapshot = structuredClone(e);
      expect(titanPose(0, .3, e, false).phase).toBe('anticipation');
      expect(titanPose(0, .95, e, false).phase).toBe('action');
      expect(titanPose(0, 1.25, e, false).phase).toBe('impact');
      expect(titanPose(0, 1.8, e, false).phase).toBe('recovery');
      expect(titanPose(0, titanEventDuration(type), e, false).done).toBe(true);
      expect(titanPose(0, .7, e, false).impact).toBe(0);
      expect(e).toEqual(snapshot);
    }
  });
  it('uses distinct arm and energy performances', () => {
    expect(titanPose(0, .7, event('slam'), false).raise).toBeGreaterThan(1);
    expect(titanPose(0, .7, event('sweep'), false).sweep).toBeLessThan(-.5);
    expect(titanPose(0, .7, event('beam'), false).charge).toBeGreaterThan(.9);
    expect(titanPose(0, .5, event('hit'), false).recoil).toBeGreaterThan(0);
    expect(titanPose(0, 3, event('victory'), false).dissolve).toBe(1);
  });
  it('removes physical motion and mesh deformation in reduced-motion mode', () => {
    const pose = titanPose(3.4, 1.25, event('slam'), true);
    expect([pose.breath, pose.tilt, pose.raise, pose.sweep, pose.recoil]).toEqual([0, 0, 0, 0, 0]);
    expect(pose.impact).toBeLessThanOrEqual(.15);
    expect(deformInk(1, 2, 4, 5, 2, pose, null, true)).toEqual({ x: 1, y: 2, z: 0 });
  });
  it('breathes a subdivided ink surface without changing its recognizable proportions', () => {
    const pose = titanPose(3, 5, null, false);
    const a = deformInk(1, 1, 4, 4, 1, pose, null, false);
    const b = deformInk(1, -1, 4, 4, 1, pose, null, false);
    expect(a.y).not.toBe(1);
    expect(a.z).not.toBe(b.z);
    expect(Math.abs(a.x - 1)).toBeLessThan(.1);
    expect(Math.abs(a.y - 1)).toBeLessThan(.1);
  });
  it('weights optional limb anchors locally and bounds deformation for arbitrary drawings', () => {
    const rig = { leftShoulder: { x: .3, y: .3 }, leftHand: { x: .1, y: .65 }, rightShoulder: { x: .7, y: .3 }, rightHand: { x: .9, y: .65 } };
    const snapshot = structuredClone(rig), pose = titanPose(1, .7, event('slam'), false);
    const hand = deformInk(-1.6, -.6, 4, 4, 1, pose, rig, false);
    const center = deformInk(0, 0, 4, 4, 1, pose, rig, false);
    expect(Math.abs(hand.x + 1.6) + Math.abs(hand.y + .6)).toBeGreaterThan(Math.abs(center.x) + Math.abs(center.y));
    for (let x = -2; x <= 2; x += .2) for (let y = -2; y <= 2; y += .2) { const v = deformInk(x, y, 4, 4, 3, pose, rig, false); expect(Math.abs(v.x - x)).toBeLessThanOrEqual(.3000001); expect(Math.abs(v.y - y)).toBeLessThanOrEqual(.3000001); }
    expect(rig).toEqual(snapshot);
  });
  it('handles coincident anchors without NaN or unsupported anatomical inference', () => {
    const p = { x: .5, y: .5 }, pose = titanPose(0, .5, event('slam'), false);
    const result = deformInk(0, 0, 4, 4, 0, pose, { leftHand: p, leftShoulder: p, rightHand: p, rightShoulder: p }, false);
    expect(Object.values(result).every(Number.isFinite)).toBe(true);
  });
  it('keeps the earned player special distinct from final defeat and exam completion', () => {
    const special = event('finisher'), snapshot = structuredClone(special);
    expect(titanEventDuration('finisher')).toBe(3.5);
    expect(titanPose(2, .7, special, false).special).toBeGreaterThan(.9);
    expect(titanPose(2, 1.4, special, false).recoil).toBeGreaterThan(.2);
    expect(titanPose(2, 3, special, false).dissolve).toBe(0);
    expect(titanPose(2, 3, special, false).darkness).toBe(0);
    expect(titanPose(2, 3, event('final'), false).darkness).toBeGreaterThan(.7);
    expect(titanPose(2, .7, event('final'), false).raise).toBeGreaterThan(2);
    expect(special).toEqual(snapshot);
  });

});
