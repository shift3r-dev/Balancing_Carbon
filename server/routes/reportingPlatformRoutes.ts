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
import { createStudioDocx, createStudioPdf, createStudioPptx, createStudioXlsx } from '../reportStudioEngine.js';
import { OllamaProvider } from '../ai/ollamaProvider.js';
import { buildCarbonCopilotContext } from '../ai/carbonCopilotContext.js';
import { runtimeConfig } from '../config/runtime.js';

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
  return { id: row.id, title: row.title, type: row.type, period: row.period, summary: row.summary ?? '', status: row.status, workflowStatus: row.workflow_status ?? 'draft', studioStatus: row.studio_status ?? 'editing', templateId: row.template_id ?? null, brandKitId: row.brand_kit_id ?? null, createdDate: row.created_date, createdAt: row.created_at, publishedAt: row.published_at ?? null, archivedAt: row.archived_at ?? null, framework: row.report_templates?.compliance_frameworks ?? null };
}

async function getDetailedReport(organisationId: string, reportId: string) {
  const { data: report, error } = await supabaseAdmin.from('reports').select('*, report_templates(*, compliance_frameworks(key,name,status)), report_brand_kits(*)').eq('id', reportId).eq('organisation_id', organisationId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!report) return null;
  const { data: versions, error: versionError } = await supabaseAdmin.from('report_versions').select('*, report_sections(*, report_evidence_links(*))').eq('report_id', reportId).order('version_number', { ascending: false });
  if (versionError) throw new Error(versionError.message);
  const { data: approvals, error: approvalError } = await supabaseAdmin.from('report_approvals').select('*').eq('report_id', reportId).order('acted_at', { ascending: false });
  if (approvalError) throw new Error(approvalError.message);
  const { data: studioPages, error: studioError } = await supabaseAdmin.from('report_studio_pages').select('*, report_studio_blocks(*, report_block_evidence(*))').eq('report_id', reportId).eq('organisation_id', organisationId).order('page_number');
  if (studioError) throw new Error(studioError.message);
  return { ...mapPlatformReport(report), template: report.report_templates ?? null, brandKit: report.report_brand_kits ?? null, currentVersion: versions?.[0] ?? null, versions: versions ?? [], approvals: approvals ?? [], studioPages: studioPages ?? [] };
}

function studioBlockType(section: TemplateSection) { const value = `${section.key} ${section.sectionType}`.toLowerCase(); if (value.includes('inventory') || value.includes('emission')) return 'kpi-grid'; if (value.includes('energy') || value.includes('quality') || value.includes('evidence')) return 'table'; return 'narrative'; }

async function initializeStudio(organisationId: string, reportId: string, sections: TemplateSection[], snapshot: any, validation: any) {
  for (let index = 0; index < sections.length; index += 1) { const section = sections[index], pageId = `studio-page-${randomUUID()}`; const content = sectionContent(section, snapshot, validation);
    const { error: pageError } = await supabaseAdmin.from('report_studio_pages').insert({ id: pageId, organisation_id: organisationId, report_id: reportId, page_number: index + 1, title: section.title, layout: index === 0 && /cover/i.test(section.sectionType) ? 'cover' : 'single' }); if (pageError) throw new Error(pageError.message);
    const blocks = [{ id: `studio-block-${randomUUID()}`, organisation_id: organisationId, report_id: reportId, page_id: pageId, block_type: 'heading', position: 0, title: section.title, content: { text: section.title }, source_label: '' }, { id: `studio-block-${randomUUID()}`, organisation_id: organisationId, report_id: reportId, page_id: pageId, block_type: 'narrative', position: 1, title: '', content: { text: section.narrative }, source_label: 'Template narrative - requires author review' }, { id: `studio-block-${randomUUID()}`, organisation_id: organisationId, report_id: reportId, page_id: pageId, block_type: studioBlockType(section), position: 2, title: studioBlockType(section) === 'kpi-grid' ? 'Performance metrics' : 'Supporting data', content, data_binding: { source: 'immutable-calculation-snapshot' }, source_label: 'Balancing Carbon calculation snapshot' }];
    const { error: blockError } = await supabaseAdmin.from('report_studio_blocks').insert(blocks); if (blockError) throw new Error(blockError.message);
  }
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

  router.get('/reporting/brand-kits', requireAuth, async (req: AuthenticatedRequest, res) => { const { data, error } = await supabaseAdmin.from('report_brand_kits').select('*').eq('organisation_id', req.authorization!.organisationId).is('deleted_at', null).order('is_default', { ascending: false }).order('name'); if (error) return res.status(500).json({ error: error.message }); res.json({ brandKits: data ?? [] }); });
  router.post('/reporting/brand-kits', requireAuth, requireOperationalLicense, requirePermission('report.studio'), requireEntitlement('reports.studio'), async (req: AuthenticatedRequest, res) => { const body = req.body ?? {}, name = str(body.name); if (!name) return res.status(400).json({ error: 'Brand kit name is required.' }); const row = { id: `report-brand-${randomUUID()}`, organisation_id: req.authorization!.organisationId, name, primary_color: str(body.primaryColor) || '#173f2a', secondary_color: str(body.secondaryColor) || '#dce9df', accent_color: str(body.accentColor) || '#d39b35', heading_font: str(body.headingFont) || 'Arial', body_font: str(body.bodyFont) || 'Arial', footer_text: str(body.footerText), page_size: ['A4','Letter','16:9'].includes(str(body.pageSize)) ? str(body.pageSize) : 'A4', is_default: Boolean(body.isDefault), created_by: req.authUser!.id }; if (row.is_default) await supabaseAdmin.from('report_brand_kits').update({ is_default: false }).eq('organisation_id', row.organisation_id); const { data, error } = await supabaseAdmin.from('report_brand_kits').insert(row).select('*').single(); if (error) return res.status(500).json({ error: error.message }); res.status(201).json({ brandKit: data }); });

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
      await initializeStudio(p.organisation_id, reportId, sections, snapshot, validation);
      await syncUsage(p.organisation_id, 'reports_month', await monthlyReportUsage(p.organisation_id));
      const report = await getDetailedReport(p.organisation_id, reportId);
      res.status(201).json({ report });
    } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to generate report.' }); }
  });

  router.put('/reporting/reports/:id/studio', requireAuth, requireOperationalLicense, requirePermission('report.studio'), requireEntitlement('reports.studio'), async (req: AuthenticatedRequest, res) => {
    try { const organisationId = req.authorization!.organisationId, report = await getDetailedReport(organisationId, req.params.id); if (!report) return res.status(404).json({ error: 'Report not found.' }); if (!['draft','changes-requested'].includes(report.workflowStatus)) return res.status(409).json({ error: 'Only draft or changes-requested reports can be edited.' }); const pages = Array.isArray(req.body?.pages) ? req.body.pages.slice(0,100) : []; if (!pages.length) return res.status(400).json({ error: 'At least one page is required.' }); const keptPageIds: string[] = [], keptBlockIds: string[] = [];
      // Move existing rows to collision-free temporary positions before applying a reorder.
      const existingPages = (report.studioPages ?? []) as any[];
      for (let index = 0; index < existingPages.length; index += 1) {
        const page = existingPages[index];
        const pageMove = await supabaseAdmin.from('report_studio_pages').update({ page_number: 10001 + index }).eq('id', page.id).eq('organisation_id', organisationId);
        if (pageMove.error) throw new Error(pageMove.error.message);
        for (let blockIndex = 0; blockIndex < (page.report_studio_blocks ?? []).length; blockIndex += 1) {
          const blockMove = await supabaseAdmin.from('report_studio_blocks').update({ position: 10001 + blockIndex, column_index: 0 }).eq('id', page.report_studio_blocks[blockIndex].id).eq('organisation_id', organisationId);
          if (blockMove.error) throw new Error(blockMove.error.message);
        }
      }
      for (let pageIndex=0; pageIndex<pages.length; pageIndex+=1) { const page=pages[pageIndex], pageId=str(page.id)||`studio-page-${randomUUID()}`; keptPageIds.push(pageId); const pageRow={id:pageId,organisation_id:organisationId,report_id:report.id,page_number:pageIndex+1,title:str(page.title),layout:['single','two-column','cover','full-bleed'].includes(str(page.layout))?str(page.layout):'single',background_color:str(page.background_color,page.backgroundColor)||'#ffffff',configuration:page.configuration??{}}; const pageResult=await supabaseAdmin.from('report_studio_pages').upsert(pageRow); if(pageResult.error) throw new Error(pageResult.error.message); const blocks=Array.isArray(page.blocks??page.report_studio_blocks)?(page.blocks??page.report_studio_blocks).slice(0,100):[];
        for(let blockIndex=0;blockIndex<blocks.length;blockIndex+=1){const block=blocks[blockIndex],blockId=str(block.id)||`studio-block-${randomUUID()}`; keptBlockIds.push(blockId); const blockType=str(block.block_type,block.blockType); if(!['heading','narrative','kpi-grid','chart','table','image','callout','spacer','page-break'].includes(blockType)) continue; const blockResult=await supabaseAdmin.from('report_studio_blocks').upsert({id:blockId,organisation_id:organisationId,report_id:report.id,page_id:pageId,block_type:blockType,position:blockIndex,column_index:Number(block.column_index??block.columnIndex??0),title:str(block.title),content:block.content??{},style:block.style??{},data_binding:block.data_binding??block.dataBinding??{},source_label:str(block.source_label,block.sourceLabel)}); if(blockResult.error) throw new Error(blockResult.error.message); }
      }
      const [{ data: existingBlocks }, { data: persistedPages }] = await Promise.all([
        supabaseAdmin.from('report_studio_blocks').select('id').eq('organisation_id', organisationId).eq('report_id', report.id),
        supabaseAdmin.from('report_studio_pages').select('id').eq('organisation_id', organisationId).eq('report_id', report.id),
      ]);
      const staleBlockIds = (existingBlocks ?? []).map((item: any) => item.id).filter((id: string) => !keptBlockIds.includes(id));
      const stalePageIds = (persistedPages ?? []).map((item: any) => item.id).filter((id: string) => !keptPageIds.includes(id));
      if (staleBlockIds.length) await supabaseAdmin.from('report_studio_blocks').delete().eq('organisation_id', organisationId).in('id', staleBlockIds);
      if (stalePageIds.length) await supabaseAdmin.from('report_studio_pages').delete().eq('organisation_id', organisationId).in('id', stalePageIds);
      if(req.body?.brandKitId!==undefined){const brandId=str(req.body.brandKitId)||null; if(brandId){const {data}=await supabaseAdmin.from('report_brand_kits').select('id').eq('id',brandId).eq('organisation_id',organisationId).maybeSingle(); if(!data)return res.status(400).json({error:'Brand kit not found.'});} await supabaseAdmin.from('reports').update({brand_kit_id:brandId,studio_status:'editing'}).eq('id',report.id).eq('organisation_id',organisationId);}
      res.json({report:await getDetailedReport(organisationId,report.id)});
    } catch(error){res.status(500).json({error:error instanceof Error?error.message:'Unable to save report studio.'});}
  });

  router.post('/reporting/reports/:id/studio/version', requireAuth, requireOperationalLicense, requirePermission('report.studio'), requireEntitlement('reports.studio'), async (req: AuthenticatedRequest, res) => {
    try { const organisationId=req.authorization!.organisationId,report=await getDetailedReport(organisationId,req.params.id); if(!report)return res.status(404).json({error:'Report not found.'}); const nextVersion=Math.max(0,...(report.versions??[]).map((item:any)=>Number(item.version_number)))+1,current=report.currentVersion; const versionId=`report-version-${randomUUID()}`; const {error}=await supabaseAdmin.from('report_versions').insert({id:versionId,report_id:report.id,version_number:nextVersion,content:{studioPages:report.studioPages,brandKit:report.brandKit,framework:report.framework},calculation_snapshot:current?.calculation_snapshot??{},validation_snapshot:current?.validation_snapshot??{},change_summary:str(req.body?.changeSummary)||'Studio composition snapshot.',created_by:req.authUser!.id}); if(error)throw new Error(error.message); await supabaseAdmin.from('reports').update({studio_status:'ready'}).eq('id',report.id).eq('organisation_id',organisationId); res.status(201).json({report:await getDetailedReport(organisationId,report.id)}); } catch(error){res.status(500).json({error:error instanceof Error?error.message:'Unable to version report.'});}
  });

  router.post('/reporting/reports/:id/studio/evidence', requireAuth, requireOperationalLicense, requirePermission('report.studio'), requireEntitlement('reports.studio'), async (req:AuthenticatedRequest,res)=>{const organisationId=req.authorization!.organisationId,blockId=str(req.body?.blockId),documentId=str(req.body?.documentId); const [{data:block},{data:document}]=await Promise.all([supabaseAdmin.from('report_studio_blocks').select('id').eq('id',blockId).eq('report_id',req.params.id).eq('organisation_id',organisationId).maybeSingle(),supabaseAdmin.from('documents').select('id,name').eq('id',documentId).eq('organisation_id',organisationId).maybeSingle()]); if(!block||!document)return res.status(400).json({error:'Valid report block and evidence document are required.'}); const {data,error}=await supabaseAdmin.from('report_block_evidence').insert({id:`report-block-evidence-${randomUUID()}`,organisation_id:organisationId,block_id:blockId,document_id:documentId,evidence_label:str(req.body?.label)||document.name,created_by:req.authUser!.id}).select('*').single(); if(error)return res.status(500).json({error:error.message});res.status(201).json({evidence:data});});

  router.post('/reporting/reports/:id/studio/narrative', requireAuth, requireOperationalLicense, requirePermission('report.ai_narrative'), requireEntitlement('reports.ai_narrative'), async (req:AuthenticatedRequest,res)=>{try{if(!runtimeConfig.ai.enabled||runtimeConfig.ai.provider!=='ollama')return res.status(503).json({error:'Local AI narrative drafting is disabled.'}); const organisationId=req.authorization!.organisationId,report=await getDetailedReport(organisationId,req.params.id);if(!report)return res.status(404).json({error:'Report not found.'}); const topic=str(req.body?.topic)||'Executive sustainability summary',blockId=str(req.body?.blockId)||null;const {context,citations}=await buildCarbonCopilotContext(organisationId,topic);const generator=new OllamaProvider(runtimeConfig.ai.baseUrl,runtimeConfig.ai.model,runtimeConfig.ai.contextLength,runtimeConfig.ai.timeoutMs);const result=await generator.generate({system:'You draft concise board-ready ESG report narrative from verified tenant context only. Do not invent facts, claims, compliance, causality, targets, quotes, or assurance. State limitations. Return JSON using the required schema.',question:`Draft the report section "${topic}" for ${report.title}. Use professional prose and citation IDs.`,history:[],context:{report:{title:report.title,type:report.type,period:report.period,framework:report.framework},verifiedContext:context}});const valid=new Set(citations.map(item=>item.id)),used=citations.filter(item=>result.citationIds.includes(item.id)&&valid.has(item.id));const {data,error}=await supabaseAdmin.from('report_narrative_generations').insert({id:`report-narrative-${randomUUID()}`,organisation_id:organisationId,report_id:report.id,block_id:blockId,prompt_key:'studio-section-draft',prompt_text:topic,generated_text:result.answer,citations:used,provider:'ollama',model:runtimeConfig.ai.model,generated_by:req.authUser!.id}).select('*').single();if(error)throw new Error(error.message);res.status(201).json({narrative:data});}catch(error){res.status(500).json({error:error instanceof Error?error.message:'Unable to draft narrative.'});}});

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
      const { error } = await supabaseAdmin.from('reports').update({ workflow_status: workflowStatus, published_at: null }).eq('id', report.id).eq('organisation_id', p.organisation_id);
      if (error) throw new Error(error.message);
      await supabaseAdmin.from('report_approvals').insert({ id: `report-approval-${randomUUID()}`, report_id: report.id, status, comment: str(req.body?.comment), acted_by: req.authUser!.id });
      res.json({ report: await getDetailedReport(p.organisation_id, report.id) });
    } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to record report approval.' }); }
  });

  router.post('/reporting/reports/:id/publish', requireAuth, requireOperationalLicense, requirePermission('report.publish'), requireEntitlement('reports.export'), async (req: AuthenticatedRequest, res) => {
    try {
      const organisationId = req.authorization!.organisationId;
      const report = await getDetailedReport(organisationId, req.params.id);
      if (!report) return res.status(404).json({ error: 'Report not found.' });
      if (report.workflowStatus !== 'approved') return res.status(409).json({ error: 'Only an approved report can be published.' });
      const publishedAt = new Date().toISOString();
      const { error } = await supabaseAdmin.from('reports').update({ workflow_status: 'published', studio_status: 'locked', published_at: publishedAt }).eq('id', report.id).eq('organisation_id', organisationId);
      if (error) throw new Error(error.message);
      await supabaseAdmin.from('report_approvals').insert({ id: `report-approval-${randomUUID()}`, report_id: report.id, status: 'published', comment: str(req.body?.comment) || 'Published from ESG Reporting Studio.', acted_by: req.authUser!.id });
      res.json({ report: await getDetailedReport(organisationId, report.id) });
    } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to publish report.' }); }
  });

  router.post('/reporting/reports/:id/exports', requireAuth, requireOperationalLicense, requirePermission('report.export'), requireEntitlement('reports.export'), async (req: AuthenticatedRequest, res) => {
    try {
      const format = str(req.body?.format).toLowerCase(); if (!['pdf', 'excel', 'csv', 'json', 'docx', 'pptx', 'xlsx'].includes(format)) return res.status(400).json({ error: 'Supported export formats are PDF, DOCX, PPTX, XLSX, Excel, CSV, and JSON.' });
      const p = await getProfile(req.authUser!.id); const report = await getDetailedReport(p.organisation_id, req.params.id); if (!report) return res.status(404).json({ error: 'Report not found.' });
      const exportId = `report-export-${randomUUID()}`;
      const { error: insertError } = await supabaseAdmin.from('report_exports').insert({ id: exportId, report_id: report.id, organisation_id: p.organisation_id, format, status: 'queued', exported_by: req.authUser!.id });
      if (insertError) throw new Error(insertError.message);
      let body: Buffer | string; let mimeType: string; let extension: string;
      if (format === 'pdf' && report.studioPages?.length) { body = await createStudioPdf(report); mimeType = 'application/pdf'; extension = 'pdf'; }
      else if (format === 'docx') { body = await createStudioDocx(report); mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; extension = 'docx'; }
      else if (format === 'pptx') { body = await createStudioPptx(report); mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'; extension = 'pptx'; }
      else if (format === 'xlsx') { body = await createStudioXlsx(report); mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; extension = 'xlsx'; }
      else if (format === 'pdf') { body = createPdfExport(report); mimeType = 'application/pdf'; extension = 'pdf'; }
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
