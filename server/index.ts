import { resolve } from 'node:path';
import { createApp } from './app.js';
import { readConfig } from './config.js';

const config = readConfig();
const clientDirectory = resolve('dist/client');
const server = createApp(config, clientDirectory).listen(config.port, config.host, () => {
  console.log(`INKBORN listening at http://${config.host}:${config.port} (curated samples available)`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    server.closeIdleConnections();
    setTimeout(() => process.exit(1), 5_000).unref();
  });
}
