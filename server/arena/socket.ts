import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { z } from 'zod';
import { ArenaError, ArenaManager, type ArenaOptions } from './engine.js';

const handshakeSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/).optional() }).strict();
export type ArenaServerConfig = { origins: string[]; publicUrl: string | null };
export function readArenaConfig(env: NodeJS.ProcessEnv = process.env): ArenaServerConfig {
  const raw = env.ARENA_ALLOWED_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) ?? ['http://127.0.0.1:4173', 'http://localhost:4173', 'http://127.0.0.1:5173', 'http://localhost:5173'];
  const origins = raw.map(value => { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value) throw new Error('ARENA_ALLOWED_ORIGINS must contain exact HTTP(S) origins without paths.'); return url.origin; });
  const publicUrl = env.ARENA_PUBLIC_URL?.trim() || null;
  if (publicUrl) { const url = new URL(publicUrl); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('ARENA_PUBLIC_URL must be an HTTP(S) URL without credentials.'); }
  return { origins, publicUrl };
}

/** Socket transport only; ArenaManager owns all gameplay and temporary identities. */
export function attachArena(http: HttpServer, config: ArenaServerConfig, options: ArenaOptions = {}) {
  const allowed = new Set(config.origins);
  const attempts = new Map<string, { start: number; count: number }>();
  const clients = new Map<string, Socket>();
  const io = new Server(http, {
    path: '/arena/socket.io', serveClient: false, maxHttpBufferSize: 192_000, perMessageDeflate: false,
    pingInterval: 10_000, pingTimeout: 10_000,
    cors: { origin: config.origins, methods: ['GET', 'POST'], credentials: false },
    allowRequest: (request, callback) => {
      const origin = request.headers.origin;
      const sameOriginPolling = !origin && request.headers['sec-fetch-site'] === 'same-origin' && config.origins.some(value => new URL(value).host === request.headers.host);
      if (!(origin && allowed.has(origin)) && !sameOriginPolling) { callback('Arena origin is not allowed.', false); return; }
      const ip = request.socket.remoteAddress ?? 'unknown', now = Date.now();
      let entry = attempts.get(ip);
      if (!entry || now - entry.start > 60_000) { entry = { start: now, count: 0 }; attempts.set(ip, entry); }
      entry.count++;
      // Bound hostile origin/IP bookkeeping without trusting forwarded IP headers.
      if (attempts.size > 2048) attempts.delete(attempts.keys().next().value!);
      callback(entry.count <= 40 ? null : 'Arena connection rate limit.', entry.count <= 40);
    },
  });
  const manager = new ArenaManager({ ...options, publicUrl: config.publicUrl, onChange: ids => {
    for (const id of ids) { const client = clients.get(id); if (client?.connected) client.emit('arena:state', manager.snapshot(id)); }
    options.onChange?.(ids);
  } });
  io.use((socket, next) => {
    const parsed = handshakeSchema.safeParse(socket.handshake.auth);
    if (!parsed.success) { const error = new Error('Invalid temporary Arena session.'); Object.assign(error, { data: { code: 'INVALID_SESSION' } }); next(error); return; }
    try {
      const session = manager.connect(parsed.data.token, socket.id);
      socket.data.playerId = session.id; socket.data.token = session.token; socket.data.replaced = session.replacedConnectionId;
      next();
    } catch (cause) { const error = new Error(cause instanceof Error ? cause.message : 'Arena connection unavailable.'); Object.assign(error, { data: { code: cause instanceof ArenaError ? cause.code : 'SERVER_ERROR' } }); next(error); }
  });
  io.on('connection', socket => {
    const id = String(socket.data.playerId), previous = clients.get(id);
    clients.set(id, socket);
    if (previous && previous.id !== socket.id) { previous.emit('arena:error', { code: 'SESSION_REPLACED', message: 'This guest session connected in another window. Start a fresh guest here to play independently.' }); previous.disconnect(true); }
    socket.emit('arena:session', { token: socket.data.token, snapshot: manager.snapshot(id) });
    socket.on('arena:command', (payload: unknown, acknowledgement?: unknown) => {
      if (clients.get(id)?.id !== socket.id) return;
      const result = manager.command(id, payload);
      if (typeof acknowledgement === 'function') acknowledgement(result);
    });
    let pingAt = 0;
    socket.on('arena:ping', (acknowledgement?: unknown) => { const now = manager.now(); if (typeof acknowledgement === 'function' && now - pingAt >= 500) { pingAt = now; acknowledgement({ serverNow: now }); } });
    socket.on('disconnect', () => { if (clients.get(id)?.id === socket.id) clients.delete(id); manager.disconnect(id, socket.id); });
  });
  const ticker = setInterval(() => { manager.tick(); const now = Date.now(); for (const [ip, entry] of attempts) if (now - entry.start > 120_000) attempts.delete(ip); }, 100);
  ticker.unref();
  return { io, manager, close: async () => { clearInterval(ticker); manager.shutdown(); await new Promise<void>(resolve => io.close(() => resolve())); clients.clear(); attempts.clear(); } };
}
