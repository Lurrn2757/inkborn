---
doc: checklist
status: draft
---

# Build Checklist

Build mode: fast — explicitly selected by the owner. Verify and commit every slice, keep this record current, and continue without per-feature approval. Pause for the planned early firsthand feedback and final learner review; additional pauses require a genuine blocker, a material plan change or an operation requiring authorization.

Scope, PRD and spec are approved. This build order is awaiting its required review. No application slice has been implemented or verified.

Git prerequisite: separate metadata initialized safely and excluded; planning checkpoint `d83da5f` verified through filesystem-only push and a clean ordinary clone with identical content and no private/metadata paths. Application helper/startup verification remains in slice 1. External publication has not occurred.

## Slices

- [ ] **1. Draw a creature and finish a genuine sample battle**
  Becomes usable: A running local game lets the player enter a clearly labeled sample, draw a creature, see that actual cropped drawing animate with three concept crystals, choose encounters, answer initial/follow-up questions and reach accurate results through victory or retreat.
  Why now: Proves INKBORN's defining drawing/concept/corruption/recovery relationship end to end before building presentation around an unproven kernel. Project bootstrapping belongs inside this usable increment.
  PRD ref: `prd.md > The Core Journey`, `Drawing and Sprite Preparation`, `Vulnerability Selection and Question Interaction`, `Finite Encounters and Combat Outcomes`, `Results, Review and Next Practice`
  Spec ref: `spec.md > Application Shell and Navigation`, `Drawing Editor`, `Sprite Preparation and Crystal Placement`, `Session Controller and Deterministic Battle Reducer`, `Arena Renderer`, `Educational Schema and Evidence Validator`, `Local API and Production Server`, `Licensing Boundaries`, `File Structure`
  Build: Install the coherent locked toolchain; create the React application, local dev/production server and essential original visual treatment; implement one validated curated lesson, baseline genuine drawing/cropping/automatic placement, Pixi creature motion, selectable crystals, finite reducer/feedback and derived results. Add guarded submissions and keyboard concept/answer controls from the start. Establish scoped MIT code/protected creative paths and license documents, a workspace Git helper and factual startup instructions. Do not display nonfunctional controls for later features.
  Verify (mechanical): Run lint, browser/shared/server typecheck, relevant unit tests and production build. Use a production-browser flow to draw two distinct creatures, verify exported sprite content differs, and complete initial-success, recovery and unresolved paths with accurate results and no duplicate submission. Inspect rendered title/arena/results captures. Start development and production without `.env` or API credentials. Verify the Git helper and ordinary clone/local push workflow with metadata/private files excluded and protected `.git` unchanged.
  Learner check: No mandatory pause at this boundary in Fast mode. At the early checkpoint after slice 2, draw an original creature, select different concept orders, make one mistake and correct its follow-up, then inspect the resulting crystal and results.
  Commit: `Build playable drawing-to-creature sample battle`

- [ ] **2. Shape the creature and experience its cinematic awakening and combat**
  Becomes usable: The full magical workbench, adjustable attached crystals, authored chamber, title/help/settings, expressive creature states, meaningful sound, recovery shattering and distinct polished endings operate through the real battle.
  Why now: Resolves the visual and interaction risks while early firsthand feedback can materially influence the rest of the game. This is the first planned learner checkpoint, not a finished-product claim.
  PRD ref: `prd.md > Screens and Layout`, `Look and Feel`, `Title, Help and Settings`, `Drawing and Sprite Preparation`, `Crystal Placement and Preview`, `Awakening and Creature Performance`, `Accessibility and Responsive Behavior`
  Spec ref: `spec.md > Look and Feel`, `Drawing Editor`, `Sprite Preparation and Crystal Placement`, `Arena Renderer`, `Cinematic Timeline and Effects`, `Audio Director`, `Application Shell and Navigation`, `Licensing Boundaries`
  Build: Complete pen/brush/palette/eraser/undo/redo/clear and bounded-history preservation; silhouette-aware sparse/narrow drawing handling; direct and keyboard crystal adjustment; staged awakening with safe skip; all creature performance states; local corruption, fracture/recovery particles and convincing attachment/shadows. Finish authored title/workbench/arena/result compositions, licensed self-hosted fonts, original audio presets and settings. Implement the reduced-effects graphics fallback, reduced motion, focus handling and responsive controls. Keep protected creative compositions separate from MIT machinery.
  Verify (mechanical): Run drawing/history/placement/timeline/rule tests, lint, typecheck and production build; exercise complete browser battles with sparse and asymmetric drawings, tool operations, adjusted anchors, muted/reduced motion, keyboard controls and duplicate inputs. Force graphics initialization failure and runtime context loss independently. Inspect screenshots at 1440×900, 1920×1080 and 390×844 for readability, clipping, recognizable drawing and attached crystals. Check audio through an interactive run where available and disclose any unverified sound/hardware behavior. Resolve reported early-check issues and reverify before marking this slice complete.
  Learner check: Required early firsthand checkpoint. Start `npm run dev`, open `http://127.0.0.1:5173`, draw a distinctive creature, adjust a crystal, watch awakening and experience a mistake followed by recovery. Also inspect retreat. Report what you noticed and what you would change, particularly recognition, attachment, atmosphere, motion, sound and question clarity. Record actual feedback; clarify only material ambiguity and implement agreed corrections.
  Commit: `Complete cinematic workbench and living creature encounters`

- [ ] **3. Resume sessions and review both sample subjects accurately**
  Becomes usable: Both curated subjects work through the same game; drafts and battles resume safely, completed records remain reviewable, and evidence/outcomes/navigation work across reloads and smaller screens.
  Why now: Builds durable session behavior on the already tested drawing/battle model and catches serialization or result inconsistencies before AI content adds variability.
  PRD ref: `prd.md > Notes and Educational Preparation`, `Results, Review and Next Practice`, `Saving, Resume and Navigation`, `States and Boundaries`, `Accessibility and Responsive Behavior`
  Spec ref: `spec.md > Session Repository`, `Results and Review Presenter`, `Data Model`, `Educational Schema and Evidence Validator`, `Application Shell and Navigation`, `Verification Strategy`
  Build: Add the second independently reviewed curated subject; ensure sample labels and edited-sample invalidation are accurate. Complete versioned IndexedDB snapshots/assets/settings, revision-ordered writes, ten-record history, atomic completion, Continue/New Battle protection, detailed answer/evidence review and concept-specific next-practice guidance. Recover honestly from invalid/blocked/full storage, interrupted animations and incomplete preparation. Complete navigation/accessibility coverage without adding account or sync features.
  Verify (mechanical): Run schema/evidence/result/persistence integration tests plus browser flows for both subjects and different doodles. Reload in drawing, corrupted feedback, resolution and results; confirm retained colors/anchors/answers and no duplicated completion. Exercise invalid saves and unavailable/quota storage, sample editing, read-only historical review, keyboard overlays and small viewport. Run lint, typecheck and production build; inspect review/results captures and confirm category/answer counts match actual actions.
  Learner check: No additional scheduled pause. The final learner review will include resuming a session and comparing results/review across subjects; any independently volunteered observations are recorded honestly without manufacturing another checkpoint.
  Commit: `Persist battles and complete evidence-based sample review`

- [ ] **4. Turn fresh personal notes into a real validated battle**
  Becomes usable: The player can prepare a lesson from new notes through the actual configured provider, draw and fight it through the same engine, or recover cleanly from unavailable/invalid AI preparation while sample play remains available.
  Why now: Integrates the remaining external dependency into a proven engine and storage format. Provider/schema feasibility and configuration are checked early during this slice, with failures isolated from genuine sample gameplay.
  PRD ref: `prd.md > Notes and Educational Preparation`, `States and Boundaries`, `Release Acceptance and Verification Evidence`
  Spec ref: `spec.md > AI Preparation Service`, `Educational Schema and Evidence Validator`, `Local API and Production Server`, `OpenAI Contract, Cost and Limits`, `Session Repository`, `Verification Strategy`
  Build: Implement server-only SDK/environment configuration, honest provider disclosure, strict request/response schemas, source-block quote resolution, semantic review and one bounded repair cycle. Add deadlines/cancellation, request-ID/concurrency/rate protection, safe insufficient/refusal/truncation/provider handling and stale-response guards. Use no browser provider key, model-controlled battle state or fake live-generation path. Record actual live verification independently from injected-provider test results.
  Verify (mechanical): Run server integration tests for malformed output, missing/wrong evidence, Unicode/repeated excerpts, absent hints, conflicting questions, refusals, truncation, missing credentials, provider failures, duplicates, cancellation and bounded calls. Verify actual request bodies exclude drawing data and bundle inspection excludes credentials/server SDK. Run fresh-note provider generation and a complete battle when valid local credentials/access exist; otherwise explicitly leave that live check incomplete. Exercise browser error/edit/explicit-sample recovery and accepted lesson flow with clearly identified test fixtures. Run lint, typecheck, tests and production build.
  Learner check: No extra scheduled pause. At final review, try personal-note preparation if configured and compare its behavior with the labeled sample. Live-provider access may be a genuine verification blocker; never request credentials in chat or claim mocked output proves live operation.
  Commit: `Integrate real evidence-validated AI lesson preparation`

- [ ] **5. Finish release verification, visual polish and the real demonstration path**
  Becomes usable: A cohesive, production-launchable local game with verified end-to-end journeys, honest failure recovery, polished responsive presentation, clear mixed-license boundaries, accurate technical documentation and a reproducible short demo route.
  Why now: Evaluates the integrated application against the entire approved PRD, repairs cross-feature defects and establishes evidence for final learner review rather than mistaking completed source files for a finished game.
  PRD ref: `prd.md > Genuine Demo Path Under Three Minutes`, `Accessibility and Responsive Behavior`, `What We're Building`, `Release Acceptance and Verification Evidence`
  Spec ref: `spec.md > Verification Strategy`, `Where It Runs and How Someone Tries It`, `Look and Feel`, `Important Failure Modes`, `Git, Workspace and Build Execution`, `Licensing Boundaries`, `Assets and Package Provenance`
  Build: Refine environmental depth, transitions, creature recognition/attachment, combat timing, sound balance and bestiary readability. Repair production/browser/accessibility failures, ensure bounded effects and proper resource disposal, finish README/environment example/architecture/demo guidance and scoped license/asset inventory. Rehearse a genuine under-three-minute recovery route, second subject/doodle and unresolved ending. Record each quality gate's real status, without inventing live-provider success or hardware observations. Prepare the final running-app review; record subsequent agreed refinements under Final Review.
  Verify (mechanical): Run all available lint, typecheck, unit/integration tests, production-browser tests and production build. Start both documented modes from a clean environment, including no `.env`, and inspect actual screenshots at all target sizes and meaningful animation states. Verify drawing identity, every encounter path, both endings, exact results, persistence, keyboard/touch/settings/reduced motion and critical failures. Time the real sample route under 180 seconds and record evidence. Inspect staged files and Git history for secrets/private context and verify ordinary local clone/push workflow and licensing boundaries. Identify any blocked browser/live-provider/audio/performance check precisely rather than marking it passed.
  Learner check: Required final firsthand review. Start the documented application, explore the full journey freely with a new drawing and awkward input, try resume/review and configured AI where available, and report anything broken, unclear or worth changing. Agree on refinements, retry affected behavior after fixes, and explicitly confirm readiness only when satisfied. Agent tests and screenshots do not substitute for this report.
  Commit: `Polish and verify complete local INKBORN experience`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 2; actual learner observations recorded and agreed fixes resolved before marking the slice complete.
- [ ] Final kick-the-tires exploration and feedback completed — after the integrated mechanical release checks; full journey and awkward inputs tried firsthand.

## Final Review

No final learner feedback has been received. Add agreed revision tasks here as unchecked items, then verify, commit and have the learner retry affected behavior before checking them.

- [ ] Final review complete — feedback resolved and learner explicitly confirms ready to ship.

## Code Tour and App Map

- [ ] Learning activity complete — a short real answer/evidence/validation trace or evidence-based recap connected to the owner's stated verification goal.
- [ ] Optional edit and transfer reflection addressed — offered, declined, already covered or not applicable recorded honestly.
- [ ] `devpost/app-map.html` generated from finished code, checked and shown, including a project-grounded practice to reuse.

Activity and evidence: Not yet performed. Planned connection: distinguish schema validity, exact source evidence and semantic correctness using an actual fixture/test and real follow-up encounter; use finished code, not hypothetical paths.
Route and stops: Not yet established from implemented code; prepare a short 2–3-location reference route during the wrap-up.
Edit outcome: Not yet offered; no optional edit is required to manufacture progress.
Reflection: Not yet offered; keep personal responses in the ignored learner profile rather than this public record.
Activity mode: Not yet performed; choose a concise guided trace or evidence-based recap appropriate to the actual build history.

## Revisions
