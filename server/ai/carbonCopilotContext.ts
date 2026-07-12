import { supabaseAdmin } from '../supabaseClients.js';
import { selectRelevantChunks } from '../documentExtraction.js';

export interface CopilotCitation { id: string; label: string; type: string; recordId?: string; detail: string; }

const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const rows = (result: any) => { if (result.error) throw new Error(result.error.message); return result.data ?? []; };

export async function buildCarbonCopilotContext(organisationId: string, question = '') {
  const [organisationResult, facilitiesResult, energyResult, productionResult, esgResult, projectsResult, opportunitiesResult, reportsResult, documentsResult, chunksResult] = await Promise.all([
    supabaseAdmin.from('organisations').select('id,name,industry,location,reporting_year,target_reduction_percent').eq('id', organisationId).single(),
    supabaseAdmin.from('facilities').select('id,name,location,industry_type,production_output,production_unit,emissions_scope_1,emissions_scope_2,carbon_intensity,esg_readiness_status').eq('organisation_id', organisationId).limit(50),
    supabaseAdmin.from('energy_records').select('id,facility_id,date,source_type,energy_type,quantity,unit,scope,emissions_t_co2e,registry_emission_factor_id,source_document').eq('organisation_id', organisationId).order('date', { ascending: false }).limit(120),
    supabaseAdmin.from('production_records').select('id,facility_id,date,quantity,unit,source_document').eq('organisation_id', organisationId).order('date', { ascending: false }).limit(60),
    supabaseAdmin.from('esg_questions').select('id,category,question,answer,score,status,review_status,recommendation').eq('organisation_id', organisationId).order('updated_at', { ascending: false }).limit(40),
    supabaseAdmin.from('decarbonization_projects').select('id,facility_id,title,category,status,owner,target_annual_reduction_t_co2e,planned_completion_date').eq('organisation_id', organisationId).order('created_at', { ascending: false }).limit(30),
    supabaseAdmin.from('reduction_opportunities').select('id,facility_id,title,category,status,confidence,estimated_annual_reduction_t_co2e,engineering_assessment_required').eq('organisation_id', organisationId).order('created_at', { ascending: false }).limit(30),
    supabaseAdmin.from('reports').select('id,title,type,period,status,workflow_status,created_date').eq('organisation_id', organisationId).order('created_date', { ascending: false }).limit(30),
    supabaseAdmin.from('documents').select('id,name,category,facility_id,period,evidence_usage,upload_date').eq('organisation_id', organisationId).order('upload_date', { ascending: false }).limit(40),
    supabaseAdmin.from('document_text_chunks').select('id,document_id,chunk_index,content,documents!inner(name,category,period)').eq('organisation_id', organisationId).limit(300),
  ]);
  if (organisationResult.error) throw new Error(organisationResult.error.message);
  const facilities = rows(facilitiesResult), energy = rows(energyResult), production = rows(productionResult), esg = rows(esgResult);
  const projects = rows(projectsResult), opportunities = rows(opportunitiesResult), reports = rows(reportsResult), documents = rows(documentsResult);
  const relevantChunks = selectRelevantChunks(question, chunksResult.error ? [] : (chunksResult.data ?? []), 8);
  const facilityNames = new Map(facilities.map((item: any) => [item.id, item.name]));
  const totalEmissions = energy.reduce((sum: number, item: any) => sum + number(item.emissions_t_co2e), 0);
  const byScope = energy.reduce((acc: Record<string, number>, item: any) => { const key = item.scope || 'unclassified'; acc[key] = (acc[key] ?? 0) + number(item.emissions_t_co2e); return acc; }, {});
  const bySource = energy.reduce((acc: Record<string, number>, item: any) => { const key = item.source_type || item.energy_type || 'Unknown'; acc[key] = (acc[key] ?? 0) + number(item.emissions_t_co2e); return acc; }, {});
  const citations: CopilotCitation[] = [];
  facilities.forEach((item: any, index: number) => citations.push({ id: `F${index + 1}`, type: 'facility', recordId: item.id, label: item.name, detail: `${item.location}; ${number(item.emissions_scope_1) + number(item.emissions_scope_2)} tCO2e cached footprint` }));
  energy.slice(0, 20).forEach((item: any, index: number) => citations.push({ id: `E${index + 1}`, type: 'energy-record', recordId: item.id, label: `${item.source_type || item.energy_type} - ${item.date}`, detail: `${facilityNames.get(item.facility_id) ?? item.facility_id}; ${item.quantity} ${item.unit}; ${number(item.emissions_t_co2e)} tCO2e` }));
  reports.slice(0, 10).forEach((item: any, index: number) => citations.push({ id: `R${index + 1}`, type: 'report', recordId: item.id, label: item.title, detail: `${item.period}; ${item.workflow_status ?? item.status}` }));
  documents.slice(0, 10).forEach((item: any, index: number) => citations.push({ id: `D${index + 1}`, type: 'document', recordId: item.id, label: item.name, detail: `${item.category}; ${item.period}` }));
  projects.slice(0, 10).forEach((item: any, index: number) => citations.push({ id: `P${index + 1}`, type: 'project', recordId: item.id, label: item.title, detail: `${item.status}; target ${number(item.target_annual_reduction_t_co2e)} tCO2e/year` }));
  relevantChunks.forEach((item: any, index: number) => citations.push({ id: `X${index + 1}`, type: 'document', recordId: item.document_id, label: item.documents?.name ?? `Evidence document ${index + 1}`, detail: `${item.documents?.category ?? 'Evidence'}; extracted text chunk ${Number(item.chunk_index) + 1}` }));
  const context = {
    organisation: organisationResult.data,
    accountingSummary: { totalRecordedEmissionsTCO2e: totalEmissions, byScopeTCO2e: byScope, bySourceTCO2e: bySource, activityRecordCount: energy.length, productionRecordCount: production.length },
    facilities, recentEnergyRecords: energy.slice(0, 30), recentProductionRecords: production.slice(0, 20),
    esgItems: esg, projects, reductionOpportunities: opportunities, reports, evidenceDocuments: documents,
    evidenceExcerpts: relevantChunks.map((item: any, index: number) => ({ citationId: `X${index + 1}`, documentId: item.document_id, documentName: item.documents?.name, chunkIndex: item.chunk_index, content: String(item.content).slice(0, 2200) })),
    citationCatalog: citations,
  };
  return { context, citations };
}
