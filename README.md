# INKBORN

INKBORN now includes **Exam Siege**: review an uploaded examination or curated sample, confirm its answer key, draw a creature and confront that drawing inside a real 3D crystal titan. Correct answers fracture armor; mistakes reduce the mathematically maximum attainable grade. Complete a passing paper to defeat the boss, or review an exact Examination Autopsy when passing becomes impossible. Classic Battle remains available with its original retry-to-learn encounters.

Quick Battle has five weighted questions; full arithmetic samples contain 30, 50 and 100 questions. Supported uploads are selectable-text PDFs and PNG/JPEG/WEBP images, with local extraction/OCR and an editable review. There is no automatic authoritative answer generation. No examination paper is publicly uploaded or sent to an AI provider. Personal-note AI preparation remains unavailable at `/api/lessons`; no API key is needed for the delivered modes.

The cinematic overhaul adds fixed 1920 × 1080 composition, articulated crystal limbs, five boss attacks, shader ink dissolution, a deeper Three.js chamber and fullscreen battle controls. Verification passed: strict typechecking, lint, 172 unit/integration tests, 42 distinct browser scenarios across full/targeted runs, and production build. Command results and running screenshots are recorded in [cinematic overhaul verification](devpost/cinematic-boss-overhaul.md). Prior mechanical verification included lint, strict typechecking, 162 unit/integration tests, 39 distinct production-browser scenarios across full/targeted runs, and production build/startup. The owner confirmed firsthand gameplay on **27 October 2026**; see the [playtest record](docs/playtest-report.md). Detailed scenario feedback and explicit final release readiness remain unrecorded. See [Exam Siege evidence and limitations](devpost/exam-siege.md), [actual architecture](docs/architecture.md), and [repeatable demonstration](docs/demo-checklist.md).

## Run locally

Use Node.js 24 LTS or newer and npm. This workspace uses Node 26.10.0 and npm 12.1.0. Install from the lockfile:

```bash
npm ci
npm run dev
```

Open http://127.0.0.1:5173. The launcher runs Vite on port 5173 and the API on port 3001, proxies `/api`, and shuts down both processes on Ctrl+C. npm cache and browser downloads stay inside `.cache/` in the project.

To run the complete local production server:

```bash
npm run build
npm start
```

Open http://127.0.0.1:4173. Vite builds `dist/client`; TypeScript compiles the Node server and shared code into `dist/server`. The entry `dist/server/server/index.js` serves client assets and `/api` from one origin. Missing asset paths and unknown API routes return 404; API errors are JSON. A frontend-only Netlify deployment is configured separately; see [hosting instructions](docs/netlify-deployment.md). Arena is disabled in that deployment.

Both modes start without `.env`. To prepare for the later AI integration, copy `.env.example` to `.env` locally. `OPENAI_API_KEY` is server-only; `OPENAI_MODEL` defaults to `gpt-5.4-mini`, `HOST` to `127.0.0.1`, and production `PORT` to `4173`. Development uses port 3001. Never put a provider key in a `VITE_` variable, browser storage or source control. `/api/status` reports configuration presence, not verified provider/model access. Configuring a key does not activate the unimplemented preparation endpoint.

## Verify

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e:install
npm run test:e2e
npm run build
```

Playwright downloads Chromium into `.cache/playwright` and manages the production build/server for browser tests. Real WebGL journeys have a 120-second test budget because this workspace uses a slow software GPU; examination scoring has no timer. Browser system libraries must already be available; the install command does not modify the host. Test reports are ignored in `test-results/` and `playwright-report/`. Current verification evidence is recorded in `devpost/checklist.md`; commands in this document are not a claim that every later feature or check is complete.

Locked versions for this build: React/React DOM 19.3.1, TypeScript 6.0.3, Vite 8.3.4, React plugin 6.1.2, PixiJS 8.22.0, Motion 14.3.0, Zod 4.6.7, idb 8.0.4, Express 5.3.0, OpenAI SDK 7.38.0, ESLint 10.13.0, typescript-eslint 8.71.2, Vitest 5.0.5, Playwright 1.64.1, tsx 4.23.15 and fake-indexeddb 6.2.6. `package-lock.json` also pins type packages and transitive dependencies. npm 12 reported the esbuild postinstall as blocked by its default script policy; its platform binary is installed through the optional dependency, and the development runtime works without approving that script.

This environment downloaded Playwright's Ubuntu 24.04 fallback builds because its OS is not officially supported. Chromium 156.0.8078.4 and Firefox 157.0 both passed a headless launch/page check without host package changes. The standard browser-test project uses Chromium. To install Firefox for an additional check, run `PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/playwright" TMPDIR="$PWD/.cache/tmp" npm exec -- playwright install firefox` after creating `.cache/tmp`.

The slice-1 tooling check passed lint, strict browser/shared/server typechecking, the production build, and two HTTP contract tests. Development startup/proxy and clean shutdown passed on 5173/3001; production `npm start` passed no-key startup, client JavaScript/font delivery, JSON API/missing-asset errors and clean shutdown on 4173. These checks establish local tooling/server behavior; complete gameplay, visual acceptance and later-slice capabilities have separate evidence in the checklist. Vite currently warns that the main minified chunk is slightly above 500 kB; it is a successful build, with further bundle tuning reserved for later polish.

React owns readable controls; Canvas 2D records and exports drawing pixels; the rendering adapter animates that creature; shared validated lessons and a deterministic battle reducer determine answers and outcomes. Express owns server-only configuration. The current workbench includes pen/eraser, pressure-aware strokes, undo/redo/clear, silhouette-aware adjustable crystals, staged awakening, corruption/recovery effects, distinct endings and original synthesized cues. Sound and motion settings are available from the header. Personal-note generation, Classic durable persistence, the second Classic subject and its final learner review remain pending; Exam Siege persistence is implemented separately. Real-provider behavior, audio hardware and final visual acceptance require their own verification.

## Play Exam Siege

Choose **Enter Exam Siege**, select a sample or **Upload Examination**, and review every included question, choice and mark. Enter/import a correct key and explicitly confirm it. You can exclude malformed questions and configure the passing threshold (default 30%). Then draw, optionally mark shoulder/hand anchors, awaken the titan and commit each answer once. Earned score and survival potential are separate meters. At exactly the pass threshold the exam continues; strictly below it, the paper ends with unreached questions marked unattempted. All questions must be finished after exposing the boss core.

Paper limits: 10 MB/file, 30 MB combined, at most 30 files, 30 PDF pages and 20 MP/image; up to 300 validated questions. Printed English OCR needs public recognition-asset downloads. Handwriting, equations and poor scans are not reliable; scanned-PDF OCR is unavailable. Review and correct all extraction. Positive weighted marks support two decimal places. Essays, semantic equivalence, negative marks, optional-question schemes and partial credit are unsupported. A missing key leaves ungraded preparation available.

Exam Siege saves reviewed questions, keys, drawings and committed answers locally in IndexedDB; raw uploads are released. Return to title, re-enter Exam Siege and choose **Resume saved examination**. Storage failures are disclosed with memory-only continuation. Browser site-data clearing removes local records. Report export is JSON or browser print/save-PDF. User-confirmed keys are labeled as player-confirmed, not independently certified.

The real Three.js titan is isolated from Classic's Pixi arena and from all scoring. Graphics failure/context loss provides a lightweight original-drawing fallback with playable questions and retry. Effects are bounded, DPR capped and reduced motion available. No measured 60 FPS, hardware quality, universal OCR accuracy or human acceptance is claimed.

## Try Classic Battle

Choose **Sample Battle**, read the electrical-circuits notes, then draw an original creature. Prepare it and optionally drag a numbered crystal or focus it and use arrow keys (Shift makes finer adjustments). Awaken the creature; the six-second sequence can be skipped. Choose any crystal directly or use its labeled control, select one of four answers, then cast it. An initial mistake reveals source evidence and a different follow-up. Five engraved seals display Ritual Integrity. Every incorrect answer breaks one ward, triggers a monster strike, and deepens the chamber’s corruption. A second mistake leaves that crystal unresolved. A successful follow-up reclaims and shatters the crystal, while broken wards remain as scars. At zero seals, read the feedback and retreat with your record preserved; there are no forced retries. Clear all crystals for a dominant victory with five intact seals, or a scarred victory after corrections. Any unresolved concept leads to a retreat ending. Open the battle record to review the source evidence and next practice.

The workbench retains 100 recent actions and 50,000 editable points; older strokes are flattened losslessly. Clear is undoable within this window. Settings provide mute, volume, a test chime and system/reduced/full motion. Audio starts only after interaction and pauses in background tabs. If WebGL is unavailable, a fresh Canvas surface shows a reduced-effects notice and preserves the same actual creature, questions and outcomes.

Classic sessions survive navigation within the page; Classic reload persistence is not implemented. Exam Siege has separate IndexedDB resume. Live AI and durable history remain pending, and the current sample is explicitly curated. Do not use this early review build as evidence that those later features are complete. Hardware sound quality and firsthand visual acceptance require the learner review.

## Optional 3D chamber study

PixiJS remains the default battle renderer. A contained Three.js experiment adds a real 3D chamber while retaining your exact transparent drawing as the creature. Open `http://127.0.0.1:5173/?renderer=three` in development (or use port 4173 in production), then play the usual sample. **Use standard visuals** returns to PixiJS without resetting the battle. Graphics failure tries PixiJS, then the existing Canvas fallback. The experiment does not change questions, settings, outcomes or session persistence.

The development comparison is at `/experiments/battle-3d.html`. See [the architecture, benchmark method and promotion gate](devpost/3d-battle-evaluation.md). Run `node scripts/benchmark-battle.mjs` with Vite running on port 5174 to reproduce the local comparison. Software-rendered measurements do not establish hardware/mobile frame rates. This promotion gate still applies to Classic. Exam Siege separately uses its smaller procedural Three.js titan with a lightweight fallback; it does not promote the Classic chamber study.

## Git in this workspace

The supplied workspace has a protected, unusable `.git` mount. Leave it untouched. Real local metadata lives in ignored `.inkborn-git`. Use the helper for normal repository operations here:

```bash
bash scripts/git-local.sh status
bash scripts/git-local.sh diff
bash scripts/git-local.sh add <intended-paths>
npm run security:scan
bash scripts/git-local.sh commit -m "Describe the verified change"
bash scripts/git-local.sh log --oneline
```

The helper uses ordinary Git automatically in a normal clone with a valid `.git`. A normal clone can use `git status`, `git add`, `git commit` and `git push` directly. The security scan inspects staged paths and added lines, reports file/line locations with credential values withheld, and exits nonzero on findings; it never stages or commits. Review intended paths and the staged diff too.

A filesystem-only bare-remote push and ordinary clean-clone round trip was verified for the planning checkpoint. The first application checkpoint was also cloned into an ordinary repository, freshly installed offline, built and started successfully in both development and production without credentials. This proves local repository/transport behavior; external GitHub authentication or publication has not been attempted. Cache, private profile, credentials, dependency/build output and alternate metadata are excluded by `.gitignore`.

## Licensing

Application/engine/tooling code and technical documentation are MIT licensed, with the explicit exclusions in [LICENSE](LICENSE). The INKBORN name/branding and original assets in `src/creative/` and `public/art/` are separately protected under [ASSETS-LICENSE.md](ASSETS-LICENSE.md), which permits bundled local installation, inspection, development, testing and demonstration. It grants no standalone reuse, rebranding or unrestricted redistribution of those assets. Generic rendering/drawing/audio machinery remains MIT code. User notes and drawings retain their owners' rights. Third-party packages and OFL fonts retain their own notices; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Detailed monster presets and special moves

The drawing workbench includes **Choose a detailed pre-drawn monster** and an optional Forbidden Bestiary: The Cathedral Wraith, The Thorn Devourer and The Abyssal Oracle. All three are original AI-generated transparent illustrations, explicitly labeled as presets. Choose one, add your own ink, then prepare/awaken through the usual pipeline. A previous sketch is recoverable with **Restore previous drawing** until you leave the workbench. [Asset prompts and provenance](public/art/monsters/provenance.json) are included.

In Exam Siege, securing the passing marks before the final question unlocks **Cast Sovereign Sigil**: a once-per-exam player spear barrage. It is a cosmetic earned special, not extra credit or early exam completion; remaining answers are still required. Failure triggers the titan's **Eclipse Judgment**, with a portal, directed beam and shield fragments. Neither move changes grading, and the failure report is immediately skippable to. Reduced-motion and lightweight graphics alternatives remain available.

## Cinematic boss battle

Exam Siege now presents **Abyssal Slam**, **Shard Tempest**, **Inkborn's Wrath**, **Fractured Beam** and the terminal **Last Reckoning / Eclipse Judgment** through the existing scoring events. The exact drawing remains a deforming ink core; optional anchors provide bounded limb motion and procedural articulated crystal arms support arbitrary scribbles. Correct answers deliver a distinct player strike; completed passing play dissolves the drawing into original-color ink fragments.

All arenas fit a fixed **1920 × 1080 logical / 16:9** composition with proportional scaling and letterboxing, capped pixel density, aligned pointer targets and responsive HTML questions. Use the arena fullscreen button on desktop. **Lightweight graphics** is available manually and automatically after WebGL failure; retry never resets marks. Settings retain mute, volume and reduced motion. No graphics feature awards marks or penalizes the player.

See [implementation, recovery checkpoints and browser evidence](devpost/cinematic-boss-overhaul.md). Local work is isolated on `overhaul/cinematic-boss`; use the documented Git helper.
