export interface ServerConfig {
  host: string;
  port: number;
  model: string;
  apiKeyConfigured: boolean;
}

/** Server-only configuration. Never serialize the environment or API key. */
export function readConfig(environment: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = Number(environment.PORT ?? '4173');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer from 1 to 65535.');
  }
  return {
    host: environment.HOST?.trim() || '127.0.0.1',
    port,
    model: environment.OPENAI_MODEL?.trim() || 'gpt-5.4-mini',
    apiKeyConfigured: Boolean(environment.OPENAI_API_KEY?.trim()),
  };
}
