import type { ArenaFrame, ArenaViewProps } from './types';

export function layoutArena(width: number, height: number, sprite: ArenaViewProps['sprite']) {
  const scale = Math.min(width * .57 / Math.max(1, sprite.width), height * .49 / Math.max(1, sprite.height));
  return { x: width / 2, y: height * .45, width: sprite.width * scale, height: sprite.height * scale };
}

export function evaluatePose(props: ArenaViewProps, frame: ArenaFrame) {
  const moving = !props.reducedMotion;
  const age = frame.eventAge;
  const impulse = props.event && age < 1.1 ? Math.sin(Math.min(age / 1.1, 1) * Math.PI) : 0;
  const damaged = props.event?.type === 'hit' || props.event?.type === 'recovery';
  const attacking = props.event?.type === 'corrupt' || props.event?.type === 'unresolved';
  const awakening = props.scene === 'awakening' ? Math.min(1, frame.sceneAge / 2.8) : 1;
  const ending = Math.min(1, frame.sceneAge / 2.8);
  return {
    x: moving ? (damaged ? Math.sin(age * 24) * impulse * 8 : attacking ? Math.sin(age * 9) * impulse * 13 : 0) : 0,
    y: moving ? Math.sin(frame.time * 1.45) * 6 + (attacking ? impulse * 12 : -impulse * 6) : 0,
    rotation: moving ? Math.sin(frame.time * .65) * .016 + (damaged ? Math.sin(age * 17) * impulse * .035 : 0) : 0,
    scaleX: moving ? 1 + Math.sin(frame.time * 1.8) * .012 - (attacking ? impulse * .045 : 0) : 1,
    scaleY: moving ? 1 - Math.sin(frame.time * 1.8) * .014 + (attacking ? impulse * .06 : 0) : 1,
    alpha: props.scene === 'victory' ? Math.max(.08, 1 - ending * .92) : props.scene === 'retreat' ? Math.max(.2, 1 - ending * .8) : .15 + awakening * .85,
    endingScale: props.scene === 'retreat' && moving ? 1 - ending * .3 : 1,
    impulse,
  };
}

/** One clock survives a renderer replacement. Semantic state is never changed here. */
export class PresentationClock {
  private start = performance.now();
  private eventAt = this.start;
  private sceneAt = this.start;
  private eventId: string | null = null;
  private scene: ArenaViewProps['scene'] | null = null;
  sample(props: ArenaViewProps): ArenaFrame {
    const now = performance.now();
    if ((props.event?.id ?? null) !== this.eventId) { this.eventId = props.event?.id ?? null; this.eventAt = now; }
    if (props.scene !== this.scene) { this.scene = props.scene; this.sceneAt = now; }
    return { time: (now - this.start) / 1000, eventAge: (now - this.eventAt) / 1000, sceneAge: (now - this.sceneAt) / 1000 };
  }
}

export function crystalColor(state: ArenaViewProps['crystals'][number]['state']): number {
  return state === 'stable' ? 0x8ac8bd : state === 'shattered' ? 0xbd9857 : 0xb85472;
}
