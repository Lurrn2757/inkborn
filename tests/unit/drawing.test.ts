import { describe, expect, it } from 'vitest';
import { appendAction, MAX_HISTORY_POINTS, MAX_STROKE_POINTS, mergeCompaction, planCompaction, redo, splitStroke, undo } from '../../src/drawing/actions.js';
import { moveAnchor, nearestInk, placeAnchors } from '../../src/drawing/anchors.js';
import { normalizePointer } from '../../src/drawing/input.js';
import { createOccupancyMask, visibleBounds } from '../../src/drawing/sprite.js';
import { emptyDrawing, type DrawingAction, type OccupancyMask, type Stroke } from '../../src/drawing/types.js';

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

  it('flattens only the oldest prefix after 100 actions, including clear, without discarding an edit', () => {
    const actions: DrawingAction[] = Array.from({ length: 103 }, (_, index) => index === 1 ? { kind: 'clear' } : { ...ink, color: `color-${index}` });
    const drawing = { base: null, actions, cursor: actions.length };
    const plan = planCompaction(drawing);
    expect(plan.flatten).toEqual(actions.slice(0, 3));
    expect(plan.retain).toEqual(actions.slice(3));
    expect([...plan.flatten, ...plan.retain]).toEqual(actions);
    expect(plan.retain).toHaveLength(100);
    expect(planCompaction({ ...drawing, cursor: 100 }).flatten).toEqual([]);
    expect(drawing.actions).toEqual(actions);
  });

  it('segments a very long stroke with every point and connecting edge preserved, then bounds retained points', () => {
    const points = Array.from({ length: MAX_HISTORY_POINTS + 123 }, (_, index) => ({ x: index / 60_000, y: (index % 100) / 100, pressure: 0.7 }));
    const stroke: Stroke = { ...ink, points };
    const segments = splitStroke(stroke);
    expect(segments.every((segment) => segment.points.length <= MAX_STROKE_POINTS)).toBe(true);
    expect(segments.flatMap((segment, index) => index === 0 ? segment.points : segment.points.slice(1))).toEqual(points);
    for (const [index, segment] of segments.entries()) {
      if (index > 0) expect(segment.points[0]).toEqual(segments[index - 1]!.points.at(-1));
    }
    const document = appendAction(emptyDrawing(), stroke);
    const plan = planCompaction(document);
    expect(plan.flatten.length).toBeGreaterThan(0);
    expect(plan.retain.reduce((total, action) => total + (action.kind === 'stroke' ? action.points.length : 0), 0)).toBeLessThanOrEqual(MAX_HISTORY_POINTS);
    expect([...plan.flatten, ...plan.retain]).toEqual(document.actions);
    expect(() => splitStroke(stroke, 1)).toThrow();
  });

  it('merges a completed flatten with new ink but rejects a flatten over an intervening undo or replacement', () => {
    const actions: DrawingAction[] = Array.from({ length: 102 }, () => ({ ...ink }));
    const before = { base: null, actions, cursor: actions.length };
    const compacted = { base: 'data:image/png;base64,prefix', actions: actions.slice(2), cursor: 100 };
    const latest = appendAction(before, { kind: 'clear' });
    expect(mergeCompaction(before, compacted, latest)).toEqual({ base: compacted.base, actions: [...actions.slice(2), { kind: 'clear' }], cursor: 101 });
    expect(mergeCompaction(before, compacted, before)).toBe(compacted);
    const undone = undo(before);
    expect(mergeCompaction(before, compacted, undone)).toBe(undone);
    const replaced = appendAction(undo(before), { kind: 'clear' });
    expect(mergeCompaction(before, compacted, replaced)).toBe(replaced);
  });
});

describe('drawing coordinate mapping', () => {
  it('maps equivalent CSS positions identically after resize, independently of backing resolution', () => {
    const sample = { clientX: 300, clientY: 200, pointerType: 'mouse', pressure: 0 };
    expect(normalizePointer(sample, { left: 100, top: 50, width: 400, height: 300 })).toEqual({ x: 0.5, y: 0.5, pressure: 0.75 });
    expect(normalizePointer({ ...sample, clientX: 500, clientY: 350 }, { left: 100, top: 50, width: 800, height: 600 })).toEqual({ x: 0.5, y: 0.5, pressure: 0.75 });
  });

  it('clamps captured pointers outside the drawing and preserves bounded pen pressure', () => {
    const rect = { left: 10, top: 20, width: 100, height: 50 };
    expect(normalizePointer({ clientX: -10, clientY: 900, pointerType: 'pen', pressure: 2 }, rect)).toEqual({ x: 0, y: 1, pressure: 1 });
    expect(normalizePointer({ clientX: 50, clientY: 30, pointerType: 'pen', pressure: 0 }, rect).pressure).toBe(0.15);
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

  it('retains isolated faint pixels and tethers to their exact positions inside coarse mask cells', () => {
    const width = 120; const height = 80;
    const pixels = new Uint8ClampedArray(width * height * 4);
    const inkPixels = [1, 33 * width + 99, 79 * width + 119];
    for (const pixel of inkPixels) pixels[pixel * 4 + 3] = 1;
    const mask = createOccupancyMask(pixels, width, height, 8);
    expect(mask.cells).toHaveLength(3);
    const anchors = placeAnchors(mask, conceptIds);
    for (const anchor of anchors) {
      const pixel = Math.floor(anchor.attachmentY * height) * width + Math.floor(anchor.attachmentX * width);
      expect(inkPixels).toContain(pixel);
      expect(pixels[pixel * 4 + 3]).toBeGreaterThan(0);
    }
    expect(mask).toEqual(createOccupancyMask(pixels, width, height, 8));
  });
});

describe('silhouette attachment', () => {
  const masks: [string, OccupancyMask][] = [
    ['thin vertical silhouette', { width: 20, height: 20, cells: Array.from({ length: 20 }, (_, y) => y * 20 + 1) }],
    ['thin horizontal silhouette', { width: 20, height: 20, cells: Array.from({ length: 20 }, (_, x) => 200 + x) }],
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
    for (const [index, anchor] of anchors.entries()) {
      for (const other of anchors.slice(index + 1)) expect(Math.hypot(anchor.x - other.x, anchor.y - other.y)).toBeGreaterThanOrEqual(0.24);
    }
    expect(anchors).toEqual(placeAnchors({ ...mask, cells: [...mask.cells].reverse() }, conceptIds));
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

  it('preserves separation and visible attachments for a single cell anywhere in the silhouette', () => {
    for (let cell = 0; cell < 400; cell += 1) {
      const mask = { width: 20, height: 20, cells: [cell] };
      const anchors = placeAnchors(mask, conceptIds);
      for (const [index, anchor] of anchors.entries()) {
        expect(attachmentCell(mask, anchor.attachmentX, anchor.attachmentY)).toBe(cell);
        for (const other of anchors.slice(index + 1)) expect(Math.hypot(anchor.x - other.x, anchor.y - other.y)).toBeGreaterThanOrEqual(0.24);
      }
    }
  });

  it('rejects empty ink instead of inventing an attachment point', () => {
    const empty = { width: 20, height: 20, cells: [] };
    expect(() => placeAnchors(empty, conceptIds)).toThrow(/visible ink/);
    expect(() => nearestInk(empty, 0.5, 0.5)).toThrow(/visible ink/);
  });
});
