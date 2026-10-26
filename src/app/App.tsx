import { lazy, Suspense, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { session } from './SessionController.js';
import { ChamberBackdrop } from '../creative/TitleSigil.js';
import { battleEnding, ritualIntegrity } from '../battle/ritual.js';
import { audio } from '../audio/AudioDirector.js';
import { SettingsDialog } from '../components/SettingsDialog.js';
import { Dialog } from '../components/Dialog.js';
import { TitleScreen } from '../screens/TitleScreen.js';
import { NotesScreen } from '../screens/NotesScreen.js';
import { CrystalPreview, DrawingScreen } from '../screens/DrawingScreen.js';
import { BattleScreen } from '../screens/BattleScreen.js';
import { ResultsScreen } from '../screens/ResultsScreen.js';
const ArenaScreen = lazy(() => import('../arena/ArenaScreen.js').then(module => ({ default: module.ArenaScreen })));
const ExamSiege = lazy(() => import('../exam/ExamSiege.js').then(module => ({ default: module.ExamSiege })));
import { useReducedMotion } from '../hooks/useReducedMotion.js';

function ScreenFrame({ children, reducedMotion }: { children: ReactNode; reducedMotion: boolean }) {
  useEffect(() => {
    const heading = document.querySelector<HTMLElement>('main h1');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); document.title = `${heading.textContent} · INKBORN`; }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  return <motion.div initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }} transition={{ duration: reducedMotion ? 0.12 : 0.3 }}>{children}</motion.div>;
}

export function App() {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const reducedMotion = useReducedMotion(state.settings.motion);
  const [arena, setArena] = useState(() => new URLSearchParams(window.location.search).has('arena'));
  const [siege, setSiege] = useState(false);
  const [help, setHelp] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => { audio.configure(state.settings); }, [state.settings]);
  useEffect(() => {
    const unlock = () => { void audio.unlock(); };
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
    return () => { window.removeEventListener('pointerdown', unlock, { capture: true }); window.removeEventListener('keydown', unlock, { capture: true }); };
  }, []);
  useEffect(() => {
    const event = state.battle?.event;
    if (event && state.battle) {
      const cue = event.type === 'victory' && battleEnding(state.battle) === 'scarred' ? 'scarredVictory' : event.type;
      const audioEventId = `${state.sprite?.id ?? 'session'}:${event.id}`;
      audio.play(cue, audioEventId);
      if ((event.type === 'corrupt' || event.type === 'unresolved') && ritualIntegrity(state.battle) <= 2) audio.play('critical', `${audioEventId}:critical`);
    }
    else if (state.screen === 'awakening') audio.play('awakening', `awaken-${state.sprite?.id ?? ''}`);
  }, [state.battle?.event, state.screen, state.sprite?.id]);
  useEffect(() => {
    if (state.screen === 'battle' && state.battle?.phase === 'question') audio.play('select', `${state.sprite?.id ?? ''}:select:${state.battle.revision}`);
  }, [state.screen, state.battle?.phase, state.battle?.revision, state.sprite?.id]);
  useEffect(() => { document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full'; }, [reducedMotion]);
  function start() {
    if ((state.resumeScreen || state.battle) && state.screen !== 'results' && !window.confirm('Begin a new battle? This replaces the current in-memory encounter.')) return;
    session.start();
  }
  let content;
  const { lesson, sprite, battle } = state;
  if (arena) content = <Suspense fallback={<main className="page"><h1>Opening the Arena…</h1></main>}><ArenaScreen reducedMotion={reducedMotion} onExit={() => { setArena(false); window.history.replaceState(null, '', window.location.pathname); }}/></Suspense>;
  else if (siege) content = <Suspense fallback={<main className="page"><h1>Opening the examination chamber…</h1></main>}><ExamSiege reducedMotion={reducedMotion} onExit={() => { setSiege(false); session.toTitle(); }}/></Suspense>;
  else if (state.screen === 'title') content = <TitleScreen onArena={() => setArena(true)} onSiege={() => setSiege(true)} onStart={start} onContinue={state.resumeScreen ? session.resume : null} onHelp={() => setHelp(true)}/>;
  else if (state.screen === 'notes' && lesson) content = <NotesScreen lesson={lesson} onChoose={session.chooseLesson} onContinue={() => session.navigate('draw')}/>;
  else if (state.screen === 'draw' && lesson) content = <DrawingScreen drawing={state.drawing} lesson={lesson} preparing={state.preparing} error={state.error} onChange={session.setDrawing} onError={session.setError} onPrepare={() => { void session.prepare(); }} onBack={() => session.navigate('notes')}/>;
  else if (state.screen === 'preview' && sprite && lesson) content = <CrystalPreview sprite={sprite} lesson={lesson} onChange={session.setSprite} onAwaken={session.awaken} onRedraw={() => session.navigate('draw')}/>;
  else if ((state.screen === 'battle' || state.screen === 'awakening') && sprite && lesson && battle) content = <BattleScreen sprite={sprite} lesson={lesson} battle={battle} awakening={state.screen === 'awakening'} reducedMotion={reducedMotion} presenting={state.presenting} onReady={session.beginBattle} onSelect={session.select} onSubmit={session.submit} onContinue={session.continueBattle} onFinish={session.finish}/>;
  else if (state.screen === 'results' && sprite && lesson && battle) content = <ResultsScreen lesson={lesson} sprite={sprite} battle={battle} onNew={session.start} onTitle={session.toTitle}/>;
  else content = <main className="recovery-screen"><h1>A new page awaits.</h1><button className="button primary" onClick={session.start}>Begin a battle</button></main>;
  return <><ChamberBackdrop/><div className="app-shell"><header className="app-header"><button className="brand" aria-label="INKBORN title screen" onClick={() => { setArena(false); setSiege(false); session.toTitle(); window.history.replaceState(null, '', window.location.pathname); }}><span className="brand-mark" aria-hidden="true">◈</span> INKBORN</button><div className="header-right">{(arena || siege || state.screen !== 'title') && <span className="mode-label">{arena ? 'ARENA · TWO MINDS, ONE RITUAL' : siege ? 'EXAM SIEGE · POSITIVE WEIGHTED MARKS' : 'CLASSIC BATTLE · CURATED QUESTIONS'}</span>}<button className="icon-button settings-trigger" aria-label="Sound and motion settings" onClick={() => setSettingsOpen(true)}>⚙</button><button className="icon-button" aria-label="How it works" onClick={() => setHelp(true)}>?</button></div></header><AnimatePresence mode="wait"><ScreenFrame key={arena ? 'arena' : siege ? 'exam-siege' : state.screen} reducedMotion={reducedMotion}>{content}</ScreenFrame></AnimatePresence>{settingsOpen && <SettingsDialog settings={state.settings} onChange={session.setSettings} onClose={() => setSettingsOpen(false)}/>} {help && <Dialog title="Knowledge gives it form." onClose={() => setHelp(false)}><div className="help-steps"><p><strong>Exam Siege.</strong> Choose a sample or upload a paper, review questions and confirm the key, then draw your crystal titan. Correct answers earn marks and fracture armor. Wrong answers reduce the maximum attainable grade. Falling strictly below the configured pass threshold ends an unwinnable exam. All remaining questions must be completed after reaching a passing score. Read the Examination Autopsy for exact marks, unattempted questions and revision evidence.</p><h3>Classic Battle</h3><p><strong>01 / Offer your notes.</strong> Begin with an explicitly labeled sample. Its questions are curated against the notes you see.</p><p><strong>02 / Draw something unfinished.</strong> Your actual strokes become the living creature. Three crystals represent three concepts.</p><p><strong>03 / Confront a crystal.</strong> Choose its question. A correct answer shatters it. A mistake corrupts it and reveals an explanation from your notes.</p><p><strong>04 / Find another way in.</strong> A distinct follow-up lets you demonstrate a correction. Two incorrect answers leave that concept unresolved. Each mistake breaks one of five ritual seals; when the last breaks, read your feedback and retreat with your record preserved.</p><p><strong>05 / Read the record.</strong> Discover a dominant victory, a scarred victory, or a retreat with open concepts. See what was correct immediately, what you reclaimed and what deserves more practice.</p></div><button className="button ink-button" onClick={() => setHelp(false)}>Return to the chamber →</button></Dialog>}</div></>;
}
