/** Original INKBORN architecture, runes and atmospheric shaders. See ASSETS-LICENSE.md. */
import * as THREE from 'three';
import { basaltTexture } from './basalt';

export function enrichBossChamber(scene: THREE.Scene) {
  const weathering = basaltTexture();
  const stone = new THREE.MeshLambertMaterial({ map: weathering, color: 0x554b5c, emissive: 0x08060c });
  const edge = new THREE.MeshLambertMaterial({ map: weathering, color: 0x7a677c });
  const brass = new THREE.MeshBasicMaterial({ color: 0x87704b });
  const cyan = new THREE.MeshBasicMaterial({ color: 0x83bcb7 });
  const box = new THREE.BoxGeometry(1, 1, 1), oct = new THREE.OctahedronGeometry(1);
  const dummy = new THREE.Object3D();
  // Large masonry blocks, flying buttresses and vaulted ribs are physical geometry.
  const masonry = new THREE.InstancedMesh(box, stone, 108);
  for (let i = 0; i < 108; i++) {
    const row = Math.floor(i / 18), col = i % 18;
    dummy.position.set((col - 8.5) * 1.25 + row % 2 * .5, row * 1.28 + .2, -10.5 - Math.abs(col - 8.5) * .1);
    dummy.rotation.set(0, 0, 0); dummy.scale.set(1.21, 1.24, .65); dummy.updateMatrix(); masonry.setMatrixAt(i, dummy.matrix);
  }
  scene.add(masonry);
  const flutes = new THREE.InstancedMesh(box, edge, 48);
  for (let i = 0; i < 48; i++) {
    const col = Math.floor(i / 4), flute = i % 4, a = Math.PI * (.1 + col * .8 / 11);
    dummy.position.set(Math.cos(a) * 7.3 + (flute - 1.5) * .12, 3.8, -Math.sin(a) * 7.3 - .66);
    dummy.rotation.set(0, a, 0); dummy.scale.set(.035, 7.1, .09); dummy.updateMatrix(); flutes.setMatrixAt(i, dummy.matrix);
  }
  scene.add(flutes);
  const ribs = new THREE.InstancedMesh(box, edge, 36);
  for (let i = 0; i < 36; i++) {
    const arch = Math.floor(i / 12), part = i % 12, a = part / 11 * Math.PI;
    dummy.position.set(Math.cos(a) * (4.9 + arch * .9), 4.4 + Math.sin(a) * 4.5, -5.3 - arch * 1.4);
    dummy.rotation.set(0, 0, a); dummy.scale.set(.17, 1.35, .3); dummy.updateMatrix(); ribs.setMatrixAt(i, dummy.matrix);
  }
  scene.add(ribs);
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, .15, 64), stone); floor.position.y = -.46; scene.add(floor);
  // Engraved glyphs sit just above the platform and rotate as a single ritual band.
  const runes = new THREE.Group(); runes.position.y = .175; scene.add(runes);
  const strokes: number[] = [];
  for (let i = 0; i < 48; i++) {
    const a = i * Math.PI / 24, r = 3.74;
    for (const [u, v, u2, v2] of [[-.055, -.1, .055, .1], [-.055, .1, .055, -.1], [0, -.13, 0, .13]]) {
      const p = (x: number, z: number) => [Math.cos(a) * (r + z) - Math.sin(a) * x, 0, Math.sin(a) * (r + z) + Math.cos(a) * x];
      strokes.push(...p(u!, v!), ...p(u2!, v2!));
    }
  }
  const runeGeometry = new THREE.BufferGeometry(); runeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(strokes, 3));
  const runeMaterial = new THREE.LineBasicMaterial({ color: 0xbda77d, transparent: true, opacity: .65 }); runes.add(new THREE.LineSegments(runeGeometry, runeMaterial));
  const circles = new THREE.Group(); scene.add(circles);
  const circleMaterial = new THREE.MeshBasicMaterial({ color: 0x8ac4c2, transparent: true, opacity: .35, depthWrite: false });
  for (const r of [2.65, 3.18, 4.17]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r, .009, 3, 96), circleMaterial); ring.rotation.x = -Math.PI / 2; ring.position.y = .18; circles.add(ring); }
  const window = new THREE.Group(); window.position.set(0, 5.3, -10); scene.add(window);
  const windowMaterial = new THREE.MeshBasicMaterial({ color: 0x75647f, transparent: true, opacity: .35 });
  for (const r of [1.2, 1.6, 1.72]) { const circle = new THREE.Mesh(new THREE.TorusGeometry(r, .025, 4, 64), windowMaterial); window.add(circle); }
  const spokes = new THREE.InstancedMesh(box, windowMaterial, 12);
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; dummy.position.set(Math.cos(a) * .86, Math.sin(a) * .86, 0); dummy.rotation.set(0, 0, a); dummy.scale.set(1.6, .015, .04); dummy.updateMatrix(); spokes.setMatrixAt(i, dummy.matrix); } window.add(spokes);
  const lamps = new THREE.Group(); scene.add(lamps);
  for (const side of [-1, 1]) for (let j = 0; j < 3; j++) {
    const x = side * (5.5 + j * .6), z = 1.3 - j * 3.5;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.26, .45, .35, 6), edge); base.position.set(x, -.05, z); lamps.add(base);
    const stem = new THREE.Mesh(box, brass); stem.position.set(x, 1, z); stem.scale.set(.08, 2, .08); lamps.add(stem);
    const flame = new THREE.Mesh(oct, cyan); flame.position.set(x, 2.15, z); flame.scale.set(.12, .32, .12); lamps.add(flame);
  }
  const rimLight = new THREE.PointLight(0x71aaa9, 26, 18, 2); rimLight.position.set(4, 5, -3); scene.add(rimLight);
  const warmLight = new THREE.PointLight(0xc19564, 17, 16, 2); warmLight.position.set(-5, 4, 1); scene.add(warmLight);
  // Layered transparent geometry with soft depth gradients suggests shafts and floor fog.
  const hazeMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, strength: { value: .1 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv; uniform float time; uniform float strength;
      void main(){ float taper=pow(max(0.,sin(vUv.x*3.14159)),2.); float fade=sin(vUv.y*3.14159);
      float bands=.75+.25*sin(vUv.y*18.+sin(vUv.x*12.+time*.13));
      gl_FragColor=vec4(.43,.48,.62,taper*fade*bands*strength); }`,
  });
  const shafts = new THREE.Group(); scene.add(shafts);
  for (const side of [-1, 1]) {
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 10), hazeMaterial); shaft.position.set(side * 3.4, 5, -3.8); shaft.rotation.z = side * -.26; shafts.add(shaft);
  }
  for (let i = 0; i < 3; i++) { const fog = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.1), hazeMaterial); fog.position.set(0, .5 + i * .17, 1 - i * 2.6); shafts.add(fog); }
  const floaters = new THREE.InstancedMesh(oct, new THREE.MeshLambertMaterial({ color: 0x6f789e, emissive: 0x192d3a, flatShading: true }), 18); scene.add(floaters);
  const contactMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { opacity: { value: .65 } }, vertexShader: hazeMaterial.vertexShader,
    fragmentShader: 'varying vec2 vUv; uniform float opacity; void main(){float a=pow(max(0.,1.-length((vUv-.5)*2.)),1.6);gl_FragColor=vec4(.015,.009,.025,a*opacity);}' });
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.8), contactMaterial); contact.rotation.x = -Math.PI / 2; contact.position.set(0, .185, .1); scene.add(contact);
  return { runes, runeMaterial, circles, circleMaterial, hazeMaterial, floaters, contact, contactMaterial, rimLight, warmLight };
}
