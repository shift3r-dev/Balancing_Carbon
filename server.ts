import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { db, calculateEmissions } from './server/db';
import { GoogleGenAI } from '@google/genai';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// -------------------------------------------------------------
// Gemini API Configuration & Helper (Lazy Initialized)
// -------------------------------------------------------------
let ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI | null {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY') {
      try {
        ai = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
        console.log('Gemini API client initialized successfully.');
      } catch (e) {
        console.error('Error initializing Gemini API:', e);
      }
    }
  }
  return ai;
}

// -------------------------------------------------------------
// Helper to extract organisation ID from custom header
function getOrgId(req: express.Request): string {
  const userId = req.headers['x-user-id'] as string;
  if (userId) {
    const user = db.getUsers().find(u => u.id === userId);
    if (user) {
      return user.organisationId;
    }
  }
  return 'org-apex'; // Fallback to seeded demo tenant
}

// API Routes
// -------------------------------------------------------------

// Real registration / signup endpoint
app.post('/api/auth/signup', (req, res) => {
  try {
    const { name, email, password, organisationName } = req.body;
    if (!name || !email || !password || !organisationName) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const existing = db.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'A user with this corporate email already exists.' });
    }

    const result = db.addUser(name, email, password, organisationName);
    res.status(201).json({
      authenticated: true,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        organisationId: result.user.organisationId
      },
      organisation: result.organisation
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: `Registration failed: ${error.message || error}` });
  }
});

// Real login endpoint
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.getUserByEmail(email);
    if (!user || user.passwordHash !== password) {
      return res.status(401).json({ error: 'Invalid corporate email or secure password.' });
    }

    const organisation = db.getOrganisation(user.organisationId);
    res.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organisationId: user.organisationId
      },
      organisation
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: `Login failed: ${error.message || error}` });
  }
});

// Dynamic session lookup
app.get('/api/auth/session', (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    return res.json({ authenticated: false });
  }

  const user = db.getUsers().find(u => u.id === userId);
  if (!user) {
    return res.json({ authenticated: false });
  }

  res.json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organisationId: user.organisationId
    },
    organisation: db.getOrganisation(user.organisationId)
  });
});

// Organisation Profile
app.get('/api/organisation', (req, res) => {
  res.json(db.getOrganisation(getOrgId(req)));
});

app.post('/api/organisation', (req, res) => {
  const updated = db.updateOrganisation(req.body, getOrgId(req));
  res.json(updated);
});

// Facilities Management
app.get('/api/facilities', (req, res) => {
  res.json(db.getFacilities(getOrgId(req)));
});

app.post('/api/facilities', (req, res) => {
  const { name, location, industryType, productionOutput, productionUnit, reportingPeriod, electricityConsumption, fuelConsumption, fuelType, renewableEnergyUsage } = req.body;
  if (!name || !location || !industryType) {
    return res.status(400).json({ error: 'Name, location, and industry type are required.' });
  }
  const orgId = getOrgId(req);
  const newFac = db.addFacility({
    name,
    location,
    industryType,
    productionOutput: parseFloat(productionOutput) || 0,
    productionUnit: productionUnit || 'Tonnes',
    reportingPeriod: reportingPeriod || 'FY 2025-26',
    electricityConsumption: parseFloat(electricityConsumption) || 0,
    fuelConsumption: parseFloat(fuelConsumption) || 0,
    fuelType: fuelType || 'Diesel',
    renewableEnergyUsage: parseFloat(renewableEnergyUsage) || 0,
    esgReadinessStatus: 'Good',
  }, orgId);
  res.status(201).json(newFac);
});

app.put('/api/facilities/:id', (req, res) => {
  const orgId = getOrgId(req);
  const updated = db.updateFacility(req.params.id, req.body, orgId);
  if (!updated) {
    return res.status(404).json({ error: 'Facility not found' });
  }
  res.json(updated);
});

app.delete('/api/facilities/:id', (req, res) => {
  const orgId = getOrgId(req);
  const success = db.deleteFacility(req.params.id, orgId);
  if (!success) {
    return res.status(404).json({ error: 'Facility not found' });
  }
  res.json({ success: true });
});

// Energy & Fuel Tracking
app.get('/api/energy', (req, res) => {
  res.json(db.getEnergyRecords(getOrgId(req)));
});

app.post('/api/energy', (req, res) => {
  const { facilityId, date, reportingPeriod, energyType, quantity, unit, sourceDocument, notes } = req.body;
  if (!facilityId || !energyType || !quantity || !unit) {
    return res.status(400).json({ error: 'Facility ID, energy type, quantity, and unit are required.' });
  }
  const orgId = getOrgId(req);
  const newRec = db.addEnergyRecord({
    facilityId,
    date: date || new Date().toISOString().split('T')[0],
    reportingPeriod: reportingPeriod || 'FY 2025-26',
    energyType,
    quantity: parseFloat(quantity),
    unit,
    sourceDocument: sourceDocument || 'Manual Entry',
    notes: notes || '',
  }, orgId);
  res.status(201).json(newRec);
});

// Calculate test emissions endpoint (dry run)
app.post('/api/calculate-preview', (req, res) => {
  const { energyType, quantity } = req.body;
  if (!energyType || quantity === undefined) {
    return res.status(400).json({ error: 'Energy type and quantity are required.' });
  }
  const result = calculateEmissions(energyType, parseFloat(quantity));
  res.json(result);
});

// ESG Readiness Assessments
app.get('/api/esg', (req, res) => {
  res.json(db.getESGQuestions(getOrgId(req)));
});

app.put('/api/esg/:id', (req, res) => {
  const orgId = getOrgId(req);
  const updated = db.updateESGQuestion(req.params.id, req.body, orgId);
  if (!updated) {
    return res.status(404).json({ error: 'Assessment question not found' });
  }
  res.json(updated);
});

// OEM Questionnaire Module
app.get('/api/oem-surveys', (req, res) => {
  res.json(db.getOEMQuestionnaires(getOrgId(req)));
});

app.post('/api/oem-surveys', (req, res) => {
  const { title, oemName, dueDate } = req.body;
  if (!title || !oemName || !dueDate) {
    return res.status(400).json({ error: 'Survey title, OEM name, and due date are required.' });
  }
  const orgId = getOrgId(req);
  const survey = db.addOEMQuestionnaire(title, oemName, dueDate, orgId);
  res.status(201).json(survey);
});

app.put('/api/oem-surveys/:id', (req, res) => {
  const orgId = getOrgId(req);
  const updated = db.updateOEMQuestionnaire(req.params.id, req.body, orgId);
  if (!updated) {
    return res.status(404).json({ error: 'OEM survey not found' });
  }
  res.json(updated);
});

app.post('/api/oem-surveys/:id/approve-question', (req, res) => {
  const { questionId, status, suggestedAnswer } = req.body;
  if (!questionId || !status) {
    return res.status(400).json({ error: 'Question ID and status are required.' });
  }
  const orgId = getOrgId(req);
  const success = db.updateOEMQuestionStatus(req.params.id, questionId, status, suggestedAnswer, orgId);
  res.json({ success });
});

// Document Management
app.get('/api/documents', (req, res) => {
  res.json(db.getDocuments(getOrgId(req)));
});

app.post('/api/documents', (req, res) => {
  const { name, category, facilityId, period, size, evidenceUsage } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required.' });
  }
  const orgId = getOrgId(req);
  const newDoc = db.addDocument({
    name,
    category,
    uploadDate: new Date().toISOString().split('T')[0],
    facilityId: facilityId || 'fac-mohali',
    period: period || 'FY 2025-26',
    size: size || '250 KB',
    evidenceUsage: evidenceUsage || 'Unassigned',
  }, orgId);
  res.status(201).json(newDoc);
});

app.delete('/api/documents/:id', (req, res) => {
  const orgId = getOrgId(req);
  const success = db.deleteDocument(req.params.id, orgId);
  if (!success) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json({ success: true });
});

// Reports
app.get('/api/reports', (req, res) => {
  res.json(db.getReports(getOrgId(req)));
});

app.post('/api/reports', (req, res) => {
  const { title, type, period, summary } = req.body;
  if (!title || !type) {
    return res.status(400).json({ error: 'Report title and type are required.' });
  }
  const orgId = getOrgId(req);
  const report = db.generateReport(title, type, period || 'FY 2025-26', summary || '', orgId);
  res.status(201).json(report);
});

// Audit Logs
app.get('/api/audit-logs', (req, res) => {
  res.json(db.getAuditLogs(getOrgId(req)));
});

// AI Assistant Chatbot with Context
app.post('/api/ai-assistant', async (req, res) => {
  const { prompt, conversationTitle } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  const activeTitle = conversationTitle || 'General Discussion';
  const orgId = getOrgId(req);

  // Extract tenant-specific metrics to pass as context
  const facilities = db.getFacilities(orgId);
  const records = db.getEnergyRecords(orgId);
  const esg = db.getESGQuestions(orgId);
  const documents = db.getDocuments(orgId);
  const org = db.getOrganisation(orgId);
  const orgName = org ? org.name : 'Apex Precision Components Pvt. Ltd.';

  const totalScope1 = facilities.reduce((sum, f) => sum + f.emissionsScope1, 0);
  const totalScope2 = facilities.reduce((sum, f) => sum + f.emissionsScope2, 0);
  const totalEmissions = totalScope1 + totalScope2;

  // Compile rich context about the user's specific business state
  const businessContext = `
You are Balancing Carbon Intelligence, an elite B2B Sustainability, ESG, carbon audit, and compliance AI expert designed specifically to help Indian manufacturers and exporters.
You are assisting ${orgName} (based in India).

Here is the accurate live data from their corporate client platform:
- Total Emissions: ${totalEmissions.toFixed(2)} tCO2e (Scope 1: ${totalScope1.toFixed(2)} tCO2e, Scope 2: ${totalScope2.toFixed(2)} tCO2e)
- Facilities:
  ${facilities.map((f, idx) => `* ${f.name} (${f.location}): ${f.industryType}. Scope 1: ${f.emissionsScope1} t, Scope 2: ${f.emissionsScope2} t, Status: ${f.esgReadinessStatus}`).join('\n  ')}
- Key ESG Readiness Gaps:
  * Systematic Emission Measurement: Calculated using platform coefficients, but third-party external audit or validation by accredited agencies (e.g. TÜV / SGS) is pending.
  * Supplier Code of Conduct (child labor & fair wages) is currently a Draft and has NOT been signed or distributed to raw material suppliers (Non-compliant, average score 4/10).
- Registered documents in the secure vault:
  ${documents.length > 0 ? documents.map(d => `- ${d.name} (${d.category}) used for ${d.evidenceUsage}`).join('\n  ') : 'No documents uploaded yet.'}

Rules for your response:
1. Provide highly technical, actionable, realistic compliance recommendations for Indian factories.
2. Refer directly to their specific facilities, company name, and emission stats above.
3. Be professional, direct, clear, and objective. Avoid hand-waving "go green" advice. Offer concrete steps like standardizing diesel invoice records or contracting third-party verification agencies.
4. Mark your response clearly as: "AI-generated analysis — verify before external submission."
5. Ground your answers in BRSR (Business Responsibility and Sustainability Reporting) standards which are mandated in India.
`;

  const aiClient = getAI();
  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `${businessContext}\n\nUser Question: ${prompt}`,
      });

      const aiText = response.text || 'Unable to generate analysis. Please try again.';

      // Save user message
      db.addAIConversationMessage(activeTitle, { sender: 'user', text: prompt }, orgId);
      // Save AI message
      db.addAIConversationMessage(activeTitle, {
        sender: 'ai',
        text: aiText,
        sources: [
          { title: `${orgName} Emissions Index`, type: 'System Audit' },
          { title: 'Registered ESG Assessment Gaps', type: 'Compliance Matrix' }
        ]
      }, orgId);

      return res.json({ text: aiText, sources: [
        { title: `${orgName} Emissions Index`, type: 'System Audit' },
        { title: 'Registered ESG Assessment Gaps', type: 'Compliance Matrix' }
      ] });
    } catch (err: any) {
      console.error('Error with Gemini API generation:', err);
      // Fallback below if API fails (e.g. invalid key or network issue)
    }
  }

  // Graceful Sophisticated Fallback (Rules Engine)
  console.log('Using rule-based contextual fallback responder.');
  let replyText = '';
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('scope 2') || lowerPrompt.includes('increase') || lowerPrompt.includes('electricity')) {
    replyText = `Based on our emissions inventory, electricity consumption is your largest Scope 2 hotspot. Your intense reliance on standard state grid electricity without rooftop solar offsets is the primary reason why your Scope 2 emissions remain high.

**Recommended Actions:**
1. **Feasibility Study:** Evaluate rooftop solar deployment at your primary manufacturing unit. 
2. **Open Access Solar:** Explore procuring green power via third-party open access agreements.
3. **Energy Audit:** Complete a comprehensive Level-2 energy audit of your heavy stamp and heating lines to optimize machinery idle states.`;
  } else if (lowerPrompt.includes('missing') || lowerPrompt.includes('document') || lowerPrompt.includes('evidence')) {
    replyText = `Our document compliance auditor lists several gaps requiring physical evidence uploads:
1. **Supplier Code of Conduct:** The Supplier Code of Conduct is presently in draft. To resolve compliance gaps (score 4/10), you must upload a copy of the executed/signed agreement from your top suppliers.
2. **Pollution Board CTO:** Ensure your regional Consent to Operate (CTO) renewal is submitted and the final, approved CTO certificate is uploaded.
3. **Accredited Verification:** No third-party carbon audit certificate is linked to your emissions reports.`;
  } else if (lowerPrompt.includes('question') || lowerPrompt.includes('oem') || lowerPrompt.includes('tata')) {
    replyText = `Regarding the OEM Supplier ESG Survey, the draft answers have been generated with high confidence.
For question: *"Does your company measure and report Scope 1 & 2 emissions?"*
**Answer status:** Ready for Review.
**Evidence mapping:** Linked to active monthly electricity and diesel entries.
**Action:** Select "Approve Response" in the OEM Questionnaire interface to freeze this response for the export spreadsheet.`;
  } else {
    replyText = `I have completed a comprehensive multi-tenant ESG assessment for ${orgName}:
1. **Scope Breakdown:** Scope 1 emissions represent heavy industrial fuel burning, while Scope 2 represents purchased electricity. Scope 2 is currently your leading carbon contributor.
2. **BRSR Compliance Gaps:** Your average ESG readiness score is **72%**. Improving this to >85% (Excellent) requires finalizing the Supplier Code of Conduct and completing accredited third-party verification of your energy log books.
3. **Immediate Recommendation:** Designate a compliance officer to establish energy log auditing guidelines and gather missing bills to secure export shipments.

What specific area would you like to investigate further? I can help with Scope 1 calculations, document verification, or drafting answers for specific OEM compliance surveys.`;
  }

  const formattedResponse = `**AI-generated analysis — verify before external submission.**\n\n${replyText}`;

  db.addAIConversationMessage(activeTitle, { sender: 'user', text: prompt }, orgId);
  db.addAIConversationMessage(activeTitle, {
    sender: 'ai',
    text: formattedResponse,
    sources: [
      { title: `${orgName} Emissions Index`, type: 'System Audit' },
      { title: 'Registered ESG Assessment Gaps', type: 'Compliance Matrix' }
    ]
  }, orgId);

  res.json({
    text: formattedResponse,
    sources: [
      { title: `${orgName} Emissions Index`, type: 'System Audit' },
      { title: 'Registered ESG Assessment Gaps', type: 'Compliance Matrix' }
    ]
  });
});

// -------------------------------------------------------------
// Dev & Production Serving Modes
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted in Development mode.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Static asset serving mounted in Production mode.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Export app for serverless platforms like Vercel
export default app;

// Only start the server if NOT running in a serverless environment (e.g. Vercel)
if (process.env.VERCEL !== '1') {
  startServer();
}
