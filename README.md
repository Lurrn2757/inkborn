# INKBORN

INKBORN is a local drawing-and-learning game under active development. The first build slice connects a hand-drawn creature to a curated sample battle with finite initial and follow-up encounters. Personal-note AI preparation is not implemented in this slice: `/api/lessons` responds with an explicit unavailable error. Samples do not need a provider account or API key.

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

Open http://127.0.0.1:4173. Vite builds `dist/client`; TypeScript compiles the Node server and shared code into `dist/server`. The entry `dist/server/server/index.js` serves client assets and `/api` from one origin. Missing asset paths and unknown API routes return 404; API errors are JSON. This is a local app, with no hosted deployment configured.

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

Playwright downloads Chromium into `.cache/playwright` and manages the production build/server for browser tests. Browser system libraries must already be available; the install command does not modify the host. Test reports are ignored in `test-results/` and `playwright-report/`. Current verification evidence is recorded in `devpost/checklist.md`; commands in this document are not a claim that every later feature or check is complete.

Locked versions for this build: React/React DOM 19.3.1, TypeScript 6.0.3, Vite 8.3.4, React plugin 6.1.2, PixiJS 8.22.0, Motion 14.3.0, Zod 4.6.7, idb 8.0.4, Express 5.3.0, OpenAI SDK 7.38.0, ESLint 10.13.0, typescript-eslint 8.71.2, Vitest 5.0.5, Playwright 1.64.1, tsx 4.23.15 and fake-indexeddb 6.2.6. `package-lock.json` also pins type packages and transitive dependencies. npm 12 reported the esbuild postinstall as blocked by its default script policy; its platform binary is installed through the optional dependency, and the development runtime works without approving that script.

This environment downloaded Playwright's Ubuntu 24.04 fallback builds because its OS is not officially supported. Chromium 156.0.8078.4 and Firefox 157.0 both passed a headless launch/page check without host package changes. The standard browser-test project uses Chromium. To install Firefox for an additional check, run `PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/playwright" TMPDIR="$PWD/.cache/tmp" npm exec -- playwright install firefox` after creating `.cache/tmp`.

The slice-1 tooling check passed lint, strict browser/shared/server typechecking, the production build, and two HTTP contract tests. Development startup/proxy and clean shutdown passed on 5173/3001; production `npm start` passed no-key startup, client JavaScript/font delivery, JSON API/missing-asset errors and clean shutdown on 4173. These checks establish local tooling/server behavior; complete gameplay, visual acceptance and later-slice capabilities have separate evidence in the checklist. Vite currently warns that the main minified chunk is slightly above 500 kB; it is a successful build, with further bundle tuning reserved for later polish.

React owns readable controls; Canvas 2D records and exports drawing pixels; the rendering adapter animates that creature; shared validated lessons and a deterministic battle reducer determine answers and outcomes. Express owns server-only configuration. Personal-note generation, complete persistence and the polished cinematic experience are later build slices. Real-provider behavior, audio hardware and final visual acceptance require their own verification.

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

A filesystem-only bare-remote push and ordinary clean-clone round trip was verified for the planning checkpoint. This proves local repository/transport behavior; external GitHub authentication or publication has not been attempted. Cache, private profile, credentials, dependency/build output and alternate metadata are excluded by `.gitignore`.

## Licensing

Application/engine/tooling code and technical documentation are MIT licensed, with the explicit exclusions in [LICENSE](LICENSE). The INKBORN name/branding and original assets in `src/creative/` and `public/art/` are separately protected under [ASSETS-LICENSE.md](ASSETS-LICENSE.md), which permits bundled local installation, inspection, development, testing and demonstration. It grants no standalone reuse, rebranding or unrestricted redistribution of those assets. Generic rendering/drawing/audio machinery remains MIT code. User notes and drawings retain their owners' rights. Third-party packages and OFL fonts retain their own notices; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
