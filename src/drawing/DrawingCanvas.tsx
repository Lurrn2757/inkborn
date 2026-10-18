import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { appendAction, compactDrawing, paintStroke, replayDrawing } from './actions.js';
import { DRAWING_HEIGHT, DRAWING_WIDTH, type DrawingDocument, type Point, type Stroke } from './types.js';

type Props = { drawing: DrawingDocument; onChange: (drawing: DrawingDocument) => void; tool: 'pen' | 'eraser'; color: string; brush: number; onError: (message: string) => void };
export function DrawingCanvas({ drawing, onChange, tool, color, brush, onError }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const active = useRef<Stroke | null>(null);
  const current = useRef(drawing);
  const [busy, setBusy] = useState(false);
  current.current = drawing;
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;
    let cancelled = false;
    const repaint = () => {
      const buffer = document.createElement('canvas'); buffer.width = DRAWING_WIDTH; buffer.height = DRAWING_HEIGHT;
      const bufferContext = buffer.getContext('2d');
      if (!bufferContext) return;
      void replayDrawing(bufferContext, drawing).then(() => {
        if (cancelled) return;
        context.clearRect(0, 0, DRAWING_WIDTH, DRAWING_HEIGHT);
        context.drawImage(buffer, 0, 0);
      }).catch(error => onError(error instanceof Error ? error.message : 'Drawing preview failed.'));
    };
    repaint();
    return () => { cancelled = true; };
  }, [drawing, onError]);
  function point(event: PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)), pressure: event.pointerType === 'pen' ? Math.max(0.15, event.pressure) : 0.75 };
  }
  function down(event: PointerEvent<HTMLCanvasElement>) {
    if (busy || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    active.current = { kind: 'stroke', tool, color, width: brush, points: [point(event)] };
    const context = event.currentTarget.getContext('2d');
    if (context) paintStroke(context, active.current);
  }
  function move(event: PointerEvent<HTMLCanvasElement>) {
    const stroke = active.current;
    if (!stroke) return;
    const next = point(event);
    const previous = stroke.points.at(-1);
    if (previous && Math.hypot(next.x - previous.x, next.y - previous.y) < 0.0007) return;
    stroke.points.push(next);
    const context = event.currentTarget.getContext('2d');
    if (context && previous) paintStroke(context, { ...stroke, points: [previous, next] });
  }
  function finish(event: PointerEvent<HTMLCanvasElement>) {
    const stroke = active.current;
    if (!stroke) return;
    active.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setBusy(true);
    void compactDrawing(appendAction(current.current, stroke)).then(onChange).catch(error => onError(error instanceof Error ? error.message : 'Unable to preserve this stroke.')).finally(() => setBusy(false));
  }
  return <canvas ref={canvas} className={`drawing-canvas ${tool === 'eraser' ? 'eraser-cursor' : ''}`} width={DRAWING_WIDTH} height={DRAWING_HEIGHT} aria-label="Draw your creature here using a mouse, pen or touch" onPointerDown={down} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish} />;
}
