import type { Anchor, OccupancyMask } from './types.js';

export function occupiedPoints(mask: OccupancyMask): Array<{ x: number; y: number }> {
  return mask.cells.map(cell => ({ x: (cell % mask.width + 0.5) / mask.width, y: (Math.floor(cell / mask.width) + 0.5) / mask.height }));
}
export function nearestInk(mask: OccupancyMask, x: number, y: number): { x: number; y: number } {
  let nearest = { x: 0.5, y: 0.5 };
  let distance = Infinity;
  for (const point of occupiedPoints(mask)) {
    const next = (point.x - x) ** 2 + (point.y - y) ** 2;
    if (next < distance) { nearest = point; distance = next; }
  }
  return nearest;
}
export function placeAnchors(mask: OccupancyMask, conceptIds: string[]): Anchor[] {
  const points = occupiedPoints(mask);
  const targets = [{ x: 0.27, y: 0.28 }, { x: 0.73, y: 0.28 }, { x: 0.5, y: 0.7 }];
  const anchors: Anchor[] = [];
  conceptIds.forEach((conceptId, index) => {
    const target = targets[index % targets.length] ?? { x: 0.5, y: 0.5 };
    let best = points[0] ?? target;
    let score = Infinity;
    for (const point of points) {
      const crowding = anchors.reduce((sum, anchor) => sum + Math.max(0, 0.35 - Math.hypot(anchor.attachmentX - point.x, anchor.attachmentY - point.y)) * 2, 0);
      const candidate = Math.hypot(point.x - target.x, point.y - target.y) + crowding;
      if (candidate < score) { score = candidate; best = point; }
    }
    let x = best.x;
    let y = best.y;
    if (anchors.some(anchor => Math.hypot(anchor.x - x, anchor.y - y) < 0.24)) {
      x = target.x; y = target.y;
    }
    anchors.push({ conceptId, x: Math.max(0.06, Math.min(0.94, x)), y: Math.max(0.06, Math.min(0.94, y)), attachmentX: best.x, attachmentY: best.y });
  });
  // A sparse silhouette can put an early body directly on a later fallback target.
  // Move the whole constellation if any pair crowds; tethers still terminate on ink.
  if (anchors.some((anchor, index) => anchors.slice(index + 1).some(other => Math.hypot(anchor.x - other.x, anchor.y - other.y) < 0.24))) {
    return anchors.map((anchor, index) => ({ ...anchor, ...(targets[index] ?? { x: 0.5, y: 0.5 }) }));
  }
  return anchors;
}
export function moveAnchor(anchor: Anchor, mask: OccupancyMask, x: number, y: number): Anchor {
  const boundedX = Math.max(0.04, Math.min(0.96, x));
  const boundedY = Math.max(0.04, Math.min(0.96, y));
  const point = nearestInk(mask, boundedX, boundedY);
  return { ...anchor, x: boundedX, y: boundedY, attachmentX: point.x, attachmentY: point.y };
}
