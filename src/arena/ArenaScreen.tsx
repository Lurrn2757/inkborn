import { useEffect, useRef, useState } from 'react';
import { profileSchema, arenaRules, type ArenaCommand, type ArenaMatch, type ArenaMode, type ArenaRoundRecord, type ArenaSnapshot, type MonsterInput } from '../../shared/arena/protocol.js';
import { sampleLessons } from '../../shared/samples.js';
import { session } from '../app/SessionController.js';
import { emptyDrawing, type DrawingDocument } from '../drawing/types.js';
import { prepareSprite } from '../drawing/sprite.js';
import { DrawingScreen } from '../screens/DrawingScreen.js';
import { ArenaStage } from './ArenaStage.js';
import { useArenaClient } from './client.js';
import { arenaMonsterFromSprite, savedArenaMonster, starterMonsters, storeArenaMonster } from './monsters.js';
import '../creative/arena.css';

const moveNames = { execution: 'The Ink Execution', hellfall: 'Crystal Hellfall', equation: 'The Forbidden Equation', fracture: 'Soul Fracture', mindstorm: 'Mindstorm' };
const seconds = (deadline: number | null | undefined, now: number) => Math.max(0, Math.ceil(((deadline ?? now) - now) / 1000));
const activeMatch = (match: ArenaMatch | null | undefined) => Boolean(match && !['lobby', 'completed', 'cancelled'].includes(match.phase));
function MonsterBadge({ monster, className = '' }: { monster: MonsterInput; className?: string }) {
  return <div className={`arena-monster-badge ${className}`} data-monster-kind={monster.kind}>
    {monster.kind === 'drawing' ? <img src={monster.dataUrl} alt={`Original drawing of ${monster.name}`}/> : <svg viewBox="0 0 160 160" aria-label={`Original procedural starter: ${monster.name}`} role="img"><circle cx="80" cy="80" r="58"/><path className="starter-halo" d="M23 80h114M80 23v114M40 40l80 80M40 120l80-80"/>{monster.id === 'warden' ? <><path className="starter-body" d="M38 54 46 23 66 47 93 47 114 23 123 55 116 113 80 137 43 112Z"/><path d="m48 68 24 6m40-6-24 6m-20 31 12 5 12-5"/></> : monster.id === 'oracle' ? <><path className="starter-body" d="m80 29 45 29 15 45-35 32H54l-35-32 16-45Z"/><path d="M43 79q37-40 74 0-37 40-74 0Z"/><circle className="starter-eye" cx="80" cy="79" r="13"/></> : <><path className="starter-body" d="M82 22c-45 26-65 56-41 88l-8 25 27-9 20 12 20-12 27 9-8-25c28-33-6-55-17-73 0 29-28 37-20-15Z"/><path d="m54 80 16 5m36-5-16 5m-17 21 7 5 7-5"/></>}</svg>}
  </div>;
}
function RuleSummary({ mode }: { mode: ArenaMode }) {
  const rules = arenaRules(mode);
  return <p className="arena-rules">First to <strong>{rules.target}</strong> points · {rules.normalRoundLimit} normal rounds · highest score wins at the cap. A tie enters up to five sudden-death rounds, then an honest draw. One answer each per round. Server receipt determines who was first; network latency can affect the result.</p>;
}
function PlayerCard({ player, self, slot }: { player: ArenaMatch['players'][number] | undefined; self: boolean; slot: number }) {
  if (!player) return <article className="arena-player-card arena-empty-slot"><div className="arena-empty-sigil" aria-hidden="true">◇</div><p className="eyebrow">PLAYER {slot + 1} / OPEN SUMMONING</p><h2>Awaiting a real challenger.</h2><p>Share the room code. No opponent is simulated.</p><span className="arena-ready-status">Not connected</span></article>;
  return <article className={`arena-player-card ${player.ready ? 'is-ready' : ''}`}><MonsterBadge monster={player.monster.appearance}/><p className="eyebrow">PLAYER {slot + 1}{self ? ' / YOU' : ' / CHALLENGER'}</p><h2>{player.nickname}</h2><p className="arena-monster-name">{player.monster.appearance.name}</p><span className={`arena-ready-status ${player.connected ? '' : 'is-offline'}`}><i/>{!player.connected ? 'Disconnected' : player.ready ? 'Ready to battle' : 'Preparing the ritual'}</span></article>;
}
function Source({ source }: { source: string }) {
  try { const url = new URL(source); if (url.protocol === 'https:' || url.protocol === 'http:') return <a href={url.href} target="_blank" rel="noreferrer">Verification source ↗</a>; }
  catch { /* A local derivation or verification record is ordinary text. */ }
  return <span>{source}</span>;
}
function RoundHistory({ match, selfId }: { match: ArenaMatch; selfId: string }) {
  return <section className="arena-history"><div className="arena-section-heading"><p className="eyebrow">THE SERVER'S CHRONICLE</p><h2>Every round. Every answer.</h2></div>{match.history.length === 0 ? <p>No round has closed yet.</p> : match.history.map(record => <details className="arena-history-round" key={record.roundId}><summary><span>0{record.index} · {record.question.category}{record.suddenDeath ? ' · SUDDEN DEATH' : ''}</span><strong>{record.winnerId ? `${match.players.find(player => player.id === record.winnerId)?.nickname ?? 'Player'} wins` : 'No point'}</strong></summary><h3>{record.question.text}</h3><p><strong>Correct answer:</strong> {record.correctChoiceId} · {record.question.choices.find(choice => choice.id === record.correctChoiceId)?.text}</p><p>{record.explanation}</p><ul>{match.players.map(player => { const answer = record.answers.find(item => item.playerId === player.id); return <li key={player.id}><strong>{player.nickname}{player.id === selfId ? ' (you)' : ''}:</strong> {answer ? `${answer.choiceId} · ${record.question.choices.find(choice => choice.id === answer.choiceId)?.text} · ${answer.correct ? 'correct' : 'incorrect'} · received #${answer.order}` : 'No submitted answer before this round closed'}</li>; })}</ul><p className="arena-history-source"><Source source={record.source}/></p></details>)}</section>;
}
function Scoreboard({ match, selfId }: { match: ArenaMatch; selfId: string }) {
  return <div className="arena-scoreboard" aria-label="Match score">{match.players.map((player, index) => <div className={`arena-score-player slot-${index} ${player.score === match.target - 1 ? 'is-match-point' : ''}`} key={player.id}><p className="eyebrow">{player.id === selfId ? 'YOUR CREATURE' : 'CHALLENGER'} · {player.connected ? 'CONNECTED' : 'RECONNECTING'}</p><strong>{player.nickname}</strong><span className="arena-score-monster">{player.monster.appearance.name}</span><div className="arena-score-seals" aria-label={`${player.score} of ${match.target} points`}>{Array.from({ length: match.target }, (_, point) => <i className={point < player.score ? 'earned' : ''} key={point}/>)}</div><b className="arena-score-number">{player.score}</b></div>)}</div>;
}
function RoundResult({ record, match }: { record: ArenaRoundRecord; match: ArenaMatch }) {
  return <section className="arena-round-result" aria-live="polite"><p className="eyebrow">ROUND {record.index} / SEALED BY THE SERVER</p><h2>{record.winnerId ? `${match.players.find(player => player.id === record.winnerId)?.nickname ?? 'A player'} strikes first.` : record.reason === 'both-wrong' ? 'Two spells falter.' : 'The question closes.'}</h2><p>{record.winnerId ? 'One point awarded. The other creature absorbs the strike.' : 'No point awarded. The next question offers a fresh chance.'}</p><div className="arena-confirmed-answer"><small>THE CONFIRMED ANSWER</small><strong>{record.correctChoiceId} · {record.question.choices.find(choice => choice.id === record.correctChoiceId)?.text}</strong></div><p>{record.explanation}</p><p className="arena-history-source"><Source source={record.source}/></p></section>;
}

export function ArenaScreen({ reducedMotion, onExit }: { reducedMotion: boolean; onExit: () => void }) {
  const client = useArenaClient(), snapshot = client.snapshot, match = snapshot?.match ?? null;
  const [nickname, setNickname] = useState('');
  const [monster, setMonster] = useState<MonsterInput>({ kind: 'starter', id: 'warden', name: 'The Ink Warden' });
  const [mode, setMode] = useState<ArenaMode>('standard');
  const [code, setCode] = useState(() => { const raw = new URLSearchParams(location.search).get('arena') ?? ''; return /^[A-HJ-NP-Z2-9]{6}$/i.test(raw) ? raw.toUpperCase() : ''; });
  const [error, setError] = useState<string | null>(null), [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [drawingMode, setDrawingMode] = useState(false);
  const [drawing, setDrawing] = useState<DrawingDocument>(emptyDrawing);
  const drawingRef = useRef(drawing), seededProfile = useRef<string | null>(null);
  const [choice, setChoice] = useState<string | null>(null), [uncertain, setUncertain] = useState(false);
  const me = match?.players.find(player => player.id === snapshot?.selfId);
  const connected = client.connection === 'connected';
  const pending = busy || client.pending;
  const roundId = match?.round?.id;
  useEffect(() => {
    if (snapshot && seededProfile.current !== snapshot.selfId) { seededProfile.current = snapshot.selfId; setNickname(snapshot.profile.nickname); setMonster(snapshot.profile.monster.appearance); }
  }, [snapshot]);
  useEffect(() => { setChoice(null); setUncertain(false); setError(null); }, [roundId]);
  useEffect(() => { if (me?.submitted || match?.phase !== 'question') setUncertain(false); }, [me?.submitted, match?.phase]);

  async function perform(command: ArenaCommand) {
    setError(null);
    const result = await client.send(command);
    if (!result.ok) setError(result.message);
    return result;
  }
  async function prepareProfile() {
    const checked = profileSchema.safeParse({ nickname, monster });
    if (!checked.success) { setError(checked.error.issues[0]?.message ?? 'Check your nickname and monster name.'); return false; }
    const result = await perform({ type: 'profile', profile: checked.data });
    return result.ok;
  }
  async function begin(command: ArenaCommand) {
    if (pending || !connected) return;
    setBusy(true); setInfo(null);
    try { if (await prepareProfile()) await perform(command); }
    finally { setBusy(false); }
  }
  async function importDrawing() {
    if (pending) return;
    setBusy(true); setError(null);
    try {
      let sprite = session.getSnapshot().sprite;
      let origin = 'Classic Battle';
      if (!sprite) { const saved = await (await import('../exam/storage.js')).loadSiege(); sprite = saved?.sprite ?? null; origin = 'Exam Siege'; }
      if (!sprite) throw new Error('No compatible single-player creature is saved. Draw a new one, or choose an original starter.');
      const prepared = await arenaMonsterFromSprite(sprite, monster.name);
      setMonster(prepared); const saved = storeArenaMonster(prepared);
      setInfo(`Your ${origin} drawing is ready. Only its creature image is shared with your opponent.${saved ? '' : ' Local saving is unavailable; keep this tab open.'}`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'The previous drawing could not be loaded.'); }
    finally { setBusy(false); }
  }
  async function prepareDrawing() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const sprite = await prepareSprite(drawingRef.current, []);
      const prepared = await arenaMonsterFromSprite(sprite, monster.name);
      setMonster(prepared); const saved = storeArenaMonster(prepared); setDrawingMode(false);
      setInfo(saved ? 'Your original ink is ready for the Arena and saved on this device.' : 'Your drawing is ready for this visit. Local saving is blocked in this browser.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'The drawing could not be prepared.'); }
    finally { setBusy(false); }
  }
  async function submit(choiceId: 'A' | 'B' | 'C' | 'D') {
    if (!match?.round || match.phase !== 'question' || !connected || me?.submitted || choice || pending || !match.players.every(player => player.connected)) return;
    setChoice(choiceId); const reply = await perform({ type: 'answer', matchId: match.id, roundId: match.round.id, choiceId });
    if (!reply.ok) { if (reply.code === 'TIMEOUT' || reply.code === 'INVALID_REPLY') setUncertain(true); else setChoice(null); }
  }
  async function exit() {
    if (match && connected) await client.send({ type: 'leave', matchId: match.id });
    if (snapshot?.queue && connected) await client.send({ type: 'cancelQueue' });
    onExit();
  }
  async function copyInvite() {
    if (!snapshot?.publicUrl || !match?.code) return;
    const url = new URL(snapshot.publicUrl); url.searchParams.set('arena', match.code);
    try { await navigator.clipboard.writeText(url.href); setInfo('Invitation copied. Your temporary guest token is never included.'); }
    catch { setInfo(`Copy this invitation: ${url.href}`); }
  }

  if (drawingMode) return <DrawingScreen drawing={drawing} lesson={sampleLessons[0]!} preparing={busy} error={error} onChange={next => { drawingRef.current = next; setDrawing(next); }} onError={setError} onPrepare={() => { void prepareDrawing(); }} onBack={() => setDrawingMode(false)} bindingLabels={['Your Arena identity', 'Original transparent ink', 'Only your creature image is shared']} backLabel="← Back to Arena lobby"/>;

  const status = client.connection === 'connected' ? 'CONNECTED TO ARENA' : client.connection === 'reconnecting' ? 'RECONNECTING TO ARENA' : client.connection === 'unavailable' ? 'ARENA UNAVAILABLE' : client.connection === 'replaced' ? 'GUEST ACTIVE IN ANOTHER WINDOW' : 'CONNECTING TO ARENA';
  const completed = match?.phase === 'completed' || match?.phase === 'cancelled';
  return <main className={`arena-online ${match && match.phase !== 'lobby' ? 'arena-in-battle' : ''}`} data-arena-phase={match?.phase ?? (snapshot?.queue ? 'queue' : 'lobby')}>
    <header className="arena-page-heading"><div><p className="eyebrow">INKBORN ARENA / TWO MINDS. ONE RITUAL.</p><h1>{match && match.phase !== 'lobby' ? completed ? 'The binding is decided.' : 'Challenge another mind.' : 'Challenge Another Mind'}</h1><p>{match && match.phase !== 'lobby' ? 'Your creatures carry the contest. The server seals every point.' : 'Bring your ink. Meet a real challenger. Earn every strike.'}</p></div><div className="arena-connection"><span className={connected ? 'is-connected' : ''}><i/>{status}</span><button className="text-button" onClick={client.connection === 'replaced' ? client.newGuest : client.reconnect} disabled={client.connection === 'connecting'}>{client.connection === 'replaced' ? 'Start new guest' : 'Reconnect'}</button></div></header>
    <div className="arena-notices">{(client.notice || snapshot?.notice) && <p className="arena-notice" role="status">{client.notice ?? snapshot?.notice}</p>}{info && <p className="arena-notice" role="status">{info}</p>}{(error || client.error) && <p className="inline-error" role="alert">{error ?? client.error}</p>}{client.connection === 'reconnecting' && <p className="arena-notice" role="status">Connection interrupted. The last confirmed score stays visible. A live match pauses for the server's reconnect grace period; no answers are invented.</p>}</div>
    {!snapshot ? <section className="arena-connecting"><div className="arena-queue-sigil" aria-hidden="true"><span>◇</span><i/><i/></div><p className="eyebrow">{client.connection === 'unavailable' ? 'THE GATE IS CLOSED' : 'OPENING A REAL CONNECTION'}</p><h2>{client.connection === 'unavailable' ? 'The Arena is unreachable.' : 'A new mind approaches.'}</h2><p>{client.connection === 'unavailable' ? 'Online play needs the Arena server. Exam Siege and Classic Battle remain available on this device.' : 'No opponent is present until another guest actually connects.'}</p><button className="button primary" onClick={client.reconnect}>Try connecting again</button></section>
    : snapshot.queue ? <section className="arena-queue-panel" aria-live="polite"><div className="arena-queue-sigil" aria-hidden="true"><span>◇</span><i/><i/></div><p className="eyebrow">{snapshot.queue.mode === 'duel' ? 'QUICK DUEL / FIRST TO THREE' : 'ARENA WARFARE / FIRST TO FIVE'}</p><h2>Searching for another mind.</h2><p><strong>{snapshot.profile.nickname}</strong>, your creature is waiting for a real player in the same queue.</p><p className="arena-queue-clock">{seconds(snapshot.queue.expiresAt, client.now)}<span>SECONDS IN THIS QUEUE WINDOW</span></p><button className="button secondary" disabled={!connected || pending} onClick={() => { void perform({ type: 'cancelQueue' }); }}>Cancel Quick Match</button><RuleSummary mode={snapshot.queue.mode}/></section>
    : !match ? <div className="arena-lobby-layout"><section className="arena-identity"><div className="arena-section-heading"><p className="eyebrow">I / GIVE THE CHALLENGER A NAME</p><h2>Your vessel.</h2></div><label>Player nickname<input aria-label="Arena nickname" maxLength={24} value={nickname} onChange={event => setNickname(event.target.value)} disabled={pending}/></label><div className="arena-current-monster"><MonsterBadge monster={monster}/><div><label>Monster name<input aria-label="Arena monster name" maxLength={24} value={monster.name} onChange={event => setMonster({ ...monster, name: event.target.value })} disabled={pending}/></label><p className="fine-print">{monster.kind === 'drawing' ? 'YOUR ACTUAL DRAWING · SHARED AS TRANSPARENT INK' : 'ORIGINAL PROCEDURAL STARTER · OPTIONAL'}</p></div></div><div className="arena-starter-grid" role="group" aria-label="Choose an original starter creature">{starterMonsters.map(starter => <button className={`arena-starter ${monster.kind === 'starter' && monster.id === starter.id ? 'selected' : ''}`} key={starter.id} aria-pressed={monster.kind === 'starter' && monster.id === starter.id} disabled={pending} onClick={() => setMonster({ kind: 'starter', id: starter.id, name: starter.name })}><span aria-hidden="true">{starter.glyph}</span><small>{starter.title}</small><strong>{starter.name}</strong></button>)}</div><div className="arena-drawing-actions"><button className="button secondary" disabled={pending} onClick={() => { setError(null); setDrawingMode(true); }}>Draw my Arena monster <span aria-hidden="true">✎</span></button><button className="text-button" disabled={pending} onClick={() => { const saved = savedArenaMonster(); if (saved) { setMonster(saved); setInfo('Your saved Arena drawing is selected.'); } else setError('No Arena drawing is saved on this device yet.'); }}>Use saved Arena drawing</button><button className="text-button" disabled={pending} onClick={() => { void importDrawing(); }}>Import previous single-player creature</button></div><p className="arena-privacy">Guest access. Your nickname and creature are shown to your opponent. Notes, papers and answer keys are never shared.</p></section><section className="arena-gates"><div className="arena-section-heading"><p className="eyebrow">II / CHOOSE YOUR CHALLENGE</p><h2>Enter the circle.</h2></div><fieldset className="arena-mode-picker"><legend>Match format</legend><label><input type="radio" name="arena-mode" value="duel" checked={mode === 'duel'} onChange={() => setMode('duel')}/><span><strong>Quick Duel</strong><small>First to 3 · five normal rounds</small></span></label><label><input type="radio" name="arena-mode" value="standard" checked={mode === 'standard'} onChange={() => setMode('standard')}/><span><strong>Arena Warfare</strong><small>First to 5 · nine normal rounds</small></span></label></fieldset><button className="arena-gate arena-gate-quick" disabled={!connected || pending} onClick={() => { void begin({ type: 'queue', mode }); }}><span className="arena-gate-rune" aria-hidden="true">✧</span><span><small>MEET ANOTHER WAITING PLAYER</small><strong>Quick Match</strong><em>Enter the live matchmaking queue</em></span><b aria-hidden="true">↗</b></button><button className="arena-gate" disabled={!connected || pending} onClick={() => { void begin({ type: 'create', mode }); }}><span className="arena-gate-rune" aria-hidden="true">◇</span><span><small>A CODE KNOWN ONLY TO YOUR CHALLENGER</small><strong>Create Private Room</strong><em>Invite a friend into the same arena</em></span><b aria-hidden="true">↗</b></button><form className="arena-join" onSubmit={event => { event.preventDefault(); void begin({ type: 'join', code }); }}><label htmlFor="arena-room-code">Join Private Room</label><div><input id="arena-room-code" aria-label="Private room code" value={code} maxLength={6} autoComplete="off" spellCheck={false} placeholder="ABC234" onChange={event => setCode(event.target.value.toUpperCase().replace(/\s/g, ''))}/><button className="button secondary" type="submit" disabled={!connected || pending || code.length !== 6}>Join room →</button></div></form><RuleSummary mode={mode}/></section></div>
    : match.phase === 'lobby' ? <section className="arena-room-lobby"><div className="arena-room-banner"><div><p className="eyebrow">{match.visibility === 'private' ? 'PRIVATE SUMMONING' : 'QUICK MATCH / TWO REAL GUESTS'}</p><h2>{match.visibility === 'private' ? 'The room is yours.' : 'A challenger has arrived.'}</h2></div>{match.code && <div className="arena-room-code"><span>ROOM CODE</span><strong aria-label="Current private room code">{match.code}</strong>{snapshot.publicUrl ? <button className="text-button" onClick={() => { void copyInvite(); }}>Copy invitation URL ↗</button> : <small>Share this code. A public invite URL is not configured.</small>}</div>}</div><div className="arena-player-grid">{[0, 1].map(index => <PlayerCard key={index} player={match.players[index]} slot={index} self={match.players[index]?.id === snapshot.selfId}/>)}</div><div className="arena-room-actions"><button className="button primary" disabled={!connected || pending || !me} onClick={() => { void perform({ type: 'ready', matchId: match.id, ready: !me?.ready }); }}>{me?.ready ? 'Withdraw ready status' : 'Ready for battle ✦'}</button><p>{match.players.length < 2 ? 'The match waits for a second connected, ready player.' : match.players.every(player => player.ready && player.connected) ? 'Both minds are ready. Awaiting the server introduction.' : 'Both players must be connected and ready to begin.'}</p><button className="text-button" disabled={!connected || pending} onClick={() => { void perform({ type: 'leave', matchId: match.id }); }}>Leave room</button></div><RuleSummary mode={match.mode}/></section>
    : <><div className="arena-live-layout"><div className="arena-battle-column"><Scoreboard match={match} selfId={snapshot.selfId}/><div className="arena-online-stage"><ArenaStage match={match} selfId={snapshot.selfId} reducedMotion={reducedMotion}/></div><div className="arena-stage-caption"><span>{completed ? 'MATCH COMPLETE' : `ROUND ${match.round?.index ?? 1}${match.round?.suddenDeath ? ' · SUDDEN DEATH' : ` / ${match.normalRoundLimit}`}`}</span><strong>{match.event?.type === 'backlash' ? 'A spell falters · answer locked' : match.event?.type === 'round' || match.event?.type === 'finish' ? moveNames[match.event.move] : 'Knowledge gives your creature form.'}</strong></div>{match.players.some(player => player.score === match.target - 1) && !completed && <p className="arena-match-point">MATCH POINT · Charged armor is cosmetic. Every player still gets one answer.</p>}</div><aside className="arena-question-folio">
      {completed ? <section className="arena-match-ending" aria-live="polite"><p className="eyebrow">{(match.finishReason === 'forfeit' || match.finishReason === 'left') ? 'DECIDED BY FORFEIT' : match.winnerId ? 'THE VICTOR IS CONFIRMED' : 'THE RITUAL CLOSES'}</p><div className="arena-ending-glyph" aria-hidden="true">{match.winnerId ? '✦' : '◇'}</div><h2>{match.winnerId ? match.winnerId === snapshot.selfId ? 'Your mind prevails.' : `${match.players.find(player => player.id === match.winnerId)?.nickname ?? 'Your challenger'} prevails.` : match.finishReason === 'draw' ? 'An honest draw.' : 'The match was interrupted.'}</h2><p className="arena-final-score">{match.players.map(player => player.score).join(' : ')}</p><p>{(match.finishReason === 'forfeit' || match.finishReason === 'left') ? 'The server resolved a departure or expired reconnect window as a forfeit. The displayed points are the points actually earned.' : match.finishReason === 'round-cap' ? 'Neither player reached the target before the normal-round cap. The server awarded the match to the score leader.' : match.finishReason === 'sudden-death' ? 'The first correct sudden-death response decided the match.' : match.finishReason === 'draw' ? 'The sudden-death limit closed without a deciding correct answer. Neither player is declared a winner.' : match.finishReason === 'target' ? 'The winning creature earned the match target. Every round is recorded below.' : 'No invented score or opponent replaces an interrupted match.'}</p><div className="arena-rematch"><button className="button ink-button" disabled={!connected || pending || match.players.length !== 2 || !match.players.every(player => player.connected)} onClick={() => { void perform({ type: 'rematch', matchId: match.id, accept: !me?.rematchAccepted }); }}>{me?.rematchAccepted ? 'Cancel rematch request' : 'Accept rematch ↗'}</button><p>{me?.rematchAccepted ? 'You accepted. Waiting for the other player to accept.' : 'A new match begins only when both connected players accept.'}</p><button className="button secondary" disabled={!connected || pending} onClick={() => { void perform({ type: 'leave', matchId: match.id }); }}>Return to Arena lobby</button></div></section>
      : match.phase === 'paused' ? <section className="arena-paused" aria-live="polite"><p className="eyebrow">THE SERVER HAS PAUSED THE RITUAL</p><h2>A connection is missing.</h2><div className="arena-countdown-number">{seconds(match.reconnectDeadline, client.now)}</div><p>seconds in the reconnect window</p><p>The current round and committed answers are preserved. Neither player can answer during the pause.</p><p>{match.players.filter(player => !player.connected).map(player => player.nickname).join(' and ')} {match.players.filter(player => !player.connected).length === 1 ? 'is' : 'are'} reconnecting.</p>{!connected && <button className="button ink-button" onClick={client.reconnect}>Reconnect to this match</button>}</section>
      : match.phase === 'intro' ? <section className="arena-introduction" aria-live="polite"><p className="eyebrow">TWO PORTALS / TWO REAL PLAYERS</p><h2>Let the ink<br/><em>recognize its rival.</em></h2><p>{match.players.map(player => player.nickname).join(' against ')}.</p><div className="arena-countdown-number">{seconds(match.phaseEndsAt, client.now)}</div><p>The server will begin the synchronized countdown.</p></section>
      : match.phase === 'countdown' ? <section className="arena-countdown" aria-live="polite"><p className="eyebrow">ROUND {match.round?.index} · {match.round?.question.category}</p><h2>{match.round?.suddenDeath ? 'Sudden death.' : 'Prepare your answer.'}</h2><div className="arena-countdown-number" role="timer" aria-label="Round begins in">{seconds(match.phaseEndsAt ?? match.round?.startsAt, client.now) || '✦'}</div><p>Both players receive the same question. Answers unlock only when the server opens the round.</p></section>
      : match.phase === 'intermission' && match.history.at(-1) ? <><RoundResult record={match.history.at(-1)!} match={match}/><p className="arena-next-round">Next server-controlled countdown in <strong>{seconds(match.phaseEndsAt, client.now)}</strong>s</p></>
      : match.phase === 'question' && match.round ? <section className="arena-live-question" key={match.round.id}><div className="arena-question-meta"><span>{match.round.question.category.toUpperCase()} · {match.round.question.difficulty.toUpperCase()}</span><span className="arena-round-clock" role="timer" aria-label="Round time remaining">{seconds(match.round.endsAt, client.now)}s</span></div><p className="eyebrow">ROUND {match.round.index}{match.round.suddenDeath ? ' / SUDDEN DEATH' : ''}</p><h2>{match.round.question.text}</h2><fieldset aria-label="Choose one Arena answer">{match.round.question.choices.map(option => <button key={option.id} className={`arena-answer ${choice === option.id ? 'chosen' : ''}`} disabled={!connected || pending || Boolean(choice) || me?.submitted || client.now < match.round!.startsAt || !match.players.every(player => player.connected)} aria-pressed={choice === option.id} onClick={() => { void submit(option.id); }}><span>{option.id}</span><strong>{option.text}</strong></button>)}</fieldset><p className="arena-answer-status" role="status">{me?.wrong ? 'Magical backlash. Your answer is locked; your opponent may still answer.' : me?.submitted ? 'Your answer has been received by the server.' : choice ? 'Awaiting authoritative confirmation…' : !connected ? 'Reconnect before answering.' : 'Choose once. Your answer commits immediately.'}</p>{uncertain && <button className="text-button" onClick={client.reconnect}>Synchronize Arena state</button>}<p className="arena-fairness">First correct response received by the server wins. Client clocks and animations never award points.</p></section> : <p>Synchronizing the next server state…</p>}
    </aside></div>{completed && <RoundHistory match={match} selfId={snapshot.selfId}/>}</>}
    <footer className="arena-online-footer"><span>REAL GUESTS · SERVER-AUTHORITATIVE SCORING · NO SIMULATED OPPONENTS</span><button className="text-button" disabled={busy} onClick={() => { void exit(); }}>{client.connection === 'replaced' ? '← Return to INKBORN' : activeMatch(match) ? 'Forfeit & return to INKBORN' : match?.phase === 'lobby' ? 'Leave room & return to INKBORN' : '← Return to INKBORN'}</button></footer>
  </main>;
}

export type { ArenaSnapshot };
