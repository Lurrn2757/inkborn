/** Original INKBORN crystal titan and ritual arena composition. Protected asset; see ASSETS-LICENSE.md. */
import * as THREE from 'three';
import { basaltTexture } from './basalt';
import type { CreatureAsset } from '../drawing/types.js';

export function buildTitanChamber(scene: THREE.Scene, sprite: CreatureAsset) {
  const stone = new THREE.MeshLambertMaterial({ map: basaltTexture(), color: 0x5b4f60, emissive: 0x09070d });
  const dark = new THREE.MeshLambertMaterial({ color: 0x101018 });
  const gold = new THREE.MeshBasicMaterial({ color: 0x957345 });
  const rune = new THREE.MeshBasicMaterial({ color: 0x9475db });
  const crystal = new THREE.MeshStandardMaterial({ color: 0x59416c, emissive: 0x141322, metalness: .5, roughness: .28, flatShading: true });
  const lightCrystal = new THREE.MeshStandardMaterial({ color: 0xaca0b6, emissive: 0x1b242b, metalness: .42, roughness: .32, flatShading: true });
  const coreMat = new THREE.MeshBasicMaterial({ color: 0x94809c });
  const ambient = new THREE.HemisphereLight(0xd5c4ee, 0x241225, 2); scene.add(ambient);
  const light = new THREE.DirectionalLight(0xf1d4ae, 3); light.position.set(-3, 8, 6); scene.add(light);
  const impactLight = new THREE.PointLight(0xc5a0ff, 0, 14, 2); impactLight.position.set(0, 3, 3); scene.add(impactLight);
  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
    const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m;
  }
  const oct = new THREE.OctahedronGeometry(1, 1), box = new THREE.BoxGeometry(1, 1, 1), ring = new THREE.TorusGeometry(1, .012, 3, 64);
  mesh(new THREE.CylinderGeometry(4.5, 4.7, .28, 48), stone, scene, 0, -.2);
  mesh(new THREE.CylinderGeometry(4.1, 4.3, .18, 48), dark, scene, 0, .03);
  for (const r of [2.9, 3.5, 4.05]) { const o = mesh(ring, gold, scene, 0, .14, 0, r, r, r); o.rotation.x = -Math.PI / 2; }
  const floorLines: number[] = [];
  for (let i = 0; i < 32; i++) { const a = i * Math.PI / 16; const r = i % 4 ? 3.6 : 3.2; floorLines.push(Math.sin(a) * r, .15, Math.cos(a) * r, Math.sin(a) * 3.95, .15, Math.cos(a) * 3.95); }
  const runeGeo = new THREE.BufferGeometry(); runeGeo.setAttribute('position', new THREE.Float32BufferAttribute(floorLines, 3)); scene.add(new THREE.LineSegments(runeGeo, new THREE.LineBasicMaterial({ color: 0xae8bd9 })));
  const columns = new THREE.InstancedMesh(box, stone, 12), trims = new THREE.InstancedMesh(box, gold, 12), dummy = new THREE.Object3D();
  for (let i = 0; i < 12; i++) { const a = Math.PI * (.1 + i * .8 / 11); dummy.position.set(Math.cos(a) * 7.3, 4.1, -Math.sin(a) * 7.3 - 1); dummy.scale.set(.5, 8.1, .6); dummy.rotation.set(0, a, 0); dummy.updateMatrix(); columns.setMatrixAt(i, dummy.matrix); dummy.position.y = 7.5; dummy.scale.set(.8, .18, .9); dummy.updateMatrix(); trims.setMatrixAt(i, dummy.matrix); }
  scene.add(columns, trims);
  // Physical pointed Gothic portal, receding behind the titan.
  for (const side of [-1, 1]) { const rib = mesh(box, stone, scene, side * 1.3, 6, -8, .24, 3.1, .4); rib.rotation.z = side * -.46; mesh(box, gold, scene, side * 2, 3.1, -8, .08, 3.8, .2); }
  const halo = mesh(ring, rune, scene, 0, 3, -1.1, 2.9, 2.9, 2.9);
  const shadow = mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .4, depthWrite: false }), scene, 0, .16, .1, 2.5, 1.4, 1); shadow.rotation.x = -Math.PI / 2;
  const titan = new THREE.Group(); titan.position.y = 2.9; scene.add(titan);
  const shell: THREE.Mesh[] = [];
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; const m = mesh(oct, i % 2 ? crystal : lightCrystal, titan, Math.sin(a) * 1.85, Math.cos(a) * 2, -.25, .45 + i % 2 * .15, .8, .5); m.rotation.z = -a; shell.push(m); }
  const fractureGeometry = new THREE.BufferGeometry();
  fractureGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0,.7,.55,-.12,.28,.83,-.12,.28,.83,.08,.05,.98,.08,.05,.98,-.06,-.3,.8,-.06,-.3,.8,.1,-.65,.55],3));
  const fractureMaterial = new THREE.LineBasicMaterial({ color: 0xbee5df, transparent: true, opacity: 0 });
  shell.forEach(s => s.add(new THREE.LineSegments(fractureGeometry, fractureMaterial)));
  const head = mesh(oct, lightCrystal, titan, 0, 2.2, 0, .7, .9, .65);
  mesh(oct, coreMat, titan, 0, .3, -.05, .85, 1.05, .4);
  const elbows: THREE.Group[] = [];
  const arms = [-1, 1].map(side => {
    const pivot = new THREE.Group(); pivot.position.set(side * 1.7, .9, -.05); titan.add(pivot);
    mesh(oct, crystal, pivot, side * .6, -.65, 0, .7, 1.25, .65).rotation.z = side * .5;
    const elbow = new THREE.Group(); elbow.position.set(side * .9, -1.2, .1); pivot.add(elbow); elbows.push(elbow);
    mesh(oct, lightCrystal, elbow, side * .22, -.2, 0, .65, .8, .75); return pivot;
  });
  // Crown and articulated gauntlet details remain procedural around the owner's ink.
  const crown = new THREE.InstancedMesh(oct, lightCrystal, 5); titan.add(crown);
  for (let i = 0; i < 5; i++) { const x = (i - 2) * .3; dummy.position.set(x, 2.5 + (2 - Math.abs(i - 2)) * .13, -.05); dummy.rotation.set(0, 0, -x * .45); dummy.scale.set(.14, .5 + (i % 2) * .13, .16); dummy.updateMatrix(); crown.setMatrixAt(i, dummy.matrix); }
  arms.forEach((pivot, sideIndex) => {
    const side = sideIndex ? 1 : -1;
    const fingers = new THREE.InstancedMesh(oct, lightCrystal, 4); const elbow = elbows[sideIndex]!; elbow.add(fingers);
    for (let i = 0; i < 4; i++) { dummy.position.set(side * (.13 + i * .13), -.7 + i * .04, .12); dummy.rotation.set(0, 0, side * (.08 + i * .12)); dummy.scale.set(.12, .48 - i * .045, .16); dummy.updateMatrix(); fingers.setMatrixAt(i, dummy.matrix); }
    const etched = new THREE.BufferGeometry(); etched.setAttribute('position', new THREE.Float32BufferAttribute([side * .3, -.3, .6, side * .7, -.72, .68, side * .7, -.72, .68, side * .5, -.95, .65, side * .5, -.95, .65, side * .95, -1.3, .65], 3)); pivot.add(new THREE.LineSegments(etched, new THREE.LineBasicMaterial({ color: 0xd3b57e })));
  });
  // Light parchment energy behind the real transparent ink keeps dark strokes readable.
  const soulMat = new THREE.MeshBasicMaterial({ color: 0xe2cdb2, transparent: true, opacity: .83, depthWrite: false });
  const backing = mesh(new THREE.PlaneGeometry(1, 1), soulMat, titan, 0, .12, .77);
  const ratio = sprite.width / sprite.height;
  const inkHeight = Math.min(4, 3.8 / ratio), inkWidth = inkHeight * ratio;
  backing.scale.set(inkWidth * 1.06, inkHeight * 1.06, 1);
  const inkGeometry = new THREE.PlaneGeometry(inkWidth, inkHeight, 28, 28);
  const base = new Float32Array(inkGeometry.attributes.position!.array);
  const inkMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, opacity: 1 });
  const ink = mesh(inkGeometry, inkMat, titan, 0, .12, .8); ink.renderOrder = 4;
  const dissolveUniform = { value: 0 };
  inkMat.onBeforeCompile = shader => {
    shader.uniforms.inkDissolve = dissolveUniform;
    shader.fragmentShader = 'uniform float inkDissolve;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <alphatest_fragment>', `
      #include <alphatest_fragment>
      #ifdef USE_MAP
      float grain=fract(sin(dot(floor(vMapUv*100.),vec2(12.9898,78.233)))*43758.5453);
      float remaining=smoothstep(inkDissolve-.035,inkDissolve+.035,grain);
      diffuseColor.a*=inkDissolve>.001?remaining:1.;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.67,.4,.2),inkDissolve>.001?(1.-smoothstep(.0,.07,grain-inkDissolve))*.7:0.);
      #endif
    `);
  };
  const shardMat = new THREE.MeshBasicMaterial({ color: 0xb792ee });
  const shards = new THREE.InstancedMesh(oct, shardMat, 24); shards.frustumCulled = false; scene.add(shards);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xb88aef, transparent: true, opacity: .55, depthWrite: false });
  const beam = mesh(new THREE.CylinderGeometry(.12, .45, 7, 8, 1, true), beamMat, scene, 0, 2.3, 3.4); beam.rotation.x = Math.PI / 2; beam.visible = false;
  const wave = mesh(ring, beamMat, scene, 0, .2, 0); wave.rotation.x = -Math.PI / 2;
  const shield = mesh(new THREE.TorusGeometry(1.5, .016, 4, 48), new THREE.MeshBasicMaterial({ color: 0x9cbeba, transparent: true, opacity: .5 }), scene, 0, .8, 4.8); shield.scale.y = .45;
  const cracksPoints: number[] = [];
  for (let i = 0; i < 9; i++) { const a = i * 2.399; cracksPoints.push(0, .19, .5, Math.cos(a) * (2 + i % 2), .19, Math.sin(a) * (2 + i % 2) + .5); }
  const crackGeo = new THREE.BufferGeometry(); crackGeo.setAttribute('position', new THREE.Float32BufferAttribute(cracksPoints, 3));
  const cracks = new THREE.LineSegments(crackGeo, new THREE.LineBasicMaterial({ color: 0x9875b8, transparent: true, opacity: .6 })); scene.add(cracks); cracks.visible = false;
  const particlePositions = new Float32Array(72 * 3);
  for (let i = 0; i < 72; i++) { particlePositions[i * 3] = Math.sin(i * 13) * 5; particlePositions[i * 3 + 1] = i % 17 * .37; particlePositions[i * 3 + 2] = Math.cos(i * 7.3) * 5 - 1; }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3)); const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xa88dbd, size: .035, sizeAttenuation: true })); scene.add(dust);
  // Special performances share bounded reusable geometry; no fullscreen postprocessing.
  const finisherMat = new THREE.MeshBasicMaterial({ color: 0xffd78b });
  const playerSpears = new THREE.InstancedMesh(oct, finisherMat, 9); playerSpears.frustumCulled = false; playerSpears.visible = false; scene.add(playerSpears);
  const spearTrailGeometry = new THREE.BufferGeometry(); spearTrailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9 * 6), 3));
  const spearTrails = new THREE.LineSegments(spearTrailGeometry, new THREE.LineBasicMaterial({ color: 0xb998e8, transparent: true, opacity: .8 })); spearTrails.visible = false; scene.add(spearTrails);
  const playerSigil = mesh(new THREE.TorusGeometry(1.65, .045, 4, 48), finisherMat, scene, 0, 1.4, 5.4); playerSigil.visible = false;
  const strikeRing = mesh(ring, finisherMat, scene, 0, 3, 1.1); strikeRing.visible = false;
  const eclipse = new THREE.Group(); eclipse.position.set(0, 3, -.8); eclipse.visible = false; scene.add(eclipse);
  mesh(new THREE.CircleGeometry(2.4, 48), new THREE.MeshBasicMaterial({ color: 0x010106 }), eclipse);
  const eclipseRim = mesh(new THREE.TorusGeometry(2.43, .075, 4, 64), new THREE.MeshBasicMaterial({ color: 0x9b5ad4 }), eclipse);
  const eclipseOrbit = mesh(ring, new THREE.MeshBasicMaterial({ color: 0x6e367e }), eclipse, 0, 0, .01, 2.8, 2.8, 2.8); eclipseOrbit.rotation.x = .5;
  const judgmentMat = new THREE.MeshBasicMaterial({ color: 0x8f49b5, transparent: true, opacity: .72, depthWrite: false });
  const judgmentBeam = mesh(new THREE.CylinderGeometry(.28, .68, 1, 10, 1, true), judgmentMat, scene); judgmentBeam.visible = false;
  const shieldPieces = new THREE.InstancedMesh(oct, finisherMat, 18); shieldPieces.frustumCulled = false; shieldPieces.visible = false; scene.add(shieldPieces);
  return { fractureMaterial, elbows, dissolveUniform, crystal, coreMat, halo, titan, head, arms, inkGeometry, base, inkMat, inkHeight, inkWidth, backing, soulMat, shell, shards, dummy, beam, wave, cracks, shield, dust, impactLight, ambient, light, playerSpears, spearTrails, playerSigil, strikeRing, eclipse, eclipseRim, eclipseOrbit, judgmentBeam, judgmentMat, shieldPieces };
}
