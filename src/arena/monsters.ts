import { monsterInputSchema, type MonsterInput } from '../../shared/arena/protocol.js';
import type { CreatureAsset } from '../drawing/types.js';

export const starterMonsters = [
  { id: 'warden', name: 'The Ink Warden', title: 'THE STEADFAST', description: 'A horned guardian of violet crystal and antique gold.', glyph: '♜' },
  { id: 'wisp', name: 'The Ember Wisp', title: 'THE RESTLESS', description: 'A flicker of living ink held inside a restless crystal shell.', glyph: '✦' },
  { id: 'oracle', name: 'The Pale Oracle', title: 'THE WATCHFUL', description: 'A many-faceted seer, crowned with a halo of forgotten signs.', glyph: '◉' },
] as const;
const savedMonsterKey = 'inkborn-arena-monster-v1';
export function savedArenaMonster(): MonsterInput | null {
  try { const value = localStorage.getItem(savedMonsterKey); if (!value) return null; const result = monsterInputSchema.safeParse(JSON.parse(value)); return result.success && result.data.kind === 'drawing' ? result.data : null; }
  catch { return null; }
}
export function storeArenaMonster(monster: MonsterInput) {
  try { localStorage.setItem(savedMonsterKey, JSON.stringify(monster)); return true; }
  catch { return false; }
}
/** Only transparent creature pixels are shared. Notes, keys and examination records stay local. */
export async function arenaMonsterFromSprite(sprite: Pick<CreatureAsset, 'dataUrl'>, name: string): Promise<MonsterInput> {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { image.onload = image.onerror = null; reject(new Error('The saved drawing could not be loaded. Try drawing again.')); }, 6000);
    image.onload = () => { clearTimeout(timer); resolve(); };
    image.onerror = () => { clearTimeout(timer); reject(new Error('The drawing image could not be read.')); };
    image.src = sprite.dataUrl;
  });
  if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth > 2048 || image.naturalHeight > 2048) throw new Error('This drawing is not a compatible INKBORN creature.');
  const canvas = document.createElement('canvas'), context = canvas.getContext('2d');
  if (!context) throw new Error('The browser could not prepare a shared creature image.');
  let maximum = 320;
  let dataUrl: string;
  do {
    const scale = Math.min(1, maximum / image.naturalWidth, maximum / image.naturalHeight);
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    context.clearRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
    dataUrl = canvas.toDataURL('image/png'); maximum = Math.floor(maximum * .8);
  } while (dataUrl.length > 128000 && maximum >= 48);
  if (dataUrl.length > 128000) throw new Error('This image is too detailed to share safely. Use a simpler drawing.');
  return monsterInputSchema.parse({ kind: 'drawing', dataUrl, name });
}
