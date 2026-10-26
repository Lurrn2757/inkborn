export interface InkSample { x: number; y: number; color: number; alpha: number }
const imageSamples = new WeakMap<HTMLImageElement, InkSample[]>();

/** Evenly samples occupied pixels, preserving actual drawing colors rather than inventing a silhouette. */
export function sampleInkPixels(pixels: Uint8ClampedArray, width: number, height: number, limit = 144): InkSample[] {
  if (limit < 1 || width < 1 || height < 1) return [];
  let occupied = 0;
  for (let index = 3; index < pixels.length; index += 4) if ((pixels[index] ?? 0) > 8) occupied++;
  const step = Math.max(1, occupied / limit);
  const samples: InkSample[] = [];
  let seen = 0, next = 0;
  for (let index = 0; index < width * height && samples.length < limit; index++) {
    const alpha = pixels[index * 4 + 3] ?? 0;
    if (alpha <= 8) continue;
    if (seen++ < next) continue;
    next += step;
    samples.push({ x: ((index % width) + .5) / width, y: (Math.floor(index / width) + .5) / height, color: ((pixels[index * 4] ?? 0) << 16) | ((pixels[index * 4 + 1] ?? 0) << 8) | (pixels[index * 4 + 2] ?? 0), alpha: alpha / 255 });
  }
  return samples;
}

export function sampleInkImage(image: HTMLImageElement): InkSample[] {
  const cached = imageSamples.get(image);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return [];
  try {
    context.drawImage(image, 0, 0);
    const samples = sampleInkPixels(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
    imageSamples.set(image, samples);
    return samples;
  } catch { return []; }
}

export function evaluateInkFragment(sample: InkSample, index: number, progress: number, width: number, height: number, reducedMotion: boolean) {
  const angle = index * 2.399963;
  const travel = reducedMotion ? 0 : progress * progress * (35 + index % 7 * 14);
  return {
    x: (sample.x - .5) * width + Math.cos(angle) * travel,
    y: (sample.y - .5) * height + Math.sin(angle) * travel - (reducedMotion ? 0 : progress * 52),
    size: 1.5 + index % 3,
    alpha: sample.alpha * Math.sin(Math.min(1, progress * 4) * Math.PI / 2) * (1 - progress),
  };
}

const rimCache = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
/** Cached lighting surrounds the real alpha edge; original drawing pixels render above it unchanged. */
export function createInkRim(image: HTMLImageElement): HTMLCanvasElement | null {
  const cached = rimCache.get(image);
  if (cached) return cached;
  const padding = 16;
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth + padding * 2;
  canvas.height = image.naturalHeight + padding * 2;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.shadowColor = '#ede3cd'; context.shadowBlur = 9;
  context.drawImage(image, padding, padding);
  context.shadowBlur = 0;
  context.globalCompositeOperation = 'destination-out';
  context.drawImage(image, padding, padding);
  context.globalCompositeOperation = 'source-in';
  context.fillStyle = '#ede3cd'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = 'source-over';
  rimCache.set(image, canvas);
  return canvas;
}
