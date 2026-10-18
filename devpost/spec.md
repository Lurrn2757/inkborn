---
doc: spec
status: approved
---

# INKBORN — Technical Specification

Implements the approved scope and PRD. The owner explicitly approved this technical specification, with two clarifications incorporated here: safely isolated Git metadata with verified ordinary development/publishing workflows, and MIT application code with separately protected INKBORN branding/custom creative assets. Routine details may be refined during implementation without changing product behavior; consequential architecture or product changes require agreement.

## How This Works, In Plain Language

React owns the screens, readable questions and accessible controls. A dedicated PixiJS scene draws the living creature, attached crystals, lighting and particles. Both read the same battle record; neither animations nor AI decide whether an answer counts.

The drawing is stored as editable strokes. A transparent copy is cropped into the actual creature image, and its visible ink determines crystal attachment points. One creature transform moves the image, crystals and their tethers together, preserving the player's recognizable silhouette and colors.

Curated samples and real AI preparation produce the same validated lesson format. Personal notes go to a local server, which keeps the API key private, asks OpenAI for structured questions, checks source passages and question consistency, and returns accepted content. A separate pure battle reducer applies finite encounter rules. Local browser storage preserves the drawing, lesson and answer history; results are calculated from that history.

This shape gives visual freedom without putting questions inside a graphics canvas or coupling learning outcomes to frame rate. It needs one local application server and, only for personal-note generation, one external AI provider.

## The Core Journey Through the System

Implements `prd.md > The Core Journey`.

1. The application loads settings and the latest valid session, then renders the title and appropriate Continue action.
2. Sample selection loads one of two reviewed content fixtures. Personal notes remain a draft until preparation is requested; edits invalidate previously prepared material.
3. The drawing editor records normalized strokes and renders them with Canvas 2D. Preview exports transparent pixels, computes bounds and attachment candidates, and produces a creature asset.
4. For personal notes, the client submits a versioned generation request. The server prepares and validates a lesson; stale or cancelled responses cannot replace a newer draft. Samples use the same canonical validator without a generation request.
5. The crystal preview combines the creature asset with the three lesson concepts. Adjustments update creature-local crystal coordinates, not screen coordinates.
6. Awakening animates that asset into the arena. React's concept controls and Pixi's crystal hit targets issue the same selection command.
7. Submission reaches the reducer with session, concept, question and revision identifiers. It records exactly one answer and emits a presentation event. The renderer and audio respond to that event.
8. Feedback exposes the answer, explanation and original evidence. Continue opens the follow-up or returns to concept selection according to the reducer.
9. When all encounters finish, the ending is derived from crystal outcomes. Results and local history derive from committed answers, not animation callbacks or model-written summaries.

## Stack

Use compatible stable releases, pin installed versions in `package-lock.json`, and record actual versions in the README. Target major versions below guide selection; do not invent an exact patch version before installation. Resolve peer requirements before coding against them.

| Area | Proposed choice | Reason and tradeoff | Primary documentation |
| --- | --- | --- | --- |
| UI | React 19 + React DOM | Accessible HTML, familiar component boundaries; avoid rendering per-frame effects through React. | [React](https://react.dev/learn) |
| Language | TypeScript, strict mode | Typed shared contracts, exhaustive state transitions; also enable unchecked-index and exact-optional checks. | [Strict configuration](https://www.typescriptlang.org/tsconfig/strict.html) |
| Frontend tooling | Vite + React plugin | Fast iteration and a static production bundle; no server rendering or application framework needed. | [Vite](https://vite.dev/guide/) |
| Arena | PixiJS 8, imperative adapter | GPU sprites, scene hierarchy and effects; less unnecessary game-engine machinery than Phaser for this interaction model. | [Application](https://pixijs.com/8.x/guides/components/application), [renderers](https://pixijs.com/8.x/guides/components/renderers) |
| UI motion | Motion for React | Coordinated screen and folio transitions, reduced-motion integration; creature motion remains in the arena timeline. | [Motion](https://motion.dev/docs/react) |
| Drawing/audio | Browser Canvas 2D + Web Audio | Precise custom drawing and original synthesized sound without extra drawing/audio libraries. | [Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API), [Web Audio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) |
| Local backend | Node.js + Express 5 | One small HTTP service for AI and production assets; use native fetch/abort where appropriate. | [Node releases](https://nodejs.org/en/about/previous-releases), [Express 5](https://expressjs.com/en/guide/migrating-5/) |
| Runtime validation | Zod 4 | Shared structural validation, safe persistence decoding and structured AI contracts. | [Zod](https://zod.dev/) |
| AI | Official OpenAI JavaScript SDK, Responses API | One supported provider with structured output; server-only dependency and configurable model. | [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [SDK](https://github.com/openai/openai-node) |
| Persistence | IndexedDB through `idb` | Transactional storage for strokes, blobs and session snapshots without localStorage image-size limits. | [idb](https://github.com/jakearchibald/idb) |
| Verification | Vitest + Playwright | Unit/integration checks for rules and validation, real-browser complete journeys and screenshots. | [Vitest](https://vitest.dev/guide/), [Playwright](https://playwright.dev/docs/intro) |
| Development | ESLint/typescript-eslint; `tsx` for server development | Lint/type checks plus a simple watched development server; production runs compiled JavaScript. | [ESLint](https://eslint.org/docs/latest/use/configure/), [typescript-eslint](https://typescript-eslint.io/getting-started/), [tsx](https://tsx.is/) |

Use custom CSS and original SVG/procedural assets. No component UI kit, Redux, extra state-machine framework, database service, authentication service, physics engine, skeletal-animation package or second animation framework is required.

## Where It Runs and How Someone Tries It

Implements `prd.md > What We're Building`, `Genuine Demo Path Under Three Minutes`.

Recommended documented runtime: Node 24 LTS and npm. The current environment has Node 26.10.0, npm 12.1.0 and Git 2.55.0; verify the selected toolchain here rather than replacing host runtimes. Modern desktop browsers with WebGL are the primary presentation target; a functional rendering fallback is specified below.

After implementation, a fresh checkout uses:

```bash
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. The dev launcher starts Vite and the local API on port 3001, forwards `/api` requests through Vite, propagates failure and shuts down both child processes cleanly.

The complete local production application uses:

```bash
npm run build
npm start
```

Open `http://127.0.0.1:4173`. Express serves `dist/client` and the real API from the same origin. The server is compiled with its shared modules into `dist/server`; `npm start` invokes its compiled entry. Vite preview is not the production AI server.

Sample mode needs no `.env` or provider connection. For personal notes, copy the secret-free `.env.example` to `.env`, configure the server environment locally and restart. Never paste a key into chat. Document these variables:

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
HOST=127.0.0.1
PORT=4173
```

Load `.env` optionally server-side with `--env-file-if-exists=.env`, never the required-file variant. Both development and production must start from a clean checkout without this file. No key is exposed through a `VITE_` variable, browser settings, browser storage or client imports. Development uses port 3001 independently of the production default. Missing credentials disable only personal-note generation, not server startup or samples.

Bind locally by default. Public hosting, a public repository and video upload remain separate authorized shipping actions. A demo video and public GitHub repository are required shipping artifacts; no deployment is currently selected or claimed.

## Look and Feel

Implements `prd.md > Look and Feel`, `Screens and Layout`, `Awakening and Creature Performance`.

- Establish CSS tokens for midnight `#100f15`, charcoal `#19171e`, ivory `#ede3cd`, parchment `#d9c8a5`, burgundy `#8f354f`, antique gold `#bd9857`, violet `#685278` and restrained teal `#6dada5`. Validate real text/background combinations; adjust values for legibility rather than preserving inaccessible swatches.
- Self-host Cormorant Garamond for display and Manrope for interface text; retain their supplied [Cormorant license](https://github.com/google/fonts/blob/main/ofl/cormorantgaramond/OFL.txt) and [Manrope license](https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt). Use readable fallbacks while fonts load. Questions use calm, stable typography with generous line height.
- Build original chamber architecture, engraved borders, a summoning floor, book/folio surfaces and an emblem using SVG, canvas textures and CSS. Layer architectural shadow, mist, floor, creature, lights and interface deliberately. Textures remain subtle behind reading areas.
- Carry forward the [Lovable composition studies](https://lovable.dev/projects/d9fcd5a5-b70c-45f9-bde2-31fdaa890330) as inspiration only. Follow PRD corrections: preserve the actual doodle, correct crystal semantics, avoid mastery claims and invented visual copy. Remote concept images are not dependencies of the playable game.
- Keep original brand artwork, scene compositions, distinctive theme styling, animation presets and sound compositions in explicitly protected asset paths (`public/art/` and `src/creative/`). Generic application/rendering/audio machinery remains MIT code; its outputs are not all assigned one blanket license.
- Use screen-scale transitions around 250–500 ms, brief combat beats around 0.8–1.8 seconds, an awakening target of 5–7 seconds and an ending target of 2–4 seconds. These are tunable presentation defaults, not academic timers. Reading remains player-paced.
- Prioritize 1440×900 and 1920×1080 composition. Below the wide layout breakpoint, stack arena and question folio; use fluid spacing, no fixed-height reading traps and reachable touch controls.

## Components

### Application Shell and Navigation

Implements `prd.md > Title, Help and Settings`, `Screens and Layout`, `Saving, Resume and Navigation`.

`App` hosts a typed screen flow and a session controller. Separate screen components cover title, notes, drawing/preview, arena and results. Help, settings and saved records are overlays with focus handling, Escape support and return-focus behavior. Screen changes preserve drafts; starting over explicitly resolves an existing active session.

Use semantic HTML for all questions, choices, progress summaries and concept controls. Pixi is the visual scene, not the only source of learning information. Render errors have a recovery boundary that preserves the last usable session rather than a blank page.

`NotesScreen` places the provider disclosure beside the personal-note preparation action: notes are sent to the configured OpenAI provider; the drawing is excluded. The client request contains only the request ID and notes. Verify the actual request body, not only the notice text. Sample mode instead explains that its questions are curated and makes no generation request.

### Drawing Editor

Implements `prd.md > Drawing and Sprite Preparation`.

Store vector actions on a fixed logical 1024×768 drawing surface, with normalized point coordinates, logical brush width, color, tool and pressure. Display scaling uses the canvas bounding rectangle and device pixel ratio; resizing replays actions rather than stretching an existing bitmap.

Pointer capture, coalesced movement where supported, a visible dot for taps and pointer-cancel handling keep strokes coherent. Disable touch scrolling only on the drawing surface. Pen uses source-over compositing; eraser uses destination-out. Parchment is outside the exported drawing bitmap.

Represent clear as an undoable action. Keep undo/redo action stacks; a new action discards the redo branch. Retain at most 100 undoable actions and 50,000 editable points. When crossing a limit, flatten only the oldest completed actions into a lossless base bitmap at the unchanged logical resolution; replay the retained actions above it. Never discard visible ink to trim history. Eraser and clear continue to operate on the full composition, including the base. Explain the retained undo boundary in tool help; long strokes are safely segmented/coalesced without losing their visible result. Persist the base bitmap, retained actions and cursor together. Finish the current stroke before switching tools or screens, save at stroke completion and debounce intermediate draft updates. Verify that exceeding the history cap preserves the creature through export and reload.

### Sprite Preparation and Crystal Placement

Implements `prd.md > Drawing and Sprite Preparation`, `Crystal Placement and Preview`.

Replay the transparent base bitmap and retained drawing actions into an offscreen transparent Canvas 2D bitmap. Scan alpha for inclusive visible bounds, reject zero visible pixels, add transparent padding and fit within a maximum 1024-pixel sprite dimension while preserving aspect ratio. Keep the editable drawing composition separately. Store a PNG Blob, dimensions, content hash and a downsampled occupancy mask; no external image service is involved.

For attachment, collect occupied cells, compute the drawing's visible centroid and extent, then select candidates near preferred upper-left, upper-right and lower-center regions. Rank candidates using target distance and separation from previously selected points; exclude empty cells. Use deterministic tie-breaking. Sparse masks fall back to distinct crystal bodies around the silhouette with tethers ending on visible ink.

Each anchor stores a visible-ink attachment and a crystal-body position in normalized sprite-local coordinates. Manual drag or keyboard nudges update the body position; attachment snaps to nearby visible ink. Clamp positions to the padded preview, keep labels readable and reset through the same automatic algorithm. Redrawing recomputes anchors.

Browser tests verify actual alpha pixels, crop bounds and creature-image hashes for different doodles; screenshot inspection confirms recognition and physical attachment. Pure mask/placement tests cover asymmetric, sparse, narrow and disconnected input.

### Session Controller and Deterministic Battle Reducer

Implements `prd.md > Vulnerability Selection and Question Interaction`, `Finite Encounters and Combat Outcomes`.

A small controller serializes commands, runs a pure reducer and exposes immutable snapshots to React through `useSyncExternalStore`. The renderer receives snapshots and presentation events through an adapter; no per-frame React state updates are required.

Commands include selecting a concept, selecting an option, submitting an answer, continuing feedback, acknowledging a presentation event and returning to title. Submission includes `sessionId`, `questionId`, `conceptId`, expected revision and selected option ID. Reject commands for the wrong phase, revision, concept or already answered question. The reducer reads the accepted lesson's correct option; neither UI nor AI supplies a success flag.

| Current phase | Valid action | Result |
| --- | --- | --- |
| Choosing | Select an available concept | Initial question for that concept. |
| Question | Submit one valid option | Append one answer, set crystal outcome and enter feedback with an event ID. |
| Feedback after initial mistake | Continue after effect settles | Distinct follow-up for the same concept. |
| Feedback after initial success or either follow-up | Continue | Choose remaining concept, or begin the derived ending if all are terminal. |
| Ending | Finish or skip presentation | Results with the same recorded outcomes. |

Within each concept: initial correct → first-attempt correct/shattered; initial wrong → follow-up pending/corrupted; follow-up correct → corrected/shattered; follow-up wrong → unresolved/corrupted. No extra attempt, health/death state or invented mastery state exists.

Commit the semantic answer before animation. Feedback is a durable state; the short presentation lock is transient. Duplicate submissions are rejected even if two events arrive in one frame. On reload, validate the snapshot and resume committed feedback without replaying its mutation. Stale animation acknowledgments cannot advance a different event or question.

### Arena Renderer

Implements `prd.md > Crystal Placement and Preview`, `Awakening and Creature Performance`, `Vulnerability Selection and Question Interaction`.

Use one Pixi Application with asynchronous initialization, a private ticker and WebGL preference. Mount it through a lifecycle-safe adapter and destroy ticker, textures, observers and listeners on unmount, including React development remounts. Prefer WebGL over experimental WebGPU for this release, consistent with [Pixi's renderer guidance](https://pixijs.com/8.x/guides/components/renderers).

Scene layers: architectural backdrop, floor geometry, atmosphere, contact shadow, creature container, impacts and foreground accents. The creature container owns the player sprite, three crystal meshes/vector shapes, tethers, attachment shadows and local corruption. A single container transform keeps them attached. Independent crystal-local transforms provide pulse, crack, corruption and shatter while identity remains mapped by concept ID.

Keep concept selection hit regions forgiving. Mirror them in permanent HTML controls; expose state through those controls and live text. Convert pointer coordinates through the inverse scene transform for preview manipulation and crystal selection. Never store viewport pixels as attachment coordinates.

If WebGL initialization or context recovery fails, clean up partially initialized Pixi resources and replace its canvas with a fresh Canvas 2D surface; a WebGL-bound canvas cannot be reused for a 2D context. The small fallback implements the same adapter: actual sprite, attached vector crystals/tethers, shared pose evaluation, basic particles and distinct answer states. Preserve the snapshot, presentation event identity and elapsed clock without replaying semantic or audio events. React remains interactive. This is an explicitly reduced-effects mode, not a promised Pixi built-in fallback; force initialization failure and runtime context loss separately in browser tests. If canvas itself is unavailable, show a recoverable graphics error rather than claiming the game is playable.

### Cinematic Timeline and Effects

Implements `prd.md > Awakening and Creature Performance`, `Finite Encounters and Combat Outcomes`.

Use a shared presentation clock and pure pose/effect evaluators. Events carry unique IDs, type, concept ID and a visual seed. Seeded randomness affects only visuals. Pose evaluation covers dormant, awakening, idle, charging, attacking, damage, enraged, stunned, defeated and retreating states with coherent entry/exit easing.

Correct hits target the selected crystal, create directional recoil, fracture lines and pooled fragments. A first error grows burgundy veins and triggers anticipation then attack. Recovery draws corruption back before a stronger gold shatter and settling beat. Defeat dissolves or disperses fragments sampled from the actual drawing; retreat withdraws the recognizable body with corrupted crystals.

Presentation completion is guarded by event ID and a bounded watchdog; missing graphics callbacks cannot trap the player. Skipping awakening/ending settles to the correct ready/results state. Hidden tabs pause ambient work and settle overdue presentation safely on return without catch-up particle bursts.

Cap normal device resolution at 2, lower it for small/slow rendering, pool particles, bound active fragments and cache static textures. Target smooth 60 fps on a mainstream laptop, measure actual frame timing and disclose device limits; do not claim a benchmark from a headless software renderer. Reduced motion uses static emphasis/fades and suppresses shake, camera travel and large bursts while preserving visible states.

### Audio Director

Implements `prd.md > Title, Help and Settings`, `Look and Feel`, `Awakening and Creature Performance`.

Use Web Audio with one master gain and a bounded set of synthesized voices/noise envelopes for ink, crystal chimes, impact, corruption and recovery. Generate original atmospheric layers sparingly; no downloaded commercial music or audio dependency is required. Event IDs prevent duplicate sounds.

Initialize/resume only after a player gesture, obey mute/volume, suspend during hidden/background states and gracefully tolerate blocked audio. Settings update immediately without changing the battle. All audio events have visual/text equivalents.

### Educational Schema and Evidence Validator

Implements `prd.md > Notes and Educational Preparation`, `Results, Review and Next Practice`.

Keep shared Zod schemas and pure validators separate from server credentials and SDK imports. Validate both server output and client-restored lessons. Use a simple JSON-schema-compatible wire schema for generation, then stricter local refinements and canonicalization; do not depend on unsupported schema refinements being enforced by the model.

The server segments the exact submitted notes into identified source blocks while retaining their UTF-16 offsets. The model returns block IDs and verbatim quotes, not arithmetic offsets. The validator requires each quote inside its named block, then calculates canonical `start`/`end` offsets and verifies `notes.slice(start, end) === quote`. This handles Unicode and avoids trusting model-computed positions. Repeated quotes resolve deterministically inside the stated block.

Canonical validation requires exactly three concepts, unique IDs, four unique option IDs/texts per question, a correct ID present in the options, allowed difficulty, bounded text, evidence for each question, distinct initial/follow-up prompts and no duplicate question IDs. IDs are assigned server-side after validation; preserve them for the session. Supporting passages are genuine references, not proof of external truth.

Require a nonblank, evidence-grounded hint on every initial question so first-mistake feedback always includes the promised hint. Only follow-up hints may be null. Reject or repair candidates that omit required hints; apply the same rule to curated samples.

### AI Preparation Service

Implements `prd.md > Notes and Educational Preparation`, `States and Boundaries`.

Use the official OpenAI Responses API with strict structured output, `store: false` and no tools. Proposed configurable default: `gpt-5.4-mini`, documented with structured-output support and Responses access in the [official model page](https://developers.openai.com/api/docs/models/gpt-5.4-mini). This is a practical cost/latency starting point, not a claim that it is the strongest model or available to every account. Validate real educational quality before final acceptance; configure another compatible model if needed through owner-approved architecture boundaries.

Use fixed developer instructions to produce three independent concepts from supplied evidence, one initial and one genuinely different follow-up each, four options, one correct answer and explanations supported by the notes. Pass notes as a clearly delimited user-data payload; do not interpolate them into developer instructions. Request an explicit insufficient-content result when support is inadequate. Never expose tools, credentials or local files to note content.

After structural/evidence validation, a separate structured semantic-review request checks each question's supported answer, ambiguity, distractors, explanation, concept association, concept distinctness and follow-up difference against the same notes. It may accept or reject, not silently rewrite answers. This second pass uses the same provider and is not an independent factual authority. Rejection triggers at most one repaired candidate; revalidate and rereview before acceptance. Reject unsupported or contradictory material honestly.

Bound one user action to two candidate cycles and at most four upstream calls, with SDK automatic retries disabled, a 120-second overall deadline, per-call aborts, bounded output tokens and cancellation on disconnected requests. Distinguish refusal, truncation, validation failure, unavailable credentials, rate limit, timeout and provider error. Provider failures do not silently activate samples. Cache nothing server-side beyond short-lived request coordination; do not log raw notes, credentials or generated educational text.

### Local API and Production Server

Implements `prd.md > Notes and Educational Preparation`, `What We're Building`.

- `GET /api/status` → `{ aiConfigured: boolean, provider: "openai", model: string, maxNotesLength: 12000 }`. Configuration means a key is present, not that billing/model access has been tested.
- `POST /api/lessons` accepts only JSON `{ requestId, notes }`, with a UUID request ID and 120–12,000 UTF-16 code units of nonblank notes. Reject unexpected fields, including image/drawing payloads. Preserve exact submitted text for evidence. Reject bodies above 128 KiB and wrong content types. UI displays limits before submission.
- Success → `{ requestId, lesson }`, where `lesson` is the canonical schema below. The server assigns the lesson ID; the client creates its separate play-session ID.
- Error → `{ requestId?, error: { code, message, retryable } }`. Use 400/413 for input/body limits, 409 for duplicate/conflicting request IDs, 422 for unusable/invalid content, 429 for rate/concurrency limits, 503 for missing configuration, 502 for provider failures and 504 for timeout. Messages remain actionable and sanitized.
- Allow one generation pipeline globally and at most five accepted pipelines per client address in a rolling five minutes. Reject an in-flight duplicate request ID without another provider call; reject reuse with different notes as a conflict. Keep at most the last 32 request-ID/hash/status records for ten minutes, with no completed lesson or note text in that coordination cache. Reusing a completed ID is rejected; an explicit retry creates a new ID. Release active slots in a finally path on success, cancellation, disconnect and errors. Return suitable retry timing for rate/concurrency errors; never automatically retry billable preparation from a recovered browser draft.
- Default loopback binding, same-origin generation requests and explicit JSON handling limit exposure in this local product. No permissive wildcard CORS or browser-supplied provider URL.
- Production static routing must leave `/api` errors as JSON, serve actual assets correctly and return the client entry only for application navigation. Development proxy and production use the same API contract.

### Session Repository

Implements `prd.md > Saving, Resume and Navigation`, `Results, Review and Next Practice`.

Use versioned IndexedDB stores for active-session snapshots, creature assets, completed records and settings. One active session and the latest ten completed records are retained. A completion transaction inserts/updates a record by session ID and clears the active slot atomically; reloading cannot create a duplicate summary. Prune unreferenced assets after safe completion, not while an active session needs them.

Serialize writes in revision order. Save semantic answers promptly, show saving/saved/error truthfully and flush pending drawing actions at meaningful boundaries. Validate on read; migrate only explicitly supported versions. A valid snapshot must agree with its lesson, question IDs, answer history and crystal outcomes; invalid state cannot award progress.

Store settings in IndexedDB too, with a safe in-memory default if storage fails. Use memory-only play with a visible warning after blocked/quota errors. Do not clear healthy records to recover one broken record. An incomplete preparation resumes as an editable draft and requires explicit retry; it cannot silently repeat a billable request.

### Results and Review Presenter

Implements `prd.md > Results, Review and Next Practice`, `Genuine Demo Path Under Three Minutes`.

Derive counts from answer history and concept terminal outcomes: immediate correct, corrected, unresolved, correct answers and submitted answers. For the demo recovery path this is two immediate concepts, one corrected concept and three correct answers out of four submissions. Do not confuse resolved concepts with questions answered correctly.

Render the actual creature asset and a stable readable bestiary record, with expandable per-question details and exact source highlights. Practice advice derives from accepted concept labels, explanations and outcomes; it requires no new model call. Historical summaries open in read-only mode with their original lesson and notes.

## Data Model

Implements `prd.md > Notes and Educational Preparation`, `Saving, Resume and Navigation`, `Results, Review and Next Practice`.

| Record | Required fields and invariants | Location |
| --- | --- | --- |
| Evidence | `id`, `blockId`, `start`, `end`, `quote`; exact original-note slice, inclusive start/exclusive end. | Accepted lesson, locally persisted. |
| Question | `id`, `conceptId`, `kind: initial/followup`, `prompt`, four `{id,text}` options, `correctOptionId`, `explanation`, required nonblank initial `hint` (nullable for follow-up), `difficulty: easy/medium/hard`, nonempty evidence references. | Lesson. |
| Concept | `id`, `label`, evidence references, exactly one initial and one distinct follow-up question. | Lesson. |
| Lesson | `schemaVersion`, server-assigned `id`, `mode: sample/ai`, sample ID or provider/model provenance, `notes`, notes hash, three concepts, evidence collection, preparation timestamp. | Memory and IndexedDB; AI response. |
| Drawing | `id`, normalized dimensions, optional lossless base-bitmap asset reference, versioned retained stroke/clear actions, history cursor, palette/tool draft settings and updated revision. | Memory and active snapshot; base Blob in asset store. |
| Creature asset | Asset ID, drawing hash, PNG Blob, sprite dimensions/crop metadata, occupancy mask and three concept-linked attachment/body coordinates. | IndexedDB asset store; decoded texture in renderer memory. |
| Answer | Unique question ID, concept ID, attempt kind, selected option ID, derived correctness, sequence and submitted timestamp. | Append-only session history. |
| Session | Client UUID, schema version, revision, draft/preview/battle/completed stage, lesson/asset references, concept outcomes, active concept/question, feedback state, answer history, timestamps. | Controller and active snapshot/completed record. |
| Presentation | Event ID, type, concept ID, visual seed and transient elapsed time/lock. No authority over correctness. | Memory; restored semantic state settles pending visuals safely. |
| Settings | Mute, volume and motion choice `system/reduced/full`; defaults resolved safely. | IndexedDB and memory. |

The server's generation envelope uses a root object with `status`, nullable `reason` and a concepts array; locally require exactly three concepts for ready and none for insufficient. Keep optional wire values nullable and object keys explicit for structured output. Canonical IDs, evidence offsets and session records are application-owned, not model-authored.

## File Structure

Planned application-owned files; adjust purely internal filenames as needed while preserving these responsibilities. Curriculum folders remain untouched and are not app dependencies.

```text
inkborn/
├── src/
│   ├── main.tsx                         # React entry
│   ├── app/
│   │   ├── App.tsx                      # Screen composition
│   │   ├── SessionController.ts          # Serialized commands/subscriptions
│   │   └── ErrorBoundary.tsx             # Recoverable UI failure
│   ├── screens/
│   │   ├── TitleScreen.tsx
│   │   ├── NotesScreen.tsx
│   │   ├── DrawingScreen.tsx             # Editor + crystal preview
│   │   ├── BattleScreen.tsx
│   │   └── ResultsScreen.tsx
│   ├── components/
│   │   ├── Dialog.tsx                    # Accessible overlays
│   │   ├── SettingsPanel.tsx
│   │   ├── ConceptControls.tsx
│   │   ├── QuestionFolio.tsx
│   │   ├── EvidenceExcerpt.tsx
│   │   └── SavedRecords.tsx
│   ├── drawing/
│   │   ├── DrawingCanvas.tsx
│   │   ├── actions.ts                   # Stroke history and replay
│   │   ├── sprite.ts                    # Alpha bounds/cropped PNG
│   │   └── anchors.ts                   # Silhouette-aware placement
│   ├── battle/
│   │   ├── reducer.ts                   # Pure finite encounters
│   │   ├── invariants.ts                # Snapshot/history consistency
│   │   └── results.ts                   # Derived honest outcomes
│   ├── rendering/
│   │   ├── ArenaView.tsx                # React lifecycle adapter
│   │   ├── PixiArena.ts                 # Main GPU renderer
│   │   ├── CanvasArena.ts               # Reduced-effects fallback
│   │   ├── scene.ts                     # Creature/crystals/environment
│   │   ├── timeline.ts                  # Shared poses/event timing
│   │   ├── particles.ts                 # Bounded pooled effects
│   │   └── procedural.ts                # Generic vector/texture machinery (MIT)
│   ├── creative/                       # Separately protected custom creative assets
│   │   ├── chamber.ts                  # Authored scene/art compositions
│   │   ├── motion.ts                   # Authored cinematic presets
│   │   ├── audio.ts                    # Original sound compositions/presets
│   │   └── theme.css                   # Distinctive INKBORN brand styling
│   ├── audio/AudioDirector.ts           # Original synthesized audio
│   ├── persistence/repository.ts        # IDB schema/transactions/recovery
│   ├── api/lessons.ts                   # Typed client/cancellation
│   ├── hooks/                          # Motion/focus/session hooks
│   └── styles/                         # Tokens, layout, screens, effects
├── shared/
│   ├── schema.ts                        # Canonical and wire Zod schemas
│   ├── evidence.ts                      # Source blocks/exact validation
│   └── samples.ts                       # Two reviewed lessons/notes
├── server/
│   ├── index.ts                         # Local entry/static production
│   ├── app.ts                           # Testable Express factory
│   ├── config.ts                        # Server-only environment
│   ├── ai.ts                            # OpenAI adapter and generation
│   ├── prompts.ts                       # Fixed generation/review prompts
│   └── lessons.ts                       # Bounded preparation orchestration
├── tests/
│   ├── unit/                           # Drawing, schema, rules, results
│   ├── integration/                    # Server/persistence/error contracts
│   ├── e2e/                            # Production browser journeys
│   └── fixtures/                       # Invalid outputs and distinct inputs
├── public/
│   ├── fonts/                          # Self-hosted files + license texts
│   └── art/                            # Original authored static assets
├── scripts/
│   ├── dev.mjs                         # Start/stop both development processes
│   └── git-local.sh                    # Restricted-workspace Git helper
├── docs/
│   ├── architecture.md                 # Actual implemented boundaries
│   └── demo-checklist.md               # Real interaction rehearsal/evidence
├── devpost/
│   ├── learner-profile.md              # Ignored personal context
│   ├── scope.md                        # Approved
│   ├── prd.md                          # Approved
│   ├── spec.md                         # This review document
│   ├── checklist.md                    # Created/reviewed in 5-build
│   └── app-map.html                    # Generated from finished code
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json                       # Strict frontend/shared checks
├── tsconfig.server.json                # Compiled Node/shared output
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── eslint.config.js
├── index.html
├── README.md
├── THIRD_PARTY_NOTICES.md
├── LICENSE                             # MIT application-code license with scope notice
└── ASSETS-LICENSE.md                    # Protected branding/custom-asset terms and paths
```

`dist/`, `.cache/`, generated test reports, browser downloads, local Git metadata, dependencies, local credentials and personal learner context are ignored. Staging uses explicit reviewed application paths; never blanket-add curriculum/configuration/private workspace files.

## External Services and Dependencies

### OpenAI Contract, Cost and Limits

Server-only `POST https://api.openai.com/v1/responses`, authenticated with `Authorization: Bearer` from `OPENAI_API_KEY`. The SDK request sets `model`, fixed developer instructions plus user note data in `input`, strict `text.format` through the Zod helper, output-token limits and `store: false`. Read parsed structured output only after checking completion/refusal status. See the [Responses API reference](https://developers.openai.com/api/reference/resources/responses/methods/create) and [structured-output guide](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).

Generation returns candidate concepts, quoted source references and question fields; the review request returns an accept/reject assessment with indexed issues. Both are validated locally. Cancellation/deadlines use abort signals; no browser-to-provider call or provider key appears in client bundles.

The proposed model's currently documented standard text rates are $0.75 per million input tokens and $4.50 per million output tokens, subject to change and account access. Use configurable output caps of 6,000 tokens for a candidate and 1,200 for a review. Actual cost depends on input, output and retries; do not promise a fixed battle cost. Provider quotas vary by account. [Model pricing and limits](https://developers.openai.com/api/docs/models/gpt-5.4-mini).

Only personal-note preparation uses provider calls. Playing and reviewing an accepted lesson makes no further request. Samples incur no provider cost. No ChatGPT/Codex subscription credit, funded account or live verification is assumed.

### Assets and Package Provenance

Use npm registry packages with a committed lockfile and official documentation above. Download font files from their official project/Google Fonts sources and keep their OFL notices. Document original SVG, procedural textures, scene/motion presets and synthesized sound compositions honestly in the protected-asset inventory. Generic generators/engines and protected authored compositions live in separate paths. Review actual installed package licenses in `THIRD_PARTY_NOTICES.md`; neither the application MIT license nor the protected-asset terms override dependency/font licenses.

## Verification Strategy

Implements `prd.md > Release Acceptance and Verification Evidence` and each feature's acceptance criteria.

### Unit and Integration Checks

Vitest covers stroke/clear undo-redo behavior and history-cap preservation; transparent inclusive bounds and blank images; occupancy placement and normalization; schema/cardinality/option/evidence/hint validation including repeated quotes and Unicode; all battle paths and command guards; follow-up selection; outcome counts; save decoding/migration and transaction behavior; stale request rejection; malformed/refused/truncated model output; absent keys; provider errors, cancellation, duplicate generation coordination and retry bounds.

Test pure image-array functions in Node and real Canvas behavior in browser tests. Use [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB) as a test-only adapter for repository transactions, plus real IndexedDB browser checks. Test Express through an ephemeral local server and native fetch with an injected provider adapter; test doubles never appear as a user-facing live-AI success mode. Real-provider verification remains separately labeled.

### Browser and Visual Verification

Run Playwright against the compiled production app, not only Vite development. Complete both curated subjects with distinct pointer-drawn creatures; compare prepared sprite hashes and inspect screenshots to exclude a fixed substitute. Cover full victory, recovery, mixed/all-unresolved retreat, concept order, quick double submit, drawing tools/eraser/clear, anchor adjustment, resume and error recovery.

Check 1440×900, 1920×1080 and 390×844, plus touch-capable input emulation, keyboard decisions, focus/overlays, muted audio, reduced motion and forced graphics fallback. Use web-first assertions and condition-based waits. Capture screenshots/traces at title, workbench, preview, awakening, corruption, recovery and results. Inspect actual rendered images and fix clipping, unreadable text, detached crystals and scene/transition defects. Headless screenshots do not prove audio quality or hardware performance; check these in a real interactive run and disclose limits.

Install Playwright Chromium and, where the environment permits, Firefox in a workspace-local browser cache. No browser is currently on PATH or connected through computer-use tooling; installation and required system-library availability are unverified. Try safe local remedies before asking for help; do not silently treat a blocked browser check as passed or change host packages destructively.

### Commands and Evidence

Provide and run:

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm start
```

`typecheck` covers browser, shared and server code. `test:e2e` manages the production server and its browser setup is documented. Verify clean-checkout development and production startup without `.env` or an API key. Record actual pass/fail results, relevant screenshots and any unverified live checks in the final technical documentation/checklist. Fix failures before marking slices done. Repeat broader checks after changes only when needed.

Use a distinct fresh-note input for a real configured-provider smoke run; validate its lesson and finish a battle. Mocked contracts, curated data and a successful build do not satisfy that real AI check. Time the normal sample recovery journey against the PRD's 170-second rehearsal budget; do not create a special success route.

## Git, Workspace and Build Execution

Git is present, but the mounted read-only `.git` directory is not a usable repository. The owner explicitly authorized safe separate metadata: create real metadata at `.inkborn-git` inside this workspace and use `git --git-dir=.inkborn-git --work-tree=.` through a small helper. Ignore that metadata directory before staging and verify it is absent from the index and exported history. Preserve the protected `.git` mount, curriculum, credentials and unrelated work; never replace, remove, write or redirect that protected directory.

Verify add/status/diff/commit/log and an ordinary clone from the real local metadata repository. In an ignored workspace-local verification area, exercise a filesystem-only bare remote, push and a fresh clone using normal Git commands. Confirm the clone has an ordinary `.git`, identical committed content, and no private profile, credentials, cache or metadata files. This proves the repository/transport workflow without external publication; actual GitHub authentication, access and public visibility remain a separate `6-ship` verification requiring authorization. Document the helper in README, including normal Git commands for ordinary clones. Never declare public publishing verified from a local round trip alone.

Keep npm cache, browser downloads and generated artifacts inside the workspace. No SSH-key searches, unrelated repository access, host-level runtime replacement, destructive Git operations or public actions are part of this specification.

On entry to `5-build`, prepare its canonical Markdown checklist, get the required build-order review, then execute Fast mode without per-slice approval. Proposed sequence for that checklist:

1. **Draw and finish a genuine sample battle:** bootstrapping is included, and the actual drawing/crystals/corruption/follow-up/results kernel works early.
2. **Use the full workbench and cinematic creature:** complete tools, silhouette-aware adjustable crystals, authored arena, awakening, both endings and meaningful audio. **Early firsthand learner feedback here**, while it can still shape the remaining build.
3. **Resume and review both sample subjects:** robust saves/history, second subject, accurate evidence records and navigation/settings/accessibility completion.
4. **Fight from personal notes:** real server-side generation, structural/evidence/semantic validation, error recovery and live verification when credentials permit.
5. **Complete release-quality verification and polish:** browser flows, responsive/rendering corrections, timed demo, production launch, documentation and license audit; then the mandatory final learner review and revisions.

These are proposed working increments, not completed slices or an approved checklist. Each receives mechanical verification and an inspected commit before the next. The official `5-build` skill requires its own displayed build-order approval before code; the existing Fast-mode choice carries forward and will not be asked again. No extra middle hands-on checkpoint is planned unless new evidence makes it useful.

After final review, complete the brief evidence-based learning wrap-up and generate `devpost/app-map.html` from actual code. Only then enter `6-ship`; preserve human authorship of submission/video narration/feedback/survey content, and obtain explicit authorization before public publication.

## Important Failure Modes

- **Drawing/sprite/attachment failure:** retain editable strokes, show the precise issue, allow redraw/reset/retry and never replace the creature with stock art.
- **Provider or educational validation failure:** retain notes and drawing, stop within bounded attempts, explain retry/edit/sample choices and leave sample selection explicit.
- **Graphics, audio or storage failure:** use the specified reduced-effects renderer, visual feedback or memory-only mode where possible; show honest limitations and preserve committed answer semantics. Unrecoverable rendering failure offers recovery instead of a blank screen.
- **Interrupted or duplicated events:** question/revision guards and durable feedback prevent extra answers, lost corrections or duplicate results. Resume settles presentation without replaying mutations.

## What Was Simplified and Why

- Transform-based animation preserves arbitrary drawings; no inferred skeleton, anatomy or generative character replacement.
- A pure reducer implements a small finite encounter model; no full game simulation, physics engine or extra state framework.
- Native drawing/audio and custom CSS keep control over authored visuals without overlapping libraries.
- One local Node server plus one optional provider avoids cloud services, accounts and operational dependencies. IndexedDB is local persistence, not cross-device sync.
- Two curated lessons make the genuine gameplay demonstrable without a key; they are explicitly labeled and do not replace the live integration.
- A focused semantic-review pass improves educational checks without claiming that an exact quotation or another model guarantees truth.

## Licensing Boundaries

**Owner-selected application-code license: MIT.** Apply the standard [MIT license](https://opensource.org/license/mit) to the application/engine/tooling code and technical documentation, with an explicit scope notice identifying exclusions. It permits reuse, modification and redistribution of that covered code with the required notices. Generic rendering/audio/drawing machinery is covered code; original brand/creative compositions are separately identified assets.

**Protected INKBORN branding and custom creative assets:** reserve rights in the INKBORN name/wordmark/emblem, original artwork/textures, authored scene compositions, distinctive theme styling, original cinematic presets and sound compositions. Place protected files in `public/art/` and `src/creative/`, with explicit file notices and an inventory in `ASSETS-LICENSE.md`. These assets are excluded from MIT. Permit their use as bundled for local installation, inspection, development, testing and demonstration of this project; do not grant standalone reuse, rebranding or unrestricted redistribution of those assets. Do not imply a registered trademark or that source-code access transfers branding rights. Owner-authorized project publication is handled separately.

Third-party packages and fonts retain their own notices; learner-provided notes/drawings remain user content and are not automatically relicensed. Preserve applicable hosting-platform terms when a public repository is later authorized. Root `LICENSE`, `ASSETS-LICENSE.md`, README, package metadata and `THIRD_PARTY_NOTICES.md` must agree: describe the project as MIT application code with separately protected assets, not an entirely MIT-licensed asset bundle. Use `SEE LICENSE IN LICENSE` for mixed-distribution package metadata and scoped SPDX/file notices as appropriate. Proposed application-code copyright notice is `2026 INKBORN contributors`; do not infer a legal identity from account metadata.

## Decisions and Open Issues

**Established by the owner:** approved scope, PRD and technical specification; the proposed architecture; maximum routine implementation autonomy; Fast mode; complete local delivery and genuine checkpoints; MIT application code with separately protected original branding/custom creative assets; safely isolated Git metadata with normal workflows verified and the protected `.git` untouched.

**Approved technical direction:** PixiJS WebGL with a functional reduced-effects fallback; imperative rendering outside React's frame loop; a pure command-guarded reducer; editable drawing compositions plus actual cropped PNGs; silhouette-aware creature-local anchors; IndexedDB; Express; one OpenAI provider with configurable model and bounded semantic review; the verification, production and clarified Git/licensing approach above.

**Learning connection grounded in the owner's stated goal:** the owner wants to verify agent-generated work and integrate structured AI into real functionality. The important distinction is schema validity versus evidence validity versus answer correctness. During the build, use one malformed fixture and one genuine follow-up encounter to trace what each validator/test establishes and what still requires semantic review or real-provider observation. This is a planned investigation, not an invented learner question or completed learning activity.

**Pending decisions/checks:**

- Technical specification and license decision are approved; implement the clarified boundaries and verify them.
- Exact installed dependency versions/peer compatibility and browser-runtime availability, to be verified at build startup.
- Real provider credentials, access, output quality and actual fresh-note verification; these remain unverified until exercised, with sample mode usable independently.
- Actual frame timing, sound quality, visual acceptance and the timed demo, established by running verification and firsthand review.
- `5-build` checklist/order approval before implementation, as explicitly required by that skill.

No application implementation or test result is claimed by this plan.
