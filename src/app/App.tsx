import { useEffect, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { session } from './SessionController.js';
import { ChamberBackdrop } from '../creative/TitleSigil.js';
import { Dialog } from '../components/Dialog.js';
import { TitleScreen } from '../screens/TitleScreen.js';
import { NotesScreen } from '../screens/NotesScreen.js';
import { CrystalPreview, DrawingScreen } from '../screens/DrawingScreen.js';
import { BattleScreen } from '../screens/BattleScreen.js';
import { ResultsScreen } from '../screens/ResultsScreen.js';
import { useReducedMotion } from '../hooks/useReducedMotion.js';

export function App() {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const reducedMotion = useReducedMotion(state.settings.motion);
  const [help, setHelp] = useState(false);
  useEffect(() => { document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full'; }, [reducedMotion]);
  function start() {
    if ((state.resumeScreen || state.battle) && state.screen !== 'results' && !window.confirm('Begin a new battle? This replaces the current in-memory encounter.')) return;
    session.start();
  }
  let content;
  const { lesson, sprite, battle } = state;
  if (state.screen === 'title') content = <TitleScreen onStart={start} onContinue={state.resumeScreen ? session.resume : null} onHelp={() => setHelp(true)}/>;
  else if (state.screen === 'notes' && lesson) content = <NotesScreen lesson={lesson} onChoose={session.chooseLesson} onContinue={() => session.navigate('draw')}/>;
  else if (state.screen === 'draw' && lesson) content = <DrawingScreen drawing={state.drawing} lesson={lesson} preparing={state.preparing} error={state.error} onChange={session.setDrawing} onError={session.setError} onPrepare={() => { void session.prepare(); }} onBack={() => session.navigate('notes')}/>;
  else if (state.screen === 'preview' && sprite && lesson) content = <CrystalPreview sprite={sprite} lesson={lesson} onChange={session.setSprite} onAwaken={session.awaken} onRedraw={() => session.navigate('draw')}/>;
  else if ((state.screen === 'battle' || state.screen === 'awakening') && sprite && lesson && battle) content = <BattleScreen sprite={sprite} lesson={lesson} battle={battle} awakening={state.screen === 'awakening'} reducedMotion={reducedMotion} presenting={state.presenting} onReady={session.beginBattle} onSelect={session.select} onSubmit={session.submit} onContinue={session.continueBattle} onFinish={session.finish}/>;
  else if (state.screen === 'results' && sprite && lesson && battle) content = <ResultsScreen lesson={lesson} sprite={sprite} battle={battle} onNew={session.start} onTitle={session.toTitle}/>;
  else content = <main className="recovery-screen"><h1>A new page awaits.</h1><button className="button primary" onClick={session.start}>Begin a battle</button></main>;
  return <><ChamberBackdrop/><div className="app-shell"><header className="app-header"><button className="brand" aria-label="INKBORN title screen" onClick={session.toTitle}><span className="brand-mark" aria-hidden="true">◈</span> INKBORN</button><div className="header-right">{state.screen !== 'title' && <span className="mode-label">SAMPLE BATTLE · CURATED QUESTIONS</span>}<button className="icon-button" aria-label="How it works" onClick={() => setHelp(true)}>?</button></div></header><AnimatePresence mode="wait"><motion.div key={state.screen} initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }} transition={{ duration: reducedMotion ? 0.12 : 0.3 }}>{content}</motion.div></AnimatePresence>{help && <Dialog title="Knowledge gives it form." onClose={() => setHelp(false)}><div className="help-steps"><p><strong>01 / Offer your notes.</strong> Begin with an explicitly labeled sample. Its questions are curated against the notes you see.</p><p><strong>02 / Draw something unfinished.</strong> Your actual strokes become the living creature. Three crystals represent three concepts.</p><p><strong>03 / Confront a crystal.</strong> Choose its question. A correct answer shatters it. A mistake corrupts it and reveals an explanation from your notes.</p><p><strong>04 / Find another way in.</strong> A distinct follow-up lets you demonstrate a correction. Two incorrect answers leave the concept unresolved; they never end the battle early.</p><p><strong>05 / Read the record.</strong> See what was correct immediately, what you corrected and what deserves more practice.</p></div><button className="button ink-button" onClick={() => setHelp(false)}>Return to the chamber →</button></Dialog>}</div></>;
}
