import { GAME_WIDTH, GAME_HEIGHT } from './viewport';
import { Application, Circle, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { evaluateReleaseSeal, paintChamber } from '../creative/chamber';
import { crystalColor, evaluatePose, evaluateTimeline, layoutArena, visualCrystalState } from './motion';
import { createInkRim, evaluateInkFragment, sampleInkImage, type InkSample } from './ink';
import type { ArenaRenderer, ArenaViewProps } from './types';

interface CrystalNode {
  root: Container;
  tether: Graphics;
  body: Graphics;
  plate: Graphics;
  label: Text;
  key: string;
}

/** Imperative Pixi adapter. No graphics callback can change battle outcomes. */
export async function createPixiArena(onContextFailure: () => void): Promise<ArenaRenderer> {
  const app = new Application();
  try {
    await app.init({
      width: 1, height: 1, preference: ['webgl'], sharedTicker: false, autoStart: false,
      antialias: true, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2),
      backgroundColor: 0x100f15, powerPreference: 'low-power',
    });
  } catch (error) {
    // Initialization may fail before Pixi has installed its plugins.
    try { app.destroy(true, { children: true }); } catch { /* No completed renderer to destroy. */ }
    throw error;
  }
  const canvas = app.canvas;
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:manipulation';
  canvas.setAttribute('aria-hidden', 'true');
  const backdrop = new Sprite(Texture.EMPTY);
  const shadow = new Graphics();
  const atmosphere = new Graphics();
  const creature = new Container();
  const rim = new Sprite(Texture.EMPTY); rim.anchor.set(.5);
  const drawing = new Sprite(Texture.EMPTY);
  drawing.anchor.set(.5);
  creature.addChild(rim, drawing);
  const ink = new Graphics();
  creature.addChild(ink);
  const impacts = new Graphics();
  app.stage.addChild(backdrop, shadow, atmosphere, creature);
  const nodes = new Map<string, CrystalNode>();
  let propsNow: ArenaViewProps | null = null;
  let width = 1, height = 1, disposed = false;
  let drawingImage: HTMLImageElement | null = null;
  let inkSamples: InkSample[] = [];
  let drawingTexture: Texture | null = null;
  let rimTexture: Texture | null = null;
  let backgroundTexture: Texture | null = null;
  let frameCallback: (() => void) | null = null;
  const contextLost = (event: Event) => { event.preventDefault(); if (!disposed) onContextFailure(); };
  canvas.addEventListener('webglcontextlost', contextLost);

  function createNode(id: string): CrystalNode {
    const tether = new Graphics();
    const root = new Container();
    const body = new Graphics();
    const plate = new Graphics();
    const label = new Text({ text: '', style: { fontFamily: 'Manrope, sans-serif', fontSize: 11, fill: 0x100f15, fontWeight: '600', align: 'center' } });
    label.anchor.set(.5); label.position.set(19, 20);
    root.addChild(body, plate, label);
    root.eventMode = 'static'; root.cursor = 'pointer'; root.hitArea = new Circle(0, 0, 35);
    root.on('pointertap', () => propsNow?.onSelect(id));
    creature.addChild(tether, root);
    return { root, tether, body, plate, label, key: '' };
  }

  function decorate(node: CrystalNode, crystal: ArenaViewProps['crystals'][number], selected: boolean, index: number) {
    const color = crystalColor(crystal.state);
    const g = node.body;
    g.clear();
    if (selected) g.circle(0, 0, 43).fill({ color, alpha: .025 }).circle(0, 0, 35).fill({ color, alpha: .045 });
    g.circle(0, 0, selected ? 31 : 25).fill({ color, alpha: selected ? .11 : .045 }).stroke({ color, alpha: selected ? .85 : .3, width: selected ? 1.5 : 1 });
    g.circle(0, 0, 19).stroke({ color, alpha: .13, width: 5 });
    if (crystal.state === 'shattered') {
      for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3;
        const x = Math.cos(angle) * 13, y = Math.sin(angle) * 13;
        g.poly([x, y - 5, x + 4, y + 2, x - 3, y + 4]).fill({ color, alpha: .5 }).stroke({ color, alpha: .9, width: 1 });
      }
      g.moveTo(-5, 0).lineTo(-1, 4).lineTo(7, -5).stroke({ color: 0xede3cd, width: 1.5 });
    } else {
      g.poly([0, -22, 14, -5, 10, 13, 0, 23, -10, 13, -14, -5]).fill({ color, alpha: .65 }).stroke({ color: 0xede3cd, alpha: .85, width: 1 });
      g.poly([0, -22, -4, -3, 0, 23, -10, 13, -14, -5]).fill({ color, alpha: .5 });
      g.poly([0, -22, 14, -5, -4, -3]).fill({ color: 0xede3cd, alpha: .3 });
      g.moveTo(0, -22).lineTo(-4, -3).lineTo(0, 23).moveTo(-14, -5).lineTo(-4, -3).lineTo(14, -5).stroke({ color: 0xede3cd, alpha: .55, width: 1 });
      if (crystal.state !== 'stable') {
        g.moveTo(4, -15).lineTo(-3, -7).lineTo(3, 0).lineTo(-5, 10).stroke({ color: 0x251321, width: 2.4 });
        g.moveTo(3, 0).lineTo(10, 5).stroke({ color: 0x251321, width: 1.5 });
      }
    }
    node.plate.clear().circle(19, 20, 9).fill({ color: 0xede3cd, alpha: .96 }).stroke({ color: 0x100f15, width: 1.5 });
    node.label.text = `${index + 1}`;
    node.key = `${crystal.state}:${selected}:${crystal.label}:${index}`;
  }

  const tick = () => { if (!disposed && !document.hidden) frameCallback?.(); };
  app.ticker.add(tick);
  const visibility = () => { if (disposed) return; if (document.hidden) app.stop(); else app.start(); };
  document.addEventListener('visibilitychange', visibility);

  return {
    canvas,
    resize(w, h) {
      width = GAME_WIDTH; height = GAME_HEIGHT;
      app.renderer.resize(Math.max(w, 1), Math.max(h, 1));
      app.stage.scale.set(w / width, h / height);
      const painted = document.createElement('canvas');
      painted.width = Math.ceil(w * Math.min(window.devicePixelRatio || 1, 2));
      painted.height = Math.ceil(h * Math.min(window.devicePixelRatio || 1, 2));
      const context = painted.getContext('2d');
      if (context) paintChamber(context, painted.width, painted.height);
      const previous = backgroundTexture;
      backgroundTexture = Texture.from(painted); backdrop.texture = backgroundTexture;
      backdrop.width = width; backdrop.height = height;
      previous?.destroy(true);
    },
    render(props, image, frame) {
      if (disposed) return;
      propsNow = props;
      if (image !== drawingImage) {
        const previous = drawingTexture;
        drawingImage = image;
        inkSamples = image ? sampleInkImage(image) : [];
        drawingTexture = image ? Texture.from(image) : null;
        drawing.texture = drawingTexture ?? Texture.EMPTY;
        previous?.destroy(true);
        rimTexture?.destroy(true);
        const rimCanvas = image ? createInkRim(image) : null;
        rimTexture = rimCanvas ? Texture.from(rimCanvas) : null; rim.texture = rimTexture ?? Texture.EMPTY;
      }
      drawing.visible = image !== null;
      const layout = layoutArena(width, height, props.sprite);
      const pose = evaluatePose(props, frame);
      const timeline = evaluateTimeline(props, frame);
      drawing.width = layout.width; drawing.height = layout.height;
      rim.visible = image !== null && rimTexture !== null;
      rim.width = layout.width * (props.sprite.width + 32) / props.sprite.width;
      rim.height = layout.height * (props.sprite.height + 32) / props.sprite.height;
      rim.alpha = .62 * pose.alpha;
      creature.position.set(layout.x + pose.x, layout.y + pose.y);
      creature.scale.set(pose.scaleX * pose.endingScale, pose.scaleY * pose.endingScale);
      creature.rotation = pose.rotation; creature.alpha = props.scene === 'victory' || props.scene === 'awakening' ? 1 : pose.alpha;
      drawing.alpha = props.scene === 'victory' || props.scene === 'awakening' ? pose.alpha : 1;
      shadow.clear().ellipse(layout.x, height * .748, layout.width * .42 * pose.scaleX, Math.max(9, layout.width * .055) / pose.scaleY).fill({ color: 0x050509, alpha: .45 * pose.alpha });
      ink.clear();
      if (props.scene === 'victory' || props.scene === 'awakening') {
        const gathering = props.scene === 'awakening';
        const progress = gathering ? 1 - timeline.bodyReveal : timeline.inkDispersal;
        for (const [index, sample] of inkSamples.entries()) {
          const fragment = evaluateInkFragment(sample, index, progress, layout.width, layout.height, props.reducedMotion);
          const alpha = gathering ? Math.sin(timeline.bodyReveal * Math.PI) * sample.alpha : fragment.alpha;
          ink.rect(fragment.x, fragment.y, fragment.size, fragment.size).fill({ color: sample.color, alpha });
        }
      }
      const live = new Set(props.crystals.map(crystal => crystal.id));
      for (const [id, node] of nodes) {
        if (!live.has(id)) { node.tether.destroy(); node.root.destroy({ children: true }); nodes.delete(id); }
      }
      for (const [index, crystal] of props.crystals.entries()) {
        const anchor = props.sprite.anchors.find(item => item.conceptId === crystal.id);
        if (!anchor) continue;
        let node = nodes.get(crystal.id);
        if (!node) { node = createNode(crystal.id); nodes.set(crystal.id, node); }
        const selected = props.selectedId === crystal.id;
        const visualState = visualCrystalState(crystal, props, frame);
        if (node.key !== `${visualState}:${selected}:${crystal.label}:${index}`) decorate(node, { ...crystal, state: visualState }, selected, index);
        const x = (anchor.x - .5) * layout.width, y = (anchor.y - .5) * layout.height;
        const ax = (anchor.attachmentX - .5) * layout.width, ay = (anchor.attachmentY - .5) * layout.height;
        node.root.position.set(x, y);
        const crystalAlpha = timeline.crystalReveal(index) * (props.scene === 'victory' ? 1 - Math.min(1, frame.sceneAge / 1.5) : 1);
        node.root.alpha = crystalAlpha;
        const pulse = props.reducedMotion ? 1 : 1 + Math.sin(frame.time * 2 + index * 2) * .025;
        node.body.scale.set(pulse);
        const color = crystalColor(visualState);
        node.tether.clear();
        node.tether.alpha = crystalAlpha;
        if (selected) node.tether.circle(ax, ay, 20).fill({ color, alpha: .055 });
        node.tether.moveTo(ax, ay).quadraticCurveTo(ax, y, x, y).stroke({ color, alpha: selected ? .75 : .4, width: selected ? 2 : 1 });
        node.tether.circle(ax, ay, 8).fill({ color, alpha: .075 }).circle(ax, ay, 4).stroke({ color, alpha: .5, width: 1 });
        const recovering = props.event?.type === 'recovery' && props.event.conceptId === crystal.id && frame.eventAge < .36;
        if (visualState === 'corrupted' || visualState === 'unresolved' || recovering) {
          const growth = props.event?.conceptId === crystal.id ? timeline.corruption : 1;
          for (let i = 0; i < 3; i++) {
            const angle = Math.atan2(-ay, -ax) + (i - 1) * .55;
            const length = Math.min(layout.width, layout.height) * (visualState === 'unresolved' ? .36 : .22) * growth;
            const endX = ax + Math.cos(angle) * length, endY = ay + Math.sin(angle) * length;
            node.tether.moveTo(ax, ay).lineTo(ax + Math.cos(angle + .2) * length * .38, ay + Math.sin(angle + .2) * length * .38).lineTo(endX, endY).stroke({ color: 0xb85472, alpha: .55 * growth, width: 1.5 });
          }
        }
      }
      if (impacts.parent !== creature) creature.addChild(impacts);
      creature.setChildIndex(impacts, creature.children.length - 1);
      impacts.clear();
      const target = props.sprite.anchors.find(anchor => anchor.conceptId === props.event?.conceptId);
      if (target && props.event && timeline.burst) {
        const p = timeline.burstAge / timeline.burstDuration;
        const x = (target.x - .5) * layout.width, y = (target.y - .5) * layout.height;
        const corrupt = props.event.type === 'corrupt' || props.event.type === 'unresolved';
        const color = corrupt ? 0xb85472 : 0xe2c38c;
        impacts.circle(x, y, 23 + (props.reducedMotion ? 3 : p * 67 * timeline.burstStrength)).stroke({ color, alpha: (1 - p) * .8, width: 1.5 });
        if (!props.reducedMotion) {
          const count = corrupt ? 14 : props.event.type === 'recovery' ? 34 : 24;
          for (let i = 0; i < count; i++) {
            const angle = i * 2.39996;
            const radius = p * (40 + i % 6 * 11) * timeline.burstStrength;
            const px = x + Math.cos(angle) * radius, py = y + Math.sin(angle) * radius + p * p * 40;
            impacts.poly([px, py - 3, px + 3, py + 2, px - 2, py + 3]).fill({ color, alpha: 1 - p });
          }
          if (corrupt) {
            const reach = Math.sin(Math.min(1, Math.max(0, (frame.eventAge - .3) / 1.05)) * Math.PI);
            impacts.moveTo(x, y).quadraticCurveTo(x + 42 * reach, y + 48, x + 18 * reach, y + 105 * reach).stroke({ color, alpha: (1 - p) * .65, width: 2 });
          }
        }
      }
      atmosphere.clear();
      if (props.scene === 'victory') {
        const seal = evaluateReleaseSeal(frame.sceneAge, props.reducedMotion, props.victoryStyle);
        const unit = Math.min(layout.width, layout.height);
        for (let index = 0; index < 3; index++) atmosphere.circle(layout.x, layout.y, unit * (seal.radius + index * .06)).stroke({ color: index === 1 ? 0x8ac8bd : 0xe2c38c, alpha: seal.alpha / (index + 1), width: 1.3 });
        for (const fragment of seal.fragments) {
          const x = layout.x + fragment.x * unit, y = layout.y + fragment.y * unit;
          atmosphere.poly([x, y - 3, x + 2, y, x, y + 3, x - 2, y]).fill({ color: fragment.color, alpha: seal.alpha });
        }
      }
      if (timeline.energy > 0) {
        atmosphere.ellipse(layout.x, height * .748, layout.width * (.4 + timeline.energy * .14), Math.max(16, layout.width * .1)).stroke({ color: 0xbd9857, alpha: timeline.energy * .28, width: 1.3 });
      }
      if (!props.reducedMotion) {
        for (let i = 0; i < 32; i++) {
          const phase = (frame.time * (.018 + i % 3 * .007) + i * .173) % 1;
          atmosphere.circle(width * (.15 + ((i * .137) % .7)), height * (.88 - phase * .72), i % 5 === 0 ? 1.6 : .7).fill({ color: i % 3 === 0 ? 0x6dada5 : 0xbd9857, alpha: Math.sin(phase * Math.PI) * .42 });
        }
      }
    },
    start(onFrame) { frameCallback = onFrame; visibility(); },
    destroy() {
      if (disposed) return;
      disposed = true; canvas.removeEventListener('webglcontextlost', contextLost);
      document.removeEventListener('visibilitychange', visibility);
      app.ticker.remove(tick); app.stop();
      app.destroy(true, { children: true, texture: false, textureSource: false });
      drawingTexture?.destroy(true); rimTexture?.destroy(true); backgroundTexture?.destroy(true);
    },
  };
}
