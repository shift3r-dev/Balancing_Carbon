import { Router } from 'express';
import { randomUUID } from 'node:crypto';

import { type AuthenticatedRequest, getProfile, requireAuth, requirePermission } from '../auth.js';
import { num, optionalFinite, str } from '../requestUtils.js';
import { mapFacility } from '../rowMappers.js';
import { supabaseAdmin } from '../supabaseClients.js';
import { syncUsage } from '../entitlementService.js';
import { requireEntitlement, requireLimit, requireOperationalLicense } from '../middleware/entitlements.js';

async function facilityUsage(organisationId: string) {
  const { count, error } = await supabaseAdmin.from('facilities').select('*', { count: 'exact', head: true }).eq('organisation_id', organisationId).is('deleted_at', null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export function createFacilityRouter() {
  const router = Router();

  router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id);
      const { data, error } = await supabaseAdmin.from('facilities').select('*').eq('organisation_id', p.organisation_id).is('deleted_at', null);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ facilities: (data ?? []).map(mapFacility) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to load facilities.' }); }
  });

  router.post('/', requireAuth, requireOperationalLicense, requirePermission('facility.create'), requireEntitlement('facility.create'), requireLimit('facilities', facilityUsage), async (req: AuthenticatedRequest, res) => {
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
      const row = {
        id: `fac-${randomUUID()}`, organisation_id: p.organisation_id, name, location,
        industry_type: industryType, production_output: productionOutput,
        production_unit: str(b.productionUnit, b.production_unit) || 'Tonnes',
        reporting_period: reportingPeriod, electricity_consumption: electricity,
        fuel_consumption: fuel, fuel_type: fuelType,
        renewable_energy_usage: renewable, emissions_scope_1: 0, emissions_scope_2: 0,
        carbon_intensity: 0, esg_readiness_status: str(b.esgReadinessStatus, b.esg_readiness_status) || 'Needs Improvement',
        facility_code: str(b.facilityCode, b.facility_code), plant_type: str(b.plantType, b.plant_type), business_unit: str(b.businessUnit, b.business_unit), address: str(b.address), country: str(b.country) || 'India', latitude: optionalFinite(b.latitude), longitude: optionalFinite(b.longitude), operational_status: str(b.operationalStatus, b.operational_status) || 'active', operating_hours: optionalFinite(b.operatingHours ?? b.operating_hours), commission_date: str(b.commissionDate, b.commission_date) || null, primary_products: str(b.primaryProducts, b.primary_products), manager_name: str(b.managerName, b.manager_name), reporting_boundary: str(b.reportingBoundary, b.reporting_boundary),
      };
      const { data, error } = await supabaseAdmin.from('facilities').insert(row).select('*').single();
      if (error || !data) return res.status(500).json({ error: `Failed to create facility: ${error?.message ?? 'unknown error'}` });
      await syncUsage(p.organisation_id, 'facilities', await facilityUsage(p.organisation_id));
      res.status(201).json({ success: true, facility: mapFacility(data) });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create facility.' }); }
  });

  router.patch('/:id', requireAuth, requireOperationalLicense, requirePermission('facility.edit'), requireEntitlement('facility.edit'), async (req: AuthenticatedRequest, res) => {
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
        ['facilityCode','facility_code','s'], ['plantType','plant_type','s'], ['businessUnit','business_unit','s'], ['address','address','s'], ['country','country','s'], ['operationalStatus','operational_status','s'], ['primaryProducts','primary_products','s'], ['managerName','manager_name','s'], ['reportingBoundary','reporting_boundary','s'],
      ];

      for (const [front, db, kind] of mappings) {
        if (b[front] !== undefined) u[db] = kind === 'n' ? num(b[front]) : str(b[front]);
      }
      if (b.latitude !== undefined) u.latitude = optionalFinite(b.latitude);
      if (b.longitude !== undefined) u.longitude = optionalFinite(b.longitude);
      if (b.operatingHours !== undefined) u.operating_hours = optionalFinite(b.operatingHours);
      if (b.commissionDate !== undefined) u.commission_date = str(b.commissionDate) || null;

      const { data, error } = await supabaseAdmin.from('facilities').update(u)
        .eq('id', req.params.id).eq('organisation_id', p.organisation_id)
        .select('*').single();

      if (error || !data) return res.status(500).json({ error: error?.message ?? 'Update failed.' });

      res.json({ success: true, facility: mapFacility(data) });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'Update failed.' });
    }
  });

  router.delete('/:id', requireAuth, requireOperationalLicense, requirePermission('facility.delete'), requireEntitlement('facility.delete'), async (req: AuthenticatedRequest, res) => {
    try {
      const p = await getProfile(req.authUser!.id);
      const { data, error } = await supabaseAdmin.from('facilities').update({ deleted_at: new Date().toISOString(), archived_at: new Date().toISOString() }).eq('id', req.params.id).eq('organisation_id', p.organisation_id).is('deleted_at', null).select('id').maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      if (!data) return res.status(404).json({ error: 'Facility not found.' });
      await syncUsage(p.organisation_id, 'facilities', await facilityUsage(p.organisation_id));
      res.json({ success: true, deletedFacilityId: req.params.id });
    } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Delete failed.' }); }
  });

  router.post('/:id/archive', requireAuth, requireOperationalLicense, requirePermission('facility.edit'), requireEntitlement('facility.edit'), async (req: AuthenticatedRequest, res) => {
    const { data, error } = await supabaseAdmin.from('facilities').update({ archived_at: new Date().toISOString(), operational_status: 'archived' }).eq('id', req.params.id).eq('organisation_id', req.authorization!.organisationId).is('deleted_at', null).select('*').maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Facility not found.' });
    res.json({ success: true, facility: mapFacility(data) });
  });

  return router;
}
