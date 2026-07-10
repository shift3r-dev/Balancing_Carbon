import { type DiagnosticQuestionResponse } from './phase2CarbonIntelligence.js';
import { mapDiagnosticResponse, mapEnergyRecord, mapProductionRecord } from './rowMappers.js';
import { supabaseAdmin } from './supabaseClients.js';

export async function ensureFacility(organisationId: string, facilityId?: string | null) {
  if (!facilityId) return null;
  const { data, error } = await supabaseAdmin.from('facilities').select('id').eq('id', facilityId).eq('organisation_id', organisationId).single();
  if (error || !data) throw new Error('Facility not found for this organisation.');
  return data;
}

export async function loadIntelligenceInputs(organisationId: string, facilityId?: string, startDate?: string, endDate?: string) {
  let energyQuery = supabaseAdmin.from('energy_records').select('*').eq('organisation_id', organisationId);
  let productionQuery = supabaseAdmin.from('production_records').select('*').eq('organisation_id', organisationId);
  let responseQuery = supabaseAdmin.from('diagnostic_question_responses').select('*').eq('organisation_id', organisationId);
  if (facilityId) {
    energyQuery = energyQuery.eq('facility_id', facilityId);
    productionQuery = productionQuery.eq('facility_id', facilityId);
    responseQuery = responseQuery.eq('facility_id', facilityId);
  }
  if (startDate) {
    energyQuery = energyQuery.gte('date', startDate);
    productionQuery = productionQuery.gte('date', startDate);
  }
  if (endDate) {
    energyQuery = energyQuery.lte('date', endDate);
    productionQuery = productionQuery.lte('date', endDate);
  }
  const [energy, production, responses] = await Promise.all([energyQuery, productionQuery, responseQuery]);
  if (energy.error) throw new Error(energy.error.message);
  if (production.error) throw new Error(production.error.message);
  if (responses.error) throw new Error(responses.error.message);
  return {
    activityRecords: (energy.data ?? []).map(mapEnergyRecord),
    productionRecords: (production.data ?? []).map(mapProductionRecord),
    questionnaireResponses: (responses.data ?? []).map(mapDiagnosticResponse) as DiagnosticQuestionResponse[],
  };
}
