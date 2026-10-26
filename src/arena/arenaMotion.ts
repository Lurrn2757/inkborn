import type { ArenaMatch, ArenaMove } from '../../shared/arena/protocol';

export const ARENA_MOVE_NAMES: Record<ArenaMove, string> = {
  execution: 'THE INK EXECUTION', hellfall: 'CRYSTAL HELLFALL', equation: 'THE FORBIDDEN EQUATION', fracture: 'SOUL FRACTURE', mindstorm: 'MINDSTORM',
};
export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
export const smooth01 = (value: number) => { const n = clamp01(value); return n * n * (3 - 2 * n); };
export type ArenaPerformance = {
  phase: 'idle' | 'anticipation' | 'release' | 'impact' | 'recovery'; charge: number; release: number; impact: number; recover: number; done: boolean; ending: boolean;
};
/** Cosmetic time only. Server scores, answers and deadlines are never accepted as outputs. */
export function arenaPerformance(match: ArenaMatch, age: number): ArenaPerformance {
  const event = match.event, ending = event?.type === 'finish';
  const duration = event?.type === 'intro' ? 3.8 : event?.type === 'backlash' ? 1.25 : ending ? 3.7 : 3.15;
  const done = !event || age >= duration;
  const backlash = event?.type === 'backlash';
  const hitAt = backlash ? .2 : 1.15;
  return {
    ending, done, phase: done ? 'idle' : age < (backlash ? .16 : .7) ? 'anticipation' : age < hitAt ? 'release' : age < hitAt + .3 ? 'impact' : 'recovery',
    charge: done ? 0 : smooth01(age / (backlash ? .16 : .7)) * (1 - smooth01((age - hitAt) / .65)),
    release: done ? 0 : smooth01((age - (backlash ? .16 : .7)) / (hitAt - (backlash ? .16 : .7))),
    impact: !done && age >= hitAt ? Math.exp(-(age - hitAt) * (backlash ? 10 : 7)) : 0,
    recover: done ? 0 : 1 - smooth01((age - hitAt - .3) / Math.max(.1, duration - hitAt - .3)),
  };
}
export function arenaPlayerPose(match: ArenaMatch, slot: number, time: number, age: number, reducedMotion: boolean) {
  const player = match.players[slot], opponent = match.players[slot === 0 ? 1 : 0];
  const event = match.event, p = arenaPerformance(match, age), direction = slot === 0 ? 1 : -1;
  const actor = player?.id === event?.actorId, attack = event?.type === 'round' || event?.type === 'finish';
  const damaged = (attack && !actor && Boolean(event?.actorId)) || (event?.type === 'backlash' && actor);
  const condition = Math.max(0, 1 - (opponent?.score ?? 0) / match.target);
  const low = condition <= .4;
  const moving = !reducedMotion && match.phase !== 'paused';
  const breath = moving ? Math.sin(time * (low ? 1.1 : 1.7) + slot * .8) * (low ? .036 : .022) : 0;
  const cast = actor && attack && !p.done;
  const strike = p.release * p.recover;
  const finisherLoss = event?.type === 'finish' && damaged && match.winnerId !== player?.id;
  const dissolve = finisherLoss ? smooth01((age - 1.35) / 1.7) : 0;
  const celebration = match.phase === 'completed' && match.winnerId === player?.id;
  const compression = cast ? p.charge * .09 : damaged ? p.impact * .13 : 0;
  const lunge = cast ? strike * (event?.move === 'execution' ? 1.15 : event?.move === 'fracture' ? .6 : .18) : 0;
  return {
    condition, low, actor, damaged, cast, dissolve, celebration, matchPoint: Boolean(player && player.score >= match.target - 1 && match.phase !== 'completed'),
    x: moving ? direction * (lunge - (damaged ? p.impact * .32 : 0)) : 0,
    y: moving ? Math.sin(time * 1.35 + slot) * .045 - compression * .45 - dissolve * 1.15 + (celebration ? Math.sin(time * 1.8) * .07 : 0) : 0,
    tilt: moving ? Math.sin(time * .65 + slot) * .015 + (damaged ? direction * p.impact * .16 : 0) + dissolve * direction * .7 : 0,
    yaw: direction * .13 + (moving && cast ? direction * -.14 * p.charge : 0),
    scaleX: moving ? 1 - breath * .4 + compression * .5 + (cast && event?.move === 'execution' ? strike * .18 : 0) : 1,
    scaleY: moving ? 1 + breath - compression : 1,
    arm: moving ? (cast ? p.charge * -.85 + strike * .8 : Math.sin(time * 1.4 + slot) * .055) + (damaged ? p.impact * .3 : 0) : 0,
    elbow: moving ? (cast ? p.charge * -.55 + strike * .65 : Math.sin(time * 1.2 + slot + .8) * .055) : 0,
    fracture: Math.max((1 - condition) * .65, damaged && !p.done ? p.impact : 0),
    glow: cast ? p.charge : celebration ? .45 : low ? .15 : 0,
  };
}
