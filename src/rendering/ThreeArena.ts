import { GAME_WIDTH, GAME_HEIGHT, GAME_ASPECT } from './viewport';
import * as THREE from 'three';
import { buildThreeChamber } from '../creative/threeChamber';
import { evaluateReleaseSeal } from '../creative/chamber';
import { createInkRim, evaluateInkFragment, sampleInkImage, type InkSample } from './ink';
import { crystalColor, evaluatePose, evaluateTimeline, layoutArena, visualCrystalState } from './motion';
import type { ArenaRenderer, ArenaViewProps } from './types';

function glowTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, '#ffffffbb'); gradient.addColorStop(.25, '#ffffff44'); gradient.addColorStop(1, '#ffffff00');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}
function badgeTexture(index: number) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ede3cd'; ctx.strokeStyle = '#100f15'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(32, 32, 27, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#100f15'; ctx.font = '600 33px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`${index + 1}`, 32, 33);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

/** Optional 2.5D adapter. Projects the same immutable battle snapshots as Pixi. */
export function createThreeArena(onFailure: () => void): ArenaRenderer & { diagnostics: () => { drawCalls: number; triangles: number; textures: number; geometries: number; pixelRatio: number } } {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.debug.onShaderError = () => onFailure();
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:manipulation'; canvas.setAttribute('aria-hidden', 'true');
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0e1019); scene.fog = new THREE.FogExp2(0x10131d, .047);
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 70);
  let chamber: ReturnType<typeof buildThreeChamber>;
  try { chamber = buildThreeChamber(scene); } catch (error) { disposeScene(); renderer.dispose(); renderer.forceContextLoss(); throw error; }
  const creature = new THREE.Group(); scene.add(creature);
  const bodyMaterial = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false });
  const body = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), bodyMaterial); body.renderOrder = 10; creature.add(body);
  const rimMaterial = new THREE.SpriteMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false });
  const rim = new THREE.Sprite(rimMaterial); rim.position.z = -.5; rim.renderOrder = 9; creature.add(rim);
  const glow = glowTexture();
  const crystalGeometry = new THREE.OctahedronGeometry(1, 0);
  const shardGeometry = new THREE.TetrahedronGeometry(1, 0);
  const ringGeometry = new THREE.TorusGeometry(1, .018, 4, 48);
  type Node = {
    root: THREE.Group; crystal: THREE.Mesh<THREE.OctahedronGeometry, THREE.MeshStandardMaterial>;
    halo: THREE.Sprite; ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>; badge: THREE.Sprite;
    tether: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>; cracks: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
    shards: THREE.InstancedMesh<THREE.TetrahedronGeometry, THREE.MeshStandardMaterial>;
  };
  const nodes = new Map<string, Node>();
  const dummy = new THREE.Object3D();
  const burstMaterial = new THREE.MeshBasicMaterial({ color: 0xe2c38c, transparent: true, depthWrite: false, toneMapped: false });
  const burst = new THREE.InstancedMesh(shardGeometry, burstMaterial, 36); burst.frustumCulled = false; burst.renderOrder = 15; creature.add(burst);
  const burstRing = new THREE.Mesh(ringGeometry, burstMaterial); burstRing.renderOrder = 15; creature.add(burstRing);
  const inkPositions = new Float32Array(144 * 3), inkColors = new Float32Array(144 * 4);
  const inkGeometry = new THREE.BufferGeometry();
  inkGeometry.setAttribute('position', new THREE.BufferAttribute(inkPositions, 3)); inkGeometry.setAttribute('color', new THREE.BufferAttribute(inkColors, 4));
  const inkMaterial = new THREE.PointsMaterial({ vertexColors: true, size: 2.5, sizeAttenuation: false, transparent: true, depthWrite: false, toneMapped: false });
  const ink = new THREE.Points(inkGeometry, inkMaterial); ink.frustumCulled = false; ink.renderOrder = 11; creature.add(ink);
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: glow, color: 0x000000, transparent: true, opacity: .8, depthWrite: false });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(5, 3), shadowMaterial); shadow.rotation.x = -Math.PI / 2; shadow.position.y = .155; scene.add(shadow);
  const releaseMaterial = new THREE.MeshBasicMaterial({ color: 0xe2c38c, transparent: true, depthWrite: false, toneMapped: false });
  const release = new THREE.Mesh(ringGeometry, releaseMaterial); release.renderOrder = 12; creature.add(release);
  let width = 1, height = 1, disposed = false, raf = 0, callback: (() => void) | null = null;
  let currentProps: ArenaViewProps | null = null, drawingImage: HTMLImageElement | null = null, samples: InkSample[] = [];
  let frames = 0;
  const worldPosition = new THREE.Vector3();
  const hitPosition = new THREE.Vector3();
  const color = new THREE.Color();

  function disposeScene() {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    scene.traverse(object => {
      const renderable = object as THREE.Mesh;
      if (renderable.geometry) geometries.add(renderable.geometry);
      if (renderable.material) for (const material of Array.isArray(renderable.material) ? renderable.material : [renderable.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      }
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
    for (const value of geometries) value.dispose(); for (const value of materials) value.dispose(); for (const value of textures) value.dispose();
  }
  function removeNode(node: Node) {
    node.root.removeFromParent(); node.tether.removeFromParent(); node.cracks.removeFromParent();
    node.crystal.material.dispose(); node.halo.material.dispose(); node.ring.material.dispose(); node.badge.material.map?.dispose(); node.badge.material.dispose();
    node.tether.geometry.dispose(); node.tether.material.dispose(); node.cracks.geometry.dispose(); node.cracks.material.dispose(); node.shards.dispose();
  }
  function createNode(index: number): Node {
    const root = new THREE.Group(); creature.add(root);
    const material = new THREE.MeshStandardMaterial({ color: 0x8ac8bd, emissive: 0x8ac8bd, emissiveIntensity: .35, metalness: .38, roughness: .22, flatShading: true, transparent: true });
    const crystal = new THREE.Mesh(crystalGeometry, material); root.add(crystal);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0x8ac8bd, transparent: true, opacity: .25, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.set(100, 100, 1); halo.position.z = -2; root.add(halo);
    const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: 0x8ac8bd, transparent: true, opacity: .5, depthWrite: false })); ring.scale.setScalar(29); root.add(ring);
    const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTexture(index), depthTest: false, depthWrite: false, toneMapped: false })); badge.scale.set(20, 20, 1); badge.position.set(19, -20, 24); badge.renderOrder = 20; root.add(badge);
    const tetherGeometry = new THREE.BufferGeometry(); tetherGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 17), 3));
    const tether = new THREE.Line(tetherGeometry, new THREE.LineBasicMaterial({ color: 0x8ac8bd, transparent: true, opacity: .6 })); creature.add(tether);
    const crackGeometry = new THREE.BufferGeometry(); crackGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 12), 3));
    const cracks = new THREE.LineSegments(crackGeometry, new THREE.LineBasicMaterial({ color: 0xb85472, transparent: true })); creature.add(cracks);
    const shards = new THREE.InstancedMesh(shardGeometry, material, 6); shards.frustumCulled = false; root.add(shards);
    return { root, crystal, halo, ring, badge, tether, cracks, shards };
  }
  let press: { id: number; x: number; y: number } | null = null;
  const pointerDown = (event: PointerEvent) => { if (event.isPrimary && event.button === 0) press = { id: event.pointerId, x: event.clientX, y: event.clientY }; };
  const cancelPress = () => { press = null; };
  function select(event: PointerEvent) {
    const down = press; press = null;
    if (!down || event.pointerId !== down.id || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 10) return;
    if (!currentProps || disposed || currentProps.scene !== 'battle') return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * width, y = (event.clientY - rect.top) / rect.height * height;
    let selected: string | null = null, nearest = 38;
    for (const [id, node] of nodes) {
      if (!node.root.visible || node.crystal.material.opacity < .5) continue;
      node.root.getWorldPosition(hitPosition); hitPosition.project(camera);
      const distance = Math.hypot(x - (hitPosition.x + 1) * width / 2, y - (1 - hitPosition.y) * height / 2);
      if (distance < nearest) { selected = id; nearest = distance; }
    }
    if (selected) currentProps.onSelect(selected);
  }
  const contextLost = (event: Event) => { event.preventDefault(); if (!disposed) onFailure(); };
  const tick = () => {
    if (disposed || document.hidden) return;
    try { callback?.(); } catch { onFailure(); return; }
    if (!disposed) raf = requestAnimationFrame(tick);
  };
  const visibility = () => { cancelAnimationFrame(raf); if (!disposed && !document.hidden && callback) raf = requestAnimationFrame(tick); };
  canvas.addEventListener('webglcontextlost', contextLost); canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointerup', select); canvas.addEventListener('pointercancel', cancelPress); document.addEventListener('visibilitychange', visibility);

  return {
    canvas,
    diagnostics: () => ({ drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries, pixelRatio: renderer.getPixelRatio() }),
    resize(w, h) {
      width = GAME_WIDTH; height = GAME_HEIGHT; camera.aspect = GAME_ASPECT; camera.updateProjectionMatrix(); renderer.setSize(Math.max(1, w), Math.max(1, h), false);
    },
    render(props, image, frame) {
      if (disposed) return;
      currentProps = props;
      const layout = layoutArena(width, height, props.sprite), pose = evaluatePose(props, frame), timeline = evaluateTimeline(props, frame);
      if (image !== drawingImage) {
        drawingImage = image;
        bodyMaterial.map?.dispose(); rimMaterial.map?.dispose(); bodyMaterial.map = null; rimMaterial.map = null;
        if (image) {
          const texture = new THREE.Texture(image); texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true;
          bodyMaterial.map = texture;
          const edge = createInkRim(image); if (edge) { rimMaterial.map = new THREE.CanvasTexture(edge); rimMaterial.map.colorSpace = THREE.SRGBColorSpace; }
        }
        bodyMaterial.needsUpdate = true; rimMaterial.needsUpdate = true;
        samples = image ? sampleInkImage(image) : [];
      }
      // Tiny camera arcs reveal room depth. Ink stays face-on and its anchors stay exact.
      const moving = !props.reducedMotion;
      const dolly = moving && props.scene === 'awakening' ? (1 - timeline.bodyReveal) * 1.1 : 0;
      camera.position.set(moving ? Math.sin(frame.time * .17) * .22 : 0, 3.8, 12 + dolly);
      camera.lookAt(0, 3.05, 0); camera.updateMatrixWorld();
      const depth = 12;
      const unit = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * depth / height;
      worldPosition.set((layout.x + pose.x - width / 2) * unit, (height / 2 - layout.y - pose.y) * unit, -depth).applyMatrix4(camera.matrixWorld);
      creature.position.copy(worldPosition); creature.quaternion.copy(camera.quaternion); creature.rotateZ(-pose.rotation);
      creature.scale.set(unit * pose.scaleX * pose.endingScale, unit * pose.scaleY * pose.endingScale, unit);
      body.visible = !!image; body.scale.set(layout.width, layout.height, 1); bodyMaterial.opacity = pose.alpha;
      rim.visible = !!image && !!rimMaterial.map; rim.scale.set(layout.width * (props.sprite.width + 32) / props.sprite.width, layout.height * (props.sprite.height + 32) / props.sprite.height, 1); rimMaterial.opacity = .65 * pose.alpha;
      rimMaterial.rotation = -pose.rotation;
      shadowMaterial.opacity = .8 * pose.alpha;
      shadow.scale.x = Math.max(.15, layout.width * unit / 5) * pose.scaleX;
      const gathering = props.scene === 'awakening';
      ink.visible = gathering || props.scene === 'victory';
      if (ink.visible) {
        const progress = gathering ? 1 - timeline.bodyReveal : timeline.inkDispersal;
        samples.forEach((sample, i) => {
          const fragment = evaluateInkFragment(sample, i, progress, layout.width, layout.height, props.reducedMotion);
          inkPositions.set([fragment.x, -fragment.y, 1], i * 3);
          color.setHex(sample.color); const alpha = gathering ? Math.sin(timeline.bodyReveal * Math.PI) * sample.alpha : fragment.alpha;
          inkColors.set([color.r, color.g, color.b, alpha], i * 4);
        });
        inkGeometry.setDrawRange(0, samples.length); inkGeometry.attributes.position!.needsUpdate = true; inkGeometry.attributes.color!.needsUpdate = true;
      }
      const live = new Set(props.crystals.map(item => item.id));
      for (const [id, node] of nodes) if (!live.has(id)) { removeNode(node); nodes.delete(id); }
      for (const [index, crystal] of props.crystals.entries()) {
        const anchor = props.sprite.anchors.find(item => item.conceptId === crystal.id); if (!anchor) continue;
        let node = nodes.get(crystal.id); if (!node) { node = createNode(index); nodes.set(crystal.id, node); }
        const state = visualCrystalState(crystal, props, frame), selected = props.selectedId === crystal.id;
        const tint = crystalColor(state);
        const x = (anchor.x - .5) * layout.width, y = (.5 - anchor.y) * layout.height;
        const ax = (anchor.attachmentX - .5) * layout.width, ay = (.5 - anchor.attachmentY) * layout.height;
        const alpha = timeline.crystalReveal(index) * (props.scene === 'victory' ? 1 - Math.min(1, frame.sceneAge / 1.5) : props.scene === 'awakening' ? 1 : pose.alpha);
        node.root.position.set(x, y, 2); node.root.visible = alpha > .001;
        node.crystal.visible = state !== 'shattered'; node.shards.visible = state === 'shattered';
        node.crystal.scale.set(15, 24, 10); node.crystal.rotation.set(.12, moving ? frame.time * .32 + index : .5, .08);
        node.crystal.material.color.setHex(tint); node.crystal.material.emissive.setHex(tint); node.crystal.material.opacity = alpha;
        node.crystal.material.emissiveIntensity = selected ? .8 : .3;
        node.halo.material.color.setHex(tint); node.halo.material.opacity = alpha * (selected ? .55 : .24);
        node.ring.material.color.setHex(tint); node.ring.material.opacity = alpha * (selected ? .85 : .28); node.ring.scale.setScalar(selected ? 33 : 28);
        node.badge.material.opacity = alpha;
        if (state === 'shattered') {
          for (let i = 0; i < 6; i++) { const angle = i * Math.PI / 3; dummy.position.set(Math.cos(angle) * 15, Math.sin(angle) * 15, i % 2 * 5); dummy.scale.set(4, 6, 3); dummy.rotation.set(i, i * .8, i); dummy.updateMatrix(); node.shards.setMatrixAt(i, dummy.matrix); }
          node.shards.instanceMatrix.needsUpdate = true;
        }
        const tether = node.tether.geometry.attributes.position!;
        for (let i = 0; i < 17; i++) { const t = i / 16; tether.setXYZ(i, (1 - t) * (1 - t) * ax + t * (2 - t) * x, (1 - t * t) * ay + t * t * y, 1); }
        tether.needsUpdate = true; node.tether.material.color.setHex(tint); node.tether.material.opacity = alpha * (selected ? .8 : .45);
        const corrupted = state === 'corrupted' || state === 'unresolved'; node.cracks.visible = corrupted;
        if (corrupted) {
          const positions = node.cracks.geometry.attributes.position!;
          for (let i = 0; i < 3; i++) {
            const angle = Math.atan2(-ay, -ax) + (i - 1) * .55;
            const length = Math.min(layout.width, layout.height) * (state === 'unresolved' ? .36 : .22) * (props.event?.conceptId === crystal.id ? timeline.corruption : 1);
            const mx = ax + Math.cos(angle + .2) * length * .38, my = ay + Math.sin(angle + .2) * length * .38;
            positions.setXYZ(i * 4, ax, ay, 2); positions.setXYZ(i * 4 + 1, mx, my, 2); positions.setXYZ(i * 4 + 2, mx, my, 2); positions.setXYZ(i * 4 + 3, ax + Math.cos(angle) * length, ay + Math.sin(angle) * length, 2);
          }
          positions.needsUpdate = true; node.cracks.material.opacity = alpha * .7;
        }
      }
      const target = props.sprite.anchors.find(item => item.conceptId === props.event?.conceptId);
      burst.visible = !!target && timeline.burst && moving; burstRing.visible = !!target && timeline.burst;
      const corrupt = props.event?.type === 'corrupt' || props.event?.type === 'unresolved';
      burstMaterial.color.setHex(corrupt ? 0xb85472 : 0xe2c38c);
      chamber.impact.color.copy(burstMaterial.color); chamber.impact.intensity = timeline.burst ? Math.sin(timeline.burstAge / timeline.burstDuration * Math.PI) * (moving ? 45 : 12) : 0;
      if (target && timeline.burst) {
        const p = timeline.burstAge / timeline.burstDuration, x = (target.x - .5) * layout.width, y = (.5 - target.y) * layout.height;
        burstMaterial.opacity = 1 - p; burstRing.position.set(x, y, 20); burstRing.scale.setScalar(23 + (moving ? p * 67 * timeline.burstStrength : 3));
        for (let i = 0; i < 36; i++) {
          const angle = i * 2.39996, radius = p * (40 + i % 6 * 11) * timeline.burstStrength;
          dummy.position.set(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius - p * p * 40, Math.sin(i * 9) * p * 60 + 8);
          dummy.rotation.set(p * 8 + i, p * 4, i); dummy.scale.setScalar((1 - p) * (2 + i % 3)); dummy.updateMatrix(); burst.setMatrixAt(i, dummy.matrix);
        }
        burst.instanceMatrix.needsUpdate = true;
      }
      release.visible = props.scene === 'victory';
      if (release.visible) { const seal = evaluateReleaseSeal(frame.sceneAge, props.reducedMotion, props.victoryStyle); release.scale.setScalar(Math.min(layout.width, layout.height) * seal.radius); releaseMaterial.opacity = seal.alpha; }
      chamber.sealMaterial.opacity = .65 + timeline.energy * .3;
      chamber.seal.rotation.z = moving ? Math.sin(frame.time * .08) * .025 : 0;
      chamber.cold.intensity = 55 - (5 - (props.ritualIntegrity ?? 5)) * 5;
      chamber.warm.color.setHex((props.ritualIntegrity ?? 5) <= 2 ? 0xb85472 : 0xd6a264);
      chamber.haze.uniforms.strength!.value = props.reducedMotion ? .075 : .12 + timeline.energy * .04;
      chamber.motes.visible = moving; chamber.motes.position.y = moving ? Math.sin(frame.time * .12) * .3 : 0;
      renderer.render(scene, camera);
      if (++frames % 60 === 0) { canvas.dataset.drawCalls = `${renderer.info.render.calls}`; canvas.dataset.triangles = `${renderer.info.render.triangles}`; canvas.dataset.textures = `${renderer.info.memory.textures}`; canvas.dataset.geometries = `${renderer.info.memory.geometries}`; }
    },
    start(onFrame) { callback = onFrame; visibility(); },
    destroy() {
      if (disposed) return; disposed = true; cancelAnimationFrame(raf);
      canvas.removeEventListener('webglcontextlost', contextLost); canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointerup', select); canvas.removeEventListener('pointercancel', cancelPress); document.removeEventListener('visibilitychange', visibility);
      disposeScene(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    },
  };
}
