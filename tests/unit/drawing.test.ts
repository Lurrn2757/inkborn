import { describe, expect, it } from 'vitest';
import { appendAction, redo, undo } from '../../src/drawing/actions.js';
import { moveAnchor, placeAnchors } from '../../src/drawing/anchors.js';
import { visibleBounds } from '../../src/drawing/sprite.js';
import { emptyDrawing, type OccupancyMask, type Stroke } from '../../src/drawing/types.js';

const ink: Stroke = {
  kind: 'stroke', tool: 'pen', color: '#bd9857', width: 12,
  points: [{ x: 0.2, y: 0.4, pressure: 0.5 }, { x: 0.6, y: 0.7, pressure: 1 }],
};
const conceptIds = ['closed-path', 'ohms-law', 'series-parallel'];

describe('editable drawing history', () => {
  it('can undo and redo a clear, then discards only the redo branch when new ink is added', () => {
    const original = emptyDrawing();
    const drawn = appendAction(original, ink);
    const cleared = appendAction(drawn, { kind: 'clear' });
    expect(redo(undo(cleared))).toEqual(cleared);
    expect(undo(cleared).actions.slice(0, 1)).toEqual([ink]);

    const replacement = { ...ink, color: '#6dada5' };
    const branched = appendAction(undo(cleared), replacement);
    expect(branched.actions).toEqual([ink, replacement]);
    expect(redo(branched)).toEqual(branched);
    expect(original).toEqual({ base: null, actions: [], cursor: 0 });
    expect(cleared.actions).toEqual([ink, { kind: 'clear' }]);
  });

  it('clamps the history cursor and preserves the flattened base through edits', () => {
    const empty = emptyDrawing();
    expect(undo(empty).cursor).toBe(0);
    expect(redo(empty).cursor).toBe(0);
    const drawn = appendAction({ ...empty, base: 'data:image/png;base64,saved-ink' }, ink);
    expect(undo(undo(drawn)).cursor).toBe(0);
    expect(redo(redo(undo(drawn))).cursor).toBe(1);
    expect(undo(drawn).base).toBe(drawn.base);
    expect(appendAction(undo(drawn), { kind: 'clear' }).base).toBe(drawn.base);
  });
});

describe('transparent sprite bounds', () => {
  it('detects a blank drawing by alpha even when transparent pixels contain RGB values', () => {
    const pixels = new Uint8ClampedArray(4 * 3 * 4);
    pixels[0] = 255;
    pixels[1] = 42;
    expect(visibleBounds(pixels, 4, 3)).toBeNull();
  });

  it.each([[0, 0], [3, 0], [0, 2], [3, 2], [1, 1]])('retains a single visible pixel at (%i, %i) with inclusive dimensions', (x, y) => {
    const pixels = new Uint8ClampedArray(4 * 3 * 4);
    pixels[(y * 4 + x) * 4 + 3] = 1;
    expect(visibleBounds(pixels, 4, 3)).toEqual({ x, y, width: 1, height: 1 });
  });

  it('includes both extreme pixels of a disconnected drawing without cropping an edge', () => {
    const pixels = new Uint8ClampedArray(5 * 4 * 4);
    pixels[(0 * 5 + 1) * 4 + 3] = 255;
    pixels[(3 * 5 + 4) * 4 + 3] = 255;
    expect(visibleBounds(pixels, 5, 4)).toEqual({ x: 1, y: 0, width: 4, height: 4 });
  });
});

describe('silhouette attachment', () => {
  const masks: [string, OccupancyMask][] = [
    ['thin vertical silhouette', { width: 20, height: 20, cells: Array.from({ length: 20 }, (_, y) => y * 20 + 1) }],
    ['asymmetric disconnected silhouette', { width: 20, height: 20, cells: [2, 3, 22, 43, 109, 110, 111, 129, 150, 169, 360, 361, 380] }],
    ['single visible cell', { width: 20, height: 20, cells: [210] }],
  ];

  function attachmentCell(mask: OccupancyMask, x: number, y: number): number {
    return Math.floor(y * mask.height) * mask.width + Math.floor(x * mask.width);
  }

  it.each(masks)('keeps all three concept identities tethered to actual ink for a %s', (_name, mask) => {
    const anchors = placeAnchors(mask, conceptIds);
    expect(anchors.map((anchor) => anchor.conceptId)).toEqual(conceptIds);
    expect(anchors).toEqual(placeAnchors(mask, conceptIds));
    expect(new Set(anchors.map((anchor) => `${anchor.x},${anchor.y}`)).size).toBe(3);
    for (const anchor of anchors) {
      expect(mask.cells).toContain(attachmentCell(mask, anchor.attachmentX, anchor.attachmentY));
      expect(anchor.x).toBeGreaterThanOrEqual(0);
      expect(anchor.x).toBeLessThanOrEqual(1);
      expect(anchor.y).toBeGreaterThanOrEqual(0);
      expect(anchor.y).toBeLessThanOrEqual(1);
    }
  });

  it('separates crystal bodies when a sparse silhouette occupies a preferred fallback target', () => {
    const mask: OccupancyMask = { width: 20, height: 20, cells: [114] };
    const anchors = placeAnchors(mask, conceptIds);
    expect(anchors.map((anchor) => anchor.conceptId)).toEqual(conceptIds);
    for (const [index, anchor] of anchors.entries()) {
      expect(attachmentCell(mask, anchor.attachmentX, anchor.attachmentY)).toBe(114);
      for (const other of anchors.slice(index + 1)) {
        expect(Math.hypot(anchor.x - other.x, anchor.y - other.y)).toBeGreaterThanOrEqual(0.24);
      }
    }
    expect(anchors).toEqual(placeAnchors(mask, conceptIds));
  });

  it('clamps a moved crystal while keeping its identity and snapping its tether to visible ink', () => {
    const mask: OccupancyMask = { width: 10, height: 10, cells: [9, 90] };
    const original = placeAnchors(mask, conceptIds)[0]!;
    const moved = moveAnchor(original, mask, 20, -10);
    expect(moved.conceptId).toBe(original.conceptId);
    expect(moved.x).toBeGreaterThanOrEqual(0);
    expect(moved.x).toBeLessThanOrEqual(1);
    expect(moved.y).toBeGreaterThanOrEqual(0);
    expect(moved.y).toBeLessThanOrEqual(1);
    expect(attachmentCell(mask, moved.attachmentX, moved.attachmentY)).toBe(9);
    expect(original).toEqual(placeAnchors(mask, conceptIds)[0]);
  });
});
