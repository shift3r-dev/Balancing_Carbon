let application: Promise<any> | null = null;

function loadApplication() {
  application ??= import('../server.js').then((module) => module.default);
  return application;
}

export default async function handler(req: any, res: any) {
  try {
    const app = await loadApplication();
    return app(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server initialization error.';
    console.error(JSON.stringify({ level: 'error', event: 'api_bootstrap_failed', message, stack: error instanceof Error ? error.stack : undefined }));
    application = null;
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({
      error: 'The API failed to initialize.',
      code: 'api_bootstrap_failed',
      configuration: {
        supabaseUrl: Boolean(process.env.SUPABASE_URL),
        supabaseAnonKey: Boolean(process.env.SUPABASE_ANON_KEY),
        supabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      },
      guidance: 'Check the Vercel function log for event api_bootstrap_failed. No secret values are included in this response.',
    }));
  }
}
