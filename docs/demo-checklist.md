# Repeatable real-system demonstration

Run `npm run build && npm start`, then open http://127.0.0.1:4173. Header settings control sound and reduced motion. Use a fresh drawing; none is substituted.

## Quick Battle (five questions, ten weighted marks)

1. Enter **Exam Siege → Quick Battle**. Review the five-question paper and marks. Confirm the included questions/key, then **Draw your titan**.
2. Draw a recognizable creature, **Prepare the creature**. Optional shoulder/hand anchors are available; skip these for a short demo.
3. **Awaken my creature → Enter the arena**. The transparent drawing remains the titan's ink identity.
4. Q1: select **6** (A), commit. Score 1/10; potential remains 100%; armor fractures.
5. Q2: select **17** (A), commit. This is incorrect; correct area is 16 (D). Score remains 1/10; potential falls to 80%; Shard Storm attacks. Continue.
6. Q3: **5** (C); Q4: **6** (B); Q5: **14** (A). Commit each once and continue after feedback. Final score 8/10, 80%, **Crystal Conquest**. Open the report, expand Q2 and inspect source derivation, two lost marks and topic revision priority.

Alternative real failure: answer A incorrectly on Q1 by choosing B, then choose incorrect answers on all subsequent questions. The exam ends in **The Shattering** with actual marks. A paper with 70% pass threshold can demonstrate earlier mathematically unavoidable failure; unattempted questions remain distinct.

The engine has no scripted success/failure override. Demo answer indices are instructions for the original sample only. Recheck the reviewed paper if you edit it. Ending cinematics can be skipped by opening the report immediately. A recording has no generated narration and must be timed under three minutes by the owner; a browser automation runtime is not a human recording rehearsal.

## Full Examination

Choose **Full Examination · 30**, **50**, or **100**. Same schema, reducer, rendering and reporting. No crystal is created for each question. The pass target is configurable before drawing; reaching it only exposes the core and never skips remaining questions.

## Upload Examination

Select a genuine selectable-text PDF, or PNG/JPEG/WEBP page images (multiple supported). Review draft text, numbered choices, marks, source pages and warnings. Correct any OCR errors. Enter answers in the question editor or import a plain text numbered key (`1: A`). Confirm supported positive marking and the key, then draw and play. No key means ungraded review only. Scanned PDFs require image pages/transcription. Images need recognition-asset downloads on first use; no paper bytes are sent to a provider.

## Firsthand play and remaining review checkpoints

The owner confirmed firsthand gameplay on **27 October 2026**. The [playtest record](playtest-report.md) documents that confirmation, and the [build checklist](../devpost/checklist.md) now marks firsthand play complete.

For detailed review, record coverage of a new paper/drawing, one correct answer, one mistake, reload/continue, failure or victory and its report. Assess drawing recognition, readable attacks, question clarity, sound, motion and extracted-paper correctness. These specific observations and final release readiness were not included in the gameplay confirmation.

## Cinematic overhaul route

1. Enter Exam Siege, choose Quick Battle, confirm the curated key and draw an irregular scribble or a recognizable creature. Prepare and optionally mark shoulder/hand anchors.
2. Awaken and enter the arena. Resize or use the top-right fullscreen control: the scene remains 16:9 and questions remain available.
3. Answer every Quick Battle question incorrectly (B, A, A, A, B). The real engine emits Abyssal Slam, Shard Tempest, Fractured Beam, Inkborn's Wrath and The Last Reckoning, in order. Potential is 90%, 70%, 60%, 40%, then 0%. The ending report records five wrong answers and no additional damage.
4. For a perfect ending, play a fresh paper with A, D, C, B, A. Correct answers strike the titan; all five earned answers trigger ink dissolution. Sovereign Sigil is available after securing the actual pass target and remains cosmetic.
5. Use Lightweight graphics and Retry 3D graphics; select reduced motion or mute in Settings. Reload and Resume saved examination to check the actual drawing and committed marks.
6. Classic Battle remains on Sample Battle. Check direct crystal selection after resize and the existing follow-up/recovery route.

Automated screenshots and exact verification outcomes are recorded in `devpost/cinematic-boss-overhaul.md`; human hardware/audio assessment remains separate.
