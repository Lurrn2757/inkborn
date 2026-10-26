# Netlify frontend deployment

Import `Lurrn2757/inkborn` in Netlify and deploy the `main` branch. The repository's
`netlify.toml` sets Node 24, `npm run build:frontend`, and the `dist/client` publish
directory, with a fallback for client navigation. No API key is required.

This deployment runs Exam Siege and Classic Battle in the browser. Arena is hidden
by `VITE_ARENA_ENABLED=false`; Arena invitation query parameters also remain on the
single-player app. The Node server is not deployed to Netlify.

For a manual deploy, build with `VITE_ARENA_ENABLED=false npm run build:frontend`
and deploy `dist/client` using Netlify CLI. Claim an anonymous deployment in your
Netlify account within one hour or Netlify removes it. Connect the GitHub repository
in the Netlify dashboard to enable future automatic deployments.

To enable multiplayer later, deploy the persistent Arena server separately as
described in `arena-deployment.md`, configure `VITE_ARENA_SERVER_URL`, and change
`VITE_ARENA_ENABLED` to `true` before rebuilding.
