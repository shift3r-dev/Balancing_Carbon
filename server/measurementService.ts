import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from './supabaseClients.js';

type RegistryUnit = { id: string; code: string; name: string; symbol: string; category_id: string; measurement_system: string; canonical_unit_id: string; factor_to_canonical: number | null; conversion_formula: string; display_precision: number; status: string };
type ConversionRule = { id: string; from_unit_id: string; to_unit_id: string; multiplier: number | string; offset_value: number | string; formula: string };
type RegistryCache = { units: RegistryUnit[]; aliases: Array<{ unit_id: string; normalized_alias: string; language_code: string }>; rules: ConversionRule[]; categories: Array<{ id: string; code: string; canonical_unit_code: string }>; expiresAt: number };
export type ConvertedMeasurement = { inputValue: number; inputUnit: string; canonicalValue: number; canonicalUnit: string; factorValue: number; factorUnit: string; conversionFactor: number; conversionPath: string[] };

let cache: RegistryCache | null = null;
const CACHE_TTL_MS = 5 * 60_000;
const normalizeUnit = (value: string) => value.trim().toLocaleLowerCase().replaceAll('³', '3').replace(/\s+/g, ' ');

export function clearMeasurementCache() { cache = null; }

async function registry(): Promise<RegistryCache> {
  if (cache && cache.expiresAt > Date.now()) return cache;
  const [unitResult, aliasResult, ruleResult, categoryResult] = await Promise.all([
    supabaseAdmin.from('unit_registry').select('id, code, name, symbol, category_id, measurement_system, canonical_unit_id, factor_to_canonical, conversion_formula, display_precision, status').eq('status', 'active').is('deleted_at', null),
    supabaseAdmin.from('unit_aliases').select('unit_id, normalized_alias, language_code').eq('status', 'active').is('deleted_at', null),
    supabaseAdmin.from('unit_conversion_rules').select('id, from_unit_id, to_unit_id, multiplier, offset_value, formula').eq('status', 'active').is('deleted_at', null),
    supabaseAdmin.from('unit_categories').select('id, code, canonical_unit_code').eq('status', 'active').is('deleted_at', null),
  ]);
  const error = unitResult.error ?? aliasResult.error ?? ruleResult.error ?? categoryResult.error;
  if (error) throw new Error(error.message);
  cache = { units: (unitResult.data ?? []) as RegistryUnit[], aliases: aliasResult.data ?? [], rules: ruleResult.data ?? [], categories: categoryResult.data ?? [], expiresAt: Date.now() + CACHE_TTL_MS };
  return cache;
}

export async function getUnitRegistry(categoryCode?: string) {
  const data = await registry();
  const category = categoryCode ? data.categories.find((item) => item.code === categoryCode) : null;
  return data.units.filter((unit) => !category || unit.category_id === category.id);
}

export async function resolveUnit(value: string, languageCode = 'en') {
  const data = await registry();
  const key = normalizeUnit(value);
  const direct = data.units.find((unit) => normalizeUnit(unit.code) === key || normalizeUnit(unit.symbol) === key || normalizeUnit(unit.name) === key);
  if (direct) return direct;
  const alias = data.aliases.find((item) => item.normalized_alias === key && (item.language_code === languageCode || item.language_code === 'en'));
  return alias ? data.units.find((unit) => unit.id === alias.unit_id) ?? null : null;
}

type Edge = { to: string; multiplier: number; offset: number; ruleId: string };
function graph(data: RegistryCache) {
  const edges = new Map<string, Edge[]>();
  const add = (from: string, edge: Edge) => edges.set(from, [...(edges.get(from) ?? []), edge]);
  for (const rule of data.rules) {
    const multiplier = Number(rule.multiplier); const offset = Number(rule.offset_value);
    if (!Number.isFinite(multiplier) || multiplier === 0 || !Number.isFinite(offset)) continue;
    add(rule.from_unit_id, { to: rule.to_unit_id, multiplier, offset, ruleId: rule.id });
    add(rule.to_unit_id, { to: rule.from_unit_id, multiplier: 1 / multiplier, offset: -offset / multiplier, ruleId: `${rule.id}:reverse` });
  }
  for (const unit of data.units) {
    if (unit.conversion_formula !== 'linear' || !unit.canonical_unit_id || unit.canonical_unit_id === unit.id || unit.factor_to_canonical === null) continue;
    const multiplier = Number(unit.factor_to_canonical);
    if (!Number.isFinite(multiplier) || multiplier === 0) continue;
    add(unit.id, { to: unit.canonical_unit_id, multiplier, offset: 0, ruleId: `canonical:${unit.id}` });
    add(unit.canonical_unit_id, { to: unit.id, multiplier: 1 / multiplier, offset: 0, ruleId: `canonical:${unit.id}:reverse` });
  }
  return edges;
}

async function convertBetween(inputValue: number, fromUnit: RegistryUnit, toUnit: RegistryUnit) {
  if (!Number.isFinite(inputValue)) throw new Error('Measurement value must be finite.');
  if (fromUnit.id === toUnit.id) return { value: inputValue, factor: 1, path: [] as string[] };
  if (fromUnit.category_id !== toUnit.category_id) throw new Error(`Cannot convert ${fromUnit.code} to ${toUnit.code}: incompatible unit categories.`);
  const edges = graph(await registry());
  const queue: Array<{ unitId: string; multiplier: number; offset: number; path: string[] }> = [{ unitId: fromUnit.id, multiplier: 1, offset: 0, path: [] }];
  const visited = new Set<string>([fromUnit.id]);
  while (queue.length) {
    const current = queue.shift()!;
    for (const edge of edges.get(current.unitId) ?? []) {
      if (visited.has(edge.to)) continue;
      const multiplier = current.multiplier * edge.multiplier;
      const offset = current.offset * edge.multiplier + edge.offset;
      const path = [...current.path, edge.ruleId];
      if (edge.to === toUnit.id) return { value: inputValue * multiplier + offset, factor: multiplier, path };
      visited.add(edge.to); queue.push({ unitId: edge.to, multiplier, offset, path });
    }
  }
  throw new Error(`No active conversion path exists between ${fromUnit.code} and ${toUnit.code}.`);
}

async function logConversion(input: { organisationId?: string; userId?: string; fromUnitId?: string; toUnitId?: string; inputValue: number; outputValue: number; factor?: number; path: string[]; context: string; status: 'completed' | 'failed'; errorMessage?: string }) {
  const { error } = await supabaseAdmin.from('conversion_history').insert({ id: `conversion-${randomUUID()}`, organisation_id: input.organisationId ?? null, user_id: input.userId ?? null, from_unit_id: input.fromUnitId ?? null, to_unit_id: input.toUnitId ?? null, input_value: input.inputValue, output_value: input.outputValue, conversion_factor: input.factor ?? null, conversion_path: input.path, context: input.context, status: input.status, error_message: input.errorMessage ?? '' });
  if (error) console.warn(`Conversion history could not be recorded: ${error.message}`);
}

export async function convertMeasurement(input: { value: number; fromUnit: string; toUnit: string; organisationId?: string; userId?: string; context?: string; languageCode?: string; audit?: boolean }) {
  const from = await resolveUnit(input.fromUnit, input.languageCode); const to = await resolveUnit(input.toUnit, input.languageCode);
  if (!from || !to) throw new Error(`Unknown unit: ${!from ? input.fromUnit : input.toUnit}.`);
  try {
    const converted = await convertBetween(input.value, from, to);
    if (input.audit) await logConversion({ organisationId: input.organisationId, userId: input.userId, fromUnitId: from.id, toUnitId: to.id, inputValue: input.value, outputValue: converted.value, factor: converted.factor, path: converted.path, context: input.context ?? 'api', status: 'completed' });
    return { canonicalValue: converted.value, canonicalUnit: to.code, displayValue: converted.value, displayUnit: to.code, conversionFactor: converted.factor, conversionPath: converted.path, fromUnit: from.code, toUnit: to.code };
  } catch (error) {
    if (input.audit) await logConversion({ organisationId: input.organisationId, userId: input.userId, fromUnitId: from.id, toUnitId: to.id, inputValue: input.value, outputValue: 0, path: [], context: input.context ?? 'api', status: 'failed', errorMessage: error instanceof Error ? error.message : 'Conversion failed.' });
    throw error;
  }
}

export async function convertActivityMeasurement(input: { quantity: number; inputUnit: string; factorUnit: string; sourceType: string; organisationId: string; userId: string }) : Promise<ConvertedMeasurement> {
  const from = await resolveUnit(input.inputUnit); const factor = await resolveUnit(input.factorUnit);
  if (!from || !factor) throw new Error(`Unknown input or emission-factor unit (${input.inputUnit} -> ${input.factorUnit}).`);
  const { data: rule, error } = await supabaseAdmin.from('unit_validation_rules').select('*').eq('subject_type', 'emission-source').eq('subject_code', input.sourceType).eq('status', 'active').is('deleted_at', null).maybeSingle();
  if (error) throw new Error(error.message);
  const allowedCategories = (rule?.allowed_category_ids ?? []) as string[];
  if (allowedCategories.length && !allowedCategories.includes(from.category_id)) throw new Error(`${from.code} is not an allowed unit for ${input.sourceType}.`);
  if (from.category_id !== factor.category_id) throw new Error(`${from.code} cannot be used with the factor unit ${factor.code}.`);
  const canonical = rule?.canonical_unit_id ? (await registry()).units.find((unit) => unit.id === rule.canonical_unit_id) : (await registry()).units.find((unit) => unit.id === from.canonical_unit_id);
  if (!canonical) throw new Error(`No canonical unit has been configured for ${input.sourceType}.`);
  const [canonicalConverted, factorConverted] = await Promise.all([convertBetween(input.quantity, from, canonical), convertBetween(input.quantity, from, factor)]);
  await logConversion({ organisationId: input.organisationId, userId: input.userId, fromUnitId: from.id, toUnitId: canonical.id, inputValue: input.quantity, outputValue: canonicalConverted.value, factor: canonicalConverted.factor, path: canonicalConverted.path, context: 'activity-entry', status: 'completed' });
  return { inputValue: input.quantity, inputUnit: from.code, canonicalValue: canonicalConverted.value, canonicalUnit: canonical.code, factorValue: factorConverted.value, factorUnit: factor.code, conversionFactor: canonicalConverted.factor, conversionPath: canonicalConverted.path };
}

export async function smartDisplay(input: { value: number; unit: string; measurementSystem?: string; preferredUnit?: string }) {
  const from = await resolveUnit(input.unit); if (!from) throw new Error(`Unknown unit: ${input.unit}.`);
  const data = await registry();
  const candidates = data.units.filter((unit) => unit.category_id === from.category_id && (input.measurementSystem === 'hybrid' || !input.measurementSystem || unit.measurement_system === input.measurementSystem || unit.id === from.id));
  const preferred = input.preferredUnit ? await resolveUnit(input.preferredUnit) : null;
  const ranked = preferred ? [preferred, ...candidates.filter((unit) => unit.id !== preferred.id)] : candidates;
  let winner = from; let winnerValue = input.value;
  for (const candidate of ranked) {
    try { const converted = await convertBetween(input.value, from, candidate); const absolute = Math.abs(converted.value); if (absolute >= 1 && absolute < 1000) { winner = candidate; winnerValue = converted.value; break; } } catch { /* incompatible configured unit is ignored */ }
  }
  return { canonicalValue: input.value, canonicalUnit: from.code, displayValue: Number(winnerValue.toFixed(winner.display_precision)), displayUnit: winner.code, conversionFactor: winnerValue / (input.value || 1) };
}

export async function unitsForSource(sourceType: string) {
  const { data: rule, error } = await supabaseAdmin.from('unit_validation_rules').select('allowed_category_ids').eq('subject_type', 'emission-source').eq('subject_code', sourceType).eq('status', 'active').maybeSingle();
  if (error) throw new Error(error.message);
  const categories = (rule?.allowed_category_ids ?? []) as string[];
  return (await registry()).units.filter((unit) => categories.includes(unit.category_id));
}
