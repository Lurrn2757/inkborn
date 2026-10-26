import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildTitanChamber } from '../creative/titanChamber.js';
import type { CreatureAsset } from '../drawing/types.js';
import type { ExamEvent } from './engine.js';
import type { Rig } from './storage.js';
import { deformInk, titanPose, TITAN_AWAKENING_SECONDS } from './titanMotion.js';

export type TitanSceneProps = { sprite: CreatureAsset; rig: Rig | null; event: ExamEvent | null; bossProgress: number; hp: number; passThreshold: number; reducedMotion: boolean; awakening?: boolean; onReady?: () => void; onComplete?: () => void };
const attackNames = { hit: 'ARMOR FRACTURE', slam: 'CRYSTAL SLAM', storm: 'SHARD STORM', beam: 'VOID BEAM', sweep: 'FRACTURE SWEEP', final: 'ECLIPSE JUDGMENT · YOUR SHIELD SHATTERS', finisher: 'PLAYER SPECIAL · SOVEREIGN SIGIL', victory: 'CRYSTAL DISSOLUTION' };

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
    let texture: THREE.Texture | null = null, drawingImage: HTMLImageElement | null = null;
    const fail = () => { if (!stopped) { stopped = true; cancelAnimationFrame(frame); setFallback(true); } };
    const lost = (e: Event) => { e.preventDefault(); fail(); };
    function dispose() {
      stopped = true; cancelAnimationFrame(frame); observer?.disconnect();
      if (drawingImage) { drawingImage.onload = null; drawingImage.onerror = null; }
      document.removeEventListener('visibilitychange', visibility);
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
      scene.traverse(object => { const mesh = object as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(m); if (object instanceof THREE.InstancedMesh) object.dispose(); });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); texture?.dispose();
      if (renderer) { renderer.domElement.removeEventListener('webglcontextlost', lost); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); }
    }
    let tick = () => {};
    function visibility() { cancelAnimationFrame(frame); if (!stopped && !document.hidden) frame = requestAnimationFrame(tick); }
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' });
      const gl = renderer;
      gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      gl.outputColorSpace = THREE.SRGBColorSpace;
      gl.domElement.style.cssText = 'display:block;width:100%;height:100%';
      gl.domElement.setAttribute('aria-hidden', 'true'); gl.domElement.dataset.renderer = 'three';
      gl.domElement.addEventListener('webglcontextlost', lost);
      gl.debug.onShaderError = fail;
      mount.append(gl.domElement);
      scene.background = new THREE.Color(0x090711); scene.fog = new THREE.Fog(0x090711, 12, 29);
      const camera = new THREE.PerspectiveCamera(42, 1, .1, 40);
      const { crystal, coreMat, halo, titan, head, arms, inkGeometry, base, inkMat, inkHeight, inkWidth, backing, soulMat, shell, shards, dummy, beam, wave, cracks, shield, dust, impactLight, ambient, light, playerSpears, spearTrails, playerSigil, strikeRing, eclipse, eclipseRim, eclipseOrbit, judgmentBeam, judgmentMat, shieldPieces } = buildTitanChamber(scene, props.sprite);
      let dirty = true;
      let paintedProps: TitanSceneProps | null = null;
      const image = new Image(); drawingImage = image; image.onload = () => { if (stopped) return; texture = new THREE.Texture(image); texture.colorSpace = THREE.SRGBColorSpace; texture.minFilter = THREE.LinearFilter; texture.generateMipmaps = false; texture.needsUpdate = true; dirty = true; inkMat.map = texture; inkMat.needsUpdate = true; gl.domElement.dataset.spriteStatus = 'ready'; latest.current.onReady?.(); }; image.onerror = fail; image.src = props.sprite.dataUrl;
      let width = 1, height = 1;
      observer = new ResizeObserver(entries => { const bounds = entries[0]?.contentRect; if (!bounds || stopped) return; width = Math.max(1, bounds.width); height = Math.max(1, bounds.height); gl.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); dirty = true; }); observer.observe(mount);
      const up = new THREE.Vector3(0, 1, 0), direction = new THREE.Vector3();
      const started = performance.now(); let eventId: string | null = null, eventStart = started, completed: string | null = null, awakeComplete = false;
      tick = () => {
        if (stopped || document.hidden) return;
        try {
          const p = latest.current, now = performance.now(), time = (now - started) / 1000;
          if ((p.event?.id ?? null) !== eventId) { eventId = p.event?.id ?? null; eventStart = now; }
          const age = (now - eventStart) / 1000, pose = titanPose(time, age, p.event, p.reducedMotion);
          if (p.reducedMotion && !dirty && paintedProps === p && pose.done && (!p.awakening || awakeComplete)) { frame = requestAnimationFrame(tick); return; }
          const critical = p.hp <= p.passThreshold + 15 && p.hp >= p.passThreshold;
          const roar = critical && !p.reducedMotion ? Math.sin(time * 1.8) * .025 : 0;
          titan.position.y = 2.9 + pose.breath + (p.awakening && !p.reducedMotion ? Math.max(0, 1 - time / 2.8) * -.7 : 0);
          titan.rotation.set(-pose.recoil + roar, 0, pose.tilt); titan.scale.setScalar(p.reducedMotion ? 1 : 1 - pose.dissolve * .6);
          head.rotation.z = pose.tilt * -2; head.position.y = 2.2 + pose.breath * 3;
          arms[0]!.rotation.set(pose.raise, 0, pose.raise * .7 + pose.sweep);
          arms[1]!.rotation.set(p.event?.type === 'final' ? pose.raise : -pose.raise * .3, 0, -pose.raise * .8 + pose.sweep);
          const position = inkGeometry.attributes.position!;
          for (let i = 0; i < position.count; i++) { const v = deformInk(base[i * 3]!, base[i * 3 + 1]!, inkWidth, inkHeight, time, pose, p.rig, p.reducedMotion); position.setXYZ(i, v.x, v.y, v.z); } position.needsUpdate = true;
          inkMat.opacity = 1 - pose.dissolve; backing.visible = pose.dissolve < .95; soulMat.opacity = (.79 + pose.charge * .07) * (1 - pose.dissolve);
          shell.forEach((s, i) => { const a = i * Math.PI / 6; const fracture = p.bossProgress * .45 + (p.reducedMotion ? 0 : pose.dissolve * (2 + i % 3)); s.position.set(Math.sin(a) * (1.85 + fracture), Math.cos(a) * (2 + fracture), -.25 + Math.sin(i * 3) * pose.dissolve); s.rotation.y = p.reducedMotion ? 0 : Math.sin(time * .4 + i) * .12; s.visible = pose.dissolve < .95; });
          crystal.emissiveIntensity = .6 + pose.charge * 2 + (critical ? .6 : 0); coreMat.color.set(critical ? 0xe88bae : p.bossProgress >= .95 ? 0xffe0a1 : 0xd6a9ff);
          const attack = p.event?.type, storm = attack === 'storm' && !pose.done && !p.reducedMotion, burst = (attack === 'hit' || attack === 'finisher' || attack === 'victory' || attack === 'final' || attack === 'slam') && !pose.done && !p.reducedMotion;
          for (let i = 0; i < 24; i++) { const a = i * 2.399, t = storm ? Math.max(0, (age - .75) / .7) : Math.max(0, age - 1.2); const r = burst ? t * 2 + .2 : 2.4; dummy.position.set(Math.sin(a) * r * (storm ? 1 - Math.min(1, t) * .6 : 1), storm ? 2.3 + Math.cos(a) * .8 : Math.max(.2, 2.5 + Math.cos(a) * r - t * t * 2), storm ? (t * 8 - .5) : Math.cos(i * 11) * r); dummy.scale.setScalar((storm || burst ? .075 + i % 3 * .035 : .035) * (burst ? Math.max(0, 1 - t / 2) : 1)); dummy.rotation.set(time + i, i * .8, time); dummy.updateMatrix(); shards.setMatrixAt(i, dummy.matrix); } shards.instanceMatrix.needsUpdate = true;
          shards.visible = !p.reducedMotion;
          beam.visible = attack === 'beam' && age > .75 && age < 1.55 && !p.reducedMotion; beam.scale.x = beam.scale.z = .6 + pose.charge;
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
          direction.set(0, -1.8, 5); judgmentBeam.position.set(0, 2.2, 3.1); judgmentBeam.quaternion.setFromUnitVectors(up, direction.normalize()); judgmentBeam.scale.set(.4 + pose.charge, 5.31, .4 + pose.charge); judgmentMat.opacity = .35 + pose.charge * .35;
          shieldPieces.visible = judgment && age >= 1.2 && age < 3.5 && !p.reducedMotion;
          const shatterAge = Math.max(0, age - 1.2);
          for (let i = 0; i < 18; i++) { const a = i * Math.PI / 9, r = 1.5 + shatterAge * (1 + i % 3 * .2); dummy.position.set(Math.cos(a) * r, Math.max(.1, 1.25 + Math.sin(a) * r * .7 - shatterAge * shatterAge * .6), 5.6 + shatterAge * (i % 2 ? .8 : -.3)); dummy.rotation.set(a + shatterAge, a, shatterAge * 2); dummy.scale.setScalar(Math.max(.015, .12 * (1 - shatterAge / 3))); dummy.updateMatrix(); shieldPieces.setMatrixAt(i, dummy.matrix); } shieldPieces.instanceMatrix.needsUpdate = true;
          light.intensity = 3 * (1 - pose.darkness * .8); ambient.intensity = 2 * (1 - pose.darkness * .75);
          impactLight.color.set(judgment ? 0xb969df : special ? 0xffd58b : 0xc5a0ff);
          halo.rotation.z = p.reducedMotion ? 0 : time * .025; dust.rotation.y = p.reducedMotion ? 0 : time * .015;
          impactLight.intensity = Math.min(22, pose.charge * 8 + pose.impact * (p.event?.intensity ?? 0) * 12);
          const shake = p.reducedMotion ? 0 : pose.impact * (p.event?.intensity ?? 0) * .045;
          camera.position.set(Math.sin(time * .17) * (p.reducedMotion ? 0 : .13) + Math.sin(age * 49) * shake, 4.3 + Math.cos(age * 43) * shake, width / height < .9 ? 14.5 : 11.8); camera.lookAt(0, 2.65, 0);
          gl.render(scene, camera); dirty = false; paintedProps = p;
          if (p.event && pose.done && completed !== p.event.id) { completed = p.event.id; p.onComplete?.(); }
          if (p.awakening && !awakeComplete && time >= (p.reducedMotion ? .4 : TITAN_AWAKENING_SECONDS)) { awakeComplete = true; p.onComplete?.(); }
          frame = requestAnimationFrame(tick);
        } catch { fail(); }
      };
      document.addEventListener('visibilitychange', visibility); frame = requestAnimationFrame(tick);
    } catch { fail(); }
    return dispose;
  }, [props.sprite.hash, props.sprite.dataUrl, props.sprite.height, props.sprite.width, attempt, fallback]);
  return <div className="titan-scene" style={{ position: 'relative', width: '100%', height: '100%', minHeight: 300 }}><div ref={host} style={{ position: 'absolute', inset: 0 }}/>{fallback && <div className="titan-fallback" style={{ position: 'relative', minHeight: 300, display: 'grid', placeItems: 'center', background: 'radial-gradient(ellipse,#4b335d,#100c18 70%)', padding: 20 }}><img src={props.sprite.dataUrl} data-sprite-hash={props.sprite.hash} alt="Your original ink creature; lightweight arena" style={{ maxWidth: '65%', maxHeight: 250, background: '#d9c9b4', borderRadius: '45%', padding: 12 }}/><p>Lightweight arena · all examination rules remain active.</p><button className="text-button" onClick={() => { setFallback(false); setAttempt(n => n + 1); }}>Retry 3D graphics</button></div>}<span className="titan-attack-label" aria-live="polite" style={{ position: 'absolute', left: 18, bottom: 16, color: '#d7c2a3', fontSize: 11, letterSpacing: 2, pointerEvents: 'none' }}>{props.awakening ? 'YOUR INK AWAKENS' : props.event ? attackNames[props.event.type] : props.hp <= props.passThreshold + 15 ? 'DESPERATION ROAR · THE RITUAL TREMBLES' : 'ANCIENT INK · LIVING CRYSTAL'}</span></div>;
}
