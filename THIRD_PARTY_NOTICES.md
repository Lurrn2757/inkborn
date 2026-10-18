# Third-party notices

INKBORN is MIT application code with separately protected branding and custom creative assets. See `LICENSE` and `ASSETS-LICENSE.md`; this repository is not an entirely MIT-licensed asset bundle.

Dependencies retain their own copyright notices and licenses in the installed package directories. Exact direct and transitive versions are recorded in `package-lock.json`. Core direct packages include React/React DOM, PixiJS, Motion, Zod, idb, Express and the OpenAI JavaScript SDK; development tooling includes TypeScript, Vite, ESLint/typescript-eslint, Vitest, Playwright, tsx and fake-indexeddb. The OpenAI SDK is server-only; installation does not establish a working AI integration.

## Self-hosted fonts

| Font | Official source | Bundled file and license |
| --- | --- | --- |
| Cormorant Garamond, upright variable font | [Google Fonts repository](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond) | `public/fonts/cormorant.ttf`; `public/fonts/cormorantgaramond-OFL.txt` |
| Manrope, upright variable font | [Google Fonts repository](https://github.com/google/fonts/tree/main/ofl/manrope) | `public/fonts/manrope.ttf`; `public/fonts/manrope-OFL.txt` |

Both fonts are distributed under the SIL Open Font License, version 1.1. The complete supplied OFL notices are retained alongside the files. They are independent of INKBORN's protected-asset terms. Font files are self-hosted; gameplay does not require a font CDN.

No remote composition-study images are bundled as game assets. Learner notes and drawings are user content, not automatically relicensed third-party contributions.
