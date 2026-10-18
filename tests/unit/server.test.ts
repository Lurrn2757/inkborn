import { afterEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createApp } from '../../server/app.js';
import { readConfig } from '../../server/config.js';

const servers: Server[] = [];
const directories: string[] = [];
async function serve(clientDirectory?: string) {
  const server = createApp(readConfig({}), clientDirectory).listen(0, '127.0.0.1');
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected a local TCP address.');
  return `http://127.0.0.1:${address.port}`;
}
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    if (!server.listening) { resolve(); return; }
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  })));
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('local server boundaries', () => {
  it('starts without provider configuration and returns metadata without secrets', async () => {
    expect(readConfig({})).toMatchObject({ host: '127.0.0.1', port: 4173, apiKeyConfigured: false });
    expect(readConfig({ OPENAI_API_KEY: 'test-marker' }).apiKeyConfigured).toBe(true);
    expect(() => readConfig({ PORT: 'invalid' })).toThrow('PORT');
    const base = await serve();
    const response = await fetch(`${base}/api/status`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ aiConfigured: false, provider: 'openai', model: 'gpt-5.4-mini', maxNotesLength: 12000, preparationAvailable: false });
    const unavailable = await fetch(`${base}/api/lessons`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    expect(unavailable.status).toBe(503);
    expect((await unavailable.json()).error.code).toBe('PREPARATION_UNAVAILABLE');
  });

  it('keeps API errors and missing assets out of the HTML navigation fallback', async () => {
    const directory = await mkdtemp(path.resolve('.cache/server-test-'));
    directories.push(directory);
    await writeFile(path.join(directory, 'index.html'), '<!doctype html><title>Local client</title>');
    const base = await serve(directory);
    const navigation = await fetch(`${base}/battle`, { headers: { accept: 'text/html' } });
    expect(navigation.status).toBe(200);
    expect(await navigation.text()).toContain('Local client');
    for (const pathname of ['/api/missing', '/assets/missing.js', '/fonts/missing']) {
      const missing = await fetch(`${base}${pathname}`, { headers: { accept: 'text/html' } });
      expect(missing.status).toBe(404);
      expect(missing.headers.get('content-type')).toContain('application/json');
    }
    const malformed = await fetch(`${base}/api/lessons`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error.code).toBe('INVALID_JSON');
    const tooLarge = await fetch(`${base}/api/lessons`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'x'.repeat(128 * 1024) }) });
    expect(tooLarge.status).toBe(413);
  });
});
