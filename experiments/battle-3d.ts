import { createThreeArena } from '../src/rendering/ThreeArena';
import { createPixiArena } from '../src/rendering/PixiArena';
import { createCanvasArena } from '../src/rendering/CanvasArena';
import type { ArenaFrame, ArenaRenderer, ArenaViewProps } from '../src/rendering/types';

type Kind = 'three' | 'pixi' | 'canvas';
type Beat = 'battle' | 'awakening' | 'hit' | 'corrupt' | 'recovery' | 'victory' | 'retreat';
const host = document.querySelector<HTMLDivElement>('#arena')!;
const status = document.querySelector<HTMLParagraphElement>('#status')!;
const select = document.querySelector<HTMLSelectElement>('#renderer')!;
const beatSelect = document.querySelector<HTMLSelectElement>('#beat')!;
const reduced = document.querySelector<HTMLInputElement>('#reduced')!;

// Repeatable drawing fixture, made with ordinary canvas strokes. Never used as a game boss.
const drawing = document.createElement('canvas'); drawing.width = 600; drawing.height = 520;
const ctx = drawing.getContext('2d')!;
ctx.lineCap = ctx.lineJoin = 'round';
ctx.strokeStyle = '#8ac8bd'; ctx.lineWidth = 14;
ctx.beginPath(); ctx.moveTo(90, 400); ctx.bezierCurveTo(35, 260, 110, 180, 155, 180); ctx.lineTo(110, 30); ctx.lineTo(255, 140); ctx.quadraticCurveTo(300, 120, 350, 140); ctx.lineTo(480, 35); ctx.lineTo(445, 190); ctx.bezierCurveTo(565, 220, 560, 400, 500, 440); ctx.quadraticCurveTo(300, 510, 90, 400); ctx.stroke();
ctx.strokeStyle = '#e3bd7b'; ctx.lineWidth = 10;
for (const x of [225, 380]) { ctx.beginPath(); ctx.ellipse(x, 260, 27, 36, -.15, 0, Math.PI * 2); ctx.stroke(); }
ctx.beginPath(); ctx.moveTo(220, 365); ctx.quadraticCurveTo(310, 420, 405, 350); ctx.stroke();
ctx.strokeStyle = '#c77996'; ctx.lineWidth = 7;
ctx.beginPath(); ctx.moveTo(270, 315); ctx.lineTo(298, 285); ctx.lineTo(325, 320); ctx.stroke();
const image = new Image(); image.src = drawing.toDataURL('image/png'); await image.decode();
const base: ArenaViewProps = {
  sprite: { dataUrl: image.src, width: 600, height: 520, anchors: [
    { conceptId: 'a', x: .18, y: .31, attachmentX: .22, attachmentY: .36 },
    { conceptId: 'b', x: .82, y: .42, attachmentX: .79, attachmentY: .43 },
    { conceptId: 'c', x: .48, y: .86, attachmentX: .5, attachmentY: .85 },
  ] },
  crystals: ['a', 'b', 'c'].map(id => ({ id, label: id, state: 'stable' })),
  selectedId: 'b', event: null, scene: 'battle', reducedMotion: false, ritualIntegrity: 5, onSelect: () => {},
};
let adapter: ArenaRenderer | null = null, kind: Kind = 'three', beat: Beat = 'battle', started = performance.now(), frozen = false;
let pending = Promise.resolve();
function snapshot(next: Beat, motion = false): ArenaViewProps {
  const props = { ...base, crystals: base.crystals.map(crystal => ({ ...crystal })), reducedMotion: motion };
  if (next === 'hit' || next === 'corrupt' || next === 'recovery') {
    props.event = { id: `study-${next}`, type: next, conceptId: 'b' };
    props.crystals[1]!.state = next === 'corrupt' ? 'corrupted' : 'shattered';
    props.ritualIntegrity = next === 'hit' ? 5 : 4;
  } else props.scene = next;
  return props;
}
function draw(age = (performance.now() - started) / 1000) {
  const frame: ArenaFrame = { time: age, eventAge: age, sceneAge: age, selectionAge: 2 };
  adapter?.render(snapshot(beat, reduced.checked), image, frame);
}
async function mount(next: Kind) {
  adapter?.destroy(); adapter = null; host.replaceChildren(); kind = next; select.value = next;
  adapter = next === 'three' ? createThreeArena(() => { status.textContent = 'Three.js context lost'; }) : next === 'pixi' ? await createPixiArena(() => { status.textContent = 'PixiJS context lost'; }) : createCanvasArena();
  host.append(adapter.canvas); const bounds = host.getBoundingClientRect(); adapter.resize(bounds.width, bounds.height);
  started = performance.now(); draw(); adapter.start(() => { if (!frozen) draw(); });
  status.textContent = `${next} · ${Math.round(bounds.width)} × ${Math.round(bounds.height)} CSS pixels`;
}
select.addEventListener('change', () => { pending = pending.then(() => mount(select.value as Kind)); });
beatSelect.addEventListener('change', () => { beat = beatSelect.value as Beat; started = performance.now(); });
document.querySelector('#replay')!.addEventListener('click', () => { started = performance.now(); });
new ResizeObserver(() => { const bounds = host.getBoundingClientRect(); adapter?.resize(bounds.width, bounds.height); }).observe(host);
const percentile = (values: number[], ratio: number) => values.slice().sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * ratio))] ?? 0;
const study = {
  async show(next: Kind, nextBeat: Beat = 'battle', age = 3) {
    await pending; frozen = true; beat = nextBeat; beatSelect.value = nextBeat; await mount(next); draw(age);
    return next === 'three' && adapter && 'diagnostics' in adapter ? (adapter as ReturnType<typeof createThreeArena>).diagnostics() : {};
  },
  async benchmark(next: Kind, seconds = 4, motion = false) {
    await pending; frozen = true; reduced.checked = motion;
    const before = performance.now(); await mount(next); const mountMs = performance.now() - before;
    const renderer = adapter!;
    const cpu: number[] = [], intervals: number[] = [];
    // Warm all shader/material/effect paths before measuring, including actual ink dispersal.
    const beats: Beat[] = ['battle', 'awakening', 'hit', 'corrupt', 'recovery', 'victory', 'retreat'];
    for (const nextBeat of beats) renderer.render(snapshot(nextBeat, motion), image, { time: 1, eventAge: .65, sceneAge: 1, selectionAge: 2 });
    await new Promise<void>(resolve => { let count = 0; function warm() { if (++count >= 30) resolve(); else requestAnimationFrame(warm); } requestAnimationFrame(warm); });
    const start = performance.now(); let previous = 0;
    await new Promise<void>(resolve => {
      function tick(now: number) {
        if (previous) intervals.push(now - previous); previous = now;
        const age = (now - start) / 1000;
        const props = snapshot(beats[Math.floor(age / seconds * beats.length) % beats.length]!, motion);
        const beforeRender = performance.now(); renderer.render(props, image, { time: age, eventAge: age % 1.4, sceneAge: age % 3.2, selectionAge: 2 }); cpu.push(performance.now() - beforeRender);
        if (age >= seconds) resolve(); else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
    const gl = next === 'canvas' ? null : renderer.canvas.getContext('webgl2') ?? renderer.canvas.getContext('webgl');
    const debug = gl?.getExtension('WEBGL_debug_renderer_info');
    const result = {
      renderer: next, reducedMotion: motion, width: host.clientWidth, height: host.clientHeight, dpr: devicePixelRatio,
      drawingBuffer: [renderer.canvas.width, renderer.canvas.height], mountMs,
      frames: cpu.length, durationMs: performance.now() - start,
      fps: intervals.length / (intervals.reduce((sum, item) => sum + item, 0) / 1000),
      frameP50: percentile(intervals, .5), frameP95: percentile(intervals, .95), frameP99: percentile(intervals, .99),
      over33ms: intervals.filter(value => value > 33.5).length / intervals.length,
      cpuP50: percentile(cpu, .5), cpuP95: percentile(cpu, .95),
      gpu: debug ? gl!.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'Canvas 2D',
      diagnostics: next === 'three' ? (renderer as ReturnType<typeof createThreeArena>).diagnostics() : null,
    };
    status.textContent = JSON.stringify(result, null, 2); return result;
  },
  destroy() { adapter?.destroy(); adapter = null; host.replaceChildren(); },
  image: image.src,
};
declare global { interface Window { chamberStudy: typeof study } }
window.chamberStudy = study;
await mount(kind);
