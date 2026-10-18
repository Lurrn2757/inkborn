import { paintChamber } from '../creative/chamber';
import { crystalColor, evaluatePose, layoutArena } from './motion';
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
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:manipulation';
  canvas.addEventListener('pointerup', select);

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
      width = Math.max(1, w); height = Math.max(1, h);
      resolution = Math.min(window.devicePixelRatio || 1, 2);
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
      context.save();
      context.fillStyle = '#09080d66';
      context.beginPath(); context.ellipse(layout.x, height * .748, layout.width * .42, Math.max(9, layout.width * .055), 0, 0, Math.PI * 2); context.fill();
      context.restore();
      // This is the exact player-created PNG, with its original colors and proportions.
      context.save();
      context.translate(layout.x + pose.x, layout.y + pose.y);
      context.rotate(pose.rotation);
      context.scale(pose.scaleX * pose.endingScale, pose.scaleY * pose.endingScale);
      context.globalAlpha = pose.alpha;
      if (image) {
        context.shadowColor = '#bd985750'; context.shadowBlur = 22;
        context.drawImage(image, -layout.width / 2, -layout.height / 2, layout.width, layout.height);
        context.shadowBlur = 0;
      }
      for (const [index, crystal] of props.crystals.entries()) {
        const anchor = props.sprite.anchors.find(item => item.conceptId === crystal.id);
        if (!anchor) continue;
        const x = (anchor.x - .5) * layout.width, y = (anchor.y - .5) * layout.height;
        const ax = (anchor.attachmentX - .5) * layout.width, ay = (anchor.attachmentY - .5) * layout.height;
        const color = cssColor(crystalColor(crystal.state));
        const selected = props.selectedId === crystal.id;
        context.strokeStyle = `${color}88`; context.lineWidth = selected ? 2 : 1;
        context.beginPath(); context.moveTo(ax, ay); context.quadraticCurveTo(ax, y, x, y); context.stroke();
        context.beginPath(); context.arc(ax, ay, 5, 0, Math.PI * 2); context.stroke();
        context.save(); context.translate(x, y);
        const radius = selected ? 29 : 24;
        context.fillStyle = `${color}10`; context.strokeStyle = `${color}${selected ? 'cc' : '44'}`;
        context.beginPath(); context.arc(0, 0, radius, 0, Math.PI * 2); context.fill(); context.stroke();
        if (crystal.state === 'shattered') {
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
          if (crystal.state !== 'stable') {
            context.strokeStyle = '#190f1c'; context.lineWidth = 2;
            context.beginPath(); context.moveTo(4, -13); context.lineTo(-3, -5); context.lineTo(3, 2); context.lineTo(-4, 11); context.stroke();
          }
        }
        context.fillStyle = '#100f15e8'; context.fillRect(-76, 30, 152, 37);
        context.strokeStyle = `${color}66`; context.strokeRect(-76, 30, 152, 37);
        context.fillStyle = '#ede3cd'; context.textAlign = 'center'; context.font = '11px Manrope, sans-serif';
        const label = `${index + 1} · ${crystal.label}`;
        context.fillText(label, 0, 45, 142);
        context.fillStyle = color; context.font = '9px Manrope, sans-serif';
        context.fillText(crystal.state.toUpperCase(), 0, 59, 142);
        context.restore();
      }
      context.restore();
      // Bounded analytic motes never accumulate or trigger game events.
      if (!props.reducedMotion) {
        for (let i = 0; i < 30; i++) {
          const phase = (frame.time * (.02 + i % 3 * .007) + i * .173) % 1;
          context.globalAlpha = Math.sin(phase * Math.PI) * .42;
          context.fillStyle = i % 3 === 0 ? '#6dada5' : '#bd9857';
          context.beginPath(); context.arc(width * (.15 + ((i * .137) % .7)), height * (.88 - phase * .72), i % 5 === 0 ? 1.8 : .8, 0, Math.PI * 2); context.fill();
        }
      }
      const anchor = props.sprite.anchors.find(item => item.conceptId === props.event?.conceptId);
      if (anchor && props.event && frame.eventAge < 1.4) {
        const x = layout.x + (anchor.x - .5) * layout.width, y = layout.y + (anchor.y - .5) * layout.height;
        const fraction = frame.eventAge / 1.4;
        context.globalAlpha = 1 - fraction;
        context.strokeStyle = props.event.type === 'corrupt' || props.event.type === 'unresolved' ? '#b85472' : '#e2c38c';
        context.lineWidth = 2;
        context.beginPath(); context.arc(x, y, 22 + (props.reducedMotion ? 3 : fraction * 65), 0, Math.PI * 2); context.stroke();
      }
      context.globalAlpha = 1;
    },
    start(onFrame) {
      const tick = () => { if (disposed) return; if (!document.hidden) onFrame(); raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
    },
    destroy() { disposed = true; cancelAnimationFrame(raf); canvas.removeEventListener('pointerup', select); canvas.remove(); },
  };
}
