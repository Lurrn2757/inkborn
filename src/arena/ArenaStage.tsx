import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ArenaMatch } from '../../shared/arena/protocol';
import { BattleViewport } from '../rendering/BattleViewport';
import { GAME_ASPECT } from '../rendering/viewport';
import { audio, type AudioCue } from '../audio/AudioDirector';
import { ARENA_MOVE_COLORS, createArenaChamber, createArenaCreature, createArenaEffects, starterInk } from '../creative/arenaStage';
import { ARENA_MOVE_NAMES, arenaPerformance, arenaPlayerPose, clamp01, smooth01 } from './arenaMotion';

export interface ArenaStageProps { match: ArenaMatch; selfId: string; reducedMotion: boolean }
const cueForMove = { execution: 'siegeSweep', hellfall: 'siegeStorm', equation: 'siegeSigil', fracture: 'siegeBeam', mindstorm: 'siegeSlam' } satisfies Record<string, AudioCue>;

/** Projects authoritative snapshots. This module has no network or scoring mutation API. */
export function ArenaStage(props: ArenaStageProps) {
  const host = useRef<HTMLDivElement>(null), latest = useRef(props);
  const [fallback, setFallback] = useState(false), [attempt, setAttempt] = useState(0), [ready, setReady] = useState(false);
  latest.current = props;
  const identity = props.match.players.map(player => `${player.id}:${player.monster.hash}`).join('|');
  const fallbackImages = useMemo(() => props.match.players.map(player => player.monster.appearance.kind === 'drawing' ? player.monster.appearance.dataUrl : starterInk(player.monster.appearance.id)), [identity]);
  useEffect(() => {
    const event = props.match.event;
    if (!event) return;
    const cue: AudioCue = event.type === 'intro' ? 'awakening' : event.type === 'backlash' ? 'corrupt' : event.type === 'finish' ? event.actorId === props.selfId ? 'victory' : event.actorId ? 'siegeFailure' : 'retreat' : cueForMove[event.move];
    audio.play(cue, `arena:${props.match.id}:${event.id}`);
  }, [props.match.event?.id, props.match.id, props.selfId]);
  useEffect(() => {
    if (!host.current || fallback) return;
    const mount = host.current, scene = new THREE.Scene();
    let renderer: THREE.WebGLRenderer | null = null, raf = 0, stopped = false, observer: ResizeObserver | null = null;
    let creatures: ReturnType<typeof createArenaCreature>[] = [], effects: ReturnType<typeof createArenaEffects> | null = null;
    setReady(false);
    const fail = () => { if (!stopped) { stopped = true; cancelAnimationFrame(raf); setFallback(true); } };
    const contextLost = (event: Event) => { event.preventDefault(); fail(); };
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    const cleanup = () => {
      stopped = true; cancelAnimationFrame(raf); observer?.disconnect(); document.removeEventListener('visibilitychange', visibility);
      creatures.forEach(creature => creature.stop()); effects?.dispose();
      scene.traverse(object => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) geometries.add(mesh.geometry);
        if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) { materials.add(material); for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value); }
        if (object instanceof THREE.InstancedMesh) object.dispose();
      });
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); textures.forEach(texture => texture.dispose());
      if (renderer) { renderer.domElement.removeEventListener('webglcontextlost', contextLost); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); }
    };
    let tick = () => {};
    function visibility() { cancelAnimationFrame(raf); if (!stopped && !document.hidden) raf = requestAnimationFrame(tick); }
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
      const gl = renderer; gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25)); gl.outputColorSpace = THREE.SRGBColorSpace;
      gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.03;
      gl.domElement.style.cssText = 'width:100%;height:100%;display:block'; gl.domElement.setAttribute('aria-hidden', 'true');
      gl.domElement.dataset.renderer = 'three'; gl.domElement.dataset.logicalWidth = '1920'; gl.domElement.dataset.logicalHeight = '1080'; gl.domElement.dataset.monsterHashes = props.match.players.map(player => player.monster.hash).join('|');
      gl.domElement.addEventListener('webglcontextlost', contextLost); gl.debug.onShaderError = fail; mount.append(gl.domElement);
      scene.background = new THREE.Color(0x090711); scene.fog = new THREE.Fog(0x090711, 18, 38);
      const camera = new THREE.PerspectiveCamera(43, GAME_ASPECT, .1, 45);
      const chamber = createArenaChamber(scene);
      effects = createArenaEffects(scene); const fx = effects;
      creatures = props.match.players.map((player, index) => createArenaCreature(scene, player.monster, index));
      let loaded = 0;
      creatures.forEach(creature => creature.load(() => { if (!stopped && ++loaded === creatures.length) { setReady(true); gl.domElement.dataset.spriteStatus = 'ready'; } }, fail));
      observer = new ResizeObserver(([entry]) => { if (!stopped && entry) gl.setSize(Math.max(1, entry.contentRect.width), Math.max(1, entry.contentRect.height), false); }); observer.observe(mount);
      const born = performance.now(); let eventId: string | null = null, eventAt = born, pausedAt: number | null = null, pauseOffset = 0;
      let dirtyProps: ArenaStageProps | null = null, lastPaintAge = -1;
      tick = () => {
        if (stopped || document.hidden) return;
        try {
          const p = latest.current, match = p.match, now = performance.now();
          if ((match.event?.id ?? null) !== eventId) { eventId = match.event?.id ?? null; eventAt = now; pauseOffset = 0; pausedAt = null; }
          if (match.phase === 'paused' && pausedAt === null) pausedAt = now;
          if (match.phase !== 'paused' && pausedAt !== null) { pauseOffset += now - pausedAt; pausedAt = null; }
          const time = ((pausedAt ?? now) - born) / 1000, age = Math.max(0, ((pausedAt ?? now) - eventAt - pauseOffset) / 1000);
          const perf = arenaPerformance(match, age), still = p.reducedMotion || match.phase === 'paused';
          gl.domElement.dataset.move = match.event?.move ?? 'idle'; gl.domElement.dataset.phase = perf.phase; gl.domElement.dataset.eventId = match.event?.id ?? '';
          if (still && dirtyProps === p && (perf.done || match.phase === 'paused') && lastPaintAge >= 0) { raf = requestAnimationFrame(tick); return; }
          const event = match.event, actorIndex = match.players.findIndex(player => player.id === event?.actorId), actor = actorIndex < 0 ? 0 : actorIndex, target = actor === 0 ? 1 : 0;
          const doingAttack = Boolean(event && (event.type === 'round' || event.type === 'finish') && event.actorId && actorIndex >= 0 && !perf.done);
          const wrong = event?.type === 'backlash' && !perf.done;
          const intro = event?.type === 'intro' && !perf.done;
          const poses = creatures.map((creature, slot) => {
            const pose = arenaPlayerPose(match, slot, time, age, still), side = slot === 0 ? 1 : -1;
            const spawn = intro ? smooth01((age - slot * .2) / 1.6) : 1;
            creature.root.position.set((slot === 0 ? -2.7 : 2.7) + pose.x, 2.35 + pose.y + (still ? 0 : (1 - spawn) * -.8), 0);
            creature.root.rotation.set(pose.damaged && !still ? perf.impact * -.14 : 0, pose.yaw, pose.tilt);
            const collapse = still ? 1 : 1 - pose.dissolve * .65;
            creature.root.scale.set(pose.scaleX * collapse, pose.scaleY * collapse, collapse);
            creature.root.visible = spawn > .01 && pose.dissolve < .99;
            creature.inkMaterial.opacity = spawn * (1 - pose.dissolve); creature.rimMaterial.opacity = .8 * spawn * (1 - pose.dissolve);
            const position = creature.inkGeometry.attributes.position!, { width, height } = creature.extent;
            for (let i = 0; i < position.count; i++) {
              const x = creature.base[i * 3]!, y = creature.base[i * 3 + 1]!;
              const limbWeight = Math.pow(Math.abs(x) / Math.max(.1, width / 2), 3) * Math.max(0, 1 - Math.abs(y) / Math.max(.1, height));
              const bend = still ? 0 : Math.sin(time * 1.4 + y * 2 + slot) * .018 + (pose.cast ? side * pose.arm * limbWeight * .065 : 0);
              position.setXYZ(i, x + bend, y * (1 + (still ? 0 : Math.sin(time * 1.7 + slot) * .012)), still ? 0 : Math.sin(y * 1.8 + time) * .025);
            } position.needsUpdate = true;
            creature.arms.forEach(({ pivot, elbow }, index) => {
              const inner = slot === 0 ? index === 1 : index === 0;
              pivot.rotation.z = inner ? -side * pose.arm : (still ? 0 : Math.sin(time * 1.2 + index) * .04);
              pivot.rotation.x = inner ? pose.arm * .4 : 0; elbow.rotation.z = inner ? side * pose.elbow : -side * pose.elbow * .3;
              elbow.position.x = (index === 0 ? -1 : 1) * .48 + (inner && event?.move === 'fracture' && !still ? side * perf.release * perf.recover * .3 : 0);
            });
            creature.head.rotation.z = still ? 0 : Math.sin(time * .47 + slot * 2) * .035;
            creature.veinMaterial.opacity = pose.fracture * .8 + (pose.low && !still ? (Math.sin(time * 4) + 1) * .045 : 0);
            creature.armor.emissiveIntensity = .4 + pose.glow * 1.2; creature.facet.emissiveIntensity = .4 + pose.glow;
            creature.glow.opacity = pose.matchPoint ? .6 + (still ? 0 : Math.sin(time * 2) * .1) : .18 + pose.glow * .4;
            creature.aura.rotation.z = still ? 0 : side * time * .06; creature.aura.scale.setScalar(pose.matchPoint ? 1.07 : 1);
            for (let i = 0; i < 10; i++) {
              const angle = i * Math.PI / 5, shatter = still ? 0 : pose.dissolve * (1 + i % 3 * .5);
              creature.dummy.position.set(Math.sin(angle) * (1.08 + shatter), Math.cos(angle) * (1.32 + shatter) - shatter * shatter * .45, -.15 + Math.cos(i * 3) * shatter * .4);
              creature.dummy.rotation.set(i * .3, still ? i * .2 : time * .06 + i, -angle);
              const lost = Math.floor((1 - pose.condition) * match.target);
              const intact = i >= lost * 2 || pose.dissolve > 0;
              creature.dummy.scale.set(.26 * (intact ? 1 : .4), .43 * (intact ? 1 : .45), .25 * (intact ? 1 : .5)); creature.dummy.updateMatrix(); creature.shell.setMatrixAt(i, creature.dummy.matrix);
            } creature.shell.instanceMatrix.needsUpdate = true;
            const sigil = chamber.sigils[slot]!; sigil.portalMaterial.opacity = intro ? .4 + Math.sin(clamp01(age / 3.8) * Math.PI) * .4 : pose.matchPoint ? .36 : .16;
            sigil.portal.rotation.z = still ? 0 : side * time * .06; sigil.portalInner.rotation.z = still ? 0 : -side * time * .08;
            sigil.shadow.scale.set(1 + (1 - pose.scaleY) * .8, 1 + pose.x * .04, 1); sigil.shadowMaterial.uniforms.opacity!.value = .75 * (1 - pose.dissolve);
            return pose;
          });
          const actorX = creatures[actor]?.root.position.x ?? -2.7, targetX = creatures[target]?.root.position.x ?? 2.7;
          const attackColor = ARENA_MOVE_COLORS[event?.move ?? 'execution']; fx.material.color.setHex(wrong ? 0xb66a86 : attackColor); fx.trailsMaterial.color.copy(fx.material.color); fx.cage.material.color.copy(fx.material.color);
          const movingFX = doingAttack && !still;
          fx.blade.visible = movingFX && event?.move === 'execution' && age >= .7 && age < 1.45;
          if (fx.blade.visible) { fx.blade.position.set(actorX + (targetX - actorX) * perf.release * .62, 2.4, 1); fx.blade.rotation.z = (actor === 0 ? -1 : 1) * (.8 - perf.release * 1.8); fx.blade.scale.set(2.8, .34 + perf.charge * .15, .09); }
          fx.cage.visible = movingFX && event?.move === 'equation' && age >= .6 && age < 2.05;
          const projectile = smooth01((age - .7) / .45); fx.cage.position.set(actorX + (targetX - actorX) * projectile, 2.5, .9); fx.cage.rotation.set(age * 2, age * 3, age); fx.cage.scale.setScalar(1 + perf.impact * .5);
          fx.wave.visible = movingFX && event?.move === 'mindstorm' && age > .65 && age < 2.4;
          fx.wave.position.set(actorX, .29, 0); fx.wave.scale.setScalar(.15 + Math.max(0, age - .65) * 10.8); fx.material.opacity = doingAttack ? .65 + perf.impact * .25 : .6;
          fx.glyphGroup.visible = movingFX && (event?.move === 'equation' || event?.move === 'mindstorm');
          fx.glyphGroup.position.set(actorX, 2.5, .3);
          fx.glyphSprites.forEach((glyph, i) => { const a = i * Math.PI / 8 + age * (event?.move === 'mindstorm' ? 2 : -.8), r = 1.1 + perf.charge * .3; glyph.position.set(Math.cos(a) * r, Math.sin(a) * r, Math.sin(a * 2) * .25); glyph.material.opacity = .4 + perf.charge * .5; });
          const shatter = doingAttack && age >= 1.15, hellfall = movingFX && event?.move === 'hellfall';
          fx.shards.visible = !still && (hellfall || shatter || wrong); fx.trails.visible = hellfall && age >= .7 && age < 1.65;
          const trails = fx.trails.geometry.attributes.position!;
          for (let i = 0; i < 28; i++) {
            const a = i * 2.399, burstAge = Math.max(0, age - (wrong ? .2 : 1.15)), drop = clamp01((age - .7 - i % 5 * .025) / .45);
            const x = hellfall ? targetX + Math.sin(a) * (1 - drop * .45) : (wrong ? actorX : targetX) + Math.sin(a) * burstAge * (1.2 + i % 3 * .35);
            const y = hellfall ? 5.1 - drop * (3.2 + i % 3 * .12) : Math.max(.3, 2.5 + Math.cos(a) * burstAge * 1.3 - burstAge * burstAge * 1.5);
            const z = hellfall ? Math.cos(a) * .65 + .5 : .6 + Math.cos(a) * burstAge;
            fx.dummy.position.set(x, y, z); fx.dummy.rotation.set(age * 2 + i, i, age); const scale = hellfall ? .1 + i % 3 * .025 : Math.max(.015, (.1 + i % 3 * .025) * (1 - burstAge / 2)); fx.dummy.scale.set(scale, scale * (hellfall ? 2.8 : 1.5), scale); fx.dummy.updateMatrix(); fx.shards.setMatrixAt(i, fx.dummy.matrix);
            trails.setXYZ(i * 2, x, y, z); trails.setXYZ(i * 2 + 1, x, y + .75, z);
          } fx.shards.instanceMatrix.needsUpdate = true; trails.needsUpdate = true;
          fx.cracks.visible = movingFX && event?.move === 'fracture' && age > .7 && age < 2.5;
          if (fx.cracks.visible) { const positions = fx.cracks.geometry.attributes.position!; for (let i = 0; i < 30; i++) { const t = i / 30, next = (i + 1) / 30; positions.setXYZ(i * 2, actorX + (targetX - actorX) * t, 2.5 + Math.sin(t * 18 + age * 8) * .1 * Math.sin(t * Math.PI), .9); positions.setXYZ(i * 2 + 1, actorX + (targetX - actorX) * next, 2.5 + Math.sin(next * 18 + age * 8) * .1 * Math.sin(next * Math.PI), .9); } positions.needsUpdate = true; }
          const flash = doingAttack || wrong ? perf.impact : 0;
          chamber.flash.position.set(wrong ? actorX : targetX, 2.3, 2); chamber.flash.color.setHex(wrong ? 0xb66a86 : attackColor); chamber.flash.intensity = (still ? 7 : 25) * flash;
          const darkness = doingAttack && (event?.move === 'execution' || event?.type === 'finish') ? perf.charge * .65 : 0;
          chamber.ambient.intensity = 1.5 * (1 - darkness); chamber.key.intensity = 3 * (1 - darkness * .55); chamber.rimLight.intensity = 26 * (1 - darkness * .7);
          chamber.hazeMaterial.uniforms.time!.value = still ? 0 : time; chamber.hazeMaterial.uniforms.strength!.value = .075; chamber.runes.rotation.y = still ? 0 : time * .009;
          chamber.circleMaterial.opacity = .25 + flash * .25;
          const floatTime = still ? 0 : time;
          for (let i = 0; i < 18; i++) { const a = i * 2.399; fx.dummy.position.set(Math.cos(a) * 4.4, 1.7 + i % 4 * .7 + (still ? 0 : Math.sin(floatTime + i) * .1), Math.sin(a) * 2.6 - .5); fx.dummy.rotation.set(i, floatTime * .1, i); fx.dummy.scale.set(.065, .15, .065); fx.dummy.updateMatrix(); chamber.floaters.setMatrixAt(i, fx.dummy.matrix); } chamber.floaters.instanceMatrix.needsUpdate = true;
          const introDolly = intro && !still ? (1 - smooth01(age / 3.8)) * 2.5 : 0;
          const victor = match.phase === 'completed' && match.winnerId ? match.players.findIndex(player => player.id === match.winnerId) : -1;
          const victorFrame = victor >= 0 && age > 1.6 && !still ? smooth01((age - 1.6) / 2) * (victor === 0 ? -1 : 1) * .65 : 0;
          const shake = still ? 0 : flash * .065;
          camera.position.set((still ? 0 : Math.sin(time * .12) * .08) + Math.sin(age * 47) * shake + victorFrame, 4.4 + Math.cos(age * 41) * shake, 13.7 + introDolly - Math.abs(victorFrame) * .4);
          camera.lookAt(victorFrame, 2.05, 0); gl.render(scene, camera);
          gl.domElement.dataset.drawCalls = `${gl.info.render.calls}`; gl.domElement.dataset.triangles = `${gl.info.render.triangles}`;
          gl.domElement.dataset.conditions = poses.map(pose => pose.condition.toFixed(2)).join('|'); dirtyProps = p; lastPaintAge = age;
          raf = requestAnimationFrame(tick);
        } catch { fail(); }
      };
      document.addEventListener('visibilitychange', visibility); raf = requestAnimationFrame(tick);
    } catch { fail(); }
    return cleanup;
  }, [identity, attempt, fallback]);
  const event = props.match.event;
  const label = event?.type === 'intro' ? 'TWO MINDS · ONE RITUAL' : event?.type === 'backlash' ? 'A SPELL UNRAVELS · REGROUP' : event?.type === 'finish' ? props.match.winnerId ? 'THE FINAL RECKONING' : 'THE RITUAL RESTS' : event?.type === 'round' ? ARENA_MOVE_NAMES[event.move] : 'THE ARENA OF LIVING INK';
  return <div className="arena-stage" data-renderer={fallback ? 'lightweight' : 'three'} data-effects={props.reducedMotion ? 'reduced' : 'full'} data-sprite-status={fallback || ready ? 'ready' : 'loading'} style={{ width: '100%', height: '100%', minHeight: 0 }}><BattleViewport><div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
    <div ref={host} style={{ position: 'absolute', inset: 0 }}/>
    {fallback && <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: 'radial-gradient(ellipse at 50% 70%,#35273d,#100b17 75%)', padding: '8% 8% 12%' }}>
      {props.match.players.map((player, index) => <div key={player.id} style={{ position: 'relative', width: '36%', height: '90%', display: 'grid', placeItems: 'center' }}><div aria-hidden="true" style={{ position: 'absolute', width: '100%', height: '22%', bottom: '1%', border: '1px solid #ad905a88', borderRadius: '50%', boxShadow: '0 0 0 8px #c3a7680a' }}/><img src={fallbackImages[index]} data-monster-hash={player.monster.hash} alt={`${player.nickname}'s ${player.monster.appearance.kind === 'drawing' ? 'original drawn' : 'procedural starter'} monster: ${player.monster.appearance.name}`} style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: 'drop-shadow(0 0 1px #eddbb4) drop-shadow(0 0 9px #c2ae8c)' }}/></div>)}
      <span style={{ position: 'absolute', left: 12, top: 10, color: '#c1b08f', fontSize: 9 }}>Lightweight arena · live match rules remain active</span>
      <button className="text-button" style={{ position: 'absolute', right: 58, top: 7, fontSize: 10 }} onClick={() => { setFallback(false); setAttempt(value => value + 1); }}>Retry 3D graphics</button>
    </div>}
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 75px #07050b80' }}/>
    <div style={{ position: 'absolute', left: '4%', right: '4%', bottom: '5%', display: 'flex', justifyContent: 'space-between', gap: 15, pointerEvents: 'none' }}>{props.match.players.map((player, index) => <div key={player.id} data-stage-player={player.id} data-monster-hash={player.monster.hash} style={{ textAlign: index === 0 ? 'left' : 'right', maxWidth: '44%', textShadow: '0 2px 12px #000' }}><strong style={{ display: 'block', color: index === 0 ? '#d7c296' : '#d6c2d7', fontFamily: 'var(--serif,Georgia,serif)', fontWeight: 500, fontSize: 'clamp(11px,1.25vw,21px)', letterSpacing: '.04em', overflowWrap: 'anywhere' }}>{player.monster.appearance.name}</strong><span style={{ color: '#c0b19c', fontSize: 'clamp(8px,.75vw,11px)', letterSpacing: '.08em' }}>{player.nickname}{player.id === props.selfId ? ' · YOU' : ''} · {player.connected ? 'BOUND' : 'RECONNECTING'}</span></div>)}</div>
    <span className="arena-move-label" aria-live="polite" style={{ position: 'absolute', top: '5%', left: '20%', right: '20%', textAlign: 'center', color: '#d6c095', fontSize: 'clamp(7px,.85vw,11px)', letterSpacing: '.15em', pointerEvents: 'none', textShadow: '0 2px 12px #000' }}>{label}</span>
    {!fallback && <button className="text-button" aria-label="Lightweight graphics" title="Lightweight graphics" style={{ position: 'absolute', right: 56, top: 12, width: 30, height: 30, minHeight: 0, fontSize: 18, padding: 0, color: '#b8a98f', background: '#0e0b15b0', border: '1px solid #b2986155' }} onClick={() => setFallback(true)}>◇</button>}
  </div></BattleViewport></div>;
}
