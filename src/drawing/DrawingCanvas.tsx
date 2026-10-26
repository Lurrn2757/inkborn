import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, type PointerEvent, type Ref } from 'react';
import { appendAction, compactDrawing, MAX_STROKE_POINTS, mergeCompaction, paintStroke, planCompaction, replayDrawing } from './actions.js';
import { normalizePointer } from './input.js';
import { DRAWING_HEIGHT, DRAWING_WIDTH, type DrawingDocument, type Point, type Stroke } from './types.js';

export interface DrawingCanvasHandle {
  /** Commit the current stroke and await lossless history compaction before navigation. */
  flush(): Promise<DrawingDocument>;
}
type Props = {
  drawing: DrawingDocument;
  onChange: (drawing: DrawingDocument) => void;
  tool: 'pen' | 'eraser'; color: string; brush: number;
  onError: (message: string) => void;
  ref?: Ref<DrawingCanvasHandle>;
};
type ActiveStroke = { pointerId: number; stroke: Stroke; continued: boolean };

export function DrawingCanvas({ drawing, onChange, tool, color, brush, onError, ref }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const active = useRef<ActiveStroke | null>(null);
  const current = useRef(drawing);
  const previousProp = useRef(drawing);
  const callbacks = useRef({ onChange, onError });
  callbacks.current = { onChange, onError };
  if (drawing !== previousProp.current) {
    previousProp.current = drawing;
    current.current = drawing;
  }
  const replayRevision = useRef(0);
  const mounted = useRef(false);
  const settling = useRef<Promise<DrawingDocument> | null>(null);

  const reportError = useCallback((error: unknown) => {
    if (mounted.current) callbacks.current.onError(error instanceof Error ? error.message : 'The drawing could not be preserved.');
  }, []);
  const publish = useCallback((next: DrawingDocument) => {
    current.current = next;
    callbacks.current.onChange(next);
  }, []);

  const settle = useCallback((): Promise<DrawingDocument> => {
    if (settling.current) return settling.current;
    const job = async () => {
      while (planCompaction(current.current).flatten.length > 0) {
        const before = current.current;
        const compacted = await compactDrawing(before);
        const merged = mergeCompaction(before, compacted, current.current);
        if (merged !== current.current) {
          // A late image decode from an abandoned workbench cannot replace a new session.
          if (mounted.current) publish(merged);
          else current.current = merged;
        }
        // If external undo or clear replaced this prefix, retry the latest document.
      }
      return current.current;
    };
    settling.current = job().finally(() => { settling.current = null; });
    return settling.current;
  }, [publish]);

  const finish = useCallback(() => {
    const pending = active.current;
    if (!pending) return;
    active.current = null;
    const element = canvas.current;
    if (element?.hasPointerCapture(pending.pointerId)) element.releasePointerCapture(pending.pointerId);
    if (!pending.continued || pending.stroke.points.length > 1) publish(appendAction(current.current, pending.stroke));
    void settle().catch(reportError);
  }, [publish, reportError, settle]);
  const flush = useCallback(async () => { finish(); await settle(); return current.current; }, [finish, settle]);
  useImperativeHandle(ref, () => ({ flush }), [flush]);

  const paintLive = useCallback((stroke: Stroke) => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;
    context.setTransform(element.width / DRAWING_WIDTH, 0, 0, element.height / DRAWING_HEIGHT, 0, 0);
    paintStroke(context, stroke);
  }, []);

  const repaint = useCallback(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;
    const revision = ++replayRevision.current;
    const snapshot = current.current;
    const buffer = document.createElement('canvas');
    buffer.width = element.width; buffer.height = element.height;
    const bufferContext = buffer.getContext('2d');
    if (!bufferContext) return;
    bufferContext.setTransform(buffer.width / DRAWING_WIDTH, 0, 0, buffer.height / DRAWING_HEIGHT, 0, 0);
    void replayDrawing(bufferContext, snapshot).then(() => {
      if (!mounted.current || revision !== replayRevision.current || current.current !== snapshot) return;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, element.width, element.height);
      context.drawImage(buffer, 0, 0);
      // The base image may finish decoding after a new pointer stroke started.
      if (active.current) paintLive(active.current.stroke);
    }).catch(error => { if (mounted.current && revision === replayRevision.current) reportError(error); });
  }, [paintLive, reportError]);

  useLayoutEffect(() => { repaint(); }, [drawing, repaint]);
  useLayoutEffect(() => {
    // Tool, color and brush changes finish the old stroke with its original settings.
    return finish;
  }, [tool, color, brush, finish]);
  useEffect(() => {
    mounted.current = true;
    const element = canvas.current;
    if (!element) return;
    const resize = () => {
      const rect = element.getBoundingClientRect();
      const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      const width = Math.max(1, Math.round(rect.width * ratio));
      const height = Math.max(1, Math.round(rect.height * ratio));
      if (element.width !== width || element.height !== height) {
        element.width = width; element.height = height;
      }
      repaint();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    window.addEventListener('resize', resize);
    window.addEventListener('blur', finish);
    resize();
    return () => {
      finish();
      mounted.current = false;
      replayRevision.current += 1;
      observer.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('blur', finish);
    };
  }, [finish, repaint]);

  function addPoint(point: Point) {
    const pending = active.current;
    if (!pending) return;
    const previous = pending.stroke.points.at(-1);
    if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < 0.0003 && Math.abs(point.pressure - previous.pressure) < 0.02) return;
    pending.stroke.points.push(point);
    if (previous) paintLive({ ...pending.stroke, points: [previous, point] });
    if (pending.stroke.points.length >= MAX_STROKE_POINTS) {
      publish(appendAction(current.current, pending.stroke));
      pending.stroke = { ...pending.stroke, points: [point] };
      pending.continued = true;
      void settle().catch(reportError);
    }
  }
  function down(event: PointerEvent<HTMLCanvasElement>) {
    if (active.current || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = normalizePointer(event, event.currentTarget.getBoundingClientRect());
    active.current = { pointerId: event.pointerId, continued: false, stroke: { kind: 'stroke', tool, color, width: brush, points: [point] } };
    paintLive(active.current.stroke);
  }
  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (active.current?.pointerId !== event.pointerId) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const samples = event.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const sample of samples.length > 0 ? samples : [event.nativeEvent]) addPoint(normalizePointer(sample, rect));
  }
  function up(event: PointerEvent<HTMLCanvasElement>) {
    if (active.current?.pointerId !== event.pointerId) return;
    addPoint(normalizePointer(event, event.currentTarget.getBoundingClientRect()));
    finish();
  }
  function cancel(event: PointerEvent<HTMLCanvasElement>) {
    if (active.current?.pointerId === event.pointerId) finish();
  }
  return <canvas ref={canvas} className={`drawing-canvas ${tool === 'eraser' ? 'eraser-cursor' : ''}`} width={DRAWING_WIDTH} height={DRAWING_HEIGHT} aria-label="Draw your creature here using a mouse, pen or touch" style={{ touchAction: 'none' }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} onLostPointerCapture={cancel}/>;
}
