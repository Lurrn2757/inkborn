---
doc: exam-siege-upgrade
status: implementation-authorized-reviews-pending
---

# Exam Siege upgrade — 26 October 2026

The owner explicitly requested the full Exam Siege directive on 26 October, authorized Fast-mode implementation and incremental Three.js integration, and prioritized reliable scoring/builds. This is a consequential expansion of the original three-concept learning kernel: an immutable examination with marks, early mathematical failure, extraction review and a performance report. Classic Battle remains available.

The existing approved scope, PRD, spec and authentic checklist preserve the original implementation plan and evidence. At the time of this 26 October directive, the original firsthand checkpoint and final review were pending and external publication was not authorized. The owner subsequently authorized public GitHub publication and frontend hosting, and confirmed firsthand gameplay on **27 October 2026**; see the [playtest record](../docs/playtest-report.md). Detailed scenario feedback and final readiness remain unrecorded.

## Implementation sequence

- [x] Accurate variable-length examination reducer, sample papers, separate resume storage and report; mechanically verified.
- [x] Local PDF/image extraction, editable questions and explicitly confirmed answer key; mechanically verified on genuine fresh files.
- [x] Procedural 3D titan with original player ink, attacks, fallback and accessible controls; mechanically verified.
- [x] Integrated final regression evidence, documentation and repeatable demonstration complete; firsthand approval remains pending.

Checked implementation items record agent-run mechanical evidence. The later owner confirmation is recorded separately in the learner checkpoints below and in the build checklist.

## Delivered behavior and decisions

- React-owned Exam Siege journey: sample/upload/transcription → extraction review → explicit marking/key confirmation → existing drawing workbench → optional limb anchors → awakening → immutable answers → report.
- Quick Battle has five weighted questions worth ten marks. Full original arithmetic papers have 30, 50 or 100 questions; the validated engine supports up to 300 included questions. No crystal-per-question model.
- Marks use positive hundredths and threshold comparisons use exact integer cross-products. HP is earned plus unanswered marks as a percentage of total. Strictly below the pass target ends an unwinnable examination; equality continues. Earned marks are shown separately. No retries restore marks. Passing completion requires every question; strong victory means at least 80%, other passing grades are scarred victories.
- Local PDF.js selectable-text extraction and Tesseract English image OCR. Real PNG and two-page PDF verification passed; JPEG/WEBP are accepted by the same image decoder/OCR path, but separate genuine JPEG/WEBP OCR fixtures have not been run. Multi-file inputs preserve filenames and page numbers. Literal numbered key entry/import does not solve questions; every included key needs confirmation. Without a key, preparation stays an ungraded review.
- Actual transparent drawing on a subdivided mesh with bounded breathing/weighted optional limb deformation. True Three.js platform, spatial columns/portal, geometry, camera, fog, lighting, crystal shell, arms/core and bounded instanced fragments. Distinct slam/storm/beam/sweep phases; cosmetic desperation state; shield break and dissolution. The renderer owns no grades. The old Pixi/Canvas Classic path is preserved and isolated.
- Independent, validated IndexedDB save. Reload reconstructs grading from committed answer inputs; feedback never restores marks. Memory-only continuation is disclosed if saving fails.
- Report separates incorrect/unattempted questions and lost/unanswered marks; displays confirmed key provenance, original source excerpts, highest-impact mistakes, supported topic charts and revision priorities. JSON and browser print/save-PDF exports are provided.
- Seven additional original synthesized siege cues, shared mute/volume settings, keyboard-operable controls and reduced-motion scene. No external audio recordings or copyrighted commercial music.

## Boundaries and known limitations

Positive marks with at most two decimal places; no negative marking, partial credit, optional-question grading schemes, essays or semantic equivalence grading. Exact-text grading normalizes case/Unicode/whitespace only. Player-confirmed keys are labeled as such, not independently certified. Source/topic/explanation fields from uploads remain player-reviewed; no AI explanations or authoritative answers are invented.

Scanned-PDF OCR is not implemented. Upload image pages or a corrected transcription. Handwriting, equations, tables and poor-quality scans are not reliably supported. Local OCR needs public runtime/language downloads on first use; document pixels are not posted to an AI provider. Raw uploaded files are not persisted. Extracted content, keys, drawings and answers remain in local browser storage for resume/report; clearing site data removes them.

The arena uses geometric contact shadows and scene fog, with no real-time shadow-map or volumetric pass. Effects deliberately reuse geometry and cap DPR/particle counts. No measured 60 FPS or representative hardware/thermal/battery claim. Human sound quality, genuine external learner papers, Safari/Firefox journey checks and visual preference remain unverified. No complete automatic anatomical rigging is claimed.

This upgrade does not implement the original still-pending personal-note AI preparation slice. Classic reload persistence remains unimplemented; Exam Siege storage is independent. No accounts, cross-device sync or proctoring security. Local restore validation protects consistency and corruption recovery, not a hostile user editing their own browser database.

## Mechanical verification

- `npm test`: 159 unit/integration tests passed, including 10/30/50/100 question engines, unequal/decimal marks, exact 30%, just-below threshold, early failure, unattempted accounting, key/schema guards, duplicate/stale commands, save replay and malformed storage, PDF/OCR bounds/failures, and bounded titan deformation/attack phases.
- `npm run lint` and `npm run typecheck`: passed after integration. Production build passed, including actual Node production launch; final rebuild recorded below when run. Vite warns about chunks above 500 kB (main/Three library); extraction workers and mode are split. This warning is disclosed, not hidden.
- Real production browser checks: fresh pointer-drawn asymmetric creature; a weighted mistake reduces HP to90%; duplicate commit protection; reload feedback and completion; exact30% scarred victory; early mathematically unavoidable failure with unattempted questions; 50/100-question setup; real two-page selectable PDF; fresh printed PNG through actual OCR; missing key; corrected marks; invalid/oversize files; unavailable OCR assets; reduced-motion/mobile fallback; runtime context loss preserving the selected answer/drawing and score. Final clean totals recorded below.
- Actual desktop/mobile screenshots inspected; corrected parchment feedback contrast and desktop layout. Original drawing remains recognizable in the crystal shell and in the report. Corrected a two-click presentation race without changing grade semantics or making the report unskippable.
- Seven new cues were rendered with native Chromium OfflineAudioContext: nonzero output, measured peaks0.01793–0.04977 at default volume scaling, no clipping. Hardware listening remains unverified.
- All four existing local commits inspected for obvious credential signatures and private paths: no findings. Protected `.git` untouched; no external publication. The initial working source was archived under ignored `.cache/exam-baseline/` before modifications. Existing staged/uncommitted work was preserved.

## Learner checkpoints

- [x] Firsthand gameplay confirmed by the owner on 27 October 2026; see the [playtest record](../docs/playtest-report.md).
- [ ] Exam Siege-specific scenario coverage and detailed feedback recorded; the owner's confirmation did not identify a mode or test route.
- [ ] Final learner review, agreed revisions and explicit readiness.
- [ ] Learning wrap-up/code tour activity, based on actual implemented code.

The running local production app and specific Quick Battle review route were provided to the owner. Firsthand gameplay has now been confirmed. Detailed observations, any agreed revisions and explicit final readiness are separate remaining review items. The dated confirmation is recorded without attributing unreported scenarios or feedback to the owner.

## References

[Actual architecture](../docs/architecture.md), [real demonstration checklist](../docs/demo-checklist.md), [PDF.js browser API examples](https://mozilla.github.io/pdf.js/examples/), [Three.js documentation](https://threejs.org/docs/), [Tesseract.js project](https://github.com/naptha/tesseract.js).

## Final engineering evidence

- Final production build passed and a fresh `npm start` launched on `http://127.0.0.1:4173` without `.env` or an API key. Development startup, HTML/API proxy delivery and clean shutdown passed on5173/3001. Final lint/typecheck passed. All159 unit/integration tests passed after the dependency patch.
- **35 distinct production Chromium scenarios verified across full/targeted runs:**23 existing Classic cases and12 Exam Siege cases. The initial Classic run passed21/23; the other two completed their assertions but hit a shared trace-directory teardown collision with the concurrent exam run. Both then passed cleanly with separate artifact directories (2/2). This is not a claim of one clean35-case invocation. No assertion was removed. The standard configuration now allows120seconds for the documented software-GPU limitation.
- Clean isolated Exam run:10/10 (2.5minutes), then4/4 final targeted checks (2.3minutes) covering two additional unique cases plus both OCR checks after final cleanup. Automated Quick route:33.88seconds including fresh pointer drawing, a weighted mistake, reload/resume, four correct answers and report. The owner’s actual video recording/rehearsal remains unperformed; no narration was written.
- Final additional check: all50 questions completed through the real UI, passing target exposed the core at15 but never ended the exam;50 correct records and50 earned marks in the actual downloaded JSON. Chrome generated the26-page A4 report; beforeprint opened all50 records andafterprint restored their closed state. Poppler rendered all26 A4 pages; contact sheet, first/last pages and extracted text were inspected. All50 confirmed-key records andQ50 are present, with readable content and no clipped answer records. The print theme remains ink-heavy at the outer margins; this is cosmetic, not missing content.
- Final additional check: narrow original stroke preserves its actual aspect ratio in the bounded480px rig preview, keyboard shoulder adjustment changes the supplied anchor, actual3D initializes with the same drawing and a committed answer grades correctly.
- `npm audit --omit=dev`: zero vulnerabilities after updating the existing Express transitive `body-parser` from2.3.0 to2.4.0, which fixes its compressed-request denial-of-service advisory. Exactly one installed package changed. Server/integration tests pass afterward.
- Working-source credential scan:92 intended text files, no obvious credential signatures. Staged scan also passed for the33 pre-existing staged paths. All four existing commits had no obvious credential/private-path findings. No new commit was made while the required firsthand checkpoint remains pending, and the existing staged work is preserved.
- Representative inspected real captures: [titan and weighted health loss](evidence/exam-titan.png), [accurate Examination Autopsy](evidence/exam-autopsy.png), [fresh local PNG OCR review](evidence/exam-ocr-review.png). These are agent test inputs/screenshots, not learner feedback or stock creature substitutions.

- Local restorable source checkpoint: `.cache/exam-siege/verified-source.tar.gz` (134 entries, no private profile, credentials or Git metadata). The initial source archive remains separately available in `.cache/exam-baseline/`. This is a local recovery artifact, not publication or a substituted approval/commit.

## Owner-requested bestiary and earned special moves — 26 October

The owner requested pre-drawn scary, highly detailed monsters, a player boss move available while winning before the paper ends, and a monster move on failure. This explicitly authorizes the incremental additions below; it is feature steering, not firsthand visual acceptance or final Devpost approval.

- Three optional AI-generated transparent monster illustrations: The Cathedral Wraith, The Thorn Devourer and The Abyssal Oracle. Built-in image_gen was used; exact prompts and provenance are saved in `public/art/monsters/provenance.json`. Assets live in the project, not only a tool cache. They are labeled presets and never falsely presented as player drawings.
- Shared Classic/Exam drawing workbench now includes a bestiary and one-click selection. Presets enter the same editable canvas/export/mesh pipeline; original drawing controls remain available. An existing drawing can be restored during the current workbench visit after selecting a preset.
- **Sovereign Sigil:** unlocked after earned marks secure the configured passing target while questions remain. The player casts one golden/violet runic spear barrage. A pure revision-guarded reducer action records one use, preserves it across reload and never changes score, HP, answers, question index, passing result or armor progression. It does not end the paper or dissolve the boss prematurely.
- **Eclipse Judgment:** the titan's failed-exam move now raises both arms, opens an eclipse portal, directs a dark beam at the shield and breaks it into actual 3D fragments. It is driven by the already-determined failure result and adds no penalty. Report access remains immediately available.
- Both special performances retain reduced-motion alternatives, original-drawing fallback and resource cleanup. This does not claim anatomical rigging of arbitrary monsters or measured hardware performance.

Verification for this increment:162 unit/integration tests passed, including one-cast/reload/exact-target/no-grading-change safeguards and distinct special motion phases; lint/typecheck/production build passed. Actual detailed-preset 3D and both special screenshots inspected. Integrated production-browser checks are recorded below after completion.

Bestiary/special increment production checks: all four new scenarios passed (three distinct transparent preset hashes, reload persistence and fresh custom drawing; earned one-use Sovereign Sigil/reload/10-of-10 completion without grade changes; actual3D Eclipse Judgment and immediately skippable accurate failure report; mobile reduced-motion fallback). Classic blank/distinct-drawing regression also passed. A further workbench check needed its pointer helper to scroll the larger editor into view before obtaining coordinates; assertions were retained. Full release/learner acceptance remains pending and is not inferred from this feature request.
