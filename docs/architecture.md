# INKBORN implementation architecture

Exam Siege is an incremental React feature. Classic Battle and its Pixi/Canvas/optional Three adapters retain their original reducer and sample lessons. The title lazy-loads Exam Siege; its Three scene mounts only during awakening and combat. No Pixi arena runs behind the titan.

## Exact grading

`src/exam/engine.ts` validates a common paper schema (1–300 included questions, positive marks in hundredths, pass threshold in hundredths of a percent). Active graded questions require a curated or player-confirmed key. Exact-text answers normalize Unicode, whitespace and case; semantic equivalence, essays, partial credit and negative marking are unsupported.

A pure revision-guarded reducer accepts one committed answer for the current question. Each action carries the expected revision and question ID. Options, dates, answer order, duplicate answers and phases are validated. Marks are computed in integer hundredths; pass comparisons cross-multiply the exact threshold. Rounded display percentages never determine pass/fail.

Potential = total marks − marks lost on wrong answers = earned + unanswered marks. Early failure occurs only when potential is strictly below the configured pass target. Exactly the target remains viable. Reaching the pass target exposes the core but never ends a paper; all remaining questions must be completed. Boss armor fracture is capped at 95% until passing completion. Conquest means a passing final grade of at least 80%; other passes are scarred victories.

## Input and review

`extraction.ts` checks extension, MIME, byte signatures, 10 MB/file, 30 PDF pages, 20 MP/image and bounded extracted text. The UI permits up to 30 input files and 30 MB combined. PDF.js extracts selectable text page by page locally with worker cleanup. A scanned PDF produces an explicit missing-page warning; scanned-PDF OCR is not implemented. Images use a local Tesseract English worker. Runtime/WASM/language assets are public downloads; document pixels are not posted to a provider. OCR timeouts and asset failures have recoverable errors. No raw file is retained in IndexedDB.

The literal parser detects numbered questions/options/marks and preserves filename, page and extraction excerpt. Missing marks use an explicitly warned one-mark draft placeholder. Unsupported marking or optional-question instructions require replacement with supported settings. The player corrects text/options/marks, excludes invalid questions, and enters or imports a numbered text answer key. The parser never solves questions. Confirmation is explicit, and changes invalidate it. Without a key the review remains ungraded. Topics and explanations come from curated worked derivations or player-reviewed input; no model invents report evidence.

## Drawing and presentation

The existing drawing editor exports actual transparent pixels, silhouette mask and hash. Exam Siege reuses this editor, with no concept-per-question crystals. Optional normalized shoulder/hand anchors drive bounded weighted ink deformation. Arbitrary shapes use whole-body breathing, squash, tilt and recoil plus procedural crystal arms.

`TitanScene.tsx` owns one Three renderer, a real perspective camera, geometry, lighting and scene resources. Authored composition is in `src/creative/titanChamber.ts`. Frame evaluation deforms a subdivided ink mesh and animates deterministic cosmetic event sequences. Slam, shard storm, void beam and sweep follow anticipation/action/impact/recovery. Critical survival adds a cosmetic desperation state. Victory dissolves the titan; final failure breaks the shield. These callbacks never write score or answers. Effects use reused geometry, instanced shards/columns, bounded particles, capped DPR and no expensive real-time shadow pass. A geometric contact shadow anchors the titan. Fog is scene depth fog; there is no volumetric simulation.

Reduced motion stops camera shake, moving particles and local ink deformation. Context loss or initialization/shader failure disposes the renderer and shows the same drawing in a lightweight arena with unchanged React questions and grading. Retry creates a fresh context. There are no dodge controls or timing-based penalties. Ending presentation is immediately skippable to the report.

## Persistence and reports

`storage.ts` stores an isolated versioned Exam Siege snapshot in IndexedDB. Writes are serialized and cloned. Reload revalidates the draft or strict graded schema, drawing, rig and sprite, then replays committed inputs through the reducer to reconstruct correctness and earned marks. Interrupted awakening resumes at battle. Feedback remains a committed answer; reopening it never restores marks. This is local persistence, not server authentication or tamper-proof proctoring.

The UI reports storage failures and preserves an in-memory session. Raw uploads are released after extraction; extracted source text, reviewed keys, drawing and answer history remain locally for resume/report. Clearing browser site data removes these records. Exam Siege offers a JSON report export and browser print/save-PDF. Reports distinguish wrong from unattempted questions, lost from unanswered marks, confirmed key provenance, exact marks, supported topics and highest-impact mistakes.

Audio uses bounded Web Audio voices and original presets, with optional mute/volume controls shared with Classic. Audio unlock requires a user gesture. All state changes also have text/visual feedback.

## Verification boundaries

See `devpost/exam-siege.md` for actual command/browser evidence. Software-rendered browser results do not establish hardware frame rates, mobile battery/thermal behavior, human sound quality or learner acceptance. Live AI lesson generation remains unavailable in Classic and is not required by this local extraction workflow. No upload uses an AI provider. No external publishing, final Devpost prose or learner feedback is generated by this implementation.

## Optional bestiary and earned specials

Three transparent generated monster PNGs in `public/art/monsters/` are cataloged in `src/creative/monsters.ts`. `createMonsterDrawing` proportionally fits a selected illustration into the existing logical canvas; drawing, eraser, export, occupancy, rig, texture and rendering code stay shared. The workbench preserves a prior nonempty document for explicit restoration during that component visit. Preset provenance is labeled; it is never claimed to be the student's own drawing.

`ExamState.finisherUsed` defaults to false for older saved snapshots. `finisher` is a revision-guarded action permitted only when earned marks meet the pass target, questions remain and no prior cast occurred. It changes only cosmetic event/revision and the use flag. Reload reconstructs all grades and validates that the special was earned. Cast availability persists without re-awarding marks. The renderer performs golden spears from the near-camera ritual sigil toward the boss; it never dissolves the boss before completed passing play. Failure's existing `final` event now performs Eclipse Judgment. All score/failure math remains unchanged.
