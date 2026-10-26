import { GAME_WIDTH, GAME_HEIGHT } from './viewport';
import { evaluateReleaseSeal, paintChamber } from '../creative/chamber';
import { crystalColor, evaluatePose, evaluateTimeline, layoutArena, visualCrystalState } from './motion';
import { createInkRim, evaluateInkFragment, sampleInkImage, type InkSample } from './ink';
import type { ArenaFrame, ArenaRenderer, ArenaViewProps } from './types';

const cssColor = (value: number) => `#${value.toString(16).padStart(6, '0')}`;

export function createCanvasArena(): ArenaRenderer {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas graphics are unavailable.');
  const background = document.createElement('canvas');
  const backgroundContext = background.getContext('2d');
  let width = 1, height = 1, resolution = 1, raf = 0, disposed = false;
  let latest: { props: ArenaViewProps; frame: ArenaFrame } | null = null;
  let sampledImage: HTMLImageElement | null = null;
  let inkSamples: InkSample[] = [];
  let rim: HTMLCanvasElement | null = null;
  let onFrame: (() => void) | null = null;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:manipulation';
  canvas.addEventListener('pointerup', select);
  const tick = () => { if (disposed || document.hidden) return; onFrame?.(); raf = requestAnimationFrame(tick); };
  const visibility = () => { cancelAnimationFrame(raf); if (!disposed && !document.hidden) raf = requestAnimationFrame(tick); };
  document.addEventListener('visibilitychange', visibility);

  function select(event: PointerEvent) {
    if (!latest) return;
    const { props, frame } = latest;
    const rect = canvas.getBoundingClientRect();
    const layout = layoutArena(width, height, props.sprite);
    const pose = evaluatePose(props, frame);
    const dx = (event.clientX - rect.left) * width / rect.width - layout.x - pose.x;
    const dy = (event.clientY - rect.top) * height / rect.height - layout.y - pose.y;
    const x = (dx * Math.cos(-pose.rotation) - dy * Math.sin(-pose.rotation)) / (pose.scaleX * pose.endingScale);
    const y = (dx * Math.sin(-pose.rotation) + dy * Math.cos(-pose.rotation)) / (pose.scaleY * pose.endingScale);
    let nearest = 48;
    let selected: string | null = null;
    for (const anchor of props.sprite.anchors) {
      const distance = Math.hypot(x - (anchor.x - .5) * layout.width, y - (anchor.y - .5) * layout.height);
      if (distance < nearest) { selected = anchor.conceptId; nearest = distance; }
    }
    if (selected) props.onSelect(selected);
  }

  return {
    canvas,
    resize(w, h) {
      width = GAME_WIDTH; height = GAME_HEIGHT;
      resolution = Math.min(window.devicePixelRatio || 1, 2) * Math.min(w / width, h / height);
      canvas.width = Math.round(width * resolution); canvas.height = Math.round(height * resolution);
      background.width = canvas.width; background.height = canvas.height;
      if (backgroundContext) paintChamber(backgroundContext, background.width, background.height);
    },
    render(props, image, frame) {
      latest = { props, frame };
      context.setTransform(resolution, 0, 0, resolution, 0, 0);
      context.clearRect(0, 0, width, height);
      context.drawImage(background, 0, 0, width, height);
      const layout = layoutArena(width, height, props.sprite);
      const pose = evaluatePose(props, frame);
      const timeline = evaluateTimeline(props, frame);
      if (sampledImage !== image) { sampledImage = image; inkSamples = image ? sampleInkImage(image) : []; rim = image ? createInkRim(image) : null; }
      context.save();
      context.fillStyle = '#09080d'; context.globalAlpha = .45 * pose.alpha;
      context.beginPath(); context.ellipse(layout.x, height * .748, layout.width * .42 * pose.scaleX, Math.max(9, layout.width * .055) / pose.scaleY, 0, 0, Math.PI * 2); context.fill();
      context.restore();
      if (timeline.energy > 0) {
        context.strokeStyle = '#bd9857'; context.globalAlpha = timeline.energy * .28;
        context.beginPath(); context.ellipse(layout.x, height * .748, layout.width * (.4 + timeline.energy * .14), Math.max(16, layout.width * .1), 0, 0, Math.PI * 2); context.stroke(); context.globalAlpha = 1;
      }
      // This is the exact player-created PNG, with its original colors and proportions.
      context.save();
      context.translate(layout.x + pose.x, layout.y + pose.y);
      context.rotate(pose.rotation);
      context.scale(pose.scaleX * pose.endingScale, pose.scaleY * pose.endingScale);
      context.globalAlpha = pose.alpha;
      if (image) {
        if (rim) {
          context.globalAlpha = .62 * pose.alpha;
          const rimWidth = layout.width * rim.width / image.naturalWidth, rimHeight = layout.height * rim.height / image.naturalHeight;
          context.drawImage(rim, -rimWidth / 2, -rimHeight / 2, rimWidth, rimHeight);
          context.globalAlpha = pose.alpha;
        }
        context.drawImage(image, -layout.width / 2, -layout.height / 2, layout.width, layout.height);
        context.shadowBlur = 0;
      }
      if (props.scene === 'victory' || props.scene === 'awakening') {
        const gathering = props.scene === 'awakening';
        const progress = gathering ? 1 - timeline.bodyReveal : timeline.inkDispersal;
        for (const [index, sample] of inkSamples.entries()) {
          const fragment = evaluateInkFragment(sample, index, progress, layout.width, layout.height, props.reducedMotion);
          context.globalAlpha = gathering ? Math.sin(timeline.bodyReveal * Math.PI) * sample.alpha : fragment.alpha;
          context.fillStyle = cssColor(sample.color);
          context.fillRect(fragment.x, fragment.y, fragment.size, fragment.size);
        }
      }
      for (const [index, crystal] of props.crystals.entries()) {
        const anchor = props.sprite.anchors.find(item => item.conceptId === crystal.id);
        if (!anchor) continue;
        const x = (anchor.x - .5) * layout.width, y = (anchor.y - .5) * layout.height;
        const ax = (anchor.attachmentX - .5) * layout.width, ay = (anchor.attachmentY - .5) * layout.height;
        const visualState = visualCrystalState(crystal, props, frame);
        const color = cssColor(crystalColor(visualState));
        const selected = props.selectedId === crystal.id;
        context.globalAlpha = timeline.crystalReveal(index) * (props.scene === 'victory' ? 1 - Math.min(1, frame.sceneAge / 1.5) : props.scene === 'awakening' ? 1 : pose.alpha);
        context.strokeStyle = `${color}88`; context.lineWidth = selected ? 2 : 1;
        if (selected) { context.fillStyle = `${color}0e`; context.beginPath(); context.arc(ax, ay, 20, 0, Math.PI * 2); context.fill(); }
        context.beginPath(); context.moveTo(ax, ay); context.quadraticCurveTo(ax, y, x, y); context.stroke();
        context.beginPath(); context.arc(ax, ay, 5, 0, Math.PI * 2); context.stroke();
        const recovering = props.event?.type === 'recovery' && props.event.conceptId === crystal.id && frame.eventAge < .36;
        if (visualState === 'corrupted' || visualState === 'unresolved' || recovering) {
          const growth = props.event?.conceptId === crystal.id ? timeline.corruption : 1;
          context.strokeStyle = '#b8547288'; context.lineWidth = 1.5;
          for (let n = 0; n < 3; n++) {
            const angle = Math.atan2(-ay, -ax) + (n - 1) * .55;
            const length = Math.min(layout.width, layout.height) * (visualState === 'unresolved' ? .36 : .22) * growth;
            context.beginPath(); context.moveTo(ax, ay); context.lineTo(ax + Math.cos(angle + .2) * length * .38, ay + Math.sin(angle + .2) * length * .38); context.lineTo(ax + Math.cos(angle) * length, ay + Math.sin(angle) * length); context.stroke();
          }
        }
        context.save(); context.translate(x, y);
        if (selected) { context.fillStyle = `${color}09`; context.beginPath(); context.arc(0, 0, 43, 0, Math.PI * 2); context.fill(); }
        const radius = selected ? 29 : 24;
        context.fillStyle = `${color}10`; context.strokeStyle = `${color}${selected ? 'cc' : '44'}`;
        context.beginPath(); context.arc(0, 0, radius, 0, Math.PI * 2); context.fill(); context.stroke();
        if (visualState === 'shattered') {
          context.strokeStyle = color; context.lineWidth = 1.6;
          for (let n = 0; n < 5; n++) {
            const angle = n * Math.PI * 2 / 5;
            const px = Math.cos(angle) * 13, py = Math.sin(angle) * 13;
            context.beginPath(); context.moveTo(px, py - 4); context.lineTo(px + 4, py + 2); context.lineTo(px - 3, py + 3); context.closePath(); context.stroke();
          }
        } else {
          context.shadowColor = color; context.shadowBlur = selected ? 20 : 10;
          context.beginPath(); context.moveTo(0, -21); context.lineTo(13, -5); context.lineTo(9, 13); context.lineTo(0, 22); context.lineTo(-9, 13); context.lineTo(-13, -5); context.closePath();
          context.fillStyle = `${color}aa`; context.fill(); context.strokeStyle = '#ede3cdcc'; context.stroke(); context.shadowBlur = 0;
          context.beginPath(); context.moveTo(0, -21); context.lineTo(-4, -3); context.lineTo(0, 22); context.moveTo(-13, -5); context.lineTo(-4, -3); context.lineTo(13, -5); context.strokeStyle = '#ede3cd88'; context.stroke();
          if (visualState !== 'stable') {
            context.strokeStyle = '#190f1c'; context.lineWidth = 2;
            context.beginPath(); context.moveTo(4, -13); context.lineTo(-3, -5); context.lineTo(3, 2); context.lineTo(-4, 11); context.stroke();
          }
        }
        context.fillStyle = '#ede3cd'; context.strokeStyle = '#100f15'; context.lineWidth = 1.5;
        context.beginPath(); context.arc(19, 20, 9, 0, Math.PI * 2); context.fill(); context.stroke();
        context.fillStyle = '#100f15'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.font = '600 11px Manrope, sans-serif';
        context.fillText(`${index + 1}`, 19, 20);
        context.restore();
      }
      const anchor = props.sprite.anchors.find(item => item.conceptId === props.event?.conceptId);
      if (anchor && props.event && timeline.burst) {
        const x = (anchor.x - .5) * layout.width, y = (anchor.y - .5) * layout.height;
        const fraction = timeline.burstAge / timeline.burstDuration;
        const corrupt = props.event.type === 'corrupt' || props.event.type === 'unresolved';
        context.globalAlpha = 1 - fraction;
        context.strokeStyle = corrupt ? '#b85472' : '#e2c38c';
        context.fillStyle = context.strokeStyle; context.lineWidth = 1.5;
        context.beginPath(); context.arc(x, y, 22 + (props.reducedMotion ? 3 : fraction * 65 * timeline.burstStrength), 0, Math.PI * 2); context.stroke();
        if (!props.reducedMotion) {
          const count = corrupt ? 14 : props.event.type === 'recovery' ? 34 : 24;
          for (let n = 0; n < count; n++) {
            const angle = n * 2.39996;
            const radius = fraction * (40 + n % 6 * 11) * timeline.burstStrength;
            context.fillRect(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius + fraction * fraction * 40, 3, 3);
          }
          if (corrupt) {
            const reach = Math.sin(Math.min(1, Math.max(0, (frame.eventAge - .3) / 1.05)) * Math.PI);
            context.beginPath(); context.moveTo(x, y); context.quadraticCurveTo(x + 42 * reach, y + 48, x + 18 * reach, y + 105 * reach); context.stroke();
          }
        }
      }
      context.restore();
      if (props.scene === 'victory') {
        const seal = evaluateReleaseSeal(frame.sceneAge, props.reducedMotion, props.victoryStyle);
        const unit = Math.min(layout.width, layout.height);
        context.globalAlpha = seal.alpha; context.lineWidth = 1.3;
        for (let index = 0; index < 3; index++) {
          context.strokeStyle = index === 1 ? '#8ac8bd' : '#e2c38c'; context.globalAlpha = seal.alpha / (index + 1);
          context.beginPath(); context.arc(layout.x, layout.y, unit * (seal.radius + index * .06), 0, Math.PI * 2); context.stroke();
        }
        context.globalAlpha = seal.alpha;
        for (const fragment of seal.fragments) { context.fillStyle = cssColor(fragment.color); context.fillRect(layout.x + fragment.x * unit, layout.y + fragment.y * unit, 2, 4); }
        context.globalAlpha = 1;
      }
      // Bounded analytic motes never accumulate or trigger game events.
      if (!props.reducedMotion) {
        for (let i = 0; i < 30; i++) {
          const phase = (frame.time * (.02 + i % 3 * .007) + i * .173) % 1;
          context.globalAlpha = Math.sin(phase * Math.PI) * .42;
          context.fillStyle = i % 3 === 0 ? '#6dada5' : '#bd9857';
          context.beginPath(); context.arc(width * (.15 + ((i * .137) % .7)), height * (.88 - phase * .72), i % 5 === 0 ? 1.8 : .8, 0, Math.PI * 2); context.fill();
        }
      }
      context.globalAlpha = 1;
    },
    start(callback) {
      onFrame = callback; visibility();
    },
    destroy() { disposed = true; cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', visibility); canvas.removeEventListener('pointerup', select); canvas.remove(); },
  };
}
