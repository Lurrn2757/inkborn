/** Original INKBORN chamber composition. Protected asset; see ASSETS-LICENSE.md. */
import * as THREE from 'three';

// Seeded surface grain is baked once. No asset downloads or per-frame noise textures.
function stoneTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const pixels = ctx.createImageData(256, 256);
  let seed = 719;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const v = 45 + (seed >>> 27);
    pixels.data.set([v * .82, v * .88, v, 255], i);
  }
  ctx.putImageData(pixels, 0, 0);
  ctx.strokeStyle = '#15161e'; ctx.lineWidth = 3;
  for (let y = 0; y <= 256; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
    for (let x = y % 128; x < 256; x += 128) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 64); ctx.stroke(); }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

function sigilTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(512, 512); ctx.strokeStyle = '#c2a06a'; ctx.fillStyle = '#c2a06a'; ctx.lineWidth = 1.8;
  for (const r of [264, 280, 382, 392, 450, 458]) { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); }
  for (let i = 0; i < 60; i++) {
    ctx.save(); ctx.rotate(i * Math.PI / 30);
    ctx.beginPath(); ctx.moveTo(0, 397); ctx.lineTo(0, i % 5 === 0 ? 441 : 413); ctx.stroke();
    if (i % 5 === 0) {
      ctx.translate(0, 339); ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(9, 0); ctx.lineTo(0, 18); ctx.lineTo(-9, 0); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-13, 7); ctx.lineTo(13, -7); ctx.stroke();
    }
    ctx.restore();
  }
  for (let offset = 0; offset < 2; offset++) {
    ctx.beginPath();
    for (let i = 0; i <= 3; i++) { const a = i * Math.PI * 2 / 3 + offset * Math.PI; const x = Math.sin(a) * 264, y = Math.cos(a) * 264; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildThreeChamber(scene: THREE.Scene) {
  const stoneMap = stoneTexture();
  const stone = new THREE.MeshStandardMaterial({ color: 0x777584, map: stoneMap, roughness: .88, metalness: .22 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x181b25, roughness: .7, metalness: .4 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x8d7047, roughness: .35, metalness: .78 });
  const luminous = new THREE.MeshBasicMaterial({ color: 0xb99b63, transparent: true, opacity: .55 });
  const root = new THREE.Group(); scene.add(root);
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
    const object = new THREE.Mesh(geometry, material); object.position.set(x, y, z); root.add(object); return object;
  };
  const floor = mesh(new THREE.PlaneGeometry(50, 50), stone, 0, -.3, 0); floor.rotation.x = -Math.PI / 2;
  // True stepped geometry catches the oblique chamber lights.
  for (let i = 0; i < 3; i++) mesh(new THREE.CylinderGeometry(3.5 - i * .25, 3.58 - i * .25, .13, 64), i === 2 ? dark : stone, 0, -.18 + i * .13, 0);
  for (const radius of [2.99, 3.25, 3.49]) { const torus = mesh(new THREE.TorusGeometry(radius, .018, 4, 96), trim, 0, .09, 0); torus.rotation.x = Math.PI / 2; }
  const sealMaterial = new THREE.MeshBasicMaterial({ map: sigilTexture(), transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending });
  const seal = mesh(new THREE.PlaneGeometry(6, 6), sealMaterial, 0, .151, 0); seal.rotation.x = -Math.PI / 2;

  const shaft = new THREE.CylinderGeometry(.26, .36, 7.3, 8);
  const rib = new THREE.CylinderGeometry(.37, .4, .13, 8);
  const base = new THREE.CylinderGeometry(.58, .66, .32, 8);
  const flute = new THREE.BoxGeometry(.025, 4.6, .025);
  // Receding columns and pointed ribs establish perspective around the flat ink.
  for (let i = 0; i < 9; i++) {
    const angle = Math.PI * .06 + i * Math.PI * .88 / 8;
    const x = Math.cos(angle) * 6.6, z = -Math.sin(angle) * 6.6 - .5;
    mesh(shaft, stone, x, 3.6, z); mesh(base, dark, x, 0, z); mesh(base, trim, x, .2, z);
    for (const y of [.5, 1, 5.8, 6, 7.1]) mesh(rib, y === 6 ? trim : stone, x, y, z);
    const line = mesh(flute, luminous, x * .956, 3.7, z * .956);
    line.rotation.y = angle;
    const nextAngle = angle + Math.PI * .88 / 8;
    if (i < 8) {
      const nx = Math.cos(nextAngle) * 6.6, nz = -Math.sin(nextAngle) * 6.6 - .5;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, 5.8, z), new THREE.Vector3(x * .87 + nx * .13, 7.3, z * .87 + nz * .13),
        new THREE.Vector3((x + nx) / 2, 8.5, (z + nz) / 2), new THREE.Vector3(x * .13 + nx * .87, 7.3, z * .13 + nz * .87), new THREE.Vector3(nx, 5.8, nz),
      ]);
      mesh(new THREE.TubeGeometry(curve, 20, .13, 5, false), stone, 0, 0, 0);
    }
  }
  // Recessed rear portal: layered physical rings, no background image.
  const portal = new THREE.Group(); portal.position.set(0, 3.7, -7.4); root.add(portal);
  for (let i = 0; i < 3; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(2.35 + i * .16, .065, 6, 64), i === 1 ? trim : stone); ring.scale.y = 1.55; portal.add(ring); }
  const portalGlow = new THREE.Mesh(new THREE.CircleGeometry(2.28, 64), new THREE.MeshBasicMaterial({ color: 0x141d29 })); portalGlow.scale.y = 1.55; portalGlow.position.z = -.1; portal.add(portalGlow);

  const ambient = new THREE.HemisphereLight(0x849bb7, 0x201528, 2.1); scene.add(ambient);
  const key = new THREE.DirectionalLight(0xe3ceaa, 3.2); key.position.set(-4, 8, 6); scene.add(key);
  const cold = new THREE.PointLight(0x65bbb0, 55, 16, 2); cold.position.set(-3.8, 2.5, -1); scene.add(cold);
  const warm = new THREE.PointLight(0xd6a264, 65, 16, 2); warm.position.set(4, 3.5, 1); scene.add(warm);
  const impact = new THREE.PointLight(0x8ac8bd, 0, 13, 2); impact.position.set(0, 3, 2); scene.add(impact);

  // Soft cone shells approximate shafts through haze; no ray marching or full-screen pass.
  const haze = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { strength: { value: .13 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'varying vec2 vUv; uniform float strength; void main(){float edge=pow(sin(vUv.x*3.14159265),4.0); float fade=sin(vUv.y*3.14159265); gl_FragColor=vec4(0.38,0.56,0.62,edge*fade*strength);}',
  });
  for (const x of [-3.7, 3.7]) {
    const cone = mesh(new THREE.ConeGeometry(2.3, 10, 24, 1, true), haze, x * .6, 5, -2);
    cone.rotation.z = x > 0 ? -.22 : .22;
  }
  const motePositions = new Float32Array(80 * 3);
  for (let i = 0; i < 80; i++) { motePositions[i * 3] = Math.sin(i * 27.1) * 5.5; motePositions[i * 3 + 1] = (i * .173 % 1) * 8; motePositions[i * 3 + 2] = Math.cos(i * 13.7) * 5 - 2; }
  const motesGeometry = new THREE.BufferGeometry(); motesGeometry.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  const motes = new THREE.Points(motesGeometry, new THREE.PointsMaterial({ color: 0xc7b183, size: .025, transparent: true, opacity: .6, depthWrite: false })); root.add(motes);
  // Repeated stonework shares geometry and material. Submit each set in one draw.
  const batches = new Map<string, THREE.Mesh[]>();
  for (const child of root.children) {
    if (!(child instanceof THREE.Mesh) || Array.isArray(child.material)) continue;
    const key = `${child.geometry.uuid}:${child.material.uuid}`;
    const batch = batches.get(key) ?? []; batch.push(child); batches.set(key, batch);
  }
  for (const batch of batches.values()) {
    if (batch.length < 2) continue;
    const first = batch[0]!;
    const instances = new THREE.InstancedMesh(first.geometry, first.material, batch.length);
    batch.forEach((object, index) => { object.updateMatrix(); instances.setMatrixAt(index, object.matrix); root.remove(object); });
    root.add(instances);
  }
  return { seal, sealMaterial, impact, cold, warm, haze, motes };
}
