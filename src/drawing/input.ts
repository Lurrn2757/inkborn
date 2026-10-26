import type { Point } from './types.js';

type PointerSample = { clientX: number; clientY: number; pointerType: string; pressure: number };
type DrawingRect = { left: number; top: number; width: number; height: number };

/** CSS coordinates map to the fixed logical surface independently of DPR. */
export function normalizePointer(sample: PointerSample, rect: DrawingRect): Point {
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  return {
    x: clamp((sample.clientX - rect.left) / Math.max(1, rect.width)),
    y: clamp((sample.clientY - rect.top) / Math.max(1, rect.height)),
    pressure: sample.pointerType === 'pen' ? Math.max(0.15, clamp(sample.pressure)) : 0.75,
  };
}
