import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { ackSchema, commandSchema, sessionSchema, snapshotSchema, type ArenaAck, type ArenaCommand, type ArenaSnapshot } from '../../shared/arena/protocol.js';

export type ArenaConnection = 'connecting' | 'connected' | 'reconnecting' | 'unavailable' | 'replaced';
const tokenKey = 'inkborn-arena-guest-v1';
function storedToken() {
  try { const value = sessionStorage.getItem(tokenKey); return value && /^[a-f0-9]{64}$/.test(value) ? value : null; }
  catch { return null; }
}
function saveToken(value: string | null) {
  try { if (value) sessionStorage.setItem(tokenKey, value); else sessionStorage.removeItem(tokenKey); return true; }
  catch { return false; }
}
const rejected = (code: string, message: string): ArenaAck => ({ ok: false, code, message });

/** A transport projection only: no client operation changes a match or a score. */
export function useArenaClient() {
  const socket = useRef<Socket | null>(null);
  const current = useRef<ArenaSnapshot | null>(null);
  const [snapshot, setSnapshot] = useState<ArenaSnapshot | null>(null);
  const [connection, setConnection] = useState<ArenaConnection>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [now, setNow] = useState(Date.now());
  const offset = useRef(0);
  const bestRtt = useRef(Infinity);
  const replaced = useRef(false);

  useEffect(() => {
    let active = true, connectedBefore = false, refreshedExpiredSession = false;
    let target: string | undefined;
    const configured = import.meta.env.VITE_ARENA_SERVER_URL?.trim();
    if (configured) {
      try {
        const url = new URL(configured);
        if (!['https:', 'http:'].includes(url.protocol) || location.protocol === 'https:' && url.protocol !== 'https:') throw new Error();
        target = url.origin;
      } catch { setConnection('unavailable'); setError('The Arena server address is not configured correctly. Single-player modes remain available.'); return; }
    }
    const initialToken = storedToken();
    const transport = io(target, { path: '/arena/socket.io', autoConnect: false, transports: ['websocket', 'polling'], tryAllTransports: true, timeout: 8000, reconnection: true, reconnectionDelay: 700, reconnectionDelayMax: 4000, auth: initialToken ? { token: initialToken } : {} });
    socket.current = transport;
    function accept(value: unknown) {
      const parsed = snapshotSchema.safeParse(value);
      if (!parsed.success) { if (active) setError('Arena received an incompatible server update. Reconnect to synchronize the match.'); return; }
      const next = parsed.data, previous = current.current;
      if (previous?.serverId === next.serverId && previous.selfId === next.selfId && next.sequence < previous.sequence) return;
      current.current = next;
      if (bestRtt.current === Infinity) offset.current = next.serverNow - Date.now();
      if (active) { setSnapshot(next); setNow(Date.now() + offset.current); setConnection('connected'); setError(null); }
    }
    function ping() {
      if (!transport.connected) return;
      const sentAt = Date.now();
      transport.timeout(4000).emit('arena:ping', (failure: Error | null, payload: unknown) => {
        if (failure || !active || typeof payload !== 'object' || payload === null || !('serverNow' in payload) || typeof payload.serverNow !== 'number' || !Number.isFinite(payload.serverNow)) return;
        const receivedAt = Date.now(), rtt = receivedAt - sentAt;
        if (rtt <= bestRtt.current * 1.3) { bestRtt.current = Math.min(bestRtt.current, rtt); offset.current = payload.serverNow - (sentAt + receivedAt) / 2; setNow(receivedAt + offset.current); }
      });
    }
    transport.on('connect', () => { if (!active) return; connectedBefore = true; bestRtt.current = Infinity; setConnection('connecting'); ping(); });
    transport.on('arena:error', (payload: unknown) => {
      if (!active || typeof payload !== 'object' || !payload || !('code' in payload)) return;
      if (payload.code === 'SESSION_REPLACED') {
        replaced.current = true; saveToken(null); transport.auth = {};
        setConnection('replaced'); setError('This guest is now connected in another window. This window has stopped participating. Start a new guest here to play independently.');
      }
    });
    transport.on('arena:session', (payload: unknown) => {
      const parsed = sessionSchema.safeParse(payload);
      if (!parsed.success) { if (active) setError('The Arena session could not be verified. Try reconnecting.'); return; }
      refreshedExpiredSession = false; replaced.current = false;
      transport.auth = { token: parsed.data.token };
      if (!saveToken(parsed.data.token) && active) setNotice('This browser blocked temporary session storage. Keep this tab open; refresh recovery may be unavailable.');
      accept(parsed.data.snapshot); ping();
    });
    transport.on('arena:state', accept);
    transport.on('disconnect', () => { if (active && !replaced.current) setConnection(connectedBefore ? 'reconnecting' : 'unavailable'); });
    transport.on('connect_error', (failure: Error & { data?: { code?: string } }) => {
      if (!active) return;
      if (failure.data?.code === 'SESSION_EXPIRED' && !refreshedExpiredSession) {
        refreshedExpiredSession = true; saveToken(null); current.current = null; setSnapshot(null); transport.auth = {};
        setNotice('Your temporary Arena session expired or the server restarted. Its in-memory match cannot be restored. You are joining as a new guest.');
        setConnection('connecting'); transport.connect(); return;
      }
      setConnection(connectedBefore ? 'reconnecting' : 'unavailable');
      setError(failure.data?.code === 'SERVER_FULL' ? 'The Arena is at capacity. Try again shortly.' : 'The Arena server cannot be reached. No opponent or result has been simulated.');
    });
    transport.connect();
    const clock = setInterval(() => { if (active) setNow(Date.now() + offset.current); }, 100);
    const synchronization = setInterval(ping, 10000);
    const visible = () => { if (!document.hidden) { setNow(Date.now() + offset.current); ping(); } };
    document.addEventListener('visibilitychange', visible);
    return () => { active = false; clearInterval(clock); clearInterval(synchronization); document.removeEventListener('visibilitychange', visible); transport.removeAllListeners(); transport.disconnect(); if (socket.current === transport) socket.current = null; };
  }, []);

  const send = useCallback(async (input: ArenaCommand): Promise<ArenaAck> => {
    const checked = commandSchema.safeParse(input);
    if (!checked.success) return rejected('INVALID', checked.error.issues[0]?.message ?? 'Check the Arena command.');
    const transport = socket.current;
    if (!transport?.connected || !current.current) return rejected('DISCONNECTED', 'Reconnect before sending an Arena action. Your last server-confirmed state is preserved.');
    setPending(value => value + 1);
    return new Promise(resolve => {
      transport.timeout(6000).emit('arena:command', checked.data, (failure: Error | null, value: unknown) => {
        setPending(count => Math.max(0, count - 1));
        if (failure) { resolve(rejected('TIMEOUT', 'Server confirmation did not arrive. Reconnect to check the authoritative state before retrying.')); return; }
        const parsed = ackSchema.safeParse(value);
        resolve(parsed.success ? parsed.data : rejected('INVALID_REPLY', 'The Arena reply could not be verified. Reconnect to synchronize.'));
      });
    });
  }, []);
  const reconnect = useCallback(() => {
    if (replaced.current) return;
    setConnection('connecting'); setError(null);
    const transport = socket.current;
    if (transport) { transport.disconnect(); transport.connect(); }
    else { setConnection('unavailable'); setError('The configured Arena server address is invalid. Single-player modes remain available.'); }
  }, []);
  const newGuest = useCallback(() => {
    const transport = socket.current; if (!transport) return;
    replaced.current = false; saveToken(null); current.current = null; setSnapshot(null); setError(null); setConnection('connecting');
    setNotice('A new independent guest identity is being created in this window.');
    transport.auth = {}; transport.disconnect(); transport.connect();
  }, []);
  return { snapshot, connection, error, notice, pending: pending > 0, now, send, reconnect, newGuest };
}
