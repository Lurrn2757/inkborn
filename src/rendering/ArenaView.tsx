import { useEffect, useRef, useState } from 'react';
import { createCanvasArena } from './CanvasArena';
import { evaluateTimeline, PresentationClock } from './motion';
import type { ArenaRenderer, ArenaViewProps } from './types';

export type { ArenaViewProps } from './types';

export function ArenaView(props: ArenaViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const latestProps = useRef(props);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageUrlRef = useRef<string | null>(null);
  const readySpriteRef = useRef<string | null>(null);
  const clockRef = useRef<PresentationClock | null>(null);
  // Deliberately opt-in until real-device performance and learner visual review pass.
  const [experimental, setExperimental] = useState(() => new URLSearchParams(window.location.search).get('renderer') === 'three');
  const [status, setStatus] = useState<'loading' | 'three' | 'pixi' | 'canvas' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  latestProps.current = props;

  useEffect(() => {
    let active = true;
    const image = new Image();
    imageRef.current = null;
    imageUrlRef.current = null;
    setImageFailed(false);
    setImageLoaded(false);
    image.onload = () => { if (active) { imageRef.current = image; imageUrlRef.current = props.sprite.dataUrl; setImageLoaded(true); } };
    image.onerror = () => { if (active) setImageFailed(true); };
    image.src = props.sprite.dataUrl;
    return () => { active = false; image.onload = null; image.onerror = null; };
  }, [props.sprite.dataUrl, attempt]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let active = true;
    setStatus('loading');
    let renderer: ArenaRenderer | null = null;
    let fallbackStarted = false;
    let pixiStarted = false;
    let failed = false;
    const clock = clockRef.current ?? new PresentationClock();
    clockRef.current = clock;
    clock.sample(latestProps.current);
    const resize = () => {
      const bounds = host.getBoundingClientRect();
      try { renderer?.resize(bounds.width, bounds.height); } catch { failRenderer(); }
    };
    const frame = () => {
      if (!active || !renderer || failed) return;
      const current = latestProps.current;
      const image = imageUrlRef.current === current.sprite.dataUrl ? imageRef.current : null;
      const firstActualFrame = image !== null && readySpriteRef.current !== current.sprite.dataUrl;
      if (firstActualFrame) clock.beginScene(current);
      const presentation = clock.sample(current);
      host.parentElement?.setAttribute('data-performance-state', evaluateTimeline(current, presentation).state);
      try { renderer.render(current, image, presentation); }
      catch { failRenderer(); return; }
      if (failed) return;
      if (firstActualFrame) { readySpriteRef.current = current.sprite.dataUrl; current.onSceneReady?.(); }
    };
    const mount = (next: ArenaRenderer, kind: 'three' | 'pixi' | 'canvas') => {
      if (!active) { next.destroy(); return; }
      failed = false;
      renderer = next;
      host.replaceChildren(next.canvas);
      try { resize(); frame(); if (!failed) { next.start(frame); setStatus(kind); } }
      catch { failRenderer(); }
    };
    const fallback = () => {
      if (!active || fallbackStarted) return;
      fallbackStarted = true;
      // A fresh surface is required: a WebGL canvas cannot acquire a 2D context.
      renderer?.destroy(); renderer = null;
      try { mount(createCanvasArena(), 'canvas'); } catch { if (active) setStatus('error'); }
    };
    const startPixi = () => {
      if (!active || pixiStarted) return;
      pixiStarted = true;
      renderer?.destroy(); renderer = null;
      void import('./PixiArena').then(module => module.createPixiArena(fallback)).then(next => {
        if (!active || fallbackStarted) next.destroy(); else mount(next, 'pixi');
      }).catch(() => { if (active) fallback(); });
    };
    // Defer destruction until a failing render/context callback has unwound.
    const failRenderer = () => {
      if (!active || failed) return;
      failed = true;
      queueMicrotask(() => {
        if (!active) return;
        if (!pixiStarted) startPixi();
        else if (!fallbackStarted) fallback();
        else { renderer?.destroy(); renderer = null; setStatus('error'); }
      });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    // Lazy-loading avoids allocating a graphics application during abandoned renders.
    if (experimental) {
      void import('./ThreeArena').then(module => {
        if (active && !pixiStarted) mount(module.createThreeArena(failRenderer), 'three');
      }).catch(() => { if (active) startPixi(); });
    } else startPixi();
    return () => { active = false; observer.disconnect(); renderer?.destroy(); host.replaceChildren(); };
  }, [attempt, experimental]);

  useEffect(() => { clockRef.current?.sample(props); }, [props]);

  return <div className="arena-canvas" data-renderer={status} data-effects={props.reducedMotion || status === 'canvas' ? 'reduced' : 'full'} data-sprite-status={imageFailed ? 'error' : imageLoaded ? 'ready' : 'loading'} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
    <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
    {status === 'error' && <p role="alert">The chamber could not be drawn. Your drawing and answers remain in this page. Try opening the chamber again.</p>}
    {imageFailed && <p role="alert">Your creature image could not be loaded. Try opening the chamber again.</p>}
    {(status === 'error' || imageFailed) && <button className="button secondary" style={{ position: 'absolute', top: 100, left: 20 }} onClick={() => setAttempt(value => value + 1)}>Retry graphics</button>}
    {status === 'canvas' && <span className="arena-render-notice" style={{ position: 'absolute', top: 18, right: 18, fontSize: 9, color: '#d9c8a5', opacity: .8 }}>Reduced effects · Canvas mode</span>}
    {experimental && <button className="text-button" style={{ position: 'absolute', right: 18, bottom: 110, fontSize: 11, minHeight: 40 }} onClick={() => setExperimental(false)}>Use standard visuals</button>}
  </div>;
}
