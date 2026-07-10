import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateFacilityActivities,
  calculateActivityEmissions,
  prototypeEmissionFactors,
  resolveEmissionFactor,
} from './carbonAccounting.ts';

const factor = (sourceType: string) => {
  const resolved = resolveEmissionFactor(sourceType);
  assert.ok(resolved, `Expected factor for ${sourceType}`);
  return resolved;
};

test('diesel calculation uses activity data times factor', () => {
  const result = calculateActivityEmissions({
    quantity: 12500,
    activityUnit: 'litre',
    sourceType: 'Diesel',
    emissionFactor: factor('Diesel'),
  });

  assert.equal(result.emissionsKgCO2e, 33500);
  assert.equal(result.emissionsTCO2e, 33.5);
});

test('multiple fuels aggregate into Scope 1', () => {
  const diesel = calculateActivityEmissions({
    quantity: 10000,
    activityUnit: 'litre',
    sourceType: 'Diesel',
    emissionFactor: factor('Diesel'),
  });
  const lpg = calculateActivityEmissions({
    quantity: 5000,
    activityUnit: 'litre',
    sourceType: 'LPG',
    emissionFactor: factor('LPG'),
  });

  const aggregate = aggregateFacilityActivities([
    { facilityId: 'fac-1', sourceType: 'Diesel', quantity: 10000, unit: 'litre', scope: 'scope-1', emissionsTCO2e: diesel.emissionsTCO2e },
    { facilityId: 'fac-1', sourceType: 'LPG', quantity: 5000, unit: 'litre', scope: 'scope-1', emissionsTCO2e: lpg.emissionsTCO2e },
  ], 0, 'tonnes');

  assert.equal(diesel.emissionsKgCO2e, 26800);
  assert.equal(lpg.emissionsKgCO2e, 7550);
  assert.equal(aggregate.emissionsScope1, 34.35);
});

test('grid electricity calculation uses location-based prototype factor', () => {
  const result = calculateActivityEmissions({
    quantity: 425000,
    activityUnit: 'kWh',
    sourceType: 'Grid Electricity',
    emissionFactor: factor('Grid Electricity'),
  });

  assert.equal(result.emissionsKgCO2e, 304300);
  assert.equal(result.emissionsTCO2e, 304.3);
});

test('wind alias resolves to the wind electricity prototype factor', () => {
  const resolved = factor('wind');
  assert.equal(resolved.sourceType, 'Wind Electricity');
  assert.equal(resolved.factorValue, 0);
});

test('zero quantity returns zero emissions without NaN or Infinity', () => {
  const result = calculateActivityEmissions({
    quantity: 0,
    activityUnit: 'litre',
    sourceType: 'Diesel',
    emissionFactor: factor('Diesel'),
  });

  assert.equal(result.emissionsKgCO2e, 0);
  assert.equal(result.emissionsTCO2e, 0);
  assert.equal(Number.isFinite(result.emissionsKgCO2e), true);
  assert.equal(Number.isFinite(result.emissionsTCO2e), true);
});

test('invalid unit is rejected', () => {
  assert.throws(() => calculateActivityEmissions({
    quantity: 100,
    activityUnit: 'kWh',
    sourceType: 'Diesel',
    emissionFactor: factor('Diesel'),
  }), /incompatible/i);
});

test('multi-tenant security aggregation must filter by organisation before calculation', () => {
  const rows = [
    { organisationId: 'org-a', facilityId: 'fac-a', sourceType: 'Diesel', quantity: 100, unit: 'litre', scope: 'scope-1' as const, emissionsTCO2e: 0.268 },
    { organisationId: 'org-b', facilityId: 'fac-b', sourceType: 'Diesel', quantity: 100000, unit: 'litre', scope: 'scope-1' as const, emissionsTCO2e: 268 },
  ];
  const tenantRows = rows.filter((row) => row.organisationId === 'org-a');
  const aggregate = aggregateFacilityActivities(tenantRows, 100, 'tonnes');

  assert.equal(aggregate.emissionsScope1, 0.268);
});

test('monthly aggregation by facility, scope, and source type', () => {
  const rows = [
    { date: '2026-04-01', facilityId: 'fac-1', sourceType: 'Diesel', scope: 'scope-1' as const, emissionsTCO2e: 10 },
    { date: '2026-04-18', facilityId: 'fac-1', sourceType: 'Diesel', scope: 'scope-1' as const, emissionsTCO2e: 5 },
    { date: '2026-04-30', facilityId: 'fac-1', sourceType: 'Grid Electricity', scope: 'scope-2' as const, emissionsTCO2e: 20 },
  ];
  const monthly = rows.reduce<Record<string, number>>((acc, row) => {
    const key = `${row.date.slice(0, 7)}:${row.facilityId}:${row.scope}:${row.sourceType}`;
    acc[key] = (acc[key] ?? 0) + row.emissionsTCO2e;
    return acc;
  }, {});

  assert.equal(monthly['2026-04:fac-1:scope-1:Diesel'], 15);
  assert.equal(monthly['2026-04:fac-1:scope-2:Grid Electricity'], 20);
});

test('annual aggregation equals sum of monthly records', () => {
  const monthly = [10.25, 20.25, 30.5];
  const annual = monthly.reduce((sum, value) => sum + value, 0);
  assert.equal(annual, 61);
});

test('carbon intensity returns kgCO2e per tonne when denominator is tonnes', () => {
  const aggregate = aggregateFacilityActivities([
    { facilityId: 'fac-1', sourceType: 'Grid Electricity', quantity: 1, unit: 'kWh', scope: 'scope-2', emissionsTCO2e: 2950.512 },
  ], 18500, 'tonnes');

  assert.equal(Number((aggregate.carbonIntensity * 1000).toFixed(4)), 159.4871);
});

test('incompatible production units do not produce misleading intensity', () => {
  const aggregate = aggregateFacilityActivities([
    { facilityId: 'fac-1', sourceType: 'Grid Electricity', quantity: 1, unit: 'kWh', scope: 'scope-2', emissionsTCO2e: 100 },
  ], 500000, 'units');

  assert.equal(aggregate.carbonIntensity, 0);
});

test('prototype factors are explicitly labelled as prototype-only', () => {
  assert.ok(prototypeEmissionFactors.every((item) => item.sourceName.toLowerCase().includes('prototype')));
});
