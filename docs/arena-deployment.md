# INKBORN Arena deployment and operating contract

Internet deployment is **unverified**. No public URL, hosting account, cloud resource or paid deployment was created. Local tests use real Socket.IO connections and independent guest identities; they do not prove reachability across two external networks.

## One origin, one process

Run `npm ci`, `npm run build`, then `HOST=0.0.0.0 PORT=8080 npm start`. The same Node process serves the application and Socket.IO at `/arena/socket.io`. Behind a TLS reverse proxy, set `ARENA_ALLOWED_ORIGINS` to the exact frontend origin (or comma-separated exact origins), and `ARENA_PUBLIC_URL` to the public application URL. The latter enables room invitation links; bearer tokens are never included. Without it, share the six-character room code manually.

A container build is provided in `Dockerfile`, and `deploy/nginx-arena.conf` illustrates WebSocket upgrade forwarding. These files have not been deployed or container-built in this workspace. Supply your own domain, TLS certificate and hosting authorization. The process must remain awake for live matches. Health endpoint: `/api/arena/status`. Use **one replica**: state is bounded in memory, not a shared database. Scaling to multiple processes needs an authoritative shared store and coordinated ordering; merely adding a Socket.IO adapter is insufficient.

For a separately hosted frontend, set `VITE_ARENA_SERVER_URL` to the backend HTTPS origin **at build time** and add the frontend origin to the backend allowlist. HTTPS pages refuse an insecure HTTP backend. Local development proxies `/arena/socket.io` (including WebSocket upgrades) through Vite to port 3001. Both WebSocket and HTTP polling are supported; origin validation covers both, rather than relying on CORS alone. Defaults permit only localhost ports 4173 and 5173. No provider API key is required.

## Identity and recovery

The server issues 256-bit temporary bearer tokens. The browser keeps its own token in sessionStorage, separate from other independent browser sessions. A matching token restores the same guest after refresh. Room codes are unpredictable invitations, not identity credentials. Connecting the same bearer in another window replaces the old connection; the old window can start a new guest explicitly.

A disconnected live match pauses for a common 20-second recovery window. No answers are accepted while paused. Reconnection sends a full authoritative snapshot; an open question resumes through a fresh countdown with its remaining time and existing answer locks. Expiry awards a **forfeit**, without manufacturing round points, to the sole connected guest. If neither returns, the match is abandoned with no winner. Explicitly leaving live play forfeits immediately. An interrupted open question is retained in history without awarding a point.

A restart loses in-memory matches and guest tokens. An expired token is rejected; the client discloses the lost session and joins as a fresh guest. It never invents a resumed opponent or result. Browser inactivity never creates answers. Deadlines use a server clock; returning tabs resynchronize their display.

## Bounded rules and resources

Standard: target five points, nine normal rounds. Quick Duel: target three, five normal rounds. At the normal cap, a non-tied score leader wins even if scoreless rounds prevented reaching the target. A tie enters at most five sudden-death rounds; the first correct answer wins. Five scoreless extras produce an honest draw. These exceptions to the target are displayed before entering a queue or room.

Each guest gets one answer per round. The server's first valid correct receipt wins atomically; no client timestamp is accepted. Network latency can affect ordering. This is an unsupervised casual quiz, not measured tournament-grade latency compensation or proctoring. Publicly known facts and a source-visible bank cannot prevent external research. The private server bank is excluded from the browser build, and keys/explanations are sent only after a round closes.

Defaults: 256 guests, 64 rooms, 2,048 audit records, 90-second matchmaking timeout, 15-minute idle-room expiry, 10-minute completed-room expiry and 30-minute disconnected idle-guest expiry. Empty lobbies and departed profile/image references are released. Incoming Socket.IO packets are capped at 192,000 bytes. Drawings are PNG-only, at most 100 KB decoded file size and 384 × 384 header dimensions; the normal editor sends at most 320 × 320. Commands are strict Zod unions; arbitrary scores, timestamps and player control fields are rejected. Guests have 35 actions per 10 seconds and eight room-code attempts per minute. Connection attempts are limited to 40 per minute per observed peer IP, without trusting spoofable forwarding headers; a reverse proxy shares that observed peer limit, so adjust only with a trusted-proxy design if operating at larger scale.

Only nicknames, monster PNGs and round answers are retained temporarily. Personal notes, examination papers, answer keys and provider credentials are never sent to Arena. No accounts, chat messages, analytics database or paid service is required. Single-player modes remain local when Arena is unreachable.

## Internet verification still required

1. Deploy one instance under HTTPS with the configured origin allowlist and WebSocket proxy.
2. Open the public URL on two real devices on different networks, not two local tabs.
3. Test private invitation, Quick Match, shared questions, a complete match and mutual rematch.
4. Disconnect and reconnect one device within 20 seconds; then test a real forfeit.
5. Measure receipt ordering and latency before making stronger fairness/performance claims.

Until those steps actually pass, describe this as locally verified networked multiplayer with deployment configuration, not a publicly verified internet service.
