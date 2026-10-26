import type { ArenaFrame, ArenaViewProps } from './types';
import { CHAMBER_PERFORMANCE } from '../creative/chamber';

export const AWAKENING_DURATION = CHAMBER_PERFORMANCE.awakeningSeconds;
export const ENDING_DURATION = CHAMBER_PERFORMANCE.endingSeconds;
export type PerformanceState = 'dormant' | 'awakening' | 'idle' | 'charging' | 'attacking' | 'damage' | 'enraged' | 'stunned' | 'defeated' | 'retreating';
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };

/** A pure visual projection. Event identity and outcomes remain owned by React. */
export function evaluateTimeline(props: ArenaViewProps, frame: ArenaFrame) {
  let state: PerformanceState = (props.ritualIntegrity ?? 5) <= 2 || props.crystals.some(crystal => crystal.state === 'corrupted' || crystal.state === 'unresolved') ? 'enraged' : 'idle';
  const age = frame.eventAge;
  const awakeningAge = frame.sceneAge * (props.reducedMotion ? AWAKENING_DURATION / .9 : 1);
  const recovery = props.event?.type === 'recovery';
  const corrupt = props.event?.type === 'corrupt' || props.event?.type === 'unresolved';
  const hit = props.event?.type === 'hit';
  if (props.scene === 'preview') state = 'dormant';
  else if (props.scene === 'awakening') state = awakeningAge < .7 ? 'dormant' : awakeningAge < AWAKENING_DURATION ? 'awakening' : 'idle';
  else if (props.scene === 'victory') state = 'defeated';
  else if (props.scene === 'retreat') state = 'retreating';
  else if (corrupt && age < .4) state = 'charging';
  else if (corrupt && age < 1.05) state = 'attacking';
  else if (corrupt && age < 1.9) state = 'enraged';
  else if (recovery && age < .36) state = 'stunned';
  else if ((hit && age < .36) || (recovery && age >= .36 && age < .8)) state = 'damage';
  else if ((hit && age < 1.4) || (recovery && age < 1.8)) state = 'stunned';
  const burstAge = age - (recovery ? .36 : corrupt ? .4 : 0);
  const burstDuration = corrupt ? 1 : 1.35;
  return {
    state,
    bodyReveal: props.scene === 'awakening' ? smooth((awakeningAge - .4) / 2.2) : 1,
    crystalReveal: (index: number) => props.scene === 'awakening' ? smooth((awakeningAge - 3.2 - index * .55) / .9) : 1,
    energy: props.scene === 'awakening' ? Math.sin(clamp((awakeningAge - 1.8) / 4.4) * Math.PI) : state === 'charging' ? smooth(age / .4) : 0,
    corruption: recovery ? 1 - smooth(age / .36) : corrupt ? smooth(age / .9) : 1,
    burstAge,
    burstDuration,
    burst: !!props.event && (hit || recovery || corrupt) && burstAge >= 0 && burstAge < burstDuration,
    burstStrength: recovery ? 2 : corrupt ? 1.3 : 1.25,
    ending: smooth(frame.sceneAge / ENDING_DURATION),
    inkDispersal: props.scene === 'victory' ? smooth((frame.sceneAge - .25) / 2.75) : 0,
  };
}

export function layoutArena(width: number, height: number, sprite: ArenaViewProps['sprite']) {
  const scale = Math.min(width * .57 / Math.max(1, sprite.width), height * .49 / Math.max(1, sprite.height));
  return { x: width / 2, y: height * .45, width: sprite.width * scale, height: sprite.height * scale };
}

export function evaluatePose(props: ArenaViewProps, frame: ArenaFrame) {
  const moving = !props.reducedMotion;
  const age = frame.eventAge;
  const timeline = evaluateTimeline(props, frame);
  const active = props.scene === 'battle' && props.event !== null;
  const impulse = active && age < 1.4 ? Math.sin(clamp(age / 1.4) * Math.PI) : 0;
  const damaged = timeline.state === 'damage' || timeline.state === 'stunned';
  const attacking = timeline.state === 'attacking';
  const charging = timeline.state === 'charging';
  const awake = timeline.state !== 'dormant';
  const breath = awake ? Math.sin(frame.time * (timeline.state === 'enraged' ? 2.6 : 1.8)) : 0;
  const lunge = attacking ? Math.sin(clamp((age - .4) / .65) * Math.PI) : 0;
  const focus = props.selectedId && props.scene === 'battle' ? Math.sin(clamp((frame.selectionAge ?? 2) / .8) * Math.PI) : 0;
  const focusAnchor = props.sprite.anchors.find(anchor => anchor.conceptId === props.selectedId);
  return {
    x: moving ? (damaged ? Math.sin(age * 24) * impulse * CHAMBER_PERFORMANCE.hitRecoil : attacking ? Math.sin(age * 9) * lunge * 7 : (focusAnchor ? (.5 - focusAnchor.x) * focus * 8 : 0)) : 0,
    y: moving ? (awake ? Math.sin(frame.time * 1.45) * CHAMBER_PERFORMANCE.idleBob : 0) + lunge * CHAMBER_PERFORMANCE.attackTravel - (charging ? timeline.energy * 6 : 0) - focus * 2 : 0,
    rotation: moving && awake ? Math.sin(frame.time * .65) * CHAMBER_PERFORMANCE.idleTilt + (damaged ? Math.sin(age * 17) * impulse * .03 : 0) : 0,
    scaleX: moving ? 1 + breath * CHAMBER_PERFORMANCE.idleBreath - (charging ? timeline.energy * .07 : 0) + lunge * .18 + focus * .018 : 1,
    scaleY: moving ? 1 - breath * CHAMBER_PERFORMANCE.idleBreath + (charging ? timeline.energy * .055 : 0) + lunge * .09 + focus * .018 : 1,
    alpha: props.scene === 'victory' ? 1 - smooth(frame.sceneAge / 1.8) : props.scene === 'retreat' ? Math.max(.2, 1 - timeline.ending * .8) : props.scene === 'awakening' ? timeline.bodyReveal : 1,
    endingScale: props.scene === 'retreat' && moving ? 1 - timeline.ending * .3 : 1,
    impulse,
  };
}

export function visualCrystalState(crystal: ArenaViewProps['crystals'][number], props: ArenaViewProps, frame: ArenaFrame) {
  return props.event?.type === 'recovery' && props.event.conceptId === crystal.id && frame.eventAge < .36 ? 'corrupted' : crystal.state;
}

/** One clock survives a renderer replacement. Semantic state is never changed here. */
export class PresentationClock {
  private start = performance.now();
  private eventAt = this.start;
  private sceneAt = this.start;
  private eventId: string | null = null;
  private scene: ArenaViewProps['scene'] | null = null;
  private selectedId: string | null = null;
  private selectedAt = this.start;
  beginScene(props: ArenaViewProps) { this.scene = props.scene; this.sceneAt = performance.now(); }
  sample(props: ArenaViewProps): ArenaFrame {
    const now = performance.now();
    if ((props.event?.id ?? null) !== this.eventId) { this.eventId = props.event?.id ?? null; this.eventAt = now; }
    if (props.scene !== this.scene) { this.scene = props.scene; this.sceneAt = now; }
    if (props.selectedId !== this.selectedId) { this.selectedId = props.selectedId; this.selectedAt = now; }
    return { time: (now - this.start) / 1000, eventAge: (now - this.eventAt) / 1000, sceneAge: (now - this.sceneAt) / 1000, selectionAge: (now - this.selectedAt) / 1000 };
  }
}

export function crystalColor(state: ArenaViewProps['crystals'][number]['state']): number {
  return state === 'stable' ? 0x8ac8bd : state === 'shattered' ? 0xbd9857 : state === 'unresolved' ? 0xe03665 : 0xb85472;
}
