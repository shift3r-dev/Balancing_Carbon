import { Router } from 'express';
import { randomUUID } from 'node:crypto';

import { type AuthenticatedRequest, getProfile, requireAuth, requirePermission } from '../auth.js';
import { getEntitlement, syncUsage } from '../entitlementService.js';
import { requireEntitlement, requireLimit, requireOperationalLicense } from '../middleware/entitlements.js';
import { str } from '../requestUtils.js';
import { createCsvExport, createExcelXmlExport, createPdfExport, buildReportSnapshot, type ReportingCalculation, reportRows, validateReportSnapshot } from '../reportingEngine.js';
import { supabaseAdmin } from '../supabaseClients.js';
import { getOrganizationLocalization } from '../localizationService.js';
import { smartDisplay } from '../measurementService.js';

type TemplateSection = { key: string; title: string; sectionType: string; narrative: string };

function asTemplateSections(value: unknown): TemplateSection[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is TemplateSection => Boolean(item && typeof item === 'object' && typeof (item as any).title === 'string'));
}

async function monthlyReportUsage(organisationId: string) {
  const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
  const { count, error } = await supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('organisation_id', organisationId).gte('created_at', start.toISOString());
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function resolveTemplate(organisationId: string, templateId: string) {
  const { data, error } = await supabaseAdmin.from('report_templates').select('*, compliance_frameworks(key,name,status)').eq('id', templateId).is('deleted_at', null).or(`organisation_id.is.null,organisation_id.eq.${organisationId}`).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Report template not found.');
  return data as any;
}

async function currentCalculations(organisationId: string): Promise<ReportingCalculation[]> {
  const { data, error } = await supabaseAdmin.from('calculation_records').select('id, emissions_t_co2e, factor_version, calculated_at, activity_records!inner(id, source_type, scope, facility_id, verification_status, activity_date, facilities(name), activity_evidence_links(id))').eq('organisation_id', organisationId).eq('status', 'current').is('activity_records.deleted_at', null);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    id: row.id, emissions_t_co2e: row.emissions_t_co2e, factor_version: row.factor_version, calculated_at: row.calculated_at,
    activity: { id: row.activity_records.id, source_type: row.activity_records.source_type, scope: row.activity_records.scope, facility_id: row.activity_records.facility_id, facility_name: row.activity_records.facilities?.name, verification_status: row.activity_records.verification_status, activity_date: row.activity_records.activity_date, evidence_count: (row.activity_records.activity_evidence_links ?? []).length },
  }));
}

function sectionContent(section: TemplateSection, snapshot: ReturnType<typeof buildReportSnapshot>, validation: ReturnType<typeof validateReportSnapshot>) {
  const lower = `${section.key} ${section.sectionType}`.toLowerCase();
  if (lower.includes('inventory') || lower.includes('emission')) return { narrative: section.narrative, kpis: [{ label: 'Total emissions', value: snapshot.emissionsTco2e, unit: 'tCO2e' }, { label: 'Scope 1', value: snapshot.scope1Tco2e, unit: 'tCO2e' }, { label: 'Scope 2', value: snapshot.scope2Tco2e, unit: 'tCO2e' }], chart: { type: 'source-breakdown', values: snapshot.sources } };
  if (lower.includes('energy')) return { narrative: section.narrative, kpis: [{ label: 'Scope 2', value: snapshot.scope2Tco2e, unit: 'tCO2e' }, { label: 'Emission sources', value: snapshot.sources.length, unit: 'sources' }], table: snapshot.sources };
  if (lower.includes('evidence') || lower.includes('method') || lower.includes('quality')) return { narrative: section.narrative, validation, calculationReferences: snapshot.calculationReferences, evidenceSummary: { linkedActivities: snapshot.activityEvidenceCount, activities: snapshot.activityCount } };
  return { narrative: section.narrative, kpis: [{ label: 'Total emissions', value: snapshot.emissionsTco2e, unit: 'tCO2e' }, { label: 'Facilities', value: snapshot.facilities.length, unit: 'facilities' }], table: snapshot.facilities };
}

function mapPlatformReport(row: any) {
  return { id: row.id, title: row.title, type: row.type, period: row.period, summary: row.summary ?? '', status: row.status, workflowStatus: row.workflow_status ?? 'draft', templateId: row.template_id ?? null, createdDate: row.created_date, createdAt: row.created_at, publishedAt: row.published_at ?? null, archivedAt: row.archived_at ?? null, framework: row.report_templates?.compliance_frameworks ?? null };
}

async function getDetailedReport(organisationId: string, reportId: string) {
  const { data: report, error } = await supabaseAdmin.from('reports').select('*, report_templates(*, compliance_frameworks(key,name,status))').eq('id', reportId).eq('organisation_id', organisationId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!report) return null;
  const { data: versions, error: versionError } = await supabaseAdmin.from('report_versions').select('*, report_sections(*, report_evidence_links(*))').eq('report_id', reportId).order('version_number', { ascending: false });
  if (versionError) throw new Error(versionError.message);
  const { data: approvals, error: approvalError } = await supabaseAdmin.from('report_approvals').select('*').eq('report_id', reportId).order('acted_at', { ascending: false });
  if (approvalError) throw new Error(approvalError.message);
  return { ...mapPlatformReport(report), template: report.report_templates ?? null, currentVersion: versions?.[0] ?? null, versions: versions ?? [], approvals: approvals ?? [] };
}

async function isComplianceTemplateAllowed(organisationId: string, template: any) {
  if (template.compliance_frameworks?.key !== 'BRSR') return true;
  return Boolean((await getEntitlement(organisationId, 'reports.compliance'))?.enabled);
}

export function createReportingPlatformRouter() {
  const router = Router();

  router.get('/reporting/frameworks', requireAuth, async (_req, res) => {
    const { data, error } = await supabaseAdmin.from('compliance_frameworks').select('*').is('deleted_at', null).order('name');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ frameworks: data ?? [] });
  });

  router.get('/reporting/templates', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { data, error } = await supabaseAdmin.from('report_templates').select('*, compliance_frameworks(key,name,status)').is('deleted_at', null).or(`organisation_id.is.null,organisation_id.eq.${req.authorization!.organisationId}`).in('status', ['active', 'draft']).order('is_system_template', { ascending: false }).order('name');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ templates: data ?? [] });
  });

  router.post('/reporting/templates', requireAuth, requireOperationalLicense, requirePermission('report.create'), requireEntitlement('reports.generate'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id); const body = req.body ?? {};
      const name = str(body.name); const reportType = str(body.reportType, body.report_type);
      if (!name || !reportType) return res.status(400).json({ error: 'Template name and report type are required.' });
      const frameworkId = str(body.frameworkId, body.framework_id) || null;
      if (frameworkId === 'framework-brsr' && !(await getEntitlement(p.organisation_id, 'reports.compliance'))?.enabled) return res.status(403).json({ error: 'Your plan does not include compliance reporting.', code: 'feature_not_entitled', entitlement: 'reports.compliance' });
      const structure = asTemplateSections(body.structure);
      if (!structure.length) return res.status(400).json({ error: 'At least one template section is required.' });
      const { data, error } = await supabaseAdmin.from('report_templates').insert({ id: `report-template-${randomUUID()}`, organisation_id: p.organisation_id, framework_id: frameworkId, name, report_type: reportType, description: str(body.description), structure, status: 'draft', created_by: req.authUser!.id }).select('*, compliance_frameworks(key,name,status)').single();
      if (error || !data) return res.status(500).json({ error: error?.message ?? 'Unable to create template.' });
      res.status(201).json({ template: data });
    } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to create template.' }); }
  });

  router.get('/reporting/reports', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { data, error } = await supabaseAdmin.from('reports').select('*, report_templates(*, compliance_frameworks(key,name,status))').eq('organisation_id', req.authorization!.organisationId).is('archived_at', null).order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ reports: (data ?? []).map(mapPlatformReport) });
  });

  router.get('/reporting/reports/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try { const report = await getDetailedReport(req.authorization!.organisationId, req.params.id); if (!report) return res.status(404).json({ error: 'Report not found.' }); res.json({ report }); }
    catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load report.' }); }
  });

  router.post('/reporting/reports/generate', requireAuth, requireOperationalLicense, requirePermission('report.generate'), requireEntitlement('reports.generate'), requireLimit('reports_month', monthlyReportUsage), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id); const body = req.body ?? {};
      const templateId = str(body.templateId, body.template_id); if (!templateId) return res.status(400).json({ error: 'A report template is required.' });
      const template = await resolveTemplate(p.organisation_id, templateId);
      if (!(await isComplianceTemplateAllowed(p.organisation_id, template))) return res.status(403).json({ error: 'Your plan does not include compliance reporting.', code: 'feature_not_entitled', entitlement: 'reports.compliance' });
      const calculations = await currentCalculations(p.organisation_id); const snapshot = buildReportSnapshot(calculations);
      const localization = await getOrganizationLocalization(p.organisation_id, req.authUser!.id);
      const preferredCarbonUnit = localization.units.find((unit: any) => unit.category === 'carbon')?.unitCode;
      const [totalDisplay, scope1Display, scope2Display] = await Promise.all([
        smartDisplay({ value: snapshot.emissionsTco2e * 1000, unit: 'kgCO2e', measurementSystem: localization.measurementSystem, preferredUnit: preferredCarbonUnit }),
        smartDisplay({ value: snapshot.scope1Tco2e * 1000, unit: 'kgCO2e', measurementSystem: localization.measurementSystem, preferredUnit: preferredCarbonUnit }),
        smartDisplay({ value: snapshot.scope2Tco2e * 1000, unit: 'kgCO2e', measurementSystem: localization.measurementSystem, preferredUnit: preferredCarbonUnit }),
      ]);
      snapshot.display = { total: { value: totalDisplay.displayValue, unit: totalDisplay.displayUnit }, scope1: { value: scope1Display.displayValue, unit: scope1Display.displayUnit }, scope2: { value: scope2Display.displayValue, unit: scope2Display.displayUnit } };
      const validation = validateReportSnapshot(snapshot);
      if (validation.status === 'blocked') return res.status(422).json({ error: 'The report cannot be generated until carbon calculations are available.', validation });
      const reportId = `report-${randomUUID()}`;
      const title = str(body.title) || `${template.name} - ${str(body.period) || 'Current period'}`;
      const { error: reportError } = await supabaseAdmin.from('reports').insert({ id: reportId, organisation_id: p.organisation_id, template_id: template.id, title, type: template.report_type, period: str(body.period) || 'Current period', created_date: new Date().toISOString().slice(0, 10), summary: `Generated from ${snapshot.calculationCount} current calculation record(s).`, status: 'Generated', workflow_status: 'draft', download_url: '#' });
      if (reportError) throw new Error(reportError.message);
      const versionId = `report-version-${randomUUID()}`;
      const { error: versionError } = await supabaseAdmin.from('report_versions').insert({ id: versionId, report_id: reportId, version_number: 1, content: { templateId: template.id, templateName: template.name, framework: template.compliance_frameworks ?? null }, calculation_snapshot: snapshot, validation_snapshot: validation, change_summary: 'Initial generated calculation snapshot.', created_by: req.authUser!.id });
      if (versionError) throw new Error(versionError.message);
      const sections = asTemplateSections(template.structure);
      const { data: createdSections, error: sectionsError } = await supabaseAdmin.from('report_sections').insert(sections.map((section, position) => ({ id: `report-section-${randomUUID()}`, report_version_id: versionId, section_type: section.sectionType || section.key || 'narrative', title: section.title, position, content: sectionContent(section, snapshot, validation) }))).select('*');
      if (sectionsError) throw new Error(sectionsError.message);
      const evidenceSection = (createdSections ?? []).find((section: any) => /evidence|method|quality/i.test(`${section.section_type} ${section.title}`)) ?? createdSections?.[0];
      if (evidenceSection && calculations.length) {
        const { error: evidenceError } = await supabaseAdmin.from('report_evidence_links').insert(calculations.slice(0, 500).map((calculation) => ({ id: `report-evidence-${randomUUID()}`, report_section_id: evidenceSection.id, calculation_record_id: calculation.id, evidence_type: 'calculation-lineage' })));
        if (evidenceError) throw new Error(evidenceError.message);
      }
      await syncUsage(p.organisation_id, 'reports_month', await monthlyReportUsage(p.organisation_id));
      const report = await getDetailedReport(p.organisation_id, reportId);
      res.status(201).json({ report });
    } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to generate report.' }); }
  });

  router.post('/reporting/reports/:id/submit-review', requireAuth, requireOperationalLicense, requirePermission('report.edit'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id); const report = await getDetailedReport(p.organisation_id, req.params.id); if (!report) return res.status(404).json({ error: 'Report not found.' });
      const { error } = await supabaseAdmin.from('reports').update({ workflow_status: 'under-review' }).eq('id', report.id).eq('organisation_id', p.organisation_id);
      if (error) throw new Error(error.message);
      await supabaseAdmin.from('report_approvals').insert({ id: `report-approval-${randomUUID()}`, report_id: report.id, status: 'under-review', comment: str(req.body?.comment), acted_by: req.authUser!.id });
      res.json({ report: await getDetailedReport(p.organisation_id, report.id) });
    } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to submit report for review.' }); }
  });

  router.post('/reporting/reports/:id/approvals', requireAuth, requireOperationalLicense, requirePermission('report.approve'), async (req: AuthenticatedRequest, res) => {
    try {
      const status = str(req.body?.status); if (!['approved', 'rejected', 'changes-requested'].includes(status)) return res.status(400).json({ error: 'Approval status must be approved, rejected, or changes-requested.' });
      const p = await getProfile(req.authUser!.id); const report = await getDetailedReport(p.organisation_id, req.params.id); if (!report) return res.status(404).json({ error: 'Report not found.' });
      const workflowStatus = status === 'approved' ? 'approved' : status;
      const { error } = await supabaseAdmin.from('reports').update({ workflow_status: workflowStatus, published_at: status === 'approved' ? new Date().toISOString() : null }).eq('id', report.id).eq('organisation_id', p.organisation_id);
      if (error) throw new Error(error.message);
      await supabaseAdmin.from('report_approvals').insert({ id: `report-approval-${randomUUID()}`, report_id: report.id, status, comment: str(req.body?.comment), acted_by: req.authUser!.id });
      res.json({ report: await getDetailedReport(p.organisation_id, report.id) });
    } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to record report approval.' }); }
  });

  router.post('/reporting/reports/:id/exports', requireAuth, requireOperationalLicense, requirePermission('report.export'), requireEntitlement('reports.export'), async (req: AuthenticatedRequest, res) => {
    try {
      const format = str(req.body?.format).toLowerCase(); if (!['pdf', 'excel', 'csv', 'json'].includes(format)) return res.status(400).json({ error: 'Supported export formats are PDF, Excel, CSV, and JSON.' });
      const p = await getProfile(req.authUser!.id); const report = await getDetailedReport(p.organisation_id, req.params.id); if (!report) return res.status(404).json({ error: 'Report not found.' });
      const exportId = `report-export-${randomUUID()}`;
      const { error: insertError } = await supabaseAdmin.from('report_exports').insert({ id: exportId, report_id: report.id, organisation_id: p.organisation_id, format, status: 'queued', exported_by: req.authUser!.id });
      if (insertError) throw new Error(insertError.message);
      let body: Buffer | string; let mimeType: string; let extension: string;
      if (format === 'pdf') { body = createPdfExport(report); mimeType = 'application/pdf'; extension = 'pdf'; }
      else if (format === 'excel') { body = createExcelXmlExport(report); mimeType = 'application/vnd.ms-excel'; extension = 'xls'; }
      else if (format === 'csv') { body = createCsvExport(report); mimeType = 'text/csv'; extension = 'csv'; }
      else { body = JSON.stringify({ report, export: { generatedAt: new Date().toISOString(), rows: reportRows(report) } }, null, 2); mimeType = 'application/json'; extension = 'json'; }
      const content = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');
      const filename = `${report.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'balancing-carbon-report'}.${extension}`;
      const { error: completionError } = await supabaseAdmin.from('report_exports').update({ status: 'completed', completed_at: new Date().toISOString(), file_url: `inline://${filename}` }).eq('id', exportId);
      if (completionError) throw new Error(completionError.message);
      res.json({ export: { id: exportId, format, filename, mimeType, contentBase64: content.toString('base64') } });
    } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to export report.' }); }
  });

  router.post('/reporting/schedules', requireAuth, requireOperationalLicense, requirePermission('report.schedule'), requireEntitlement('reports.compliance'), async (req: AuthenticatedRequest, res) => {
    try {
      const frequency = str(req.body?.frequency); if (!['monthly', 'quarterly', 'annual'].includes(frequency)) return res.status(400).json({ error: 'Frequency must be monthly, quarterly, or annual.' });
      const p = await getProfile(req.authUser!.id); const recipients = Array.isArray(req.body?.recipients) ? req.body.recipients.filter((value: unknown) => typeof value === 'string') : [];
      const { data, error } = await supabaseAdmin.from('report_schedules').insert({ id: `report-schedule-${randomUUID()}`, organisation_id: p.organisation_id, template_id: str(req.body?.templateId, req.body?.template_id) || null, frequency, recipients, next_run_at: str(req.body?.nextRunAt, req.body?.next_run_at) || null, active: false }).select('*').single();
      if (error || !data) throw new Error(error?.message ?? 'Unable to create report schedule.');
      res.status(201).json({ schedule: data, note: 'The schedule is saved inactive until a background delivery worker is configured.' });
    } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to create report schedule.' }); }
  });

  return router;
}
