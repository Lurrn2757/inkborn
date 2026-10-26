# Incremental 3D battle evaluation

Decision: retain PixiJS as the default. A contained Three.js adapter is available for explicit comparison using `/?renderer=three`. This is an experiment, not a completed migration or a demonstrated frame-rate upgrade. No renderer changes answers or battle outcomes.

## Inspection before implementation

The inspected PixiJS implementation is already an adapter (`src/rendering/PixiArena.ts`) behind `ArenaRenderer`. It paints the original 2D chamber once on resize, renders the actual transparent drawing, reuses cached alpha-edge lighting and drawing-pixel samples, and animates anchored crystals, corruption, impacts and ink dissolution. It has a private ticker, a hidden-tab pause, resource cleanup and fresh-surface Canvas fallback on initialization/context failure.

`ArenaView` owns asynchronous image loading, the renderer lifecycle and `PresentationClock`. `motion.ts` owns pure pose/timeline evaluation. React owns labeled concept buttons, keyboard answers, feedback, settings, screen-reader content and endings. The reducer and `SessionController` own questions, revisions, submission guards, ward damage and outcomes. These boundaries make a replacement *presentation adapter* practical; a second gameplay implementation is unnecessary.

The baseline passed 83 unit tests and 16 Chromium browser tests before the graphics work. The workspace already contained substantial staged and unstaged work; existing gameplay changes were preserved. Inspection also established that persistence currently means navigation within an in-memory session. Reload/history persistence is not implemented in the inspected build; this experiment neither introduces nor removes it.

## Architecture and scope

| Concern | Implementation |
| --- | --- |
| Chamber | Real perspective floor, three stepped platform meshes, stone columns, pointed ribs, layered portal and brass trim. Seeded grain and the ritual seal are baked locally once. |
| Light | Hemisphere, directional and bounded point lights; ACES tone mapping for the chamber. Crystal emission, soft glows and impact lighting. |
| Atmosphere | Depth fog, transparent cone shells and a bounded dust cloud. These approximate atmospheric scattering; there is no volumetric ray marching. |
| Camera | Restrained arc and awakening dolly. The drawing stays face-on and its projected size remains tied to the shared arena layout. |
| Player's drawing | The exact prepared RGBA image becomes an sRGB, transparent, unlit texture. Original proportions, strokes, colors, holes and anchors are retained. No mesh reconstruction, AI substitution or generic creature. |
| Animation | Existing `evaluatePose`, `evaluateTimeline`, `visualCrystalState`, actual-pixel gathering/dispersal and release-seal evaluation. Rotating faceted crystals, corrosion lines, instanced fragments and expanding impacts add depth. |
| Interaction | Pointer targets project each animated crystal into screen coordinates. Existing labeled HTML buttons and question controls remain authoritative and keyboard accessible. |
| Performance | Three.js pixel ratio capped at 1.5; repeated architecture and fragments use instancing. No shadow maps, transmission/refraction, downloaded models, full-screen bloom or ray marching. |
| Reliability | Lazy load only when requested. Three.js failure → existing PixiJS → fresh Canvas 2D. One presentation clock survives surface replacement and explicit return to standard visuals. Hidden tabs cancel animation; resources, instanced buffers, listeners and contexts are released on destruction. |

Plain Three.js fits the existing imperative adapter and adds one runtime dependency (`three` 0.186.1, types 0.186.0). React Three Fiber would introduce a second rendering reconciler without removing the adapter or timeline boundary in this experiment. It remains a reasonable option if later work benefits from a large declarative 3D component tree. Its own performance guidance describes demand rendering and device-dependent quality scaling; those ideas remain useful independently of the wrapper. [R3F performance guidance](https://r3f.docs.pmnd.rs/advanced/scaling-performance).

The hybrid uses one graphics context: 3D surroundings and crystals, a drawing plane in that scene, and the existing HTML interface. Running PixiJS and Three.js simultaneously on stacked canvases would retain more drawing code initially, but adds a second context, clock coordination and pointer/depth alignment work. Keeping PixiJS as an alternate adapter provides a simpler rollback and avoids paying for both renderers at once.

Explicit GPU cleanup is required by Three.js; removing React/scene objects alone does not free textures, materials or geometry. The adapter disposes these resources and instanced objects, then releases its renderer/context. [Three.js cleanup guide](https://threejs.org/manual/pages/cleanup.html).

The comparison page, `experiments/battle-3d.html`, is served by Vite for development and is excluded from the normal production entry. It uses a repeatable canvas drawing fixture solely for comparisons. The opt-in real battle always uses the player's own prepared drawing. The original PixiJS and Canvas renderers continue to work.

The production build places the optional renderer in a separate 580.49 kB minified chunk (145.96 kB gzip). Its fetch/parse/compile cost is additional to the warmed lab's mount timings. Vite still reports its chunk-size warning; this successful build is not a claim that bundle/cold-start budgets are met.

## Reproduce

```bash
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/?renderer=three`, choose Sample Battle, draw, prepare and awaken. **Use standard visuals** replaces only graphics. Without that query parameter, the original PixiJS renderer remains the default. The experiment is not a persistent graphics setting.

For the side-by-side study and automated benchmark, use two terminals:

```bash
npm exec -- vite --host 127.0.0.1 --port 5174 --strictPort
```

```bash
node scripts/benchmark-battle.mjs
```

The study is at `http://127.0.0.1:5174/experiments/battle-3d.html`. The script writes raw results to `.cache/three-evaluation/benchmark.json` and captures both renderers at desktop and narrow viewport sizes. `STUDY_URL` overrides the origin; `STUDY_SECONDS` overrides the default six-second timed round. Run without other browser tests, heavy tasks or source edits.

Each viewport uses three paired full-motion rounds with alternating renderer order, a sweep through idle, awakening, hit, corruption, recovery, victory and retreat, material/effect warm-up, and 30 settling frames. A reduced-motion run follows. Frame intervals are browser `requestAnimationFrame` cadence, including GPU/backpressure effects; they are not GPU timer-query measurements. Reported CPU times measure the adapter's `render` call: Pixi submits its stage later in its ticker, so those CPU columns are not directly equivalent and should not be used to claim CPU superiority. Context creation, first draw and shader setup contribute to mount time; network and module loading are already warm in this lab.

Desktop and narrow DPR 1 runs match physical rendering density. The narrow DPR 2 run compares the prospective shipped policies: Pixi caps density at 2, Three at 1.5. A Three result at that setting must be considered alongside its lower drawing-buffer resolution. A narrow viewport is not a mobile-device benchmark.

## Evidence and promotion gate

The final run on 23 October 2026 used Chromium 156.0.8078.4 and ANGLE/SwiftShader software Vulkan. Consequently these runs can reject a regression here, but cannot establish laptop, phone, battery or thermal performance. Raw samples, drawing-buffer sizes, reduced-motion runs and source SHA-256 hashes are in [3d-battle-benchmark.json](3d-battle-benchmark.json).

| Viewport / density | Renderer | Buffer pixels | Median fps (run range) | Median per-run p95 interval | Median warm mount |
| --- | --- | --- | --- | --- | --- |
| Desktop / DPR 1 | PixiJS | 740 × 660 | 8.3 (5.3–8.3) | 166.6 ms | 47.5 ms |
| Desktop / DPR 1 | Three.js | 740 × 660 | 3.3 (3.3–3.5) | 383.3 ms | 476.5 ms |
| Narrow / DPR 1 | PixiJS | 342 × 430 | 11.0 (9.7–20.5) | 149.9 ms | 62.8 ms |
| Narrow / DPR 1 | Three.js | 342 × 430 | 5.6 (4.8–7.4) | 350.0 ms | 465.6 ms |
| Narrow / DPR 2 | PixiJS | 684 × 860 | 4.3 (4.0–6.0) | 333.3 ms | 102.5 ms |
| Narrow / DPR 2 | Three.js | 513 × 645 | 3.7 (2.6–3.8) | 366.7 ms | 550.2 ms |

These are medians of three paired rounds, not a hardware capability estimate. Short samples and substantial run-to-run variation limit precision; GPU timing, host isolation and hardware thermal behavior were not measured. A preliminary run before the final ink-color correction also favored PixiJS (desktop 8.4 versus 3.3 fps). Neither run supports enabling Three.js by default. The reduced-motion runs also miss the frame-time targets; reduced motion suppresses movement, and currently still renders the chamber each frame.

The final settled Three.js scene reports 48 draw calls, 10,700 triangles, 38 geometries and nine textures. Per-mount geometry/texture counts stayed constant across all paired rounds. That is a useful bounded-resource check, not a long-session memory-leak proof. The repeated column/trim geometry was converted to instancing after an initial visual inspection reported 113 draw calls. The automated lab recorded no browser or shader errors.

Visual comparison shows real depth in the platform, pillars, portal, moving camera and crystals, and retains the same recognizable colored strokes in both adapters. The new chamber remains a prototype composition: it does not establish that learners prefer its lighting, sharpness or legibility. The default Pixi composition remains available, and the additional Three.js module is requested only by the explicit experiment.

Compare the same drawing and settled pose in the [current PixiJS capture](evidence/pixi-chamber.png) and [Three.js chamber capture](evidence/three-chamber.png). These captures use the lab fixture, not a substituted creature in gameplay.

Promotion requires an approved visual comparison with learner-drawn creatures, sustained hardware measurements on a representative desktop and phone, clean browser consoles, working fallback/keyboard/reduced-motion flows, and stable resource counts over repeated battles. Proposed targets are approximately 60 fps desktop and at least 30 fps on the target phone, with p95 frame intervals within their budgets and no material regression against Pixi at comparable quality. Validate cold-start delay, image sharpness, battery load and touch controls on those devices before choosing a default. Failure to meet these criteria leaves the current renderer in place.

The next graphics iteration should profile transparent haze/overdraw and lit stone materials on hardware, consider baking the static chamber's lighting, and render reduced-motion idle scenes on demand. Those are proposed improvements, not verified capabilities of this prototype. A more elaborate effects stack should wait until this smaller scene meets its frame budget.

## Final verification

- `npm run lint`, `npm run typecheck` and `npm run build` passed after the final mobile-control layout change. The existing Vite chunk-size warning remains.
- `npm test`: all 83 existing unit tests passed. The battle reducer, questions, audio, drawing export and persistence implementation were not replaced.
- The complete Chromium suite ran all 23 cases: 21 passed and two exceeded the original 60-second limit. The existing victory test had already reached the correct 3/4 scarred-victory record and opened both review entries; the new navigation test had reached the correct follow-up question. Both traces showed time-limit errors rather than failed assertions.
- Both timed-out cases then passed with a 120-second limit, with every assertion retained. The mobile 3D case was also rerun after relocating the return control below the wards; all three rechecks passed. The new 3D test file allows 120 seconds for multiple real WebGL startups; the existing test files' assertions and original Playwright configuration remain unchanged.
- Across that complete run and the rechecks, all 23 cases were verified, including real drawing identity, direct selection, keyboard answers, evidence, recovery, scarred victory, retreat, navigation persistence, graphics retry, context loss, both fallback stages, mobile layout, reduced-motion stillness and return-to-standard controls. This is not a claim of a clean single run under the original 60-second limit.
- A normal battle explicitly verified `data-renderer="pixi"` and no network request for the Three.js module. The real 3D battle verified an unchanged source image and drawing hash in the final record and no browser/shader errors.

Browser verification reused a separately built local production server with the same test/project settings through a temporary local configuration. The timeout rechecks used Playwright's `--timeout=120000`; no original gameplay assertion was removed. Full-run traces remain in `test-results/` and `playwright-report/`; recheck results are in `.cache/three-evaluation/rechecks.json`. Renderer/study source hashes still match the benchmark record.

Hardware GPU, Safari/Firefox, long-session memory/thermal behavior, cold network loading and firsthand learner visual preference remain unverified. These limits are the reason to retain the opt-in boundary.
