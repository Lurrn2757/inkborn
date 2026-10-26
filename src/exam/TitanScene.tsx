import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { enrichBossChamber } from '../creative/bossChamber';
import { createBossEffects } from '../rendering/bossEffects';
import { createInkRim } from '../rendering/ink';
import { BattleViewport } from '../rendering/BattleViewport';
import { GAME_ASPECT } from '../rendering/viewport';
import { buildTitanChamber } from '../creative/titanChamber.js';
import type { CreatureAsset } from '../drawing/types.js';
import type { ExamEvent } from './engine.js';
import type { Rig } from './storage.js';
import { deformInk, titanPose, titanPresentationAge, TITAN_AWAKENING_SECONDS } from './titanMotion.js';

export type TitanSceneProps = { sprite: CreatureAsset; rig: Rig | null; event: ExamEvent | null; bossProgress: number; hp: number; passThreshold: number; reducedMotion: boolean; awakening?: boolean; onReady?: () => void; onComplete?: () => void };
const attackNames = { hit: 'ARMOR FRACTURE', slam: 'ABYSSAL SLAM', storm: 'SHARD TEMPEST', beam: 'FRACTURED BEAM', sweep: 'INKBORN’S WRATH', final: 'THE LAST RECKONING · ECLIPSE JUDGMENT', finisher: 'PLAYER SPECIAL · SOVEREIGN SIGIL', victory: 'CRYSTAL DISSOLUTION' };

/** One disposable renderer. React and the exam reducer retain all grading authority. */
export function TitanScene(props: TitanSceneProps) {
  const host = useRef<HTMLDivElement>(null), latest = useRef(props);
  const [fallback, setFallback] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => { latest.current = props; }, [props]);
  useEffect(() => {
    if (!fallback) return;
    latest.current.onReady?.();
    const timer = setTimeout(() => latest.current.onComplete?.(), latest.current.reducedMotion ? 180 : 700);
    return () => clearTimeout(timer);
  }, [fallback, props.event?.id, props.awakening]);
  useEffect(() => {
    if (!host.current || fallback) return;
    const mount = host.current;
    let renderer: THREE.WebGLRenderer | null = null, stopped = false, frame = 0, observer: ResizeObserver | null = null;
    const scene = new THREE.Scene();
    let rimTexture: THREE.Texture | null = null, texture: THREE.Texture | null = null, drawingImage: HTMLImageElement | null = null;
    const fail = () => { if (!stopped) { stopped = true; cancelAnimationFrame(frame); setFallback(true); } };
    const lost = (e: Event) => { e.preventDefault(); fail(); };
    function dispose() {
      stopped = true; cancelAnimationFrame(frame); observer?.disconnect();
      if (drawingImage) { drawingImage.onload = null; drawingImage.onerror = null; }
      document.removeEventListener('visibilitychange', visibility);
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
      scene.traverse(object => { const mesh = object as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) { materials.add(m); for (const value of Object.values(m)) if (value instanceof THREE.Texture) textures.add(value); } if (object instanceof THREE.InstancedMesh) object.dispose(); });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); if (texture && !textures.has(texture)) texture.dispose(); if (rimTexture && !textures.has(rimTexture)) rimTexture.dispose();
      if (renderer) { renderer.domElement.removeEventListener('webglcontextlost', lost); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); }
    }
    let tick = () => {};
    function visibility() { cancelAnimationFrame(frame); if (!stopped && !document.hidden) frame = requestAnimationFrame(tick); }
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' });
      const gl = renderer;
      gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      gl.outputColorSpace = THREE.SRGBColorSpace;
      gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05;
      gl.domElement.style.cssText = 'display:block;width:100%;height:100%';
      gl.domElement.setAttribute('aria-hidden', 'true'); gl.domElement.dataset.renderer = 'three'; gl.domElement.dataset.logicalWidth = '1920'; gl.domElement.dataset.logicalHeight = '1080';
      gl.domElement.addEventListener('webglcontextlost', lost);
      gl.debug.onShaderError = fail;
      mount.append(gl.domElement);
      scene.background = new THREE.Color(0x090711); scene.fog = new THREE.Fog(0x090711, 16, 38);
      const camera = new THREE.PerspectiveCamera(42, GAME_ASPECT, .1, 50);
      const { fractureMaterial, elbows, dissolveUniform, crystal, coreMat, halo, titan, head, arms, inkGeometry, base, inkMat, inkHeight, inkWidth, backing, soulMat, shell, shards, dummy, beam, wave, cracks, shield, dust, impactLight, ambient, light, playerSpears, spearTrails, playerSigil, strikeRing, eclipse, eclipseRim, eclipseOrbit, judgmentBeam, judgmentMat, shieldPieces } = buildTitanChamber(scene, props.sprite);
      const chamber = enrichBossChamber(scene);
      const effects = createBossEffects(scene, inkWidth, inkHeight);
      let dirty = true;
      let paintedProps: TitanSceneProps | null = null;
      const image = new Image(); drawingImage = image; image.onload = () => { if (stopped) return; texture = new THREE.Texture(image); texture.colorSpace = THREE.SRGBColorSpace; texture.minFilter = THREE.LinearFilter; texture.generateMipmaps = false; texture.needsUpdate = true;
        const edge = createInkRim(image); if (edge) { rimTexture = new THREE.CanvasTexture(edge); rimTexture.colorSpace = THREE.SRGBColorSpace; soulMat.map = rimTexture; soulMat.needsUpdate = true; }
        effects.load(image); dirty = true; inkMat.map = texture; inkMat.needsUpdate = true; gl.domElement.dataset.spriteStatus = 'ready'; latest.current.onReady?.(); }; image.onerror = fail; image.src = props.sprite.dataUrl;

      observer = new ResizeObserver(entries => { const bounds = entries[0]?.contentRect; if (!bounds || stopped) return; gl.setSize(Math.max(1, bounds.width), Math.max(1, bounds.height), false); dirty = true; }); observer.observe(mount);
      const shardMatrix = new THREE.Matrix4();
      const up = new THREE.Vector3(0, 1, 0), direction = new THREE.Vector3();
      const started = performance.now(); let eventId: string | null = null, eventStart = started, completed: string | null = null, awakeComplete = false;
      tick = () => {
        if (stopped || document.hidden) return;
        try {
          const p = latest.current, now = performance.now(), time = (now - started) / 1000;
          if ((p.event?.id ?? null) !== eventId) { eventId = p.event?.id ?? null; eventStart = now; }
          const rawAge = (now - eventStart) / 1000, age = titanPresentationAge(rawAge, p.event, p.reducedMotion);
          const motionTime = !p.reducedMotion && rawAge !== age && age === (p.event?.type === 'hit' ? .14 : 1.2) ? (eventStart - started) / 1000 + age : time;
          const pose = titanPose(motionTime, age, p.event, p.reducedMotion, 1 - p.bossProgress);
          gl.domElement.dataset.dissolve = pose.dissolve.toFixed(3); gl.domElement.dataset.attack = p.event?.type ?? 'idle'; gl.domElement.dataset.phase = pose.phase; gl.domElement.dataset.spriteHash = p.sprite.hash;
          if (p.reducedMotion && !dirty && paintedProps === p && pose.done && (!p.awakening || awakeComplete)) { frame = requestAnimationFrame(tick); return; }
          const finalStill = p.event?.type === 'final' && age < .75;
          const skinTime = finalStill ? (eventStart - started) / 1000 : motionTime;
          const critical = p.bossProgress >= .7 || p.hp <= p.passThreshold + 15 && p.hp >= p.passThreshold;
          const roar = critical && !p.reducedMotion && !finalStill ? Math.sin(time * 1.8) * .025 : 0;
          titan.position.set(0, 2.9 + pose.breath - (p.event?.type === 'slam' ? pose.lunge * 4 : 0) - (p.reducedMotion ? 0 : pose.dissolve * 2) + (p.awakening && !p.reducedMotion ? Math.max(0, 1 - time / 2.8) * -.7 : 0), pose.lunge);
          titan.rotation.set(-pose.recoil + roar, pose.yaw, pose.tilt);
          const bodyScale = p.reducedMotion ? 1 : 1 - pose.dissolve * .4;
          titan.scale.set(bodyScale * (1 + pose.compression * .4 + pose.lunge * .06), bodyScale * (1 - pose.compression), bodyScale);
          titan.visible = pose.dissolve < 1;
          fractureMaterial.opacity = Math.min(.85, p.bossProgress * .65 + pose.fracture * .6 + (critical && !p.reducedMotion ? (Math.sin(time * 5) + 1) * .1 : 0));
          head.rotation.y = pose.headTurn; head.rotation.z = pose.tilt * -2; head.position.y = 2.2 + pose.breath * 3;
          const idleArm = p.reducedMotion || finalStill ? 0 : Math.sin(motionTime * 1.2) * .055;
          arms[0]!.rotation.set(pose.raise + idleArm, p.reducedMotion ? 0 : -pose.charge * .2, (p.event?.type === 'slam' ? -pose.raise * .35 : pose.raise * .7) + pose.sweep);
          arms[1]!.rotation.set(p.event?.type === 'final' ? pose.raise : -pose.raise * .3 - idleArm, p.reducedMotion ? 0 : pose.charge * .2, -pose.raise * .8 + pose.sweep);
          elbows.forEach((elbow, i) => { elbow.position.y = -1.2 - (p.event?.type === 'slam' && !p.reducedMotion ? pose.impact * .45 : 0); elbow.rotation.x = p.reducedMotion || finalStill ? 0 : pose.charge * -.6 + pose.impact * .3; elbow.rotation.z = p.reducedMotion || finalStill ? 0 : (i ? -1 : 1) * (idleArm * 1.8 + pose.sweep * .16); });
          const position = inkGeometry.attributes.position!;
          for (let i = 0; i < position.count; i++) { const v = deformInk(base[i * 3]!, base[i * 3 + 1]!, inkWidth, inkHeight, skinTime, pose, p.rig, p.reducedMotion); position.setXYZ(i, v.x, v.y, v.z); } position.needsUpdate = true;
          inkMat.opacity = pose.dissolve >= 1 ? 0 : p.reducedMotion ? 1 - pose.dissolve : 1; dissolveUniform.value = p.reducedMotion ? 0 : pose.dissolve; backing.visible = !!rimTexture && pose.dissolve < .95; soulMat.opacity = (.7 + pose.charge * .2) * (1 - pose.dissolve);
          shell.forEach((s, i) => { const a = i * Math.PI / 6; const fracture = p.bossProgress * .32 + (p.reducedMotion ? 0 : pose.fracture * .12) + (p.reducedMotion ? 0 : pose.dissolve * (2 + i % 3)); s.position.set(Math.sin(a) * (1.85 + fracture), Math.cos(a) * (2 + fracture) - (p.reducedMotion ? 0 : pose.dissolve * pose.dissolve * (3 + i % 3)), -.25 + (p.reducedMotion ? 0 : Math.sin(i * 3) * pose.dissolve)); s.rotation.y = p.reducedMotion || finalStill ? 0 : Math.sin(time * .4 + i) * .12; s.visible = pose.dissolve < .95; });
          crystal.emissiveIntensity = .35 + pose.charge * 1.7 + (critical ? .2 + (p.reducedMotion ? 0 : Math.sin(time * 7) * .12) : 0); coreMat.color.set(critical ? 0xe88bae : p.bossProgress >= .95 ? 0xffe0a1 : 0xb7a7bc);
          const attack = p.event?.type, storm = attack === 'storm' && !pose.done && !p.reducedMotion, burst = (attack === 'hit' || attack === 'finisher' || attack === 'victory' || attack === 'final' || attack === 'slam' || attack === 'beam' || attack === 'sweep') && !pose.done && !p.reducedMotion;
          for (let i = 0; i < 24; i++) { const a = i * 2.399 + (storm ? Math.min(age, .75) ** 2 * 3 : 0), t = storm ? Math.max(0, (age - .75) / .45) ** 2 : Math.max(0, age - (attack === 'hit' ? .14 : 1.2)); const r = burst ? t * 2 + .2 : 2.4; dummy.position.set(Math.sin(a) * r * (storm ? 1 - Math.min(1, t) * .85 : 1), storm ? 2.3 + Math.cos(a) * .8 * (1 - Math.min(1, t) * .9) - Math.min(1, t) * 1.5 : Math.max(.2, 2.5 + Math.cos(a) * r - t * t * 2), storm ? (t * 5.3 - .5) : Math.cos(i * 11) * r); dummy.scale.setScalar((storm || burst ? .075 + i % 3 * .035 : .035) * (burst ? Math.max(0, 1 - t / 2) : 1)); dummy.rotation.set(time + i, i * .8, time); dummy.updateMatrix(); shards.setMatrixAt(i, dummy.matrix); } shards.instanceMatrix.needsUpdate = true;
          const trail = effects.trails.geometry.attributes.position!;
          for (let i = 0; i < 24; i++) { shards.getMatrixAt(i, shardMatrix); const e = shardMatrix.elements; trail.setXYZ(i * 2, e[12]!, e[13]!, e[14]!); trail.setXYZ(i * 2 + 1, e[12]! * 1.13, e[13]! + .12, e[14]! - .85); } trail.needsUpdate = true;
          effects.update(pose, p.event, age, motionTime, p.reducedMotion);
          shards.visible = !p.reducedMotion;
          beam.visible = attack === 'beam' && age > .9 && age < 1.65 && !p.reducedMotion;
          beam.position.set(0, 1.9, 2.8); direction.set(0, -2.2, 4); beam.quaternion.setFromUnitVectors(up, direction.normalize()); beam.scale.set(.6 + pose.charge, Math.hypot(2.2, 4) / 7, .6 + pose.charge);
          wave.visible = (attack === 'slam' || attack === 'sweep' || attack === 'final') && age > 1.15 && age < 2.5 && !p.reducedMotion; wave.scale.setScalar(1 + Math.max(0, age - 1.15) * 5);
          cracks.visible = (attack === 'slam' || attack === 'final') && age >= 1.2 || p.bossProgress >= .6;
          shield.visible = !(attack === 'final' && age > 1.4); shield.rotation.z = p.reducedMotion ? 0 : pose.impact * .2;
          const special = attack === 'finisher' && !pose.done;
          const judgment = attack === 'final';
          // Player magic flies from the near ritual shield toward the titan, never toward the student.
          playerSpears.visible = special && !p.reducedMotion && age > .65 && age < 1.75;
          spearTrails.visible = playerSpears.visible;
          playerSigil.visible = special;
          playerSigil.scale.setScalar(p.reducedMotion ? 1 : .55 + pose.special * .6);
          playerSigil.rotation.z = p.reducedMotion ? 0 : -age * .65;
          const trails = spearTrails.geometry.attributes.position!;
          for (let i = 0; i < 9; i++) {
            const angle = i * Math.PI * 2 / 9, travel = Math.max(0, Math.min(1, (age - .65 - i * .035) / .55));
            const radius = 1.55 * (1 - travel * .65), x = Math.cos(angle) * radius, y = 2.65 + Math.sin(angle) * radius;
            const z = 5.4 - travel * 4.5;
            dummy.position.set(x, y, z); dummy.rotation.set(0, 0, angle); dummy.scale.set(.105, .105, 1.1); dummy.updateMatrix(); playerSpears.setMatrixAt(i, dummy.matrix);
            trails.setXYZ(i * 2, x, y, z + 1.25); trails.setXYZ(i * 2 + 1, x, y, z + 2.6);
          }
          playerSpears.instanceMatrix.needsUpdate = true; trails.needsUpdate = true;
          strikeRing.visible = special && age >= 1.2 && age < 2.35 && !p.reducedMotion; strikeRing.scale.setScalar(.3 + Math.max(0, age - 1.2) * 3.1);
          // Eclipse Judgment: a physical dark portal opens behind the recognizable ink.
          eclipse.visible = judgment; eclipse.scale.setScalar(p.reducedMotion ? 1 : .35 + Math.min(1, age / 1.1) * .9);
          eclipseRim.rotation.z = p.reducedMotion ? 0 : age * -.8; eclipseOrbit.rotation.z = p.reducedMotion ? 0 : age * .5;
          judgmentBeam.visible = judgment && age >= .85 && age < 2 && !p.reducedMotion;
          direction.set(0, -2.2, 4.2); judgmentBeam.position.set(0, 1.9, 2.7); judgmentBeam.quaternion.setFromUnitVectors(up, direction.normalize()); judgmentBeam.scale.set(.4 + pose.charge, Math.hypot(2.2, 4.2), .4 + pose.charge); judgmentMat.opacity = .35 + pose.charge * .35;
          shieldPieces.visible = judgment && age >= 1.2 && age < 3.5 && !p.reducedMotion;
          const shatterAge = Math.max(0, age - 1.2);
          for (let i = 0; i < 18; i++) { const a = i * Math.PI / 9, r = 1.5 + shatterAge * (1 + i % 3 * .2); dummy.position.set(Math.cos(a) * r, Math.max(.1, .8 + Math.sin(a) * r * .45 - shatterAge * shatterAge * .6), 4.8 + shatterAge * (i % 2 ? .8 : -.3)); dummy.rotation.set(a + shatterAge, a, shatterAge * 2); dummy.scale.setScalar(Math.max(.015, .12 * (1 - shatterAge / 3))); dummy.updateMatrix(); shieldPieces.setMatrixAt(i, dummy.matrix); } shieldPieces.instanceMatrix.needsUpdate = true;
          light.intensity = 3.2 * (1 - pose.darkness * .8); ambient.intensity = 1.35 * (1 - pose.darkness * .75);
          chamber.rimLight.intensity = 26 * (1 - pose.darkness * .85); chamber.warmLight.intensity = 17 * (1 - pose.darkness * .8);
          impactLight.color.set(judgment ? 0xb969df : special ? 0xffd58b : 0xc5a0ff);
          halo.rotation.z = p.reducedMotion ? 0 : time * .025; dust.rotation.y = p.reducedMotion ? 0 : time * .015;
          impactLight.position.set(0, attack === 'hit' || special ? 3 : 1.5, attack === 'hit' || special ? 1.5 : 4.8);
          impactLight.intensity = Math.min(22, pose.charge * 8 + pose.impact * (p.event?.intensity ?? 0) * 12);
          const shake = p.reducedMotion ? 0 : pose.impact * (p.event?.intensity ?? 0) * .075;
          chamber.runes.rotation.y = p.reducedMotion || finalStill ? 0 : motionTime * .012;
          chamber.runeMaterial.opacity = .5 + pose.charge * .4 + pose.impact * .1;
          chamber.circleMaterial.opacity = .27 + pose.impact * .55 + pose.dissolve * .25;
          chamber.hazeMaterial.uniforms.time!.value = p.reducedMotion ? 0 : motionTime;
          chamber.hazeMaterial.uniforms.strength!.value = .12 * (1 - pose.darkness * .7);
          chamber.contact.scale.set(1 + pose.breath * 2 + pose.compression, 1 + pose.lunge * .1, 1);
          chamber.contactMaterial.uniforms.opacity!.value = (1 - pose.dissolve) * (.65 + pose.compression);
          for (let i = 0; i < 18; i++) { const a = i * 2.399, floatTime = p.reducedMotion ? 0 : motionTime; dummy.position.set(Math.cos(a) * (4.3 + i % 3 * .3), 1.8 + i % 4 * .8 + Math.sin(floatTime * .7 + i) * (p.reducedMotion ? 0 : .18), Math.sin(a) * 3 - 1); dummy.rotation.set(i * .4, floatTime * .16, i); dummy.scale.set(.08, .19 + i % 3 * .07, .1); dummy.updateMatrix(); chamber.floaters.setMatrixAt(i, dummy.matrix); } chamber.floaters.instanceMatrix.needsUpdate = true;
          camera.position.set(Math.sin(motionTime * .17) * (p.reducedMotion ? 0 : .13) + Math.sin(age * 49) * shake, 4.3 + Math.cos(age * 43) * shake, 12.8 - (p.reducedMotion ? 0 : pose.charge * .25)); camera.lookAt(0, 2.65, 0);
          gl.render(scene, camera); dirty = false; paintedProps = p;
          gl.domElement.dataset.drawCalls = `${gl.info.render.calls}`; gl.domElement.dataset.triangles = `${gl.info.render.triangles}`;
          if (p.event && pose.done && completed !== p.event.id) { completed = p.event.id; p.onComplete?.(); }
          if (p.awakening && !awakeComplete && time >= (p.reducedMotion ? .4 : TITAN_AWAKENING_SECONDS)) { awakeComplete = true; p.onComplete?.(); }
          frame = requestAnimationFrame(tick);
        } catch { fail(); }
      };
      document.addEventListener('visibilitychange', visibility); frame = requestAnimationFrame(tick);
    } catch { fail(); }
    return dispose;
  }, [props.sprite.hash, props.sprite.dataUrl, props.sprite.height, props.sprite.width, attempt, fallback]);
  return <BattleViewport><div className="titan-scene"><div ref={host} style={{ position: 'absolute', inset: 0 }}/>{fallback && <div className="titan-fallback" data-impact={Boolean(props.event)}><div className="fallback-seal"/><img src={props.sprite.dataUrl} data-sprite-hash={props.sprite.hash} alt="Your original ink creature; lightweight arena"/><p>Lightweight arena · all examination rules remain active.</p><button className="text-button" onClick={() => { setFallback(false); setAttempt(n => n + 1); }}>Retry 3D graphics</button></div>}<span className="titan-attack-label" aria-live="polite"><small>{props.awakening ? 'THE RITUAL / AWAKENING' : props.event ? 'ANTICIPATION · RELEASE · IMPACT · RECOVERY' : 'BOUND FROM YOUR OWN INK'}</small><strong>{props.awakening ? 'YOUR INK AWAKENS' : props.event ? attackNames[props.event.type] : props.bossProgress >= .7 ? 'THE CORE GROWS UNSTABLE' : 'ANCIENT INK · LIVING CRYSTAL'}</strong></span>{!fallback && <button className="titan-graphics-toggle" onClick={() => setFallback(true)}>Lightweight graphics</button>}</div></BattleViewport>;
}
