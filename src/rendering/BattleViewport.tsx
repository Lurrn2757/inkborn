import { useEffect, useRef, useState, type ReactNode } from 'react';
import { fitGameViewport } from './viewport';

/** Fit a physical surface around one 1920 × 1080 composition. HTML stays readable. */
export function BattleViewport({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(() => fitGameViewport(1920, 1080));
  const [fullscreen, setFullscreen] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const element = root.current!;
    const observer = new ResizeObserver(([entry]) => { if (entry) setFit(fitGameViewport(entry.contentRect.width, entry.contentRect.height)); });
    observer.observe(element);
    const changed = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', changed);
    return () => { observer.disconnect(); document.removeEventListener('fullscreenchange', changed); };
  }, []);
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await root.current?.closest('main')?.requestFullscreen();
    } catch { setNotice('Fullscreen unavailable. You can continue in this window.'); }
  }
  return <div className="battle-viewport" ref={root} data-logical-width="1920" data-logical-height="1080">
    <div className="logical-surface" style={{ width: fit.width, height: fit.height, left: fit.left, top: fit.top }}>{children}</div>
    {document.fullscreenEnabled && <button className="viewport-fullscreen" aria-label={fullscreen ? 'Exit fullscreen battle' : 'Fullscreen battle'} onClick={() => { void toggleFullscreen(); }}>{fullscreen ? '↙' : '⛶'}</button>}
    {notice && <span className="viewport-notice" role="status">{notice}</span>}
  </div>;
}
