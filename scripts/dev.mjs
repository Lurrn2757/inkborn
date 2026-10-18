import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const root = fileURLToPath(new URL('../', import.meta.url));
const node = process.execPath;
const temporaryDirectory = fileURLToPath(new URL('../.cache/tmp/', import.meta.url));
mkdirSync(temporaryDirectory, { recursive: true });
const environment = { ...process.env, TMPDIR: temporaryDirectory, TMP: temporaryDirectory, TEMP: temporaryDirectory };
let stopping = false;
const children = [
  spawn(node, ['--env-file-if-exists=.env', '--import', 'tsx', '--watch', 'server/index.ts'], {
    cwd: root, stdio: 'inherit', detached: process.platform !== 'win32', env: { ...environment, PORT: '3001', HOST: '127.0.0.1' },
  }),
  spawn(node, ['node_modules/vite/bin/vite.js'], { cwd: root, stdio: 'inherit', detached: process.platform !== 'win32', env: environment }),
];

function signalChild(child, signal) {
  try {
    if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
}

function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) signalChild(child, 'SIGTERM');
  const deadline = setTimeout(() => {
    for (const child of children) signalChild(child, 'SIGKILL');
  }, 5_000);
  deadline.unref();
}
for (const child of children) {
  child.on('error', () => stop(1));
  child.on('exit', (code) => { if (!stopping) stop(code || 1); });
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
