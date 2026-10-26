# Cinematic boss overhaul — implementation and evidence

The owner explicitly authorized autonomous implementation, reversible operations, local checkpoints and verification on 26 October 2026. This directive supersedes the older per-slice learner approval pauses for this work. Historical learner-review boxes remain unchanged; no firsthand feedback or final publication approval is invented.

## Recovery and scope

The production build passed before application edits. Existing staged, unstaged and untracked application work was preserved on `overhaul/cinematic-boss` in `4cdee66`, with original bestiary assets/provenance in `3ae5e60`. All Git operations use `scripts/git-local.sh` and `.inkborn-git`; protected `.git` is untouched. No external publication, repository access outside this project, credential access or host package installation is needed.

This improves the existing Exam Siege Three.js scene. Classic retains its proven Pixi, Canvas and optional Three adapters. No frontend migration or additional dependency was needed. The existing unavailable live AI preparation endpoint is preserved accurately; no provider success is claimed.

## Rendering contract

`src/rendering/viewport.ts` defines 1920 × 1080 logical coordinates. `BattleViewport` fits an exact 16:9 surface into each arena with centered letterboxing/pillarboxing. The scene camera keeps a 16:9 projection at every size. Classic's Canvas and Pixi adapters draw in logical coordinates; their buffers use fitted physical size and capped DPR. Three uses fixed composition and a physical buffer, with DPR capped at 1.25 (Titan) or 1.5 (Classic). Pixi/Canvas cap DPR at 2. Original image textures remain at source resolution; mipmap-free titan ink avoids unnecessary resampling. Buffers need not allocate 1920 × 1080 on a small phone.

Pointer coordinates use the fitted canvas rectangle. Canvas converts to design coordinates; Pixi uses the scaled stage; Three projects world positions into the same logical coordinate system. Responsive question controls, settings and score meters remain HTML. Desktop fullscreen targets the whole battle so questions stay available; Escape or the fullscreen control exits. Unsupported fullscreen leaves windowed play available.

## Living creature and five moves

The exact player drawing remains the textured, subdivided core. Its source hash survives rendering, fallback and reports. No anatomy is guessed. Optional shoulder/hand anchors rotate bounded local regions (at most 7.5% of the ink extent); unriggable scribbles retain the same core with articulated procedural crystal shoulders, elbows and gauntlets. Slow breathing, floating, compression, head turns, recoil, slower/heavier breathing at low monster health, glowing fracture veins and a responsive contact shadow provide continuing life.

Each boss attack has anticipation, release, impact and recovery. Existing saved event names remain compatible:

| Engine event | Performance |
| --- | --- |
| `slam` | **Abyssal Slam** — arm lift/hold, compression, downward strike, floor cracks, expanding shockwave and debris |
| `storm` | **Shard Tempest** — shard ring, launch in depth toward the ritual shield and motion trails |
| `sweep` | **Inkborn's Wrath** — expanding bent ink tendrils, chamber darkness, body turn and screenward lunge |
| `beam` | **Fractured Beam** — core channel, directed beam toward the shield, light response and fragments |
| `final` | **The Last Reckoning / Eclipse Judgment** — terminal darkness, core flash, dark portal, massive strike and shield shatter |

The final move is selected only by the existing battle reducer when the actual examination fails. Correct answers use a separate gold player strike with immediate crystal fracture, directional body recoil and stagger. Sovereign Sigil remains an earned one-cast cosmetic special. Passing completion dissolves actual drawing pixels with a grain shader, scatters fragments sampled from their original colors, collapses the crystal shell and brightens ritual rings. The report is immediately accessible during endings.

The presentation clock introduces a 65 ms visual hit-stop without stopping or altering examination state. No renderer imports the reducer as a runtime operation or dispatches answer actions. Question keys, mark arithmetic, duplicate submission guards, results and IndexedDB reconstruction are unchanged.

## Chamber, fallback and sound

The chamber adds instanced masonry, vaulted stone ribs, brass lamps, concentric glyph bands, cyan crystal lights, drifting shards, layered shader haze and soft contact shadows. Light shafts and fog are an inexpensive volumetric-style approximation using real geometry/shaders, not a volumetric simulation. There is no expensive shadow-map or fullscreen postprocessing pass. Effects reuse bounded geometry and instancing; scene traversal disposes geometries, materials, instances and textures.

The lightweight renderer is available explicitly, on initialization/shader failure and after WebGL context loss. It keeps the actual drawing, readable move names, original questions and exact scoring. Retry builds a fresh Three context. Reduced motion disables mesh deformation, physical camera movement, tendrils, projectiles, debris and joint motion, retaining restrained lighting, text and fades. Original synthesized cues cover awakening, arm/charge gestures, distinct impacts, fracture, corruption, unstable core, victory and failure. A quiet chamber drone uses bounded voices. Shared volume/mute and blocked-audio recovery remain in place. Audio quality on physical speakers is not claimed from automated checks.

## Verification record

Mechanical verification passed against the implemented game:

| Check | Actual result |
| --- | --- |
| Baseline production build before application edits | Passed |
| Strict browser/shared/server typecheck | Passed |
| ESLint | Passed |
| Vitest | 172 tests passed, 10 files |
| Full production Chromium suite | 41 scenarios passed in 14.4 minutes |
| Final overhaul regression after visual refinements | 3 scenarios passed in 3.8 minutes |
| Additional targeted graphics/audio integration | Reduced motion, context loss, mobile fallback and earned Sigil have passing evidence |
| Direct release-frame capture run | One additional five-attack run passed in 2.1 minutes |
| Native Web Audio | All 20 cues rendered with nonzero, unclipped output |
| Scoring/storage/API preservation | Empty diff from baseline for `src/exam/engine.ts`, `src/exam/storage.ts`, `src/battle/`, `server/` and `shared/` |

There are **42 distinct passing browser scenarios** across the full and targeted runs. The final overhaul cases exercise all five attacks through actual committed wrong answers, exact survival percentages, a 0/10 report, four viewport sizes, fullscreen, lightweight graphics, fresh 3D retry and reload; aligned Pixi and Canvas crystal clicking after resize; and a recognizable anchored creature through reload, five correct answers, actual ink dissolution and a 10/10 report. The broader suite also covers a complete 50-question paper, extraction, OCR failures, weighted thresholds, both Classic endings, workbench history, touch, DPR and keyboard/settings behavior.

An early run exposed preexisting helpers drawing outside the visible viewport after navigation; helpers now scroll the actual canvas into view before pointer strokes. An intermediate targeted run had five passes and one automation race: the 900 ms reduced-motion awakening completed correctly while Playwright tried to click its removed Skip button. The helper now requires the real battle heading when that optional click loses the race. The corrected final three-case run passed. These were test-driver corrections, not simulated game outcomes or changed scores.

The final build/startup is exercised by Playwright's production web-server command. Vite retains its existing successful-build warning about chunks above 500 kB. Software GPU testing does not establish hardware FPS, battery/thermal behavior, human speaker quality or learner approval. Live AI preparation and Classic durable reload persistence remain the preexisting unavailable features; this overhaul does not claim to implement them. No final Devpost publication or human acceptance is claimed.

Native Web Audio verification: all 20 cues, including chamber ambience and the newly timed Sovereign Sigil, rendered through the actual `AudioDirector` using Chromium's native `OfflineAudioContext`. Every cue produced nonzero energy and a peak below digital clipping. See `cinematic-audio-verification.json`. Reproduce with `TMPDIR="$PWD/.cache/tmp" PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/playwright" node --import tsx scripts/check-boss-audio.mjs`. This is synthesis verification, not a claim of human hardware listening.


## Running screenshots

All evidence is produced by actual Chromium gameplay with pointer-drawn creatures and real answer commitment. There is no injected examination state. Standalone action frames are read from the live WebGL buffer before browser compositing clears it; the final dissolution frame is captured while the naturally earned shader transition is in progress.

- [1920 × 1080 viewport](evidence/boss-1920x1080.png), [1600 × 900](evidence/boss-1600x900.png), [1366 × 768](evidence/boss-1366x768.png), [390 × 844 mobile](evidence/boss-390x844.png).
- [Recognizable original creature](evidence/boss-recognizable-creature.png), [optional rig](evidence/boss-recognizable-rig.png), [actual ink dissolution](evidence/boss-ink-dissolution.png), [perfect completed paper](evidence/boss-perfect-ending.png).
- [Abyssal Slam](evidence/boss-slam-release.png), [Shard Tempest](evidence/boss-storm-release.png), [Fractured Beam](evidence/boss-beam-release.png), [Inkborn's Wrath](evidence/boss-sweep-release.png), [Last Reckoning](evidence/boss-final-release.png).
- [Mobile lightweight fallback with retained drawing and marks](evidence/boss-fallback-mobile.png).

The [machine-readable verification record](cinematic-boss-verification.json) includes SHA-256 digests of the evidence images. Source and results are local to this repository. The complete full-suite HTML report is retained in ignored `.cache/boss-overhaul/full-suite-report/`; the latest Playwright report remains in ignored `playwright-report/`.
