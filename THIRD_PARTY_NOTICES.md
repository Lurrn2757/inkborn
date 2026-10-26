# Third-party notices

INKBORN is MIT application code with separately protected branding and custom creative assets. See `LICENSE` and `ASSETS-LICENSE.md`; this repository is not an entirely MIT-licensed asset bundle.

Dependencies retain their own copyright notices and licenses in the installed package directories. Exact direct and transitive versions are recorded in `package-lock.json`. Core direct packages include React/React DOM, PixiJS, Motion, Zod, idb, Express and the OpenAI JavaScript SDK; development tooling includes TypeScript, Vite, ESLint/typescript-eslint, Vitest, Playwright, tsx and fake-indexeddb. The OpenAI SDK is server-only; installation does not establish a working AI integration.

## Three.js

The optional 3D chamber adapter uses Three.js 0.186.1 (MIT); its development types are `@types/three` 0.186.0. The upstream MIT license and copyright notice are retained in `node_modules/three/LICENSE`. This dependency loads for Exam Siege and the explicitly selected Classic experiment; Classic standard visuals retain Pixi/Canvas. [Three.js source and license](https://github.com/mrdoob/three.js).

## Self-hosted fonts

| Font | Official source | Bundled file and license |
| --- | --- | --- |
| Cormorant Garamond, upright variable font | [Google Fonts repository](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond) | `public/fonts/cormorant.ttf`; `public/fonts/cormorantgaramond-OFL.txt` |
| Manrope, upright variable font | [Google Fonts repository](https://github.com/google/fonts/tree/main/ofl/manrope) | `public/fonts/manrope.ttf`; `public/fonts/manrope-OFL.txt` |

Both fonts are distributed under the SIL Open Font License, version 1.1. The complete supplied OFL notices are retained alongside the files. They are independent of INKBORN's protected-asset terms. Font files are self-hosted; gameplay does not require a font CDN.

No remote composition-study images are bundled as game assets. Learner notes and drawings are user content, not automatically relicensed third-party contributions.

## Audio provenance

INKBORN's short sound cues are synthesized locally with Web Audio oscillators and generated noise; no third-party sound recordings, commercial music, sampled instruments or audio library are bundled. The original authored cue compositions/presets in `src/creative/audio.ts` are protected creative assets under `ASSETS-LICENSE.md`. The generic voice scheduling, envelopes, gain/visibility controls and resource management in `src/audio/` are MIT application machinery. Playback remains optional and every encounter cue has a visual/text counterpart; browser launch checks do not establish audible hardware quality.

## Examination extraction

PDF.js (`pdfjs-dist` 6.4.299) is Apache-2.0; Tesseract.js 7.0.0 and tesseract.js-core are Apache-2.0. Their notices remain in the installed package directories. Bundled workers retain upstream notices. Image OCR fetches public Tesseract runtime/WASM and English recognition data on first use; paper bytes remain in the local worker. No third-party examination papers are bundled. Samples are original arithmetic exercises with worked derivations. See the [PDF.js source](https://github.com/mozilla/pdf.js) and [Tesseract.js source](https://github.com/naptha/tesseract.js).
