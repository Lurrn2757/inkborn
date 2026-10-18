---
doc: prd
status: approved
---

# INKBORN — Product Requirements

**The Monster Made of Your Mistakes.** A complete local learning game for students who turn their study notes and their own drawing into a living, concept-driven boss battle.

Sources: approved `scope.md`, the owner's original product brief, and their explicit gameplay decisions. This document defines the focused, polished experience; it does not claim implementation or verification is complete.

## The Core Journey

Source: `scope.md > The Unique Kernel`, `The Core Loop`, `What "Working" Looks Like`.

1. Enter an atmospheric title screen that explains: your drawing becomes the monster; your understanding changes it.
2. Start a new battle, resume an existing one, or open How It Works and settings. A prominent Sample Battle route works without credentials.
3. Select clearly labeled curated notes or paste personal notes for real AI preparation. Inspect the notes and understand which mode is active.
4. Draw a creature on a magical workbench. Edit it, preview its recognizable silhouette, and continue only with visible ink.
5. Prepare three concepts with evidence-linked initial and follow-up questions. In sample mode these are curated, not generated. Preparation failures preserve the player's work.
6. Preview three automatically placed crystals, each associated with one named concept. Adjust their positions if needed, then awaken the creature.
7. Watch the actual drawing materialize, gather energy, breathe and awaken in the arena. Its crystals remain visibly attached as it moves.
8. Select any available crystal directly or through its labeled control. The arena emphasizes that region and displays its question.
9. Resolve that concept through one initial question and, only after an incorrect answer and explanatory feedback, one distinct follow-up.
10. Choose another available concept. Continue until all three encounters end as shattered or unresolved; mistakes never cause player death.
11. See an ink-dissolution victory if all crystals shattered, or a polished retreat if any remain unresolved.
12. Review accurate answer records, supporting notes and next-practice suggestions. Preserve the summary, inspect previous summaries, or begin another battle.

## Screens and Layout

Source: `scope.md > The POC Boundary`, `Inspiration & Identity`.

| Surface | Composition and primary actions |
| --- | --- |
| Title chamber | Dominant INKBORN wordmark and original emblem; a breathing ink formation within a deep chamber. Start New Battle and Sample Battle are immediately visible. Continue Battle appears only for a recoverable active session. How It Works, sound/motion settings and saved records are secondary actions. |
| Notes folio | Readable manuscript-style notes area with a clear personal-notes/sample distinction. Two curated sample choices include subject and concept previews. Primary action proceeds to drawing; back navigation preserves the draft. |
| Drawing workbench | Large parchment drawing surface, compact labeled tools, brush/palette controls, undo/redo and clear. A live creature preview reinforces that the player's drawing becomes the boss. Preparation status and continuation are visible without covering the canvas. |
| Crystal preview | The cropped creature dominates. Three numbered, named crystals and their tethers show automatic attachment. Direct adjustment, equivalent keyboard positioning controls, reset placement, redraw and Awaken are available. This is a short stage of the workbench, not another elaborate setup screen. |
| Awakening and arena | Full atmospheric environment with the creature as the visual anchor. On wide screens it occupies center-left and a readable question folio occupies the right. Battle progress, mode label, concept controls and sound/motion access remain clear. |
| Results and review | An illuminated bestiary record: the player's creature, the ending, and three outcome summaries lead into expandable answer/evidence records and practical review guidance. New Battle, return to title and saved records work. |

Help, settings, feedback and saved records use focused overlays or in-place panels, not unrelated navigation destinations. Smaller screens stack the creature and folio without overlapping answers or requiring horizontal page scrolling.

## Look and Feel

Source: `scope.md > Inspiration & Identity`; owner emphasis on premium indie-game presentation.

The world is an ancient forbidden storybook inside an alchemist's chamber. Use original ink illustration, engraved geometry, weathered parchment, layered architecture, restrained fog and floating ash. Near-black charcoal and midnight ink establish depth. Aged ivory carries readable text; antique gold communicates progression, burgundy communicates corruption, dark violet instability and soft teal secondary energy. Brilliant highlights are reserved for impacts and revelations.

Dramatic, elegant serif display typography contrasts with clean, readable gameplay text. Cormorant Garamond and Manrope are candidate directions from the brief; exact fonts and licenses are confirmed in the technical plan. Decorative lettering must not reduce question readability. Avoid generic dashboard cards, component-library styling, ubiquitous purple gradients and indiscriminate neon.

Each surface has a focal composition and controlled negative space. Materials, borders, icons, lighting and transitions belong to the same world. The creature stays recognizable and retains its colors through breathing, recoil, corruption and recovery; temporary lighting may emphasize it without permanently replacing or repainting it.

Sound supports awakening, selection, charging, attacks, fracture, recovery and endings. It is restrained, original or properly licensed, volume-controlled and never necessary to understand an event. Final presentation is judged in the running game, including full and reduced motion, rather than inferred from source files.

**External graphic inspiration:** at the owner's request, a [Lovable reference session](https://lovable.dev/projects/d9fcd5a5-b70c-45f9-bde2-31fdaa890330) produced title, arena and bestiary composition studies. These are inspiration, not application implementation or approved screen designs. Useful directions include engraved gold edges, architectural depth, stable reading surfaces and corruption reversing before a recovery shatter. Reject the reference's stock-looking title monster, invented decorative copy, "mastered" claims and its confusion between unattempted and unresolved crystal states. The product rules in this PRD take precedence.

## Features and Behavior

### Title, Help and Settings

Source: `scope.md > The Core Loop`, `The POC Boundary`.

- Start New Battle begins a draft. If an active session would be replaced, the player sees a clear choice before losing it.
- Sample Battle opens the same journey with a clearly identified sample selected; drawing remains a genuine player action.
- Continue Battle restores the saved drawing, content, crystal identities, answer history and current meaningful stage.
- How It Works explains drawing, choosing concepts, corruption, feedback, follow-ups and both endings in a short readable overlay.
- Sound, volume and motion controls work from the title and during play. Sound begins only after a player interaction; failure to start audio does not block play. Reduced-motion preferences are respected automatically and can be changed explicitly.

**Acceptance:** a first-time visitor can identify the premise and sample entry; all visible controls work; overlays close by keyboard and return focus; no nonexistent session is offered as continuable.

### Notes and Educational Preparation

Source: `scope.md > Who It's For`, `What "Working" Looks Like`, `The POC Boundary`.

- Personal-notes mode genuinely processes the supplied text through the configured AI provider. The player is told that this action sends those notes to that provider; drawing alone is not sent for question generation.
- Sample mode works without a key or network generation and is persistently labeled **Sample Battle — curated questions**. Editing sample notes switches the draft to personal-notes mode and requires fresh preparation; old curated answers must not silently apply to edited content.
- Provide two meaningfully different, verified sample sets. Delegated content choice: basic electrical circuits and cell biology, each containing three distinct concepts that can be supported entirely by its notes.
- Each concept has a stable identity, a concise label and genuine supporting excerpts. Each question has four distinguishable options, one correct option, an explanation, a concept association and a difficulty label. Follow-ups use a different prompt and test the same concept; a rearrangement of the original options is insufficient.
- Source references resolve to exact passages of the unchanged session notes. Exact-match evidence verification is required, but is not represented as proof that every AI interpretation is infallible. Content must also be checked for internal consistency and adequate support.
- Embedded instructions in notes are treated as content, not instructions for the application. Generated content is displayed as text rather than executable material.
- Empty, excessive, insufficient, conflicting or unsuitable input receives actionable feedback. If three supportable concepts cannot be prepared, ask the player to revise notes or explicitly choose a sample; do not invent missing concepts or silently substitute content.
- Show honest preparation stages such as preparing concepts and checking evidence. Do not display fabricated percentages or simulate an AI request for samples. Allow return to editing or cancellation without losing notes or drawing. Late responses cannot overwrite a newer draft.
- Provider, credential, network and validation failures produce a bounded recovery path: retry, edit notes or explicitly choose a sample. No endless regeneration loop or exposure of credentials/raw sensitive server diagnostics.

**Acceptance:** both sample sets work with no credentials; new personal notes reach the real generation path; four-option questions and distinct follow-ups are enforced; invalid/missing evidence is rejected; changing notes invalidates previous preparation; failures preserve input and never masquerade as successful generation.

### Drawing and Sprite Preparation

Source: `scope.md > The Unique Kernel`, `The POC Boundary`.

- Support mouse, touch and pen through responsive drawing input. Controls include pen, adjustable brush size, eraser, a coherent ink palette, undo, redo, clear and redraw.
- Strokes retain their visible shape and color. Erasing actually removes drawing content. Undo/redo operates on drawing actions, including clear; drawing after undo starts a new redo branch.
- A tap can produce a visible mark. Leaving the drawing area or losing contact ends the stroke cleanly; resizing does not smear or stretch the artwork. Touch drawing does not scroll the page beneath the active canvas.
- The drawing surface may look like parchment, but the creature export contains only the player's visible marks. Trim transparent boundaries, preserve proportions and normalize its arena size without clipping strokes.
- The preview and battle use the actual prepared drawing. No stock character, automatic silhouette replacement or AI reinterpretation is used.
- A blank canvas, including one fully erased or cleared, cannot proceed. Explain the issue beside the continuation control and allow immediate drawing. Do not mistake the parchment background for creature content.

**Acceptance:** two visibly different drawings produce two correspondingly recognizable bosses; all drawing tools work; an erased canvas is rejected; edge strokes survive cropping; artwork remains consistent after resizing and resume.

### Crystal Placement and Preview

Source: `scope.md > The Unique Kernel`; owner's explicit weak-point-positioning decision.

- Analyze the drawing's visible ink and automatically choose three distinct, reasonably separated attachment regions, preferring upper-left, upper-right and lower-center while adapting to the actual silhouette.
- Do not assign all creatures three blind screen coordinates. Sparse, narrow, asymmetric and disconnected drawings must receive usable placements without inventing anatomy.
- For drawings too small or narrow to hold three large crystal bodies without overlap, separate the crystals slightly around the silhouette and tether them to actual visible ink. Preserve readable identities and a clear physical connection.
- The preview reveals concept names and crystal numbers. Players may reposition crystals by dragging or by selecting a crystal and using labeled keyboard controls; reset restores automatic placement. Attachment tethers remain associated with visible ink.
- Glowing connections, contact shadows and local energy make the crystals belong to the creature. Creature movement carries crystals and their attachment effects together. Identity never changes when the creature moves, the viewport changes or the player resumes.
- Redrawing recomputes suitable placement; it does not silently leave crystals attached to empty former body regions.

**Acceptance:** default placements work without adjustment on two different doodles; manual and keyboard adjustments are usable; crystals remain separated and connected through animation; the same concept remains attached to the same crystal throughout the session.

### Awakening and Creature Performance

Source: `scope.md > Inspiration & Identity`, `What "Working" Looks Like`; owner's cinematic priorities.

Awakening is a staged event: the player's ink enters the arena, gathers into its recognizable silhouette, receives magical energy, begins breathing, materializes three crystals and becomes alert. Lighting, particles, sound and motion coordinate around those beats. Normal play is not held behind a prolonged unskippable sequence; skipping preserves the same ready battle state.

| State | Visible behavior and purpose |
| --- | --- |
| Dormant | Quiet drawing and low energy before awakening. |
| Awakening | Ink gathering, first breath, crystal materialization and an alert pose. |
| Idle | Subtle breathing, floating, secondary movement and a responsive contact shadow. |
| Charging | Brief anticipation before the consequence of a wrong answer. |
| Attacking | Controlled lunge/recoil and corruption energy tied to the missed concept. |
| Taking damage | Directional recoil, restrained hit flash and local fracture at the answered crystal. |
| Enraged | More tense posture and corrupted energy after mistakes; text remains calm and helpful. |
| Stunned | Short settling/recovery beat after a crystal shatters, especially after feedback. |
| Defeated | All crystals shattered: the actual drawing dissolves into ink, fragments and particles. |
| Retreating | Unresolved concepts remain: the recognizable creature withdraws into ink and shadow. |

Transforms must work on arbitrary drawings: breathing, squash/stretch, tilt, anticipation, recoil and settling. The creature is never motionless while only numbers change. Full-motion performance remains controlled enough for reading. Reduced motion substitutes gentle fades, static emphasis and clear state changes for camera travel, shake and large transforms.

**Acceptance:** awakening visibly transforms the player's drawing into a living creature; correct, incorrect and recovery events are distinguishable; crystals follow it; both endings play coherently; skipping or reducing motion never changes answers or blocks progress.

### Vulnerability Selection and Question Interaction

Source: `scope.md > The Core Loop`; owner's explicit battle-progression decision.

- Start the arena with three available, named crystals. Players choose any encounter order.
- Each crystal is directly selectable and has an equivalent labeled keyboard-accessible control. Labels show concept name, crystal number and readable state; color alone is insufficient.
- Selecting a crystal highlights it and its tether, shifts visual attention toward that region and opens its question. Camera movement is restrained and replaced by static emphasis in reduced motion.
- Selecting an option marks it; a clear Submit action commits it once. Prevent empty submission. During resolution, repeated clicks, keypresses or crystal selection cannot submit twice, skip a question or alter a committed answer.
- Resolve the selected concept before choosing another. After submission, show the chosen answer, correct answer, explanation and relevant note evidence. The player controls when to continue; reading is not timed.
- After a first mistake, a dedicated follow-up action opens the distinct question. Do not claim improvement from merely reading feedback. After a concept finishes, offer the remaining available concepts.
- Stable means available/unattempted, corrupted means a first mistake with follow-up pending, shattered means answered correctly, and unresolved means both attempts were incorrect. Transient cracked/fracturing visuals do not create extra learning outcomes.
- The boss status communicates how many crystals remain intact and which are shattered or unresolved. There is no conventional player health, player death, timed-answer penalty or mistake-driven premature ending.

**Acceptance:** direct and keyboard selection reach the same questions; any concept order works; one submission produces exactly one outcome; question text stays readable during effects; the active concept cannot be accidentally bypassed.

### Finite Encounters and Combat Outcomes

Source: `scope.md > The Unique Kernel`; owner's explicit repeated-mistakes and endings decision.

| Answer event | Crystal and creature consequence | Educational outcome and next action |
| --- | --- | --- |
| Initial correct | Player impact, local fractures, crystal shatter and creature recoil. | Record first-attempt correct; show explanation/evidence; return to remaining concepts. |
| Initial incorrect | Matching crystal corrupts; burgundy veins/energy grow; creature charges and attacks. | Record mistake; show grounded correction and hint; offer the distinct follow-up for this concept. |
| Follow-up correct | Corruption visibly reverses or ruptures, then a stronger recovery shatter and stunned reaction. | Record corrected after feedback; show explanation/evidence; return to remaining concepts. |
| Follow-up incorrect | Crystal remains visibly corrupted and gains an unresolved marker; attack settles. | Record unresolved; show useful explanation and review guidance; continue to remaining concepts. |

Every concept uses at most two answered questions. A complete battle contains three to six answers. All three concepts must reach a terminal outcome before normal completion. No infinite retries or health-based failure exists.

All shattered triggers the full victory. Any unresolved triggers the retreat ending with clear session-complete language. A battle in which all three concepts remain unresolved still ends properly and offers constructive review. Battle attacks communicate setbacks without humiliating the learner.

**Acceptance:** verify initial success, recovery success, repeated failure and a mixed encounter order; verify both endings including all-unresolved; the event always affects the selected concept's crystal and no other outcome is accidentally credited.

### Results, Review and Next Practice

Source: `scope.md > What "Working" Looks Like`, `The Core Loop`.

- Lead with the actual ending, the player's creature and counts of first-attempt correct, corrected after feedback and unresolved concepts. Avoid a misleading generic victory banner for retreat.
- Show questions answered correctly out of questions answered, separately from concepts resolved. Display concept names, initial question/selected answer, follow-up record when used, correct answers, explanations and source excerpts.
- Never invent a follow-up result for a concept answered correctly initially. The sum of concept categories equals three for completed battles, and the answer totals reflect actual submissions.
- Expandable review exposes the relevant original note passages with trustworthy references. Provide specific next-practice guidance: revisit the cited rule, explain it in the student's own words, or work a similar example. Suggestions are tied to the concept, not assertions of long-term mastery.
- Unresolved concepts are clearly identified as requiring more practice. Corrected concepts acknowledge demonstrated correction during this session without claiming durable learning gains.
- Begin Another Battle creates a fresh session through the real notes/drawing journey. A completed sample is never silently reused as personal AI content.

**Acceptance:** results match the complete answer history for each outcome combination; excerpts match the original notes; review, saved-record access and new-battle controls work.

### Saving, Resume and Navigation

Source: `scope.md > The POC Boundary`, `The Core Loop`.

- Preserve one active local session and a bounded recent completed-summary history. Delegated retention default: the ten most recent completed summaries. Explain that records are local to this browser and can disappear if browser data is cleared.
- Preserve notes, mode, drawing, prepared concepts/questions, crystal positions, committed answers and meaningful progression. Settings persist independently. Saving does not require an account or public upload.
- Save after meaningful changes and committed answers. Returning to title or reloading restores a coherent stage; a reload during an animation does not replay damage into the history or award a second result.
- Returning from a temporary overlay restores the current task. Starting another session does not silently discard an existing one. Completed records open read-only review rather than resubmitting answers.
- If local storage is blocked, full or damaged, show an honest message and offer usable in-memory play or a new session without silently destroying other valid records. Never promise a save that failed.

**Acceptance:** reload during drawing, after an initial mistake, during resolution and on results; confirm drawing, crystal identity and outcomes survive without duplicates. Exercise unavailable and malformed storage recovery.

## States and Boundaries

Source: `scope.md > The POC Boundary`, `Explicitly Cut`.

| State or edge case | Required behavior |
| --- | --- |
| Fresh visitor | Clear premise and genuine sample path; no false Continue action. |
| Blank/fully erased drawing | Inline feedback and immediate editing; cannot awaken a nonexistent creature. |
| Very sparse or unusual drawing | Preserve its identity, normalize it and provide usable tethered crystal placement and adjustment. |
| No API credentials | Explain personal-notes generation is unavailable; sample remains fully playable and honestly labeled. |
| Invalid or unsupported educational output | Reject it, explain recovery and preserve input; never fabricate source support. |
| Generation cancelled or superseded | Preserve current draft; ignore stale results. |
| Repeated input during effects | Record one answer and one progression step only. |
| Hidden tab or interrupted animation | Return to a coherent interaction; no timed academic penalty or accumulated duplicate events. |
| Browser resize or orientation change | Keep artwork proportions, attached crystals, readable questions and reachable controls. |
| All follow-ups wrong | Complete with unresolved concepts and retreat; no dead end. |
| Missing/unavailable audio | Continue with visible feedback and operable sound controls. |
| Corrupt save | Explain that it cannot be resumed and offer recovery/new play without a crash. |

## Accessibility and Responsive Behavior

Source: `scope.md > The POC Boundary`; owner's keyboard-accessible vulnerability selection requirement.

- Provide visible keyboard focus, labeled controls, usable reading order and focus movement after screen/overlay transitions. All game decisions, answers, settings and crystal-position adjustment work without precise pointer targeting.
- Drawing supports pen, touch and mouse; do not claim freehand drawing itself is a complete nonvisual interaction. Textual concept controls and outcome records remain available regardless of canvas/rendering effects.
- Announce meaningful selection and answer outcomes through accessible text; avoid repetitive announcements for ambient effects. Decorative particles and scenery must not obscure controls or capture input.
- Represent concept state by name, symbol/shape and text as well as color. Maintain readable text against environmental backgrounds and a calm, stable question surface.
- Reduced motion removes camera shakes, rapid movement and large particle bursts while retaining all information. Avoid excessive flashing in either mode.
- Verify desktop compositions at 1440×900 and 1920×1080 and a functional smaller layout at 390×844. Do not hide necessary actions below inaccessible overlays or allow controls to overlap question content.
- Keep atmosphere and effects responsive on mainstream laptops with integrated graphics. No unbounded particle accumulation, persistent distracting stutter or background-tab activity that breaks the session.

**Acceptance:** complete battle decisions and review with keyboard controls; inspect touch drawing, small viewport, visible focus, muted audio and reduced motion in the running application. Record any accessibility limitation accurately.

## Genuine Demo Path Under Three Minutes

Source: `scope.md > What "Working" Looks Like`; owner's explicit video-path requirement.

Use the normal Sample Battle entry and genuine curated content; this is a rehearsal route, not a hidden demonstration engine. No automatic answers, pre-rendered battle outcomes or mandatory wait for network generation.

| Rehearsal target | Actual interaction |
| --- | --- |
| 0–20 seconds | Show title, choose Sample Battle and the first curated subject. |
| 20–45 seconds | Draw a distinctive simple monster with actual pointer strokes; show the resulting preview. |
| 45–60 seconds | Accept or briefly adjust crystal positions and trigger awakening. |
| 60–145 seconds | Select a concept, deliberately choose an incorrect initial answer, inspect real feedback, answer its distinct follow-up correctly, then answer the other two initial questions correctly. |
| 145–170 seconds | Show victory and the accurate results: two initial successes, one correction after feedback, four answers submitted. Open a source excerpt. |

This timing is a target for a rehearsed demonstration, not a restriction on learners' reading time. Animation pacing must make it achievable without skipping the defining recovery moment. Verify by timing a real run. Also demonstrate a second note set and different doodle, and separately verify the unresolved/retreat path. Recording and narration remain the owner's work.

## Product Decisions

**Explicit owner decisions:** preserve the actual drawing and its colors; integrate concept crystals physically; allow concept selection in any order with equivalent keyboard controls; use one initial and one follow-up maximum per concept; represent progress rather than player health; preserve unresolved outcomes; deliver distinct victory and retreat endings; automatically place crystals from visible ink with manual adjustment; make awakening and combat cinematic; retain real AI and reliable labeled samples; prioritize a complete polished local experience and a genuine short demo.

**Delegated design decisions in this draft:** use a select-then-submit answer interaction; finish the active encounter before another selection; show feedback until the player continues; group crystal adjustment into the workbench preview; use tethered placement for sparse drawings; choose electrical circuits and cell biology as the two sample subjects; retain ten recent completed summaries. These are routine decisions made under the owner's explicit design authority, not invented interview answers, and are open to revision in review.

**Planning/process decisions:** Markdown-only planning review; Fast build mode after required approvals; early firsthand feedback, final learner review and learning wrap-up remain required. No public publishing or final submission writing is implicitly authorized.

## What We're Building

The entire journey and all behaviors above, including real drawing, silhouette-aware crystal placement, expressive animation, deterministic finite combat, genuine AI preparation with evidence validation, two curated samples, accurate results, local persistence, accessibility/settings, responsive layouts and robust failures. Delivery includes source, original or documented licensed assets, environment example, technical README, architecture overview, automated checks, a working production launch and the authentic Devpost artifacts.

## Deferred From the POC

Accounts, multiplayer, cloud sync, campaigns, long-term practice scheduling, PDF/OCR ingestion and expanded encounters remain outside the focused local battle. Deployment is optional and requires separate authorization; a live URL is not a prerequisite for local completion.

## Possible Later Enhancements

Additional note formats and spaced practice could extend the verified learning loop later. More environments and encounters could broaden presentation once the core drawing-to-concept relationship is reliable. None expands this build's acceptance criteria.

## Non-Goals

- Automatic skeletal rigging or replacing a player's drawing with generated/stock character art.
- AI-directed combat state, animation timing, automatic answer selection or hidden success paths.
- Infinite retries, health-driven failure, timed-question pressure or punitive student messaging.
- Claims of mastery, durable learning improvement or guaranteed prizes without evidence.
- Silently presenting curated samples as live AI output or accepting unverifiable educational evidence.
- A public publishing action or AI-authored submission, narration, feedback or survey answers.

## Release Acceptance and Verification Evidence

Source: `scope.md > What "Working" Looks Like`, `The POC Boundary`; original brief's quality gate.

These are required checks, not assertions that they have passed:

1. A fresh visitor understands the premise and completes sample entry without an API key.
2. Both sample sets pass the genuine drawing, placement, awakening, battle and results journey with visibly different doodles.
3. Drawing operations, blank detection, transparent cropping and sprite identity are verified.
4. Three stable concept identities map consistently to three animated, adjustable weak points.
5. Initial correct, initial wrong, follow-up correct and follow-up wrong transitions produce correct outcomes and distinct visible feedback; rapid repeated input causes no duplicates.
6. Follow-up prompts are distinct, test the same concept and appear only when appropriate.
7. Victory, mixed retreat and all-unresolved retreat complete correctly; results match actual questions and answers.
8. Source-reference validation, malformed output, unsuitable notes, missing credentials and provider failures are exercised with graceful recovery.
9. Fresh-note AI generation is exercised with valid credentials when available. If unavailable, report live-provider verification as incomplete; a test double or sample does not satisfy this check.
10. Saving/resume, completed records and damaged/unavailable storage are checked without duplicate outcomes or false save claims.
11. Desktop and smaller-screen browser journeys, real pointer/touch interactions, keyboard controls, audio settings and reduced motion are checked; rendered screenshots are inspected for clipping, legibility and coherence.
12. Available lint, typecheck, core unit tests, browser tests and production build run successfully. The complete local production application launches using the documented instructions.
13. Assets and third-party materials have accurate licensing/attribution; credentials remain outside client code and tracked/public files. Staged files and history are inspected before any publication recommendation.
14. Genuine planning/checklist artifacts are accurate; firsthand learner feedback is recorded as such, unresolved checks are disclosed, and the owner explicitly confirms final readiness after review.
15. A timed genuine demo proves the core recovery moment and results in under three minutes, with no fabricated outcome.

## Open Questions

- **PRD approval:** complete; the owner explicitly approved the full document before `4-spec`.
- **Technical plan and project license:** approved during `4-spec`; MIT covers application code while original branding/custom creative assets remain separately protected, as detailed in `spec.md > Licensing Boundaries`.
- **Live-provider access:** configuration and an actual fresh-note run are required to verify real AI functionality. Never request a key in chat or assume subscription credits cover API use.
- **Git workspace constraint:** safely resolve the currently uninitialized/unusable `.git` directory during technical planning before required build commits. Do not silently omit Git history or alter unrelated host locations.
- **Final visual acceptance and demo timing:** must be established through running-game verification and required firsthand review, not promised by this document.

No unanswered core gameplay decision blocks this draft's product review.
