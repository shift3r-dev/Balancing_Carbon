import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from './supabaseClients.js';

const defaults = { languageCode: 'en', countryCode: 'IN', regionCode: '', currencyCode: 'INR', timeZone: 'Asia/Kolkata', dateFormat: 'DD/MM/YYYY', numberFormat: 'en-IN', decimalPrecision: 2, thousandsSeparator: ',', measurementSystem: 'metric', reportingStandardCode: 'BRSR', theme: 'system' };
const map = (row: any) => ({ languageCode: row?.language_code ?? defaults.languageCode, countryCode: row?.country_code ?? defaults.countryCode, regionCode: row?.region_code ?? defaults.regionCode, currencyCode: row?.currency_code ?? defaults.currencyCode, timeZone: row?.time_zone ?? defaults.timeZone, dateFormat: row?.date_format ?? defaults.dateFormat, numberFormat: row?.number_format ?? defaults.numberFormat, decimalPrecision: Number(row?.decimal_precision ?? defaults.decimalPrecision), thousandsSeparator: row?.thousands_separator ?? defaults.thousandsSeparator, measurementSystem: row?.measurement_system ?? defaults.measurementSystem, reportingStandardCode: row?.reporting_standard_code ?? defaults.reportingStandardCode, theme: row?.theme ?? defaults.theme });

export async function getOrganizationLocalization(organisationId: string, userId?: string) {
  const [{ data: organization, error: organizationError }, { data: units, error: unitError }, user] = await Promise.all([
    supabaseAdmin.from('organization_localization').select('*').eq('organisation_id', organisationId).maybeSingle(),
    supabaseAdmin.from('organization_units').select('display_mode, unit_registry(*), unit_categories(code,name)').eq('organisation_id', organisationId),
    userId ? supabaseAdmin.from('user_localization').select('*').eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (organizationError || unitError || user.error) throw new Error(organizationError?.message ?? unitError?.message ?? user.error?.message ?? 'Unable to load localization.');
  const userOverrides = user.data ?? {};
  return { ...map(organization), languageCode: userOverrides.language_code || map(organization).languageCode, timeZone: userOverrides.time_zone || map(organization).timeZone, dateFormat: userOverrides.date_format || map(organization).dateFormat, numberFormat: userOverrides.number_format || map(organization).numberFormat, decimalPrecision: userOverrides.decimal_precision ?? map(organization).decimalPrecision, theme: userOverrides.theme || map(organization).theme, units: (units ?? []).map((row: any) => ({ categoryId: row.unit_categories?.id, category: row.unit_categories?.code, categoryName: row.unit_categories?.name, unitId: row.unit_registry?.id, unitCode: row.unit_registry?.code, unitName: row.unit_registry?.name, displayMode: row.display_mode })) };
}

export async function updateOrganizationLocalization(organisationId: string, input: any) {
  const values = { organisation_id: organisationId, language_code: input.languageCode ?? defaults.languageCode, country_code: input.countryCode ?? defaults.countryCode, region_code: input.regionCode ?? '', currency_code: input.currencyCode ?? defaults.currencyCode, time_zone: input.timeZone ?? defaults.timeZone, date_format: input.dateFormat ?? defaults.dateFormat, number_format: input.numberFormat ?? defaults.numberFormat, decimal_precision: Number.isInteger(Number(input.decimalPrecision)) ? Number(input.decimalPrecision) : defaults.decimalPrecision, thousands_separator: input.thousandsSeparator ?? defaults.thousandsSeparator, measurement_system: ['metric', 'imperial', 'hybrid'].includes(input.measurementSystem) ? input.measurementSystem : defaults.measurementSystem, reporting_standard_code: input.reportingStandardCode ?? defaults.reportingStandardCode, theme: input.theme ?? defaults.theme };
  const { error } = await supabaseAdmin.from('organization_localization').upsert(values, { onConflict: 'organisation_id' });
  if (error) throw new Error(error.message);
  if (Array.isArray(input.units)) for (const unit of input.units) {
    if (!unit?.categoryId || !unit?.unitId) continue;
    const { error: unitError } = await supabaseAdmin.from('organization_units').upsert({ id: `org-unit-${organisationId}-${unit.categoryId}`, organisation_id: organisationId, category_id: unit.categoryId, unit_id: unit.unitId, display_mode: unit.displayMode === 'fixed' ? 'fixed' : 'auto' }, { onConflict: 'organisation_id,category_id' });
    if (unitError) throw new Error(unitError.message);
  }
  return getOrganizationLocalization(organisationId);
}

export async function updateUserLocalization(organisationId: string, userId: string, input: any) {
  const { error } = await supabaseAdmin.from('user_localization').upsert({ id: `user-localization-${randomUUID()}`, user_id: userId, organisation_id: organisationId, language_code: input.languageCode || null, time_zone: input.timeZone || null, date_format: input.dateFormat || null, number_format: input.numberFormat || null, decimal_precision: input.decimalPrecision ?? null, theme: input.theme || null, unit_overrides: input.unitOverrides ?? {} }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
  return getOrganizationLocalization(organisationId, userId);
}

export async function localizationCatalog() {
  const { data, error } = await supabaseAdmin.from('reference_values').select('id, code, name, display_name, symbol, category_id, metadata, reference_categories(code)').eq('status', 'published').is('deleted_at', null).order('sort_order');
  if (error) throw new Error(error.message);
  const catalog: Record<string, any[]> = { countries: [], currencies: [], languages: [], timeZones: [], reportingStandards: [] };
  for (const row of data ?? []) {
    const target = ({ country: 'countries', currency: 'currencies', language: 'languages', timezone: 'timeZones', 'reporting-standard': 'reportingStandards' } as Record<string, string>)[(row as any).reference_categories?.code];
    if (target) catalog[target].push({ id: row.id, code: row.code, name: row.display_name || row.name, symbol: row.symbol, metadata: row.metadata });
  }
  return catalog;
}
