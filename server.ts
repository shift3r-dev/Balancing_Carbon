import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import path from 'node:path';

import { createAuthRouter } from './server/routes/authRoutes.js';
import { createComplianceRouter } from './server/routes/complianceRoutes.js';
import { createCarbonAccountingRouter } from './server/routes/carbonAccountingRoutes.js';
import { createEmissionFactorRouter, createEnergyRouter } from './server/routes/energyRoutes.js';
import { createFacilityRouter } from './server/routes/facilityRoutes.js';
import { createIntelligenceRouter } from './server/routes/intelligenceRoutes.js';
import { createOrganisationRouter } from './server/routes/organisationRoutes.js';
import { createProductionRouter } from './server/routes/productionRoutes.js';
import { createReportingRouter } from './server/routes/reportingRoutes.js';
import { createReportingPlatformRouter } from './server/routes/reportingPlatformRoutes.js';
import { createSubscriptionRouter } from './server/routes/subscriptionRoutes.js';
import { createEntitlementRouter } from './server/routes/entitlementRoutes.js';
import { createReferenceDataRouter } from './server/routes/referenceDataRoutes.js';
import { createMetadataRouter } from './server/routes/metadataRoutes.js';
import { createDataPlatformRouter } from './server/routes/dataPlatformRoutes.js';
import { createAiCopilotRouter } from './server/routes/aiCopilotRoutes.js';
import { createEnablementRouter } from './server/routes/enablementRoutes.js';
import { createAnalyticsRouter } from './server/routes/analyticsRoutes.js';
import { createSustainabilityRouter } from './server/routes/sustainabilityRoutes.js';
import { createCollaborationRouter } from './server/routes/collaborationRoutes.js';
import { createPublicPortalRouter } from './server/routes/publicPortalRoutes.js';
import { runtimeConfig } from './server/config/runtime.js';
import { errorHandler } from './server/middleware/errorHandler.js';
import { requestLogger } from './server/middleware/requestLogger.js';

const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: true, credentials: true }));
app.use(requestLogger);
app.use(express.json({ limit: runtimeConfig.requestBodyLimit }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'Balancing Carbon API' }));

app.use('/api/auth', createAuthRouter());
app.use('/api/organisation', createOrganisationRouter());
app.use('/api/facilities', createFacilityRouter());
app.use('/api/energy', createEnergyRouter());
app.use('/api/emission-factors', createEmissionFactorRouter());
app.use('/api/production', createProductionRouter());
app.use('/api', createComplianceRouter());
app.use('/api', createCarbonAccountingRouter());
app.use('/api', createReportingRouter());
app.use('/api', createReportingPlatformRouter());
app.use('/api', createIntelligenceRouter());
app.use('/api', createSubscriptionRouter());
app.use('/api', createEntitlementRouter());
app.use('/api', createReferenceDataRouter());
app.use('/api', createMetadataRouter());
app.use('/api', createDataPlatformRouter());
app.use('/api', createAiCopilotRouter());
app.use('/api', createEnablementRouter());
app.use('/api', createAnalyticsRouter());
app.use('/api', createSustainabilityRouter());
app.use('/api', createCollaborationRouter());
app.use('/api', createPublicPortalRouter());

app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.', path: req.originalUrl }));

async function configureFrontend() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
    return;
  }

  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}

async function startLocalServer() {
  await configureFrontend();
  app.use(errorHandler);
  app.listen(runtimeConfig.port, () => console.log('Balancing Carbon API running.'));
}

if (!process.env.VERCEL) {
  startLocalServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export default app;
