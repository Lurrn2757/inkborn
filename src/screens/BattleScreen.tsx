import { useEffect, useState } from 'react';
import type { Lesson } from '../../shared/schema.js';
import { getCurrentQuestion, type BattleState } from '../battle/reducer.js';
import { summarizeBattle } from '../battle/results.js';
import { battleEnding, endingCopy, ritualIntegrity } from '../battle/ritual.js';
import { QuestionFolio, FeedbackFolio } from '../components/QuestionFolio.js';
import { RitualIntegrity } from '../components/RitualIntegrity.js';
import type { CreatureAsset } from '../drawing/types.js';
import { AWAKENING_DURATION } from '../rendering/motion.js';
import { ArenaView } from '../rendering/ArenaView.js';
import type { ArenaViewProps } from '../rendering/types.js';

export const crystalState = (outcome: string | undefined): 'stable' | 'corrupted' | 'shattered' | 'unresolved' => outcome === 'first' || outcome === 'corrected' ? 'shattered' : outcome === 'corrupted' ? 'corrupted' : outcome === 'unresolved' ? 'unresolved' : 'stable';
type Props = { sprite: CreatureAsset; lesson: Lesson; battle: BattleState; awakening: boolean; reducedMotion: boolean; presenting: boolean; onReady: () => void; onSelect: (id: string) => void; onSubmit: (questionId: string, conceptId: string, optionId: string, revision: number) => void; onContinue: () => void; onFinish: () => void };
export function BattleScreen({ sprite, lesson, battle, awakening, reducedMotion, presenting, onReady, onSelect, onSubmit, onContinue, onFinish }: Props) {
  const [sceneReady, setSceneReady] = useState(false);
  useEffect(() => {
    if (!awakening || !sceneReady) return;
    const timer = setTimeout(onReady, reducedMotion ? 900 : AWAKENING_DURATION * 1000);
    return () => clearTimeout(timer);
  }, [awakening, sceneReady, onReady, reducedMotion]);
  const summary = summarizeBattle(battle);
  const integrity = ritualIntegrity(battle);
  const outcome = battleEnding(battle);
  const copy = endingCopy[outcome];
  const question = getCurrentQuestion(battle, lesson);
  const concept = lesson.concepts.find(item => item.id === battle.activeConceptId);
  const answer = battle.answers.at(-1);
  const ending = battle.phase === 'ending';
  const struck = presenting && (battle.event?.type === 'corrupt' || battle.event?.type === 'unresolved');
  const scene: ArenaViewProps['scene'] = awakening ? 'awakening' : ending ? outcome === 'retreat' ? 'retreat' : 'victory' : 'battle';
  const completed = summary.first + summary.corrected + summary.unresolved;
  const reaction = battle.event?.type;
  const impactTitle = reaction === 'recovery' ? 'CONCEPT RECLAIMED' : reaction === 'hit' ? 'CRYSTAL SHATTERED' : integrity === 0 ? 'THE FINAL SEAL BREAKS' : reaction === 'unresolved' ? 'CORRUPTION TAKES ROOT' : 'A WARD IS BROKEN';
  return <main className={`battle-screen ${awakening ? 'is-awakening' : ''} ${struck ? 'is-struck' : ''}`} data-integrity={integrity} data-ending={ending ? outcome : undefined}>
    <div className="battle-heading"><div><p className="eyebrow">{awakening ? 'IV / THE AWAKENING' : 'IV / THE RECKONING'}</p><h1>{awakening ? 'The ink remembers.' : ending ? outcome === 'retreat' ? 'The creature withdraws.' : 'The spell is broken.' : 'Confront what you know.'}</h1></div>
      <div className="battle-status" aria-label={`${summary.first + summary.corrected} crystals shattered, ${summary.unresolved} unresolved, ${3 - completed} encounters remaining`}><span><strong>{summary.first + summary.corrected}</strong> SHATTERED</span><i/><span><strong>{summary.unresolved}</strong> UNRESOLVED</span></div>
    </div>
    <div className="battle-layout">
      <section className="arena-panel" aria-label="Your animated creature">
        <ArenaView onSceneReady={() => setSceneReady(true)} sprite={sprite} crystals={lesson.concepts.map(item => ({ id: item.id, label: item.label, state: crystalState(battle.outcomes[item.id]) }))} selectedId={battle.activeConceptId} event={battle.event} scene={scene} ritualIntegrity={integrity} victoryStyle={outcome === 'dominant' ? 'dominant' : 'scarred'} reducedMotion={reducedMotion} onSelect={onSelect}/>
        <div className="chamber-pressure" aria-hidden="true"/>
        <RitualIntegrity remaining={integrity} struck={struck}/>
        {presenting && battle.event && <div key={battle.event.id} className={`battle-impact impact-${reaction}`} aria-hidden="true">
          <div className="impact-light"/>
          {struck && <svg className="attack-slashes" viewBox="0 0 600 600" preserveAspectRatio="none"><path d="M180 170Q310 290 370 460M255 145Q370 275 415 430M330 135Q430 260 460 385"/></svg>}
          {reaction === 'recovery' && <div className="reclamation-ring"/>}
          <div className="impact-caption"><span>{struck ? 'THE CREATURE STRIKES' : reaction === 'recovery' ? 'FROM CORRUPTION TO UNDERSTANDING' : 'FIRST CAST · CLEAN BREAK'}</span><strong>{impactTitle}</strong><small>{struck ? `${integrity} of 5 seals remain · ${integrity === 0 ? 'Review the feedback, then retreat' : 'Read. Regroup. Reclaim.'}` : concept?.label}</small></div>
        </div>}
        <div className="arena-corner-note"><span className="small-diamond"/> {ending ? copy.label : integrity <= 2 ? 'THE BINDING IS FAILING' : 'BOUND FROM YOUR OWN INK'}</div>
        {awakening && <div className="awakening-caption"><p className="eyebrow">A CREATURE MADE OF UNFINISHED KNOWLEDGE</p><h2>Your drawing is waking.</h2><button className="text-button" onClick={onReady}>Skip awakening →</button></div>}
        <div className="concept-controls" role="group" aria-label="Choose a concept vulnerability">{lesson.concepts.map((item, index) => {
          const state = crystalState(battle.outcomes[item.id]);
          return <button key={item.id} className={`concept-control ${state} ${item.id === battle.activeConceptId ? 'selected' : ''}`} disabled={awakening || battle.phase !== 'choosing' || state !== 'stable'} onClick={() => onSelect(item.id)} aria-label={`${item.label}: ${state}`}><span className="control-crystal">{state === 'shattered' ? '✦' : state === 'unresolved' ? '◈' : '◇'}</span><span><small>0{index + 1} / {state === 'stable' ? 'AVAILABLE' : state.toUpperCase()}</small><strong>{item.label}</strong></span></button>;
        })}</div>
      </section>
      <aside className="battle-folio-area">{awakening ? <div className="waiting-folio"><span className="waiting-glyph">✧</span><p className="eyebrow">FROM PAPER TO POSSIBILITY</p><h2>Give it<br/>a moment<br/><em>to breathe.</em></h2><p>The marks you made are the creature you’ll face. Three crystals carry three concepts from your notes.</p></div>
        : ending ? <div className={`ending-folio manuscript ${outcome}`}><span className="feedback-emblem">{outcome === 'retreat' ? '◈' : outcome === 'dominant' ? '✧' : '✦'}</span><p className="eyebrow">{copy.label}</p><h2>{copy.title}</h2><p>{copy.description}</p><p className="ending-integrity">{integrity} / 5 seals intact <span>·</span> {summary.first + summary.corrected} / 3 crystals reclaimed</p><button className="button ink-button" onClick={onFinish}>Open the battle record →</button></div>
        : question && concept ? battle.phase === 'feedback' && answer ? <FeedbackFolio key={`feedback-${question.id}`} question={question} answer={answer} presenting={presenting} integrity={integrity} onContinue={onContinue}/>
          : <QuestionFolio key={question.id} question={question} concept={concept} revision={battle.revision} onSubmit={(optionId, revision) => onSubmit(question.id, concept.id, optionId, revision)}/>
        : <div className="waiting-folio"><p className="eyebrow">{integrity === 5 ? 'CHOOSE YOUR FIRST VULNERABILITY' : 'THE CIRCLE STILL HOLDS'}</p><h2>Every crystal<br/>has a<br/><em>question.</em></h2><p>Select a crystal on your creature, or use one of the labeled controls below it. Face the concepts in any order.</p><div className="ritual-divider">✦</div><p className="ritual-rules">Five seals bind the creature. Each mistake breaks one. Use the feedback to reclaim a corrupted concept. If all five break, retreat with your discoveries.</p><p className="fine-print">No countdown. Take the time you need.</p></div>}
      </aside>
    </div>
  </main>;
}
