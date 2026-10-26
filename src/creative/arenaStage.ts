/** Original procedural Arena art and creature construction. See ASSETS-LICENSE.md. */
import * as THREE from 'three';
import type { ArenaMonster, ArenaMove } from '../../shared/arena/protocol';
import { enrichBossChamber } from './bossChamber';
import { basaltTexture } from './basalt';
import { createInkRim } from '../rendering/ink';

export function starterInk(id: 'warden' | 'wisp' | 'oracle') {
  const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 360;
  const c = canvas.getContext('2d');
  if (!c) {
    const outline = id === 'warden' ? 'M75 280L73 92L121 125L160 42L198 125L248 83L234 283Z' : id === 'wisp' ? 'M158 38C56 120 67 238 107 299Q126 266 144 303Q162 275 184 311C284 253 238 127 158 38Z' : 'M160 67C54 66 56 212 103 253Q58 298 37 246Q51 332 119 280Q160 326 201 280Q277 330 285 242Q253 304 217 253C271 188 256 71 160 67Z';
    return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 360"><path d="${outline}" fill="none" stroke="#d1bc90" stroke-width="7"/><circle cx="126" cy="174" r="8" fill="#d1bc90"/><circle cx="196" cy="174" r="8" fill="#d1bc90"/></svg>`)}`;
  }
  c.strokeStyle = '#302338'; c.fillStyle = '#302338'; c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = 7;
  c.beginPath();
  if (id === 'warden') { c.moveTo(84, 280); c.lineTo(73, 92); c.lineTo(121, 125); c.lineTo(160, 42); c.lineTo(198, 125); c.lineTo(248, 83); c.lineTo(234, 283); c.quadraticCurveTo(161, 329, 84, 280); }
  else if (id === 'wisp') { c.moveTo(158, 38); c.bezierCurveTo(56, 120, 67, 238, 107, 299); c.quadraticCurveTo(126, 266, 144, 303); c.quadraticCurveTo(162, 275, 184, 311); c.bezierCurveTo(284, 253, 238, 127, 158, 38); }
  else { c.moveTo(160, 67); c.bezierCurveTo(54, 66, 56, 212, 103, 253); c.quadraticCurveTo(58, 298, 37, 246); c.quadraticCurveTo(51, 332, 119, 280); c.quadraticCurveTo(160, 326, 201, 280); c.quadraticCurveTo(277, 330, 285, 242); c.quadraticCurveTo(253, 304, 217, 253); c.bezierCurveTo(271, 188, 256, 71, 160, 67); }
  c.stroke();
  if (id === 'oracle') { c.beginPath(); c.ellipse(160, 176, 57, 35, 0, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.ellipse(160, 176, 13, 25, 0, 0, Math.PI * 2); c.fill(); }
  else { for (const x of [126, 196]) { c.beginPath(); c.ellipse(x, 171, 8, 13, -.1, 0, Math.PI * 2); c.fill(); } c.beginPath(); c.moveTo(134, 226); c.quadraticCurveTo(161, 246, 188, 223); c.stroke(); }
  c.lineWidth = 2; c.strokeStyle = '#a68a55';
  for (let i = 0; i < 9; i++) { const a = i * Math.PI * 2 / 9; c.beginPath(); c.moveTo(160 + Math.cos(a) * 118, 177 + Math.sin(a) * 140); c.lineTo(160 + Math.cos(a) * 128, 177 + Math.sin(a) * 152); c.stroke(); }
  return canvas.toDataURL('image/png');
}
export function createArenaChamber(scene: THREE.Scene) {
  const chamber = enrichBossChamber(scene);
  const stone = new THREE.MeshLambertMaterial({ color: 0x3c3440, map: basaltTexture() });
  const gold = new THREE.MeshBasicMaterial({ color: 0x94764d });
  const ring = new THREE.TorusGeometry(1, .012, 3, 80);
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.85, .3, 64), stone); floor.position.y = -.2; scene.add(floor);
  const sigils = [-2.7, 2.7].map((x, i) => {
    const group = new THREE.Group(); group.position.set(x, .12, 0); scene.add(group);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.15, .15, 40), stone); base.position.y = -.01; group.add(base);
    for (const r of [1.5, 1.8, 2.02]) { const circle = new THREE.Mesh(ring, gold); circle.rotation.x = -Math.PI / 2; circle.scale.setScalar(r); circle.position.y = .09; group.add(circle); }
    const portalMaterial = new THREE.MeshBasicMaterial({ color: i ? 0x9784c9 : 0x82b7af, transparent: true, opacity: .36, depthWrite: false });
    const portal = new THREE.Mesh(new THREE.TorusGeometry(1.85, .026, 4, 80), portalMaterial); portal.position.set(0, 2.5, -.65); group.add(portal);
    const portalInner = new THREE.Mesh(new THREE.TorusGeometry(1.65, .013, 3, 64), portalMaterial); portalInner.position.copy(portal.position); group.add(portalInner);
    const shadowMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { opacity: { value: .7 } }, vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'varying vec2 vUv;uniform float opacity;void main(){float a=pow(max(0.,1.-length((vUv-.5)*2.)),1.7);gl_FragColor=vec4(.015,.01,.025,a*opacity);}' });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2), shadowMaterial); shadow.rotation.x = -Math.PI / 2; shadow.position.y = .11; group.add(shadow);
    return { group, portal, portalInner, portalMaterial, shadow, shadowMaterial };
  });
  const ambient = new THREE.HemisphereLight(0xe3d2ef, 0x29202d, 1.5); scene.add(ambient);
  const key = new THREE.DirectionalLight(0xf5d8ab, 3); key.position.set(-3, 8, 7); scene.add(key);
  const flash = new THREE.PointLight(0xe7c28b, 0, 14, 2); scene.add(flash);
  return { ...chamber, sigils, ambient, key, flash };
}
export function createArenaCreature(scene: THREE.Scene, monster: ArenaMonster, slot: number) {
  const root = new THREE.Group(); root.position.set(slot === 0 ? -2.7 : 2.7, 2.35, 0); scene.add(root);
  const cyan = slot === 0 ? 0x7fa6a5 : 0x9782ab;
  const armor = new THREE.MeshLambertMaterial({ color: slot === 0 ? 0x485963 : 0x5c455f, emissive: slot === 0 ? 0x102026 : 0x211529, flatShading: true });
  const facet = new THREE.MeshLambertMaterial({ color: slot === 0 ? 0x94b0ad : 0xb29bb6, emissive: 0x18101e, flatShading: true });
  const glow = new THREE.MeshBasicMaterial({ color: cyan, transparent: true, opacity: .45, depthWrite: false });
  const oct = new THREE.OctahedronGeometry(1, 0);
  const shell = new THREE.InstancedMesh(oct, armor, 10); shell.frustumCulled = false; root.add(shell);
  const dummy = new THREE.Object3D();
  const arms = [-1, 1].map(side => {
    const pivot = new THREE.Group(); pivot.position.set(side * 1.15, .4, 0); root.add(pivot);
    const upper = new THREE.Mesh(oct, armor); upper.position.set(side * .34, -.35, 0); upper.rotation.z = side * .35; upper.scale.set(.32, .65, .34); pivot.add(upper);
    const elbow = new THREE.Group(); elbow.position.set(side * .48, -.82, .12); pivot.add(elbow);
    const hand = new THREE.Mesh(oct, facet); hand.scale.set(.35, .49, .37); hand.position.set(side * .05, -.12, 0); elbow.add(hand);
    for (let i = 0; i < 3; i++) { const claw = new THREE.Mesh(oct, facet); claw.scale.set(.065, .25, .065); claw.position.set(side * (i - 1) * .16, -.51, .12); claw.rotation.z = side * (i - 1) * -.12; elbow.add(claw); }
    return { pivot, elbow };
  });
  const head = new THREE.Mesh(oct, facet); head.position.y = 1.65; head.scale.set(.4, .55, .35); root.add(head);
  const inkMaterial = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const inkGeometry = new THREE.PlaneGeometry(2.4, 2.7, 24, 24), base = new Float32Array(inkGeometry.attributes.position!.array);
  const ink = new THREE.Mesh(inkGeometry, inkMaterial); ink.position.set(0, .1, .6); ink.renderOrder = 5; ink.visible = false; root.add(ink);
  const rimMaterial = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: .8, toneMapped: false, side: THREE.DoubleSide });
  const rim = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), rimMaterial); rim.position.set(0, .1, .58); rim.renderOrder = 4; rim.visible = false; root.add(rim);
  const aura = new THREE.Mesh(new THREE.TorusGeometry(1.7, .018, 3, 64), glow); aura.position.z = -.2; root.add(aura);
  const veinsGeometry = new THREE.BufferGeometry(); veinsGeometry.setAttribute('position', new THREE.Float32BufferAttribute([-.85,1,.5,-.5,.3,.65,-.5,.3,.65,-.7,-.3,.6,.7,.8,.6,.4,.2,.67,.4,.2,.67,.65,-.6,.55,-.6,-.5,.62,0,-.8,.62,0,-.8,.62,.55,-.7,.62],3));
  const veinMaterial = new THREE.LineBasicMaterial({ color: 0xc4e8df, transparent: true, opacity: 0 }); root.add(new THREE.LineSegments(veinsGeometry, veinMaterial));
  let image: HTMLImageElement | null = null, stopped = false, width = 2.4, height = 2.7;
  const textures: THREE.Texture[] = [];
  const load = (ready: () => void, failed: () => void) => {
    image = new Image();
    image.onload = () => {
      if (stopped || !image) return;
      const ratio = image.naturalWidth / image.naturalHeight; height = Math.min(2.7, 2.4 / ratio); width = height * ratio;
      const position = inkGeometry.attributes.position!;
      for (let i = 0; i < position.count; i++) { base[i * 3] = base[i * 3]! / 2.4 * width; base[i * 3 + 1] = base[i * 3 + 1]! / 2.7 * height; position.setXYZ(i, base[i * 3]!, base[i * 3 + 1]!, 0); } position.needsUpdate = true;
      const texture = new THREE.Texture(image); texture.colorSpace = THREE.SRGBColorSpace; texture.minFilter = THREE.LinearFilter; texture.generateMipmaps = false; texture.needsUpdate = true; textures.push(texture); ink.visible = true; inkMaterial.map = texture; inkMaterial.needsUpdate = true;
      const edge = createInkRim(image); if (edge) { const rimTexture = new THREE.CanvasTexture(edge); rimTexture.colorSpace = THREE.SRGBColorSpace; textures.push(rimTexture); rim.visible = true; rimMaterial.map = rimTexture; rimMaterial.needsUpdate = true; rim.scale.set(width * edge.width / image.naturalWidth, height * edge.height / image.naturalHeight, 1); }
      ready();
    };
    image.onerror = failed;
    image.src = monster.appearance.kind === 'drawing' ? monster.appearance.dataUrl : starterInk(monster.appearance.id);
  };
  return { root, shell, armor, facet, dummy, arms, head, ink, inkGeometry, inkMaterial, rim, rimMaterial, base, aura, glow, veinMaterial,
    get extent() { return { width, height }; }, load,
    stop() { stopped = true; if (image) { image.onload = null; image.onerror = null; } textures.forEach(texture => texture.dispose()); },
  };
}

export const ARENA_MOVE_COLORS: Record<ArenaMove, number> = { execution: 0x9c7ac5, hellfall: 0x92cbc8, equation: 0xe1c28b, fracture: 0xb695d2, mindstorm: 0x86b2b1 };
export function createArenaEffects(scene: THREE.Scene) {
  const oct = new THREE.OctahedronGeometry(1, 0), dummy = new THREE.Object3D();
  const material = new THREE.MeshBasicMaterial({ color: 0x96bdbe, transparent: true, opacity: .85, depthWrite: false });
  const shards = new THREE.InstancedMesh(oct, material, 28); shards.frustumCulled = false; scene.add(shards);
  const trailsGeo = new THREE.BufferGeometry(); trailsGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(28 * 6), 3));
  const trailsMaterial = new THREE.LineBasicMaterial({ color: 0x96bdbe, transparent: true, opacity: .5, depthWrite: false }); const trails = new THREE.LineSegments(trailsGeo, trailsMaterial); trails.frustumCulled = false; scene.add(trails);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x160b24 })); scene.add(blade);
  const bladeEdge = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material); blade.add(bladeEdge); bladeEdge.scale.set(1, .055, 1.1); bladeEdge.position.y = -.48;
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xe1c28b, transparent: true, opacity: .8 });
  const cage = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(.65, 0)), lineMaterial); scene.add(cage);
  const wave = new THREE.Mesh(new THREE.TorusGeometry(1, .026, 4, 80), material); wave.rotation.x = -Math.PI / 2; scene.add(wave);
  const crackGeometry = new THREE.BufferGeometry(); crackGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(30 * 6), 3)); const cracks = new THREE.LineSegments(crackGeometry, lineMaterial); cracks.frustumCulled = false; scene.add(cracks);
  const glyphCanvas = document.createElement('canvas'); glyphCanvas.width = 512; glyphCanvas.height = 64; const context = glyphCanvas.getContext('2d')!;
  context.fillStyle = '#e7c68d'; context.font = '40px Georgia,serif'; context.textBaseline = 'middle'; const glyphs = ['Σ','π','∫','∞','Δ','Φ','Ω','∴']; glyphs.forEach((glyph, i) => context.fillText(glyph, i * 64 + 12, 32));
  const glyphTexture = new THREE.CanvasTexture(glyphCanvas); glyphTexture.colorSpace = THREE.SRGBColorSpace;
  const glyphGroup = new THREE.Group(); scene.add(glyphGroup);
  const glyphSprites = Array.from({length: 16}, (_, i) => { const texture = glyphTexture.clone(); texture.repeat.set(1 / 8, 1); texture.offset.x = i % 8 / 8; texture.needsUpdate = true; const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,opacity:.8,depthWrite:false,toneMapped:false})); sprite.scale.set(.38,.38,1); glyphGroup.add(sprite); return sprite; });
  return { shards, trails, trailsMaterial, material, dummy, blade, cage, wave, cracks, glyphGroup, glyphSprites, glyphTexture,
    dispose() { glyphTexture.dispose(); glyphSprites.forEach(sprite => sprite.material.map?.dispose()); },
  };
}
