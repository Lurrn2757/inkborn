import { useEffect, useRef, useState } from 'react';
import { createCanvasArena } from './CanvasArena';
import { PresentationClock } from './motion';
import type { ArenaRenderer, ArenaViewProps } from './types';

export type { ArenaViewProps } from './types';

export function ArenaView(props: ArenaViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const latestProps = useRef(props);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'pixi' | 'canvas' | 'error'>('loading');
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  latestProps.current = props;

  useEffect(() => {
    let active = true;
    const image = new Image();
    imageRef.current = null;
    setImageFailed(false);
    setImageLoaded(false);
    image.onload = () => { if (active) { imageRef.current = image; setImageLoaded(true); } };
    image.onerror = () => { if (active) setImageFailed(true); };
    image.src = props.sprite.dataUrl;
    return () => { active = false; image.onload = null; image.onerror = null; };
  }, [props.sprite.dataUrl]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let active = true;
    let renderer: ArenaRenderer | null = null;
    let fallbackStarted = false;
    const clock = new PresentationClock();
    const resize = () => { const bounds = host.getBoundingClientRect(); renderer?.resize(bounds.width, bounds.height); };
    const frame = () => {
      if (!active || !renderer) return;
      const current = latestProps.current;
      renderer.render(current, imageRef.current, clock.sample(current));
    };
    const mount = (next: ArenaRenderer, kind: 'pixi' | 'canvas') => {
      if (!active) { next.destroy(); return; }
      renderer = next;
      host.replaceChildren(next.canvas);
      resize(); frame(); next.start(frame); setStatus(kind);
    };
    const fallback = () => {
      if (!active || fallbackStarted) return;
      fallbackStarted = true;
      // A fresh surface is required: a WebGL canvas cannot acquire a 2D context.
      renderer?.destroy(); renderer = null;
      try { mount(createCanvasArena(), 'canvas'); } catch { if (active) setStatus('error'); }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    // Lazy-loading avoids allocating a graphics application during abandoned renders.
    void import('./PixiArena').then(module => module.createPixiArena(fallback)).then(next => {
      if (!active || fallbackStarted) next.destroy(); else mount(next, 'pixi');
    }).catch(() => { if (active) fallback(); });
    return () => { active = false; observer.disconnect(); renderer?.destroy(); host.replaceChildren(); };
  }, []);

  return <div className="arena-canvas" data-renderer={status} data-sprite-status={imageFailed ? 'error' : imageLoaded ? 'ready' : 'loading'} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
    <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
    {status === 'error' && <p role="alert">The chamber could not be drawn. Your drawing and answers are preserved; reload to retry graphics.</p>}
    {imageFailed && <p role="alert">Your creature image could not be loaded. Return to the drawing to prepare it again.</p>}
  </div>;
}
