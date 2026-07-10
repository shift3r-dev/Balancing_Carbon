import { Router } from 'express';
import { randomUUID } from 'node:crypto';

import { type AuthenticatedRequest, getProfile, requireAuth, requirePermission } from '../auth.js';
import { calculateFacilityEmissions, FUEL_EMISSION_FACTORS, GRID_ELECTRICITY_FACTOR } from '../facilityCalculations.js';
import { num, str } from '../requestUtils.js';
import { mapFacility } from '../rowMappers.js';
import { supabaseAdmin } from '../supabaseClients.js';

export function createFacilityRouter() {
  const router = Router();

  router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id);
      const { data, error } = await supabaseAdmin.from('facilities').select('*').eq('organisation_id', p.organisation_id);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ facilities: (data ?? []).map(mapFacility) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load facilities.' }); }
  });

  router.post('/', requireAuth, requirePermission('facility.create'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id), b = req.body ?? {};
      const name = str(b.name), location = str(b.location), industryType = str(b.industryType, b.industry_type);
      if (!name || !location || !industryType) return res.status(400).json({ error: 'Facility name, location and industry type are required.' });

      const reportingPeriod = str(b.reportingPeriod, b.reporting_period) || new Date().getFullYear().toString();
      const productionOutput = num(b.productionOutput, b.production_output);
      const electricity = num(b.electricityConsumption, b.electricity_consumption);
      const fuel = num(b.fuelConsumption, b.fuel_consumption);
      const renewable = num(b.renewableEnergyUsage, b.renewable_energy_usage);
      const fuelType = str(b.fuelType, b.fuel_type) || 'Diesel';
      const calculations = calculateFacilityEmissions({
        productionOutput,
        electricityConsumption: electricity,
        fuelConsumption: fuel,
        fuelType,
        renewableEnergyUsage: renewable,
      });
      const scope1 = calculations.emissionsScope1;
      const scope2 = calculations.emissionsScope2;
      const intensity = calculations.carbonIntensity;

      const row = {
        id: `fac-${randomUUID()}`, organisation_id: p.organisation_id, name, location,
        industry_type: industryType, production_output: productionOutput,
        production_unit: str(b.productionUnit, b.production_unit) || 'Tonnes',
        reporting_period: reportingPeriod, electricity_consumption: electricity,
        fuel_consumption: fuel, fuel_type: fuelType,
        renewable_energy_usage: renewable, emissions_scope_1: scope1, emissions_scope_2: scope2,
        carbon_intensity: intensity, esg_readiness_status: str(b.esgReadinessStatus, b.esg_readiness_status) || 'Needs Improvement',
      };
      const { data, error } = await supabaseAdmin.from('facilities').insert(row).select('*').single();
      if (error || !data) return res.status(500).json({ error: `Failed to create facility: ${error?.message ?? 'unknown error'}` });
      res.status(201).json({ success: true, facility: mapFacility(data) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create facility.' }); }
  });

  router.patch('/:id', requireAuth, requirePermission('facility.edit'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id);
      const b = req.body ?? {};

      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('facilities').select('*').eq('id', req.params.id)
        .eq('organisation_id', p.organisation_id).single();

      if (fetchError || !existing) return res.status(404).json({ error: 'Facility not found.' });

      const u: any = {};
      const mappings: [string, string, 's' | 'n'][] = [
        ['name','name','s'], ['location','location','s'], ['industryType','industry_type','s'],
        ['productionOutput','production_output','n'], ['productionUnit','production_unit','s'],
        ['reportingPeriod','reporting_period','s'], ['electricityConsumption','electricity_consumption','n'],
        ['fuelConsumption','fuel_consumption','n'], ['fuelType','fuel_type','s'],
        ['renewableEnergyUsage','renewable_energy_usage','n'],
        ['esgReadinessStatus','esg_readiness_status','s'],
      ];

      for (const [front, db, kind] of mappings) {
        if (b[front] !== undefined) u[db] = kind === 'n' ? num(b[front]) : str(b[front]);
      }

      const productionOutput = u.production_output ?? Number(existing.production_output ?? 0);
      const electricityConsumption = u.electricity_consumption ?? Number(existing.electricity_consumption ?? 0);
      const fuelConsumption = u.fuel_consumption ?? Number(existing.fuel_consumption ?? 0);
      const fuelType = u.fuel_type ?? existing.fuel_type ?? 'Diesel';
      const renewableEnergyUsage = u.renewable_energy_usage ?? Number(existing.renewable_energy_usage ?? 0);

      const calculations = calculateFacilityEmissions({
        productionOutput,
        electricityConsumption,
        fuelConsumption,
        fuelType,
        renewableEnergyUsage,
      });

      u.emissions_scope_1 = calculations.emissionsScope1;
      u.emissions_scope_2 = calculations.emissionsScope2;
      u.carbon_intensity = calculations.carbonIntensity;

      const { data, error } = await supabaseAdmin.from('facilities').update(u)
        .eq('id', req.params.id).eq('organisation_id', p.organisation_id)
        .select('*').single();

      if (error || !data) return res.status(500).json({ error: error?.message ?? 'Update failed.' });

      res.json({
        success: true,
        facility: mapFacility(data),
        calculation: {
          totalFootprint: calculations.totalFootprint,
          scope1: calculations.emissionsScope1,
          scope2: calculations.emissionsScope2,
          carbonIntensity: calculations.carbonIntensity,
          methodology: 'Activity data x emission factor',
          gridEmissionFactor: GRID_ELECTRICITY_FACTOR,
          fuelEmissionFactor: FUEL_EMISSION_FACTORS[fuelType] ?? 0,
        },
      });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'Update failed.' });
    }
  });

  router.delete('/:id', requireAuth, requirePermission('facility.delete'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id);
      const { data, error } = await supabaseAdmin.from('facilities').delete().eq('id', req.params.id).eq('organisation_id', p.organisation_id).select('id').maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      if (!data) return res.status(404).json({ error: 'Facility not found.' });
      res.json({ success: true, deletedFacilityId: req.params.id });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Delete failed.' }); }
  });

  return router;
}
