/** Original procedural weathered stone; no downloaded artwork. See ASSETS-LICENSE.md. */
import * as THREE from 'three';
export function basaltTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  if (context) {
    const pixels = context.createImageData(256, 256);
    let seed = 49171;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      seed = Math.imul(seed, 1664525) + 1013904223 | 0;
      const grain = (seed >>> 0) / 4294967296, strata = Math.sin(y * .09 + Math.sin(x * .021) * 3) * 10;
      const value = 156 + grain * 42 + strata, i = (y * 256 + x) * 4;
      pixels.data[i] = value; pixels.data[i + 1] = value - 5; pixels.data[i + 2] = value + 3; pixels.data[i + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    for (let i = 0; i < 32; i++) {
      const x = (i * 73) % 256, y = (i * 119) % 256;
      context.strokeStyle = i % 3 ? '#19151e50' : '#d1bb9c35'; context.lineWidth = i % 5 ? .5 : 1.4;
      context.beginPath(); context.moveTo(x, y); context.lineTo(x + 9, y + 5); context.lineTo(x + 15, y + 4); context.lineTo(x + 23, y + 14); context.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; return texture;
}
