import { replayDrawing } from './actions.js';
import { placeAnchors } from './anchors.js';
import { DRAWING_HEIGHT, DRAWING_WIDTH, type CreatureAsset, type DrawingDocument, type OccupancyMask } from './types.js';

export function visibleBounds(data: Uint8ClampedArray, width: number, height: number): CreatureAsset['bounds'] | null {
  let left = width; let top = height; let right = -1; let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((data[(y * width + x) * 4 + 3] ?? 0) > 0) {
        left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
    }
  }
  return right < 0 ? null : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}
function pixelHash(data: Uint8ClampedArray): string {
  let hash = 2166136261;
  for (const byte of data) { hash ^= byte; hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
export async function prepareSprite(drawing: DrawingDocument, conceptIds: string[]): Promise<CreatureAsset> {
  const source = document.createElement('canvas');
  source.width = DRAWING_WIDTH; source.height = DRAWING_HEIGHT;
  const context = source.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Your browser could not create a drawing surface.');
  await replayDrawing(context, drawing);
  const bounds = visibleBounds(context.getImageData(0, 0, source.width, source.height).data, source.width, source.height);
  if (!bounds) throw new Error('A creature needs a little ink. Draw something before you awaken it.');
  const padding = 40;
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 1024 / (bounds.width + padding * 2), 1024 / (bounds.height + padding * 2));
  canvas.width = Math.round((bounds.width + padding * 2) * scale); canvas.height = Math.round((bounds.height + padding * 2) * scale);
  const cropped = canvas.getContext('2d');
  if (!cropped) throw new Error('Your drawing could not be prepared. Please try again.');
  cropped.drawImage(source, bounds.x, bounds.y, bounds.width, bounds.height, padding * scale, padding * scale, bounds.width * scale, bounds.height * scale);
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = 80; maskCanvas.height = 80;
  const maskContext = maskCanvas.getContext('2d', { willReadFrequently: true });
  if (!maskContext) throw new Error('The creature silhouette could not be read.');
  maskContext.drawImage(canvas, 0, 0, 80, 80);
  const maskPixels = maskContext.getImageData(0, 0, 80, 80).data;
  const mask: OccupancyMask = { width: 80, height: 80, cells: [] };
  for (let index = 0; index < 80 * 80; index += 1) if ((maskPixels[index * 4 + 3] ?? 0) > 0) mask.cells.push(index);
  return {
    id: crypto.randomUUID(), dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height,
    hash: pixelHash(cropped.getImageData(0, 0, canvas.width, canvas.height).data),
    mask, anchors: placeAnchors(mask, conceptIds), bounds,
  };
}
