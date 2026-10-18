import { DRAWING_HEIGHT, DRAWING_WIDTH, type DrawingAction, type DrawingDocument, type Stroke } from './types.js';

export function appendAction(document: DrawingDocument, action: DrawingAction): DrawingDocument {
  const actions = [...document.actions.slice(0, document.cursor), action];
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
export async function compactDrawing(drawing: DrawingDocument): Promise<DrawingDocument> {
  const active = drawing.actions.slice(0, drawing.cursor);
  let retainedPoints = active.reduce((sum, action) => sum + (action.kind === 'stroke' ? action.points.length : 0), 0);
  let flattenCount = Math.max(0, active.length - 100);
  for (let index = 0; index < flattenCount; index += 1) {
    const action = active[index];
    retainedPoints -= action?.kind === 'stroke' ? action.points.length : 0;
  }
  while (retainedPoints > 50_000 && flattenCount < active.length) {
    const action = active[flattenCount++];
    retainedPoints -= action?.kind === 'stroke' ? action.points.length : 0;
  }
  if (flattenCount === 0) return drawing;
  const canvas = document.createElement('canvas');
  canvas.width = DRAWING_WIDTH;
  canvas.height = DRAWING_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Drawing requires a browser with Canvas support.');
  await replayDrawing(context, { base: drawing.base, actions: active.slice(0, flattenCount), cursor: flattenCount });
  const actions = active.slice(flattenCount);
  return { base: canvas.toDataURL('image/png'), actions, cursor: actions.length };
}
