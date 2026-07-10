import { Router } from 'express';
import { randomUUID } from 'node:crypto';

import { type AuthenticatedRequest, getProfile, requireAuth, requirePermission } from '../auth.js';
import { ensureFacility, loadIntelligenceInputs } from '../intelligenceInputs.js';
import { calculateDataCompleteness, calculateExpectedVsObserved, calculateReductionScenario, compareMonthlyPerformance, diagnosticQuestionTemplate, generateDiagnosticFindings, type ScenarioType } from '../phase2CarbonIntelligence.js';
import { optionalFinite, requiredFinite, str } from '../requestUtils.js';
import { mapDiagnosticResponse, mapMeasurement, mapMilestone, mapOpportunity, mapProject, mapScenario } from '../rowMappers.js';
import { supabaseAdmin } from '../supabaseClients.js';

/** Phase 2 intelligence endpoints. Mounted at /api to preserve public URLs. */
export function createIntelligenceRouter() {
  const router = Router();

  router.get('/diagnostic-questions', requireAuth, (_req, res) => res.json({ questions: diagnosticQuestionTemplate }));

  router.get('/diagnostic-responses', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id);
      let query = supabaseAdmin.from('diagnostic_question_responses').select('*').eq('organisation_id', p.organisation_id);
      if (typeof req.query.facilityId === 'string') query = query.eq('facility_id', req.query.facilityId);
      const { data, error } = await query.order('updated_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      res.json({ responses: (data ?? []).map(mapDiagnosticResponse) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load diagnostic responses.' }); }
  });

  router.post('/diagnostic-responses', requireAuth, requirePermission('activity.create'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id), b = req.body ?? {};
      const questionId = str(b.questionId, b.question_id);
      const template = diagnosticQuestionTemplate.find((question) => question.questionId === questionId);
      if (!template) return res.status(400).json({ error: 'Unknown diagnostic question id.' });
      const facilityId = str(b.facilityId, b.facility_id) || null;
      await ensureFacility(p.organisation_id, facilityId);
      let existingResponseQuery = supabaseAdmin.from('diagnostic_question_responses').select('id').eq('organisation_id', p.organisation_id).eq('question_id', questionId);
      existingResponseQuery = facilityId ? existingResponseQuery.eq('facility_id', facilityId) : existingResponseQuery.is('facility_id', null);
      const { data: existingResponse } = await existingResponseQuery.maybeSingle();
      const row = {
        id: existingResponse?.id ?? str(b.id) ?? `diag-res-${randomUUID()}`, organisation_id: p.organisation_id, facility_id: facilityId,
        question_id: questionId, industry: template.industry, category: template.category, question_text: template.questionText,
        answer_type: template.answerType, answer: str(b.answer), evidence_reference: str(b.evidenceReference, b.evidence_reference), updated_at: new Date().toISOString(),
      };
      const { data, error } = existingResponse?.id
        ? await supabaseAdmin.from('diagnostic_question_responses').update(row).eq('id', existingResponse.id).eq('organisation_id', p.organisation_id).select('*').single()
        : await supabaseAdmin.from('diagnostic_question_responses').insert(row).select('*').single();
      if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to save diagnostic response.' });
      res.status(201).json({ success: true, response: mapDiagnosticResponse(data) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to save diagnostic response.' }); }
  });

  router.get('/diagnostics', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id);
      const facilityId = typeof req.query.facilityId === 'string' ? req.query.facilityId : undefined;
      await ensureFacility(p.organisation_id, facilityId);
      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : '2026-01-01';
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : '2026-12-31';
      const inputs = await loadIntelligenceInputs(p.organisation_id, facilityId, startDate, endDate);
      const currentMonth = typeof req.query.currentMonth === 'string' ? req.query.currentMonth : undefined;
      const previousMonth = typeof req.query.previousMonth === 'string' ? req.query.previousMonth : undefined;
      const findings = generateDiagnosticFindings({ organisationId: p.organisation_id, facilityId, ...inputs, startDate, endDate, currentMonth, previousMonth });
      const completeness = calculateDataCompleteness({ ...inputs, startDate, endDate });
      const comparison = currentMonth && previousMonth ? compareMonthlyPerformance({ ...inputs, currentMonth, previousMonth }) : null;
      res.json({ findings, completeness, comparison, questions: diagnosticQuestionTemplate, responses: inputs.questionnaireResponses });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to generate diagnostics.' }); }
  });

  router.get('/opportunities', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id);
      let query = supabaseAdmin.from('reduction_opportunities').select('*').eq('organisation_id', p.organisation_id);
      if (typeof req.query.status === 'string') query = query.eq('status', req.query.status);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      res.json({ opportunities: (data ?? []).map(mapOpportunity) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load opportunities.' }); }
  });

  router.post('/opportunities', requireAuth, requirePermission('project.create'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id), b = req.body ?? {};
      const facilityId = str(b.facilityId, b.facility_id) || null;
      await ensureFacility(p.organisation_id, facilityId);
      const title = str(b.title);
      if (!title) return res.status(400).json({ error: 'Opportunity title is required.' });
      const row = {
        id: `opp-${randomUUID()}`, organisation_id: p.organisation_id, facility_id: facilityId, diagnostic_finding_id: null, title,
        category: str(b.category) || 'Data quality improvement', source: str(b.source) || 'manual',
        description: str(b.description) || 'Potential investigation area - engineering assessment required.', rationale: str(b.rationale) || 'Created from diagnostic workflow.',
        status: str(b.status) || 'identified', confidence: str(b.confidence) || 'medium',
        engineering_assessment_required: b.engineeringAssessmentRequired ?? b.engineering_assessment_required ?? true,
        estimated_annual_reduction_t_co2e: optionalFinite(b.estimatedAnnualReductionTCO2e ?? b.estimated_annual_reduction_t_co2e),
        estimated_annual_energy_savings: optionalFinite(b.estimatedAnnualEnergySavings ?? b.estimated_annual_energy_savings),
        energy_savings_unit: str(b.energySavingsUnit, b.energy_savings_unit) || null, estimated_capex: optionalFinite(b.estimatedCapex ?? b.estimated_capex),
        estimated_annual_cost_savings: optionalFinite(b.estimatedAnnualCostSavings ?? b.estimated_annual_cost_savings), simple_payback_years: optionalFinite(b.simplePaybackYears ?? b.simple_payback_years),
        calculation_metadata: b.calculationMetadata ?? b.calculation_metadata ?? {},
      };
      const { data, error } = await supabaseAdmin.from('reduction_opportunities').insert(row).select('*').single();
      if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to create opportunity.' });
      res.status(201).json({ success: true, opportunity: mapOpportunity(data) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create opportunity.' }); }
  });

  router.patch('/opportunities/:id', requireAuth, requirePermission('project.edit'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id), b = req.body ?? {};
      const updates: any = { updated_at: new Date().toISOString() };
      for (const [front, db] of [['status', 'status'], ['title', 'title'], ['description', 'description'], ['rationale', 'rationale'], ['confidence', 'confidence']] as const) if (b[front] !== undefined) updates[db] = str(b[front]);
      const { data, error } = await supabaseAdmin.from('reduction_opportunities').update(updates).eq('id', req.params.id).eq('organisation_id', p.organisation_id).select('*').single();
      if (error || !data) return res.status(404).json({ error: error?.message ?? 'Opportunity not found.' });
      res.json({ success: true, opportunity: mapOpportunity(data) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to update opportunity.' }); }
  });

  router.get('/scenarios', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id);
      let query = supabaseAdmin.from('reduction_scenarios').select('*').eq('organisation_id', p.organisation_id);
      if (typeof req.query.facilityId === 'string') query = query.eq('facility_id', req.query.facilityId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      res.json({ scenarios: (data ?? []).map(mapScenario) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load scenarios.' }); }
  });

  router.post('/scenarios', requireAuth, requirePermission('project.create'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id), b = req.body ?? {};
      const facilityId = str(b.facilityId, b.facility_id) || null;
      await ensureFacility(p.organisation_id, facilityId);
      const baselineStartDate = str(b.baselineStartDate, b.baseline_start_date), baselineEndDate = str(b.baselineEndDate, b.baseline_end_date);
      const scenarioType = str(b.scenarioType, b.scenario_type) as ScenarioType;
      if (!baselineStartDate || !baselineEndDate || !scenarioType) return res.status(400).json({ error: 'Baseline dates and scenario type are required.' });
      const inputs = await loadIntelligenceInputs(p.organisation_id, facilityId, baselineStartDate, baselineEndDate);
      const result = calculateReductionScenario({ scenarioType, activityRecords: inputs.activityRecords, productionRecords: inputs.productionRecords, baselineStartDate, baselineEndDate, assumptions: b.assumptions ?? {} });
      const row = {
        id: `scn-${randomUUID()}`, organisation_id: p.organisation_id, facility_id: facilityId, title: str(b.title) || scenarioType,
        baseline_start_date: baselineStartDate, baseline_end_date: baselineEndDate, scenario_type: scenarioType, assumptions: b.assumptions ?? {},
        baseline_emissions_t_co2e: result.baselineEmissionsTCO2e, scenario_emissions_t_co2e: result.scenarioEmissionsTCO2e,
        estimated_reduction_t_co2e: result.estimatedReductionTCO2e, estimated_reduction_percent: result.estimatedReductionPercent, calculation_metadata: result.calculationMetadata,
      };
      const { data, error } = await supabaseAdmin.from('reduction_scenarios').insert(row).select('*').single();
      if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to save scenario.' });
      res.status(201).json({ success: true, scenario: mapScenario(data) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create scenario.' }); }
  });

  router.get('/projects', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id);
      let query = supabaseAdmin.from('decarbonization_projects').select('*, project_milestones(*), project_measurements(*)').eq('organisation_id', p.organisation_id);
      if (typeof req.query.status === 'string') query = query.eq('status', req.query.status);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      res.json({ projects: (data ?? []).map(mapProject) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load projects.' }); }
  });

  router.post('/projects', requireAuth, requirePermission('project.create'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id), b = req.body ?? {};
      const facilityId = str(b.facilityId, b.facility_id) || null, opportunityId = str(b.opportunityId, b.opportunity_id) || null, scenarioId = str(b.scenarioId, b.scenario_id) || null;
      await ensureFacility(p.organisation_id, facilityId);
      if (opportunityId) { const { data } = await supabaseAdmin.from('reduction_opportunities').select('id').eq('id', opportunityId).eq('organisation_id', p.organisation_id).single(); if (!data) return res.status(404).json({ error: 'Opportunity not found.' }); }
      if (scenarioId) { const { data } = await supabaseAdmin.from('reduction_scenarios').select('id').eq('id', scenarioId).eq('organisation_id', p.organisation_id).single(); if (!data) return res.status(404).json({ error: 'Scenario not found.' }); }
      const title = str(b.title);
      if (!title) return res.status(400).json({ error: 'Project title is required.' });
      const row = {
        id: `proj-${randomUUID()}`, organisation_id: p.organisation_id, facility_id: facilityId, opportunity_id: opportunityId, scenario_id: scenarioId, title,
        description: str(b.description) || 'Decarbonization project created from Phase 2 workflow.', category: str(b.category) || 'Operational optimization', status: str(b.status) || 'planned', owner: str(b.owner) || null,
        baseline_start_date: str(b.baselineStartDate, b.baseline_start_date) || null, baseline_end_date: str(b.baselineEndDate, b.baseline_end_date) || null,
        planned_start_date: str(b.plannedStartDate, b.planned_start_date) || null, planned_completion_date: str(b.plannedCompletionDate, b.planned_completion_date) || null,
        target_annual_reduction_t_co2e: optionalFinite(b.targetAnnualReductionTCO2e ?? b.target_annual_reduction_t_co2e), estimated_capex: optionalFinite(b.estimatedCapex ?? b.estimated_capex), estimated_annual_cost_savings: optionalFinite(b.estimatedAnnualCostSavings ?? b.estimated_annual_cost_savings),
      };
      const { data, error } = await supabaseAdmin.from('decarbonization_projects').insert(row).select('*').single();
      if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to create project.' });
      if (opportunityId) await supabaseAdmin.from('reduction_opportunities').update({ status: 'converted-to-project', updated_at: new Date().toISOString() }).eq('id', opportunityId).eq('organisation_id', p.organisation_id);
      res.status(201).json({ success: true, project: mapProject(data) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create project.' }); }
  });

  router.post('/projects/:id/milestones', requireAuth, requirePermission('project.edit'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id), b = req.body ?? {};
      const { data: project } = await supabaseAdmin.from('decarbonization_projects').select('id').eq('id', req.params.id).eq('organisation_id', p.organisation_id).single();
      if (!project) return res.status(404).json({ error: 'Project not found.' });
      const title = str(b.title);
      if (!title) return res.status(400).json({ error: 'Milestone title is required.' });
      const row = { id: `mile-${randomUUID()}`, project_id: req.params.id, title, description: str(b.description), due_date: str(b.dueDate, b.due_date) || null, status: str(b.status) || 'pending' };
      const { data, error } = await supabaseAdmin.from('project_milestones').insert(row).select('*').single();
      if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to create milestone.' });
      res.status(201).json({ success: true, milestone: mapMilestone(data) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create milestone.' }); }
  });

  router.post('/projects/:id/measurements', requireAuth, requirePermission('project.edit'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id), b = req.body ?? {};
      const { data: project } = await supabaseAdmin.from('decarbonization_projects').select('id').eq('id', req.params.id).eq('organisation_id', p.organisation_id).single();
      if (!project) return res.status(404).json({ error: 'Project not found.' });
      const expectedReductionPercent = requiredFinite(b.expectedReductionPercent ?? b.expected_reduction_percent, 'Expected reduction');
      const baselineIntensity = requiredFinite(b.baselineIntensity ?? b.baseline_intensity, 'Baseline intensity');
      const observedIntensity = requiredFinite(b.observedIntensity ?? b.observed_intensity, 'Observed intensity');
      const comparison = calculateExpectedVsObserved({ expectedReductionPercent, baselineIntensity, observedIntensity });
      const row = { id: `meas-${randomUUID()}`, project_id: req.params.id, measurement_start_date: str(b.measurementStartDate, b.measurement_start_date), measurement_end_date: str(b.measurementEndDate, b.measurement_end_date), expected_reduction_percent: comparison.expectedReductionPercent, baseline_intensity: baselineIntensity, observed_intensity: observedIntensity, observed_improvement_percent: comparison.observedImprovementPercent, variance_percentage_points: comparison.variancePercentagePoints, methodology: comparison.wording, calculation_metadata: comparison };
      if (!row.measurement_start_date || !row.measurement_end_date) return res.status(400).json({ error: 'Measurement period is required.' });
      const { data, error } = await supabaseAdmin.from('project_measurements').insert(row).select('*').single();
      if (error || !data) return res.status(500).json({ error: error?.message ?? 'Failed to create measurement.' });
      res.status(201).json({ success: true, measurement: mapMeasurement(data) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create measurement.' }); }
  });

  return router;
}
