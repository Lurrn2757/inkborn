import { loadDrawingImage } from './actions.js';
import { DRAWING_HEIGHT, DRAWING_WIDTH, type DrawingDocument } from './types.js';
import type { MonsterPreset } from '../creative/monsters.js';

/** Feed selected preset pixels through the same editable drawing/sprite pipeline. */
export async function createMonsterDrawing(preset: MonsterPreset): Promise<DrawingDocument> {
  const image = await loadDrawingImage(preset.src);
  const canvas = document.createElement('canvas'); canvas.width = DRAWING_WIDTH; canvas.height = DRAWING_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not prepare the monster. You can still draw your own.');
  const scale = Math.min((DRAWING_WIDTH - 80) / image.naturalWidth, (DRAWING_HEIGHT - 60) / image.naturalHeight);
  const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
  context.drawImage(image, (DRAWING_WIDTH - width) / 2, (DRAWING_HEIGHT - height) / 2, width, height);
  return { base: canvas.toDataURL('image/png'), actions: [], cursor: 0 };
}
