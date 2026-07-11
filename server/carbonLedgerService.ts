import { randomUUID } from 'node:crypto';

import { calculateActivityEmissions, deriveActivityType, type EmissionFactor } from './carbonAccounting.js';
import { supabaseAdmin } from './supabaseClients.js';

const sourceAliases: Record<string, string> = {
  'grid power': 'Grid Electricity',
  'renewable electricity': 'On-site Solar',
  'solar electricity': 'On-site Solar',
  solar: 'On-site Solar',
  'wind electricity': 'On-site Wind',
  wind: 'On-site Wind',
};

export function activityCategory(sourceType: string) {
  const activityType = deriveActivityType(sourceType);
  if (activityType === 'electricity' || activityType === 'renewable-electricity') return 'electricity';
  if (activityType === 'fuel') return 'fuel';
  if (activityType === 'steam') return 'steam';
  if (activityType === 'heat') return 'purchased-heat';
  return 'fuel';
}

export function registryFactorToEngineFactor(row: any): EmissionFactor {
  return {
    id: row.id, sourceType: row.source_type, displayName: row.source_type, scope: row.scope,
    factorValue: Number(row.factor_value), factorUnit: row.factor_unit, activityUnit: row.activity_unit,
    compatibleUnits: [row.activity_unit], geography: [row.country, row.region].filter(Boolean).join(' / '),
    reportingYear: String(row.publication_year ?? ''), methodology: 'Activity data x versioned emission factor',
    sourceName: row.source_name, sourceReference: row.reference_url ?? '', version: row.version,
    validFrom: row.effective_from ?? '', validTo: row.effective_to ?? undefined, isActive: row.status === 'active', notes: '',
  };
}

export async function resolveRegistryFactor(sourceType: string, country = 'India', activityDate?: string) {
  const normalizedSource = sourceAliases[sourceType.trim().toLowerCase()] ?? sourceType.trim();
  let query = supabaseAdmin.from('emission_factor_registry').select('*').eq('status', 'active').is('deleted_at', null).ilike('source_type', normalizedSource).in('country', [country, 'India']);
  if (activityDate) query = query.lte('effective_from', activityDate).or(`effective_to.is.null,effective_to.gte.${activityDate}`);
  const { data, error } = await query.order('effective_from', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? registryFactorToEngineFactor(data) : null;
}

export async function saveCalculationLineage(input: {
  organisationId: string; userId: string; legacyEnergyRecordId: string; facilityId: string; sourceType: string;
  activityDate: string; reportingPeriod: string; quantity: number; unit: string; supplier?: string; invoiceNumber?: string;
  cost?: number | null; currency?: string; sourceDocument?: string; notes?: string; factor: EmissionFactor;
  calculation: ReturnType<typeof calculateActivityEmissions>; documentIds?: string[]; supersedesActivityId?: string | null;
  versionNumber?: number;
}) {
  const activityId = `activity-${randomUUID()}`;
  const evidenceIds = [...new Set((input.documentIds ?? []).filter(Boolean))];
  const verificationStatus = evidenceIds.length || input.sourceDocument ? 'submitted' : 'draft';
  const { data: activity, error: activityError } = await supabaseAdmin.from('activity_records').insert({
    id: activityId, legacy_energy_record_id: input.legacyEnergyRecordId, organisation_id: input.organisationId, facility_id: input.facilityId,
    activity_category: activityCategory(input.sourceType), source_type: input.sourceType, scope: input.factor.scope,
    activity_date: input.activityDate, reporting_period: input.reportingPeriod, quantity: input.quantity, unit: input.calculation.normalizedUnit,
    supplier: input.supplier ?? '', invoice_number: input.invoiceNumber ?? '', cost: input.cost ?? null, currency: input.currency ?? 'INR',
    emission_factor_id: input.factor.id, verification_status: verificationStatus, notes: input.notes ?? '', source_document: input.sourceDocument ?? '',
    supersedes_id: input.supersedesActivityId ?? null, version_number: input.versionNumber ?? 1, created_by: input.userId, updated_by: input.userId,
  }).select('*').single();
  if (activityError || !activity) throw new Error(activityError?.message ?? 'Unable to save activity record.');

  if (input.supersedesActivityId) {
    await supabaseAdmin.from('calculation_records').update({ status: 'superseded' }).eq('activity_record_id', input.supersedesActivityId).eq('status', 'current');
  }
  if (evidenceIds.length) {
    const { error } = await supabaseAdmin.from('activity_evidence_links').insert(evidenceIds.map((documentId) => ({ id: `activity-evidence-${randomUUID()}`, activity_record_id: activityId, document_id: documentId, evidence_type: 'supporting-document', verification_status: verificationStatus })));
    if (error) throw new Error(error.message);
  }
  const evidenceSnapshot: Array<Record<string, string>> = evidenceIds.map((id) => ({ documentId: id }));
  if (input.sourceDocument) evidenceSnapshot.push({ sourceDocument: input.sourceDocument });
  const { data: calculationRecord, error: calculationError } = await supabaseAdmin.from('calculation_records').insert({
    id: `calc-${randomUUID()}`, legacy_energy_record_id: input.legacyEnergyRecordId, activity_record_id: activityId, organisation_id: input.organisationId,
    emission_factor_id: input.factor.id, factor_version: input.factor.version, formula: 'activity quantity x emission factor',
    input_snapshot: { quantity: input.quantity, unit: input.calculation.normalizedUnit, sourceType: input.sourceType, activityDate: input.activityDate },
    evidence_snapshot: evidenceSnapshot,
    emissions_kg_co2e: input.calculation.emissionsKgCO2e, emissions_t_co2e: input.calculation.emissionsTCO2e, calculated_by: input.userId,
  }).select('*').single();
  if (calculationError || !calculationRecord) throw new Error(calculationError?.message ?? 'Unable to save calculation record.');
  return { activity, calculationRecord };
}
