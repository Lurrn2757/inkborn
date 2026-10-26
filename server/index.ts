import { createServer } from 'node:http';
import { attachArena, readArenaConfig } from './arena/socket.js';
import { resolve } from 'node:path';
import { createApp } from './app.js';
import { readConfig } from './config.js';

const config = readConfig();
const clientDirectory = resolve('dist/client');
const arenaConfig = readArenaConfig();
const server = createServer(createApp(config, clientDirectory, { publicUrl: arenaConfig.publicUrl }));
const arena = attachArena(server, arenaConfig);
server.listen(config.port, config.host, () => {
  console.log(`INKBORN listening at http://${config.host}:${config.port} (curated samples available)`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void arena.close();
    server.close(() => process.exit(0));
    server.closeIdleConnections();
    setTimeout(() => process.exit(1), 5_000).unref();
  });
}
