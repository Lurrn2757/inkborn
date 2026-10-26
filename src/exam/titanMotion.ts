import type { ExamEvent } from './engine.js';
import type { Rig } from './storage.js';

export const TITAN_AWAKENING_SECONDS = 2.8;
export const titanEventDuration = (type: ExamEvent['type']): number => type === 'hit' ? 1.7 : type === 'victory' || type === 'final' || type === 'finisher' ? 3.5 : 2.8;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
export type TitanPose = { breath: number; tilt: number; recoil: number; raise: number; sweep: number; impact: number; charge: number; action: number; dissolve: number; special: number; darkness: number; phase: 'idle' | 'anticipation' | 'action' | 'impact' | 'recovery'; done: boolean };
/** Presentation only. Time and cosmetic intensity never write examination state. */
export function titanPose(time: number, age: number, event: ExamEvent | null, reducedMotion: boolean): TitanPose {
  const duration = event ? titanEventDuration(event.type) : 0;
  const done = !event || age >= duration;
  const pose: TitanPose = { breath: reducedMotion ? 0 : Math.sin(time * 1.7) * .018, tilt: reducedMotion ? 0 : Math.sin(time * .7) * .018, recoil: 0, raise: 0, sweep: 0, impact: 0, charge: 0, action: 0, special: 0, darkness: event?.type === 'final' ? smooth((age - 1.5) / 1.3) * .75 : 0, dissolve: event?.type === 'victory' ? smooth((age - 1.25) / 1.7) : 0, phase: done ? 'idle' : age < .75 ? 'anticipation' : age < 1.2 ? 'action' : age < 1.5 ? 'impact' : 'recovery', done };
  if (!event || done) return pose;
  pose.action = smooth((age - .75) / .45);
  pose.charge = smooth(age / .75) * (1 - smooth((age - 1.2) / .6));
  pose.impact = age >= 1.2 ? Math.exp(-(age - 1.2) * 7) : 0;
  if (event.type === 'finisher') pose.special = smooth(age / .75) * (1 - smooth((age - 2.1) / 1.2));
  if (reducedMotion) { pose.impact *= .15; return pose; }
  const recovery = 1 - smooth((age - 1.45) / (duration - 1.45));
  if (event.type === 'hit') { pose.recoil = Math.sin(clamp(age / 1.3) * Math.PI) * .18; pose.tilt += Math.sin(age * 15) * Math.exp(-age * 3) * .035; }
  if (event.type === 'slam') pose.raise = smooth(age / .7) * (1 - pose.action) * 1.9 - pose.action * recovery * .55;
  if (event.type === 'sweep') pose.sweep = (smooth(age / .75) * -.7 + pose.action * 2) * recovery;
  if (event.type === 'storm' || event.type === 'beam') pose.raise = pose.charge * .7;
  if (event.type === 'final') { pose.raise = smooth(age / .8) * 2.4 * recovery; pose.tilt -= pose.charge * .1; }
  if (event.type === 'finisher') { pose.recoil = smooth((age - 1.15) / .2) * recovery * .3; pose.tilt += Math.sin(age * 20) * pose.impact * .08; }
  if (event.type === 'victory') pose.tilt += smooth(age / 2.5) * .4;
  return pose;
}
/** Bounded, local weighted rotations; arbitrary drawings retain their silhouette. */
export function deformInk(x: number, y: number, width: number, height: number, time: number, pose: TitanPose, rig: Rig | null, reducedMotion: boolean): { x: number; y: number; z: number } {
  if (reducedMotion) return { x, y, z: 0 };
  let px = x * (1 - pose.breath * .45), py = y * (1 + pose.breath), pz = Math.sin(y * 1.3 + time * 1.6) * .025;
  if (rig) {
    for (const [shoulder, hand, side] of [[rig.leftShoulder, rig.leftHand, -1], [rig.rightShoulder, rig.rightHand, 1]] as const) {
      const sx = (shoulder.x - .5) * width, sy = (.5 - shoulder.y) * height;
      const hx = (hand.x - .5) * width, hy = (.5 - hand.y) * height;
      const length = Math.hypot(hx - sx, hy - sy);
      if (length < .05) continue;
      const along = clamp(((x - sx) * (hx - sx) + (y - sy) * (hy - sy)) / (length * length));
      const distance = Math.hypot(x - (sx + along * (hx - sx)), y - (sy + along * (hy - sy)));
      const weight = Math.exp(-Math.pow(distance / Math.min(.7, length * .4 + .1), 2) * 3) * smooth(along);
      const angle = (Math.sin(time * 1.8 + side) * .05 + pose.raise * side * .16 + pose.sweep * .12) * weight;
      const dx = px - sx, dy = py - sy;
      px = sx + dx * Math.cos(angle) - dy * Math.sin(angle); py = sy + dx * Math.sin(angle) + dy * Math.cos(angle);
    }
  }
  // Limit all local displacement to a small fraction of the visible ink extent.
  px = x + Math.max(-width * .075, Math.min(width * .075, px - x));
  py = y + Math.max(-height * .075, Math.min(height * .075, py - y));
  pz += pose.recoil * (y / height + .5) * -.4;
  return { x: px, y: py, z: pz };
}
