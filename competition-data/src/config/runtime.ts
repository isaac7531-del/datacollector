export interface RuntimeConfig {
  host: string;
  port: number;
  nodeEnv: string;
  databaseUrl?: string;
  apiKey?: string;
  bodyLimitBytes: number;
  fileLimitBytes: number;
  urlTimeoutMs: number;
  redirectLimit: number;
  userAgent: string;
  automaticMatchThreshold: number;
  reviewMatchThreshold: number;
  retryMaxAttempts: number;
  retryInitialDelayMs: number;
  retryMaxDelayMs: number;
  cacheTtlMs: number;
  rawPayloadRetentionDays: number;
  logRedactionKeys: string[];
}

export function loadRuntimeConfig(env: Record<string, string | undefined> = process.env): RuntimeConfig {
  return {
    host: env.HOST ?? "0.0.0.0",
    port: numberEnv(env.PORT, 3000),
    nodeEnv: env.NODE_ENV ?? "development",
    databaseUrl: env.DATABASE_URL,
    apiKey: env.COMPETITION_DATA_ENGINE_API_KEY,
    bodyLimitBytes: numberEnv(env.COMPETITION_DATA_BODY_LIMIT_BYTES, 1_048_576),
    fileLimitBytes: numberEnv(env.COMPETITION_DATA_FILE_LIMIT_BYTES, 5_242_880),
    urlTimeoutMs: numberEnv(env.COMPETITION_DATA_PUBLIC_URL_TIMEOUT_MS, 30_000),
    redirectLimit: numberEnv(env.COMPETITION_DATA_PUBLIC_URL_REDIRECT_LIMIT, 3),
    userAgent: env.COMPETITION_DATA_PUBLIC_URL_USER_AGENT ?? "EquiBetsCompetitionDataEngine/0.1.0",
    automaticMatchThreshold: numberEnv(env.COMPETITION_DATA_AUTOMATIC_MATCH_THRESHOLD, 0.82),
    reviewMatchThreshold: numberEnv(env.COMPETITION_DATA_REVIEW_MATCH_THRESHOLD, 0.58),
    retryMaxAttempts: numberEnv(env.COMPETITION_DATA_RETRY_MAX_ATTEMPTS, 3),
    retryInitialDelayMs: numberEnv(env.COMPETITION_DATA_RETRY_INITIAL_DELAY_MS, 500),
    retryMaxDelayMs: numberEnv(env.COMPETITION_DATA_RETRY_MAX_DELAY_MS, 10_000),
    cacheTtlMs: numberEnv(env.COMPETITION_DATA_CACHE_TTL_MS, 60_000),
    rawPayloadRetentionDays: numberEnv(env.COMPETITION_DATA_RAW_PAYLOAD_RETENTION_DAYS, 90),
    logRedactionKeys: (env.COMPETITION_DATA_LOG_REDACTION_KEYS ?? "authorization,cookie,set-cookie,password,token,apiKey")
      .split(",")
      .map((key) => key.trim())
      .filter(Boolean)
  };
}

function numberEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
