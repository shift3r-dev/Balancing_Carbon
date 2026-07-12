const integer = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const runtimeConfig = {
  environment: process.env.NODE_ENV ?? 'development',
  port: integer(process.env.PORT, 3000),
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT ?? '10mb',
  logging: { level: process.env.LOG_LEVEL ?? 'info' },
  storage: { bucket: process.env.SUPABASE_STORAGE_BUCKET ?? '' },
  email: { from: process.env.EMAIL_FROM ?? '' },
  ai: {
    enabled: process.env.AI_ENABLED === 'true', provider: process.env.AI_PROVIDER ?? '',
    baseUrl: (process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434').replace(/\/$/, ''),
    model: process.env.OLLAMA_MODEL ?? 'qwen3:8b', contextLength: integer(process.env.OLLAMA_CONTEXT_LENGTH, 8192),
    timeoutMs: integer(process.env.AI_TIMEOUT_MS, 120000), allowExternal: process.env.AI_ALLOW_EXTERNAL === 'true',
  },
  billing: { enabled: false, provider: process.env.BILLING_PROVIDER ?? '' },
  erp: { enabled: false, baseUrl: process.env.ERP_BASE_URL ?? '' },
} as const;
