import {
  aggregateFacilityActivities,
  resolveEmissionFactor,
  type ActivityScope,
} from './carbonAccounting.js';
import { supabaseAdmin } from './supabaseClients.js';

/**
 * Keeps the denormalized facility summary in sync with activity records.
 * Energy write routes call this after a successful mutation.
 */
export async function refreshFacilityAggregates(organisationId: string, facilityId: string) {
  const { data: facility, error: facilityError } = await supabaseAdmin
    .from('facilities')
    .select('*')
    .eq('id', facilityId)
    .eq('organisation_id', organisationId)
    .single();
  if (facilityError || !facility) return;

  const { data: records, error: recordsError } = await supabaseAdmin
    .from('energy_records')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('facility_id', facilityId);
  if (recordsError) return;

  const aggregate = aggregateFacilityActivities(
    (records ?? []).map((record) => ({
      facilityId: record.facility_id,
      sourceType: record.source_type ?? record.energy_type,
      quantity: Number(record.quantity ?? 0),
      unit: record.unit ?? '',
      scope: (record.scope ?? resolveEmissionFactor(record.source_type ?? record.energy_type ?? '')?.scope ?? 'scope-1') as ActivityScope,
      emissionsTCO2e: Number(record.emissions_t_co2e ?? record.emissions ?? 0),
    })),
    Number(facility.production_output ?? 0),
    facility.production_unit ?? '',
  );

  await supabaseAdmin
    .from('facilities')
    .update({
      electricity_consumption: aggregate.electricityConsumption,
      renewable_energy_usage: aggregate.renewableEnergyUsage,
      fuel_consumption: aggregate.fuelConsumption,
      fuel_type: aggregate.fuelType,
      emissions_scope_1: aggregate.emissionsScope1,
      emissions_scope_2: aggregate.emissionsScope2,
      carbon_intensity: aggregate.carbonIntensity,
    })
    .eq('id', facilityId)
    .eq('organisation_id', organisationId);
}
