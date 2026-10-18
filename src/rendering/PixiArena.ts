import { Application, Circle, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { paintChamber } from '../creative/chamber';
import { crystalColor, evaluatePose, layoutArena } from './motion';
import type { ArenaRenderer, ArenaViewProps } from './types';

interface CrystalNode {
  root: Container;
  tether: Graphics;
  body: Graphics;
  plate: Graphics;
  label: Text;
  status: Text;
  key: string;
}

/** Imperative Pixi adapter. No graphics callback can change battle outcomes. */
export async function createPixiArena(onContextFailure: () => void): Promise<ArenaRenderer> {
  const app = new Application();
  try {
    await app.init({
      width: 1, height: 1, preference: 'webgl', sharedTicker: false, autoStart: false,
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
  const drawing = new Sprite(Texture.EMPTY);
  drawing.anchor.set(.5);
  creature.addChild(drawing);
  const impacts = new Graphics();
  app.stage.addChild(backdrop, shadow, atmosphere, creature);
  const nodes = new Map<string, CrystalNode>();
  let propsNow: ArenaViewProps | null = null;
  let width = 1, height = 1, disposed = false;
  let drawingImage: HTMLImageElement | null = null;
  let drawingTexture: Texture | null = null;
  let backgroundTexture: Texture | null = null;
  let frameCallback: (() => void) | null = null;
  const contextLost = (event: Event) => { event.preventDefault(); if (!disposed) onContextFailure(); };
  canvas.addEventListener('webglcontextlost', contextLost);

  function createNode(id: string): CrystalNode {
    const tether = new Graphics();
    const root = new Container();
    const body = new Graphics();
    const plate = new Graphics();
    const label = new Text({ text: '', style: { fontFamily: 'Manrope, sans-serif', fontSize: 11, fill: 0xede3cd, align: 'center', wordWrap: true, wordWrapWidth: 142 } });
    const status = new Text({ text: '', style: { fontFamily: 'Manrope, sans-serif', fontSize: 8, fill: 0xbd9857, align: 'center', letterSpacing: 1.5 } });
    label.anchor.set(.5, 0); label.position.set(0, 36);
    status.anchor.set(.5, 0); status.position.set(0, 54);
    root.addChild(body, plate, label, status);
    root.eventMode = 'static'; root.cursor = 'pointer'; root.hitArea = new Circle(0, 0, 35);
    root.on('pointertap', () => propsNow?.onSelect(id));
    creature.addChild(tether, root);
    return { root, tether, body, plate, label, status, key: '' };
  }

  function decorate(node: CrystalNode, crystal: ArenaViewProps['crystals'][number], selected: boolean, index: number) {
    const color = crystalColor(crystal.state);
    const g = node.body;
    g.clear();
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
    node.plate.clear().roundRect(-80, 30, 160, 40, 3).fill({ color: 0x100f15, alpha: .94 }).stroke({ color, alpha: selected ? .65 : .28, width: 1 });
    node.label.text = `${index + 1} · ${crystal.label}`;
    // The permanent HTML alternatives carry the full, unrestricted concept label.
    node.label.style.fontSize = crystal.label.length > 23 ? 9 : 11;
    node.status.text = crystal.state.toUpperCase(); node.status.style.fill = color;
    node.status.y = Math.min(59, 36 + node.label.height + 3);
    node.key = `${crystal.state}:${selected}:${crystal.label}:${index}`;
  }

  const tick = () => { if (!disposed && !document.hidden) frameCallback?.(); };
  app.ticker.add(tick);

  return {
    canvas,
    resize(w, h) {
      if (backgroundTexture && width === w && height === h) return;
      width = Math.max(w, 1); height = Math.max(h, 1);
      app.renderer.resize(width, height);
      const painted = document.createElement('canvas');
      painted.width = Math.ceil(width * Math.min(window.devicePixelRatio || 1, 2));
      painted.height = Math.ceil(height * Math.min(window.devicePixelRatio || 1, 2));
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
        drawingTexture = image ? Texture.from(image) : null;
        drawing.texture = drawingTexture ?? Texture.EMPTY;
        previous?.destroy(true);
      }
      drawing.visible = image !== null;
      const layout = layoutArena(width, height, props.sprite);
      const pose = evaluatePose(props, frame);
      drawing.width = layout.width; drawing.height = layout.height;
      creature.position.set(layout.x + pose.x, layout.y + pose.y);
      creature.scale.set(pose.scaleX * pose.endingScale, pose.scaleY * pose.endingScale);
      creature.rotation = pose.rotation; creature.alpha = pose.alpha;
      shadow.clear().ellipse(layout.x, height * .748, layout.width * .42, Math.max(9, layout.width * .055)).fill({ color: 0x050509, alpha: .45 * pose.alpha });
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
        if (node.key !== `${crystal.state}:${selected}:${crystal.label}:${index}`) decorate(node, crystal, selected, index);
        const x = (anchor.x - .5) * layout.width, y = (anchor.y - .5) * layout.height;
        const ax = (anchor.attachmentX - .5) * layout.width, ay = (anchor.attachmentY - .5) * layout.height;
        node.root.position.set(x, y);
        const pulse = props.reducedMotion ? 1 : 1 + Math.sin(frame.time * 2 + index * 2) * .025;
        node.body.scale.set(pulse);
        const color = crystalColor(crystal.state);
        node.tether.clear();
        node.tether.moveTo(ax, ay).quadraticCurveTo(ax, y, x, y).stroke({ color, alpha: selected ? .75 : .4, width: selected ? 2 : 1 });
        node.tether.circle(ax, ay, 8).fill({ color, alpha: .075 }).circle(ax, ay, 4).stroke({ color, alpha: .5, width: 1 });
        if (crystal.state === 'corrupted' || crystal.state === 'unresolved') {
          for (let i = 0; i < 3; i++) {
            const angle = Math.atan2(-ay, -ax) + (i - 1) * .55;
            const length = Math.min(layout.width, layout.height) * .2;
            const endX = ax + Math.cos(angle) * length, endY = ay + Math.sin(angle) * length;
            node.tether.moveTo(ax, ay).lineTo(ax + Math.cos(angle + .2) * length * .38, ay + Math.sin(angle + .2) * length * .38).lineTo(endX, endY).stroke({ color, alpha: .45, width: 1.5 });
          }
        }
      }
      if (impacts.parent !== creature) creature.addChild(impacts);
      creature.setChildIndex(impacts, creature.children.length - 1);
      impacts.clear();
      const target = props.sprite.anchors.find(anchor => anchor.conceptId === props.event?.conceptId);
      if (target && props.event && frame.eventAge < 1.6) {
        const p = frame.eventAge / 1.6;
        const x = (target.x - .5) * layout.width, y = (target.y - .5) * layout.height;
        const corrupt = props.event.type === 'corrupt' || props.event.type === 'unresolved';
        const color = corrupt ? 0xb85472 : 0xe2c38c;
        impacts.circle(x, y, 23 + (props.reducedMotion ? 3 : p * 67)).stroke({ color, alpha: (1 - p) * .8, width: 1.5 });
        if (!props.reducedMotion) {
          const count = corrupt ? 14 : 24;
          for (let i = 0; i < count; i++) {
            const angle = i * 2.39996;
            const radius = p * (40 + i % 6 * 11);
            const px = x + Math.cos(angle) * radius, py = y + Math.sin(angle) * radius + p * p * 40;
            impacts.poly([px, py - 3, px + 3, py + 2, px - 2, py + 3]).fill({ color, alpha: 1 - p });
          }
        }
      }
      atmosphere.clear();
      if (!props.reducedMotion) {
        for (let i = 0; i < 32; i++) {
          const phase = (frame.time * (.018 + i % 3 * .007) + i * .173) % 1;
          atmosphere.circle(width * (.15 + ((i * .137) % .7)), height * (.88 - phase * .72), i % 5 === 0 ? 1.6 : .7).fill({ color: i % 3 === 0 ? 0x6dada5 : 0xbd9857, alpha: Math.sin(phase * Math.PI) * .42 });
        }
      }
    },
    start(onFrame) { frameCallback = onFrame; app.start(); },
    destroy() {
      if (disposed) return;
      disposed = true; canvas.removeEventListener('webglcontextlost', contextLost);
      app.ticker.remove(tick); app.stop();
      app.destroy(true, { children: true, texture: false, textureSource: false });
      drawingTexture?.destroy(true); backgroundTexture?.destroy(true);
    },
  };
}
