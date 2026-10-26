import * as THREE from 'three';
import type { ExamEvent } from '../exam/engine';
import type { TitanPose } from '../exam/titanMotion';
import { sampleInkImage, type InkSample } from './ink';

/** Reused bounded effect geometry. It accepts presentation values, never battle actions. */
export function createBossEffects(scene: THREE.Scene, width: number, height: number) {
  const gold = new THREE.MeshBasicMaterial({ color: 0xffdb9a, transparent: true, opacity: .85, depthWrite: false });
  const strike = new THREE.Mesh(new THREE.CylinderGeometry(.025, .07, 1, 6), gold); scene.add(strike);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, .018, 4, 64), gold); ring.position.set(0, 3, 1); scene.add(ring);
  const inkMaterial = new THREE.MeshBasicMaterial({ color: 0x100a1c, side: THREE.DoubleSide });
  const tendrils = Array.from({ length: 8 }, (_, i) => {
    const geometry = new THREE.CylinderGeometry(.025, .22, 1, 6, 14, true);
    const mesh = new THREE.Mesh(geometry, inkMaterial); mesh.position.set(0, 3, .65); mesh.rotation.z = i * Math.PI / 4;
    scene.add(mesh); return { mesh, base: new Float32Array(geometry.attributes.position!.array) };
  });
  const trailGeometry = new THREE.BufferGeometry(); trailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(24 * 6), 3));
  const trailMaterial = new THREE.LineBasicMaterial({ color: 0x9ecbd3, transparent: true, opacity: .7, depthWrite: false });
  const trails = new THREE.LineSegments(trailGeometry, trailMaterial); trails.frustumCulled = false; scene.add(trails);
  const positions = new Float32Array(144 * 3), colors = new Float32Array(144 * 3);
  const inkGeometry = new THREE.BufferGeometry(); inkGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); inkGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const fragmentMaterial = new THREE.PointsMaterial({ size: .055, vertexColors: true, transparent: true, depthWrite: false });
  const fragments = new THREE.Points(inkGeometry, fragmentMaterial); fragments.frustumCulled = false; scene.add(fragments);
  let samples: InkSample[] = [];
  const color = new THREE.Color(), from = new THREE.Vector3(), to = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  return {
    trails,
    load(image: HTMLImageElement) {
      samples = sampleInkImage(image);
      samples.forEach((sample, i) => { color.setHex(sample.color); color.toArray(colors, i * 3); });
      inkGeometry.attributes.color!.needsUpdate = true; inkGeometry.setDrawRange(0, samples.length);
    },
    update(pose: TitanPose, event: ExamEvent | null, age: number, time: number, reduced: boolean) {
      const hit = event?.type === 'hit', wrath = event?.type === 'sweep', victory = event?.type === 'victory';
      strike.visible = hit && age < .3 && !reduced;
      from.set(2.7, .9, 6); to.set(0, 3, 1);
      strike.position.copy(from).lerp(to, .5); strike.quaternion.setFromUnitVectors(up, to.sub(from).normalize()); strike.scale.set(1, 6, 1);
      ring.visible = hit && age >= .14 && age < .85 && !reduced;
      ring.scale.setScalar(.15 + Math.max(0, age - .14) * 2.2); gold.opacity = Math.max(0, 1 - (age - .14) / .85);
      tendrils.forEach(({ mesh, base }, index) => {
        mesh.visible = wrath && !pose.done && !reduced;
        if (!mesh.visible) return;
        const reach = Math.sin(Math.min(1, age / 2.8) * Math.PI), p = mesh.geometry.attributes.position!;
        for (let i = 0; i < p.count; i++) {
          const t = base[i * 3 + 1]! + .5;
          p.setXYZ(i, base[i * 3]! + Math.sin(t * 5 + time * 3 + index) * t * .32, t * (1.8 + reach * 2.6), base[i * 3 + 2]! + t * t * pose.lunge * .6);
        }
        p.needsUpdate = true;
      });
      trails.visible = event?.type === 'storm' && age > .75 && age < 1.7 && !reduced;
      trailMaterial.opacity = Math.max(0, 1 - Math.max(0, age - 1.2) * 2);
      fragments.visible = victory && pose.dissolve > 0 && !reduced;
      if (fragments.visible) {
        const t = pose.dissolve;
        samples.forEach((sample, i) => {
          positions[i * 3] = (sample.x - .5) * width + Math.sin(i * 2.399) * t * (1 + i % 5 * .22);
          positions[i * 3 + 1] = Math.max(.2, 3 + (.5 - sample.y) * height - t * t * (2 + i % 4 * .6));
          positions[i * 3 + 2] = .9 + Math.cos(i * 2.399) * t * 1.7;
        });
        inkGeometry.attributes.position!.needsUpdate = true; fragmentMaterial.opacity = Math.max(0, 1 - Math.max(0, age - 2.7) / .8);
      }
    },
  };
}
