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
  ai: { enabled: false, provider: process.env.AI_PROVIDER ?? '' },
  billing: { enabled: false, provider: process.env.BILLING_PROVIDER ?? '' },
  erp: { enabled: false, baseUrl: process.env.ERP_BASE_URL ?? '' },
} as const;
