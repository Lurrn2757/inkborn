import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ZodError } from 'zod';
import { sampleLessons } from '../../shared/samples.js';
import { DrawingScreen } from '../screens/DrawingScreen.js';
import { prepareSprite } from '../drawing/sprite.js';
import { audio, type AudioCue } from '../audio/AudioDirector.js';
import { activeQuestions, createExam, examMetrics, examReducer, validateExam, type ExamQuestion } from './engine.js';
import { extractPaper, parseExamText, parseAnswerKey, MAX_PAPER_BYTES } from './extraction.js';
import { loadSiege, saveSiege, newSiegeSave, type SiegeSave, type Rig } from './storage.js';
import { sampleExams, quickExam } from './samples.js';
import { ExamReport, answerLabel, formatMarks } from './ExamReport.js';
import { TitanScene } from './TitanScene.js';
import { titanEventDuration } from './titanMotion.js';

const describeError = (error: unknown, fallback: string) => error instanceof ZodError ? error.issues.slice(0, 6).map(issue => `${issue.path[0] === 'questions' && typeof issue.path[1] === 'number' ? `Question ${issue.path[1] + 1}: ` : ''}${issue.message}`).join(' ') : error instanceof Error ? error.message : fallback;
const anchorNames = ['leftShoulder', 'leftHand', 'rightShoulder', 'rightHand'] as const;
const defaultRig: Rig = { leftShoulder: { x: .3, y: .35 }, leftHand: { x: .12, y: .65 }, rightShoulder: { x: .7, y: .35 }, rightHand: { x: .88, y: .65 } };
export function ExamSiege({ reducedMotion, onExit }: { reducedMotion: boolean; onExit: () => void }) {
  const [save, setSave] = useState<SiegeSave | null>(null);
  const current = useRef(save);
  const writes = useRef(Promise.resolve());
  const [stored, setStored] = useState<SiegeSave | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [transcript, setTranscript] = useState('');
  const [keyText, setKeyText] = useState('');
  const [reviewIndex, setReviewIndex] = useState(0);
  const [rigPoint, setRigPoint] = useState(0);
  const [rigEnabled, setRigEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [selection, setSelection] = useState('');
  const [presenting, setPresenting] = useState(false);
  const loaded = useRef(false);
  function update(next: SiegeSave) {
    current.current = next; setSave(next); setError(null);
    writes.current = writes.current.then(() => saveSiege(next)).then(() => { setStored(next); setStorageError(null); }).catch(() => setStorageError('Local saving is unavailable. Keep this tab open; answers remain in memory.'));
  }
  useEffect(() => {
    let cancelled = false;
    void loadSiege().then(value => { if (!cancelled && !loaded.current) setStored(value); }).catch(() => { if (!cancelled) setStorageError('The saved examination could not be restored. Start a fresh paper; the previous stored record is unchanged until you do.'); });
    return () => { cancelled = true; };
  }, []);
  const event = save?.battle?.event;
  useEffect(() => {
    if (!event) return;
    const metrics = save?.battle && save ? examMetrics(save.battle, save.exam) : null;
    const cue: AudioCue = event.type === 'victory' ? metrics?.ending === 'scarred' ? 'scarredVictory' : 'victory' : event.type === 'finisher' ? 'recovery' : event.type === 'hit' ? 'siegeFracture' : event.type === 'final' ? 'siegeFailure' : event.type === 'slam' ? 'siegeSlam' : event.type === 'beam' ? 'siegeBeam' : event.type === 'sweep' ? 'siegeSweep' : 'siegeStorm';
    audio.play(cue, `siege:${save?.sprite?.id}:${event.id}`);
    setPresenting(true);
    const timer = setTimeout(() => setPresenting(false), reducedMotion ? 180 : titanEventDuration(event.type) * 1000 + 50);
    return () => clearTimeout(timer);
  // The event ID is the committed presentation boundary, unrelated to grading.
  }, [event?.id, reducedMotion]);
  useEffect(() => { setSelection(''); }, [save?.battle?.index]);
  useEffect(() => { if (save?.stage === 'report') audio.play('siegeReport', `siege-report:${save.sprite?.id}`); }, [save?.stage, save?.sprite?.id]);
  function choose(index: number) { loaded.current = true; setReviewIndex(0); update(newSiegeSave(sampleExams[index]!)); }
  function editQuestion(patch: Partial<ExamQuestion>) {
    const s = current.current; if (!s || s.stage !== 'prepare') return;
    update({ ...s, keyConfirmed: false, exam: { ...s.exam, questions: s.exam.questions.map((q, i) => i === reviewIndex ? { ...q, ...patch, keyStatus: 'missing' } : q) } });
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []); event.target.value = '';
    if (!files.length) return;
    if (files.length > 30 || files.reduce((n, f) => n + f.size, 0) > MAX_PAPER_BYTES * 3) { setError('Use at most 30 files and 30 MB combined. Each file must be 10 MB or smaller.'); return; }
    setBusy(true); setError(null);
    try {
      const questions: ExamQuestion[] = [], warnings: string[] = []; let unsupported = false;
      for (const [index, file] of files.entries()) {
        const result = await extractPaper(file, setProgress);
        questions.push(...result.questions.map(q => ({ ...q, id: `file-${index}-${q.id}`, source: { ...q.source, label: `${file.name} · extracted draft` } })));
        warnings.push(...result.warnings.map(w => `${file.name}: ${w}`)); unsupported ||= result.markingUnsupported;
      }
      if (questions.length > 300) throw new Error('Use at most 300 questions per examination.');
      const draft = newSiegeSave({ ...structuredClone(quickExam), id: crypto.randomUUID(), title: files.length === 1 ? files[0]!.name : 'Uploaded examination', questions });
      loaded.current = true; setReviewIndex(0); update({ ...draft, warnings, markingConfirmed: !unsupported });
    } catch (e) { setError(describeError(e, 'Extraction failed. Try a corrected transcription.')); }
    finally { setBusy(false); setProgress(''); }
  }
  function transcribe() {
    try {
      const result = parseExamText(transcript);
      if (!result.questions.length) throw new Error('Use numbered questions, for example: 1. Calculate 2 + 2. [1 mark]');
      const draft = newSiegeSave({ ...structuredClone(quickExam), id: crypto.randomUUID(), title: 'Transcribed examination', questions: result.questions });
      loaded.current = true; setReviewIndex(0); update({ ...draft, warnings: result.warnings, markingConfirmed: !result.markingUnsupported });
    } catch (e) { setError(describeError(e, 'The transcription could not be parsed.')); }
  }
  function confirm(confirmed: boolean) {
    const s = current.current; if (!s) return;
    update({ ...s, keyConfirmed: confirmed, exam: { ...s.exam, questions: s.exam.questions.map(q => ({ ...q, keyStatus: q.keyStatus === 'curated' ? 'curated' : confirmed && q.correctAnswer ? 'confirmed' : 'missing' })) } });
  }
  function beginDrawing() {
    const s = current.current; if (!s) return;
    try {
      if (!s.keyConfirmed || !s.markingConfirmed) throw new Error('Review and confirm the answer key and supported marking settings first. Without a key, use this screen for ungraded review.');
      const exam = validateExam({ ...s.exam, questions: s.exam.questions.filter(q => !q.excluded) }); createExam(exam);
      update({ ...s, exam, stage: 'draw' });
    } catch (e) { setError(describeError(e, 'Correct the paper before graded play.')); }
  }
  async function prepare() {
    const s = current.current; if (!s || busy) return; setBusy(true);
    try { const sprite = await prepareSprite(s.drawing, []); update({ ...current.current!, sprite, stage: 'rig', rig: null }); }
    catch (e) { setError(describeError(e, 'Drawing preparation failed.')); }
    finally { setBusy(false); }
  }
  function awaken() {
    const s = current.current; if (!s) return;
    try { setReady(false); update({ ...s, battle: createExam(s.exam), stage: 'awakening', rig: rigEnabled ? s.rig ?? defaultRig : null }); audio.play('awakening', `siege-awaken:${s.sprite?.id}`); }
    catch (e) { setError(describeError(e, 'The exam could not begin.')); }
  }
  function submit() {
    const s = current.current; if (!s?.battle) return;
    const q = activeQuestions(s.exam)[s.battle.index]; if (!q) return;
    const next = examReducer(s.battle, { type: 'submit', questionId: q.id, answer: selection, expectedRevision: s.battle.revision, now: new Date().toISOString() }, s.exam);
    if (next !== s.battle) { setPresenting(true); update({ ...s, battle: next }); }
  }
  function castFinisher() {
    const s = current.current; if (!s?.battle || presenting) return;
    const next = examReducer(s.battle, { type: 'finisher', expectedRevision: s.battle.revision }, s.exam);
    if (next !== s.battle) { setPresenting(true); update({ ...s, battle: next }); }
  }
  function advance() {
    const s = current.current; if (!s?.battle || (presenting && !examMetrics(s.battle, s.exam).ended)) return;
    const next = examReducer(s.battle, { type: 'advance', expectedRevision: s.battle.revision }, s.exam);
    if (next !== s.battle) update({ ...s, battle: next, stage: next.phase === 'ended' ? 'report' : 'battle' });
  }
  useEffect(() => {
    const target = document.querySelector<HTMLElement>(save?.battle?.phase === 'feedback' && save.stage === 'battle' ? '.siege-feedback h2' : save?.stage === 'battle' ? '.siege-question h2' : 'main h1');
    if (target) { target.tabIndex = -1; target.focus({ preventScroll: true }); document.title = `${target.textContent} · INKBORN`; }
  }, [save?.stage, save?.battle?.phase, save?.battle?.index]);
  const notice = <>{storageError && <p className="inline-error" role="status">{storageError}</p>}{error && <p className="inline-error" role="alert">{error}</p>}</>;
  if (!save) return <main className="page siege-setup"><header className="page-intro"><p className="eyebrow">EXAM SIEGE / THE CRYSTAL TITAN</p><h1>Prepare the examination.</h1><p>Upload a paper. Draw its guardian. Earn every blow.</p></header>{notice}<div className="siege-choice-grid">{sampleExams.map((exam, index) => <button className="siege-choice" key={exam.id} onClick={() => choose(index)}><span className="eyebrow">{index === 0 ? 'A FIVE-QUESTION DEMONSTRATION' : `${exam.questions.length} QUESTIONS · REAL SCORING`}</span><strong>{index === 0 ? 'Quick Battle' : `Full Examination · ${exam.questions.length}`}</strong><span>{index === 0 ? 'Weighted marks, a living titan and your examination autopsy.' : 'Original arithmetic · addition, area, equations and division.'}</span><span className="fine-print">CURATED KEY · NO API KEY NEEDED →</span></button>)}</div>{stored && <button className="button primary" onClick={() => { loaded.current = true; current.current = stored; setSave(stored); }}>Resume saved examination →</button>}<section className="siege-upload"><h2>Upload Examination</h2><p>Selectable-text PDF (up to 30 pages), or PNG, JPEG and WEBP pages. Select multiple images for a multi-page paper.</p><p className="fine-print">Paper content stays on this device. Image OCR downloads public English recognition assets on first use. No AI provider receives your document. Scanned-PDF OCR is unavailable; upload scanned pages as images. Handwriting and equations require careful transcription.</p><label className="button secondary">{busy ? 'Reading the paper…' : 'Upload Examination'}<input aria-label="Upload examination files" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" multiple disabled={busy} onChange={e => { void upload(e); }}/></label><p role="status">{progress}</p><details><summary>Paste a numbered transcription instead</summary><textarea aria-label="Numbered examination transcription" value={transcript} onChange={e => setTranscript(e.target.value)} placeholder={'1. Calculate 2 + 2. [1 mark]\nA) 3\nB) 4'}/><button className="button secondary" disabled={busy} onClick={transcribe}>Extract transcription</button></details></section><button className="text-button" onClick={onExit}>← Return to INKBORN</button></main>;
  if (save.stage === 'prepare') {
    const q = save.exam.questions[reviewIndex];
    const count = activeQuestions(save.exam).length, total = activeQuestions(save.exam).reduce((n, item) => n + (Number.isFinite(item.marks) ? item.marks : 0), 0);
    return <main className="page siege-prepare"><header className="page-intro"><p className="eyebrow">I / THE PAPER · UNGRADED REVIEW</p><h1>Review the paper.</h1><p>Compare the original, correct extraction, then confirm your key. No answers are inferred.</p></header>{notice}<div className="exam-prep-summary"><label>Examination title<input value={save.exam.title} maxLength={300} onChange={e => update({ ...save, exam: { ...save.exam, title: e.target.value } })}/></label><label>Pass threshold (%)<input type="number" min="1" max="100" step=".01" value={save.exam.passThreshold} onChange={e => update({ ...save, exam: { ...save.exam, passThreshold: Number(e.target.value) } })}/></label><p><strong>{count} questions · {formatMarks(total)} maximum marks</strong><br/>Positive marks only. Exact-text questions use case-insensitive, whitespace-normalized exact matches; essays, equivalent equations, negative marks and partial credit are unsupported.</p></div>{save.warnings.length > 0 && <details className="extraction-warnings"><summary>{save.warnings.length} extraction review warnings</summary><ul>{save.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></details>}<div className="paper-review-layout"><aside className="question-navigator"><label>Review question<select aria-label="Review question" value={reviewIndex} onChange={e => setReviewIndex(Number(e.target.value))}>{save.exam.questions.map((item, i) => <option key={item.id} value={i}>Q{item.number}{item.excluded ? ' · excluded' : item.correctAnswer ? ' · key entered' : ' · key needed'}</option>)}</select></label><button className="text-button" disabled={reviewIndex <= 0} onClick={() => setReviewIndex(i => i - 1)}>← Previous</button><button className="text-button" disabled={reviewIndex >= save.exam.questions.length - 1} onClick={() => setReviewIndex(i => i + 1)}>Next →</button><button className="text-button" onClick={() => { const i = save.exam.questions.length; const item: ExamQuestion = { id: crypto.randomUUID(), number: `${i + 1}`, text: '', marks: 1, options: [], correctAnswer: null, keyStatus: 'missing', excluded: false, topic: null, topicReviewed: false, explanation: null, source: { page: null, label: 'User-entered question', evidence: '' } }; update({ ...save, keyConfirmed: false, exam: { ...save.exam, questions: [...save.exam.questions, item] } }); setReviewIndex(i); }}>+ Add question</button></aside>{q ? <section className="paper-question" key={q.id}><div className="exam-prep-summary"><label>Printed number<input value={q.number} onChange={e => editQuestion({ number: e.target.value })}/></label><label>Marks<input aria-label="Question marks" type="number" step=".01" min=".01" value={Number.isFinite(q.marks) ? q.marks : ''} onChange={e => editQuestion({ marks: e.target.value === '' ? 0 : e.target.valueAsNumber })}/></label><label className="check-label"><input type="checkbox" checked={q.excluded} onChange={e => editQuestion({ excluded: e.target.checked })}/>Exclude this question</label></div><label>Question text<textarea aria-label="Question text" value={q.text} onChange={e => editQuestion({ text: e.target.value })}/></label><label>Options · one per line, A) text<textarea aria-label="Answer options" defaultValue={q.options.map(o => `${o.id}) ${o.text}`).join('\n')} onBlur={e => { if (e.target.value === q.options.map(o => `${o.id}) ${o.text}`).join('\n')) return; editQuestion({ options: e.target.value.split('\n').filter(line => line.trim()).map((line, i) => { const match = line.match(/^\s*([A-Za-z0-9_-]+)[).:]\s*(.*)$/); return { id: match?.[1] ?? String.fromCharCode(65 + i), text: match?.[2] ?? line }; }), correctAnswer: null, keyStatus: 'missing' }); }}/></label><label>Correct answer {q.options.length ? '· select an existing option' : '· exact text required'}{q.options.length ? <select aria-label="Correct answer" value={q.correctAnswer ?? ''} onChange={e => editQuestion({ correctAnswer: e.target.value || null, keyStatus: 'missing' })}><option value="">No confirmed key</option>{q.options.map((o, i) => <option key={`${o.id}-${i}`} value={o.id}>{o.id}: {o.text}</option>)}</select> : <input aria-label="Correct answer" value={q.correctAnswer ?? ''} onChange={e => editQuestion({ correctAnswer: e.target.value || null, keyStatus: 'missing' })}/>}</label><label>Reviewed topic (optional)<input value={q.topic ?? ''} onChange={e => editQuestion({ topic: e.target.value || null, topicReviewed: false })}/></label><label className="check-label"><input type="checkbox" checked={q.topicReviewed} disabled={!q.topic} onChange={e => editQuestion({ topicReviewed: e.target.checked })}/>I reviewed this topic mapping against the source</label><label>Explanation (optional, supplied and reviewed by you)<textarea value={q.explanation ?? ''} onChange={e => editQuestion({ explanation: e.target.value || null })}/></label><details><summary>Original extraction evidence · {q.source.label}{q.source.page ? ` · page ${q.source.page}` : ''}</summary><pre>{q.source.evidence || 'No extraction evidence supplied.'}</pre></details></section> : <p>No questions detected. Add one or return and paste a corrected transcription.</p>}</div><section className="key-import"><h2>Enter or upload an answer key</h2><p>Use one mapping per line: <code>1: A</code> or <code>2: 42</code>. Plain text keys only; review each imported answer above.</p><textarea aria-label="Numbered answer key" value={keyText} onChange={e => setKeyText(e.target.value)}/><input aria-label="Upload text answer key" type="file" accept=".txt,text/plain" onChange={e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 100000) { setError('Answer keys must be 100 KB or smaller.'); return; } void file.text().then(setKeyText).catch(() => setError('The answer key could not be read.')); }}/><button className="button secondary" onClick={() => { try { const result = parseAnswerKey(keyText, save.exam.questions); update({ ...save, keyConfirmed: false, exam: { ...save.exam, questions: result.questions }, warnings: [...save.warnings, ...result.warnings] }); } catch (e) { setError(describeError(e, 'Invalid answer key.')); } }}>Apply key for review</button></section><label className="check-label"><input type="checkbox" checked={save.markingConfirmed} onChange={e => update({ ...save, markingConfirmed: e.target.checked })}/>I confirm positive marks only and every included question is required; unsupported paper rules have been replaced</label><label className="check-label"><input type="checkbox" checked={save.keyConfirmed} onChange={e => confirm(e.target.checked)}/>I confirm every included question, option, mark and answer key against the source</label><p className="fine-print">Without a confirmed key, this preparation screen remains an ungraded review. Player confirmation is not independent certification of correctness.</p><div className="report-actions"><button className="button primary" disabled={busy || !save.keyConfirmed || !save.markingConfirmed} onClick={beginDrawing}>Draw your titan →</button><button className="text-button" onClick={() => { current.current = null; setSave(null); }}>← Choose another paper</button></div></main>;
  }
  if (save.stage === 'draw') return <>{notice}<DrawingScreen drawing={save.drawing} lesson={sampleLessons[0]!} preparing={busy} error={error} onChange={drawing => update({ ...current.current!, drawing, sprite: null })} onError={setError} onPrepare={() => { void prepare(); }} onBack={() => update({ ...save, stage: 'prepare' })} bindingLabels={[save.exam.title, `${activeQuestions(save.exam).length} questions · ${save.exam.passThreshold}% to pass`, 'One immutable answer per question']} backLabel="← Back to examination"/></>;
  if (save.stage === 'rig' && save.sprite) return <main className="page siege-rig"><header className="page-intro"><p className="eyebrow">III / THE LIVING INK</p><h1>Bind the living ink.</h1><p>Your drawing remains inside the crystal shell. Optional anchors add gentle arm movement; anatomy is never guessed.</p></header>{notice}<div className="rig-layout"><div className="binding-sprite rig-sprite" style={{ aspectRatio: `${save.sprite.width}/${save.sprite.height}`, width: `min(100%, ${480 * save.sprite.width / save.sprite.height}px)`, height: 'auto', maxHeight: 'none' }} onPointerDown={e => { if (!rigEnabled) return; const b = e.currentTarget.getBoundingClientRect(); const point = { x: Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)), y: Math.max(0, Math.min(1, (e.clientY - b.top) / b.height)) }; update({ ...save, rig: { ...(save.rig ?? defaultRig), [anchorNames[rigPoint]!]: point } }); setRigPoint(i => (i + 1) % 4); }}><img src={save.sprite.dataUrl} data-sprite-hash={save.sprite.hash} alt="Your original ink drawing"/>{rigEnabled && anchorNames.map((name, i) => { const p = (save.rig ?? defaultRig)[name]; return <span key={name} className="rig-anchor" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}>{i + 1}</span>; })}</div><section><label className="check-label"><input type="checkbox" checked={rigEnabled} onChange={e => setRigEnabled(e.target.checked)}/>Mark optional shoulder and hand anchors</label>{rigEnabled && <><p>Next click places: <strong>{anchorNames[rigPoint]}</strong>. Or adjust each coordinate below.</p>{anchorNames.map((name, i) => <fieldset key={name}><legend>{i + 1} · {name}</legend>{(['x', 'y'] as const).map(axis => <label key={axis}>{axis}<input aria-label={`${name} ${axis}`} type="range" min="0" max="1" step=".01" value={(save.rig ?? defaultRig)[name][axis]} onChange={e => update({ ...save, rig: { ...(save.rig ?? defaultRig), [name]: { ...(save.rig ?? defaultRig)[name], [axis]: Number(e.target.value) } } })}/></label>)}</fieldset>)}</>}<p>Without anchors, breathing, squash, recoil and procedural crystal arms bring any silhouette to life.</p><button className="button primary" onClick={awaken}>Awaken my creature ✧</button><button className="text-button" onClick={() => update({ ...save, stage: 'draw' })}>← Return to drawing</button></section></div></main>;
  if (save.stage === 'report' && save.sprite && save.battle) return <ExamReport exam={save.exam} battle={save.battle} sprite={save.sprite} onNew={() => { current.current = null; setSave(null); }} onExit={onExit}/>;
  if (save.sprite && save.battle) {
    const m = examMetrics(save.battle, save.exam), q = activeQuestions(save.exam)[save.battle.index]!, last = save.battle.answers.at(-1);
    return <main className="siege-battle"><header className="siege-boss-title"><p className="eyebrow">{save.exam.title}</p><h1>THE CRYSTAL TITAN</h1><div className="boss-health" role="progressbar" aria-label="Titan armor remaining" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((1 - m.bossProgress) * 100)}><i style={{ width: `${(1 - m.bossProgress) * 100}%` }}/></div><p>{m.coreExposed ? m.ended ? 'The examination is decided.' : 'CORE EXPOSED · Finish every remaining question to deliver the final blow.' : 'CRYSTAL ARMOR · Correct answers fracture the shell.'}</p></header><div className="siege-arena"><TitanScene sprite={save.sprite} rig={save.rig} event={save.battle.event} reducedMotion={reducedMotion} bossProgress={m.bossProgress} hp={m.hp} passThreshold={save.exam.passThreshold} awakening={save.stage === 'awakening'} onReady={() => setReady(true)}/>{save.stage === 'awakening' && <div className="siege-awakening"><p className="eyebrow">YOUR INK HAS AWAKENED</p><h2>A paper. A creature.<br/>Every mark matters.</h2><button className="button primary" onClick={() => update({ ...save, stage: 'battle' })}>{ready ? 'Enter the arena' : 'Enter the arena'}</button></div>}</div><section className="survival-panel"><div><span>SURVIVAL POTENTIAL</span><strong>{m.hp.toFixed(2)}%</strong></div><div className="survival-meter" role="meter" aria-label="Survival potential" aria-valuemin={0} aria-valuemax={100} aria-valuenow={m.hp} aria-valuetext={`${m.hp.toFixed(2)} percent; pass threshold ${save.exam.passThreshold} percent`}><i style={{ width: `${m.hp}%` }}/><b style={{ left: `${save.exam.passThreshold}%` }}><span>{save.exam.passThreshold}% PASS</span></b></div><p>Maximum attainable: {formatMarks(m.maximumPossible)} / {formatMarks(m.total)} · Earned score: <strong>{formatMarks(m.earned)} / {formatMarks(m.total)}</strong> · {m.correct} correct · {m.incorrect} incorrect</p><p className="fine-print">Wrong answers permanently lose their question’s marks. Survival potential includes unanswered marks. There is no dodge or retry for credit.</p>{save.stage !== 'awakening' && m.coreExposed && !m.ended && <div className="player-special"><div><p className="eyebrow">{save.battle.finisherUsed ? 'SOVEREIGN SIGIL · CAST' : 'PLAYER SPECIAL · UNLOCKED'}</p><p>{save.battle.finisherUsed ? 'Your runic strike has scarred the titan. Finish the remaining paper.' : 'You have secured the passing marks. Unleash a ceremonial strike before the final questions.'}</p></div><button className="button primary" disabled={save.battle.finisherUsed || presenting} onClick={event => { if (event.detail <= 1) castFinisher(); }}>Cast Sovereign Sigil ✦</button><small>No marks or questions are changed. One cast per examination.</small></div>}</section>{notice}{save.stage !== 'awakening'  && <div className="siege-folio">{save.battle.phase === 'question' ? <section className="siege-question" key={q.id}><div className="folio-meta"><span>QUESTION {save.battle.index + 1} / {m.count}</span><span>{q.marks} MARK{q.marks === 1 ? '' : 'S'}</span></div><progress aria-label="Examination progress" max={m.count} value={save.battle.answers.length}/><h2>{q.text}</h2>{q.options.length ? <fieldset aria-label="Choose an answer">{q.options.map(o => <button key={o.id} className={`answer-option ${selection === o.id ? 'selected' : ''}`} aria-pressed={selection === o.id} onClick={() => setSelection(o.id)}><span>{o.id}</span>{o.text}</button>)}</fieldset> : <label>Your exact-text answer<input aria-label="Your answer" value={selection} maxLength={3000} onChange={e => setSelection(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); }}/></label>}<button className="button ink-button" disabled={!selection.trim()} onClick={submit}>Commit answer →</button><p className="fine-print">Committed answers cannot be changed for credit.</p></section> : <section className="siege-feedback" aria-live="polite"><p className="eyebrow">QUESTION {save.battle.index + 1} / {m.count} · COMMITTED ONCE</p><h2>{save.battle.event?.type === 'finisher' ? 'Sovereign Sigil unleashed.' : last?.correct ? m.passed ? 'The titan falls.' : 'The armor fractures.' : m.ended ? 'Eclipse Judgment.' : 'The titan strikes.'}</h2><p>{last?.correct ? `Correct. ${q.marks} marks earned.` : `Incorrect. ${q.marks} marks lost from survival potential.`}</p><p><strong>Your answer:</strong> {answerLabel(q, last?.answer)}<br/><strong>Confirmed key:</strong> {answerLabel(q, q.correctAnswer)}</p>{q.explanation && <p>{q.explanation}</p>}{m.failedEarly && <p>The maximum attainable score is now strictly below {save.exam.passThreshold}%. {m.unattempted} questions remain unattempted.</p>}{m.ended ? <button className="button ink-button" onClick={event => { if (event.detail <= 1) advance(); }}>View examination report →</button> : <button className="button ink-button" disabled={presenting} onClick={event => { if (event.detail <= 1) advance(); }}>Next question →</button>}{presenting && <p className="fine-print">{m.ended ? 'You may skip the ending and open your report immediately.' : 'Anticipation · strike · impact · recovery'}</p>}</section>}</div>}<button className="text-button siege-save-exit" onClick={onExit}>Save & return to title</button></main>;
  }
  return <main className="page"><h1>Restore the ritual.</h1>{notice}<button onClick={() => { current.current = null; setSave(null); }}>Choose a paper</button></main>;
}
