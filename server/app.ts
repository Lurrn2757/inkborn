import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { ServerConfig } from './config.js';

export function createApp(config: ServerConfig, clientDirectory?: string, arena?: { publicUrl: string | null }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '128kb' }));
  app.get('/api/status', (_request, response) => {
    response.json({
      aiConfigured: config.apiKeyConfigured,
      provider: 'openai',
      model: config.model,
      maxNotesLength: 12000,
      preparationAvailable: false,
    });
  });
  app.get('/api/arena/status', (_request, response) => { response.json({ enabled: Boolean(arena), protocol: 1, publicUrl: arena?.publicUrl ?? null, persistence: 'bounded-memory', internetDeploymentVerified: false }); });
  app.post('/api/lessons', (_request, response) => {
    response.status(503).json({ error: { code: 'PREPARATION_UNAVAILABLE', message: 'Personal-note preparation is not available yet. Choose a curated sample to play.' } });
  });
  app.use('/api', (_request, response) => {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'API route not found.' } });
  });
  if (clientDirectory) {
    app.use(express.static(clientDirectory, { index: false }));
    // Client navigation may fall back to HTML; missing file-like asset paths may not.
    app.get('/{*path}', (request, response, next) => {
      if (path.extname(request.path) || /^\/(?:assets|fonts|art)(?:\/|$)/.test(request.path) || !request.accepts('html')) return next();
      const indexPath = path.join(clientDirectory, 'index.html');
      if (!existsSync(indexPath)) return next();
      response.sendFile('index.html', { root: clientDirectory });
    });
  }
  app.use((_request, response) => {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found.' } });
  });
  const handleError: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
    const status = typeof error === 'object' && error !== null && 'status' in error && error.status === 413 ? 413 :
      error instanceof SyntaxError ? 400 : 500;
    response.status(status).json({ error: {
      code: status === 413 ? 'REQUEST_TOO_LARGE' : status === 400 ? 'INVALID_JSON' : 'SERVER_ERROR',
      message: status === 413 ? 'Request body is too large.' : status === 400 ? 'Request body must contain valid JSON.' : 'The request could not be completed.',
    } });
  };
  app.use(handleError);
  return app;
}
