import { DRAWING_HEIGHT, DRAWING_WIDTH, type DrawingAction, type DrawingDocument, type Stroke } from './types.js';

export const MAX_HISTORY_ACTIONS = 100;
export const MAX_HISTORY_POINTS = 50_000;
export const MAX_STROKE_POINTS = 2_048;

/** Consecutive segments share their boundary point, preserving every connecting line. */
export function splitStroke(stroke: Stroke, limit = MAX_STROKE_POINTS): Stroke[] {
  if (!Number.isInteger(limit) || limit < 2) throw new Error('Stroke segments need at least two points.');
  if (stroke.points.length === 0) return [];
  const segments: Stroke[] = [];
  let start = 0;
  while (start < stroke.points.length) {
    const points = stroke.points.slice(start, start + limit);
    segments.push({ ...stroke, points });
    if (start + limit >= stroke.points.length) break;
    start += limit - 1;
  }
  return segments;
}

export function appendAction(document: DrawingDocument, action: DrawingAction): DrawingDocument {
  const appended = action.kind === 'stroke' ? splitStroke(action) : [action];
  const actions = [...document.actions.slice(0, document.cursor), ...appended];
  return { ...document, actions, cursor: actions.length };
}
export function undo(document: DrawingDocument): DrawingDocument {
  return { ...document, cursor: Math.max(0, document.cursor - 1) };
}
export function redo(document: DrawingDocument): DrawingDocument {
  return { ...document, cursor: Math.min(document.actions.length, document.cursor + 1) };
}
export function paintStroke(context: CanvasRenderingContext2D, stroke: Stroke): void {
  const first = stroke.points[0];
  if (!first) return;
  context.save();
  context.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
  context.strokeStyle = stroke.color;
  context.fillStyle = stroke.color;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  context.arc(first.x * DRAWING_WIDTH, first.y * DRAWING_HEIGHT, stroke.width * (0.55 + first.pressure * 0.45) / 2, 0, Math.PI * 2);
  context.fill();
  for (let index = 1; index < stroke.points.length; index += 1) {
    const previous = stroke.points[index - 1];
    const point = stroke.points[index];
    if (!previous || !point) continue;
    context.lineWidth = stroke.width * (0.55 + point.pressure * 0.45);
    context.beginPath();
    context.moveTo(previous.x * DRAWING_WIDTH, previous.y * DRAWING_HEIGHT);
    context.lineTo(point.x * DRAWING_WIDTH, point.y * DRAWING_HEIGHT);
    context.stroke();
  }
  context.restore();
}
export function loadDrawingImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The saved drawing image could not be opened.'));
    image.src = source;
  });
}
export async function replayDrawing(context: CanvasRenderingContext2D, drawing: DrawingDocument): Promise<void> {
  const base = drawing.base ? await loadDrawingImage(drawing.base) : null;
  context.clearRect(0, 0, DRAWING_WIDTH, DRAWING_HEIGHT);
  if (base) context.drawImage(base, 0, 0, DRAWING_WIDTH, DRAWING_HEIGHT);
  for (const action of drawing.actions.slice(0, drawing.cursor)) {
    if (action.kind === 'clear') context.clearRect(0, 0, DRAWING_WIDTH, DRAWING_HEIGHT);
    else paintStroke(context, action);
  }
}
/** Return an exact prefix to flatten; no action or point is discarded. */
export function planCompaction(drawing: DrawingDocument): { flatten: DrawingAction[]; retain: DrawingAction[] } {
  const active = drawing.actions.slice(0, drawing.cursor);
  let retainedPoints = active.reduce((sum, action) => sum + (action.kind === 'stroke' ? action.points.length : 0), 0);
  let flattenCount = Math.max(0, active.length - MAX_HISTORY_ACTIONS);
  for (let index = 0; index < flattenCount; index += 1) {
    const action = active[index];
    retainedPoints -= action?.kind === 'stroke' ? action.points.length : 0;
  }
  while (retainedPoints > MAX_HISTORY_POINTS && flattenCount < active.length) {
    const action = active[flattenCount++];
    retainedPoints -= action?.kind === 'stroke' ? action.points.length : 0;
  }
  return { flatten: active.slice(0, flattenCount), retain: active.slice(flattenCount) };
}

/** Safely apply an asynchronous flatten to a newer document that only appended actions. */
export function mergeCompaction(before: DrawingDocument, compacted: DrawingDocument, latest: DrawingDocument): DrawingDocument {
  if (latest === before) return compacted;
  const removed = before.cursor - compacted.cursor;
  if (removed <= 0 || latest.base !== before.base || latest.cursor < before.cursor
    || before.actions.slice(0, before.cursor).some((action, index) => latest.actions[index] !== action)) return latest;
  return { base: compacted.base, actions: latest.actions.slice(removed), cursor: latest.cursor - removed };
}

export async function compactDrawing(drawing: DrawingDocument): Promise<DrawingDocument> {
  const { flatten, retain } = planCompaction(drawing);
  if (flatten.length === 0) return drawing;
  const canvas = document.createElement('canvas');
  canvas.width = DRAWING_WIDTH;
  canvas.height = DRAWING_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Drawing requires a browser with Canvas support.');
  await replayDrawing(context, { base: drawing.base, actions: flatten, cursor: flatten.length });
  return { base: canvas.toDataURL('image/png'), actions: retain, cursor: retain.length };
}

/** Use for clear as well as strokes so every edit observes the same undo boundary. */
export async function appendAndCompact(drawing: DrawingDocument, action: DrawingAction): Promise<DrawingDocument> {
  return compactDrawing(appendAction(drawing, action));
}
