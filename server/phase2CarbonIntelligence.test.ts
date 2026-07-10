import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDataCompleteness,
  calculateExpectedVsObserved,
  calculateReductionScenario,
  compareMonthlyPerformance,
  generateDiagnosticFindings,
  type IntelligenceActivityRecord,
  type IntelligenceProductionRecord,
} from './phase2CarbonIntelligence.ts';

const records: IntelligenceActivityRecord[] = [
  { id: 'grid-mar', facilityId: 'fac-mohali', date: '2026-03-15', sourceType: 'Grid Electricity', quantity: 400000, unit: 'kWh', scope: 'scope-2', emissionsTCO2e: 286.4, emissionFactorId: 'ef-grid-electricity-india-2025-prototype', emissionFactorValue: 0.716, emissionFactorUnit: 'kgCO2e/kWh' },
  { id: 'grid-apr', facilityId: 'fac-mohali', date: '2026-04-15', sourceType: 'Grid Electricity', quantity: 425000, unit: 'kWh', scope: 'scope-2', emissionsTCO2e: 304.3, emissionFactorId: 'ef-grid-electricity-india-2025-prototype', emissionFactorValue: 0.716, emissionFactorUnit: 'kgCO2e/kWh' },
  { id: 'solar-apr', facilityId: 'fac-mohali', date: '2026-04-15', sourceType: 'On-site Solar', quantity: 85000, unit: 'kWh', scope: 'scope-2', emissionsTCO2e: 0 },
  { id: 'diesel-apr', facilityId: 'fac-mohali', date: '2026-04-15', sourceType: 'Diesel', quantity: 12500, unit: 'litre', scope: 'scope-1', emissionsTCO2e: 33.5 },
  { id: 'gas-apr', facilityId: 'fac-mohali', date: '2026-04-15', sourceType: 'Natural Gas', quantity: 48000, unit: 'SCM', scope: 'scope-1', emissionsTCO2e: 96.96 },
];

const production: IntelligenceProductionRecord[] = [
  { id: 'prod-mar', facilityId: 'fac-mohali', date: '2026-03-31', quantity: 1600, unit: 'tonnes' },
  { id: 'prod-apr', facilityId: 'fac-mohali', date: '2026-04-30', quantity: 1520, unit: 'tonnes' },
];

test('diagnostic percentage calculation identifies largest source share', () => {
  const findings = generateDiagnosticFindings({
    organisationId: 'org-a',
    facilityId: 'fac-mohali',
    activityRecords: records,
    productionRecords: production,
    questionnaireResponses: [],
    startDate: '2026-04-01',
    endDate: '2026-04-30',
  });
  const top = findings.find((finding) => finding.id.startsWith('finding-top-source'));
  assert.equal(top?.title, 'Grid Electricity is the largest emission source');
  assert.equal(top?.currentValue, 69.99);
});

test('month-over-month comparison and electricity intensity decomposition', () => {
  const comparison = compareMonthlyPerformance({
    activityRecords: records,
    productionRecords: production,
    currentMonth: '2026-04',
    previousMonth: '2026-03',
  });
  assert.equal(comparison.electricityChangePercent, 6.25);
  assert.equal(comparison.productionChangePercent, -5);
  assert.equal(comparison.previousElectricityIntensity, 250);
  assert.equal(comparison.currentElectricityIntensity, 279.61);
  assert.equal(comparison.electricityIntensityChangePercent, 11.84);
});

test('missing production data is not treated as zero', () => {
  const comparison = compareMonthlyPerformance({
    activityRecords: records,
    productionRecords: [],
    currentMonth: '2026-04',
    previousMonth: '2026-03',
  });
  assert.equal(comparison.currentElectricityIntensity, null);
  assert.ok(comparison.warnings.some((warning) => warning.includes('Production data is missing')));
});

test('incomplete comparison periods produce warnings', () => {
  const comparison = compareMonthlyPerformance({
    activityRecords: records.filter((record) => record.date.startsWith('2026-04')),
    productionRecords: production,
    currentMonth: '2026-04',
    previousMonth: '2026-03',
  });
  assert.ok(comparison.warnings.some((warning) => warning.includes('no activity records')));
});

test('data completeness distinguishes incomplete production coverage', () => {
  const completeness = calculateDataCompleteness({
    activityRecords: records,
    productionRecords: production.slice(0, 1),
    questionnaireResponses: [],
    startDate: '2026-01-01',
    endDate: '2026-12-31',
  });
  assert.equal(completeness.productionCoveragePercent, 8.33);
  assert.ok(completeness.warnings[0].includes('Production data completeness'));
});

test('scenario baseline immutability keeps actual activity records unchanged', () => {
  const before = JSON.stringify(records);
  calculateReductionScenario({
    scenarioType: 'grid-electricity-reduction',
    activityRecords: records,
    baselineStartDate: '2026-04-01',
    baselineEndDate: '2026-04-30',
    assumptions: { reductionPercent: 10 },
  });
  assert.equal(JSON.stringify(records), before);
});

test('grid electricity reduction scenario is transparent and exact', () => {
  const scenario = calculateReductionScenario({
    scenarioType: 'grid-electricity-reduction',
    activityRecords: records,
    baselineStartDate: '2026-04-01',
    baselineEndDate: '2026-04-30',
    assumptions: { reductionPercent: 10 },
  });
  assert.equal(scenario.baselineEmissionsTCO2e, 434.76);
  assert.equal(scenario.scenarioEmissionsTCO2e, 404.33);
  assert.equal(scenario.estimatedReductionTCO2e, 30.43);
  assert.equal((scenario.calculationMetadata as any).factorValue, 0.716);
});

test('diesel reduction scenario uses diesel factor only for changed variable', () => {
  const scenario = calculateReductionScenario({
    scenarioType: 'diesel-reduction',
    activityRecords: records,
    baselineStartDate: '2026-04-01',
    baselineEndDate: '2026-04-30',
    assumptions: { reductionPercent: 15 },
  });
  assert.equal(scenario.estimatedReductionTCO2e, 5.025);
});

test('invalid scenario percentage is rejected', () => {
  assert.throws(() => calculateReductionScenario({
    scenarioType: 'grid-electricity-reduction',
    activityRecords: records,
    baselineStartDate: '2026-04-01',
    baselineEndDate: '2026-04-30',
    assumptions: { reductionPercent: 500 },
  }), /between 0 and 100/);
  assert.throws(() => calculateReductionScenario({
    scenarioType: 'diesel-reduction',
    activityRecords: records,
    baselineStartDate: '2026-04-01',
    baselineEndDate: '2026-04-30',
    assumptions: { reductionPercent: Number.NaN },
  }), /finite/);
});

test('production-normalized efficiency rejects incompatible production units', () => {
  assert.throws(() => calculateReductionScenario({
    scenarioType: 'production-normalized-efficiency',
    activityRecords: records,
    productionRecords: [{ id: 'prod-units', facilityId: 'fac-mohali', date: '2026-04-30', quantity: 10000, unit: 'pieces' }],
    baselineStartDate: '2026-04-01',
    baselineEndDate: '2026-04-30',
    assumptions: { improvementPercent: 10 },
  }), /Tonne production data is required/);
});

test('baseline factor-version preservation is included in scenario metadata', () => {
  const scenario = calculateReductionScenario({
    scenarioType: 'grid-electricity-reduction',
    activityRecords: records,
    baselineStartDate: '2026-04-01',
    baselineEndDate: '2026-04-30',
    assumptions: { reductionPercent: 10 },
  });
  assert.deepEqual((scenario.calculationMetadata as any).baselineRecordIds, ['grid-apr', 'solar-apr', 'diesel-apr', 'gas-apr']);
  assert.equal((scenario.calculationMetadata as any).factorId, 'ef-grid-electricity-india-2025-prototype');
});

test('opportunity without quantitative estimate is represented by investigation finding', () => {
  const findings = generateDiagnosticFindings({
    activityRecords: records,
    productionRecords: production,
    questionnaireResponses: [
      { questionId: 'compressed-air-used', industry: 'Automotive Components / Precision Engineering', category: 'Compressed Air', questionText: 'Does the facility use compressed air?', answerType: 'yes-no', answer: 'yes' },
      { questionId: 'compressed-air-leak-survey', industry: 'Automotive Components / Precision Engineering', category: 'Compressed Air', questionText: 'Has a compressed-air leak survey been completed in the last 12 months?', answerType: 'yes-no', answer: 'no' },
    ],
    startDate: '2026-04-01',
    endDate: '2026-04-30',
  });
  const compressedAir = findings.find((finding) => finding.id === 'finding-compressed-air-leak-survey');
  assert.equal(compressedAir?.findingType, 'investigation-area');
  assert.equal(compressedAir?.currentValue, undefined);
});

test('expected vs observed calculation avoids causality wording', () => {
  const result = calculateExpectedVsObserved({
    expectedReductionPercent: 10,
    baselineIntensity: 280,
    observedIntensity: 255,
  });
  assert.equal(result.observedImprovementPercent, 8.9286);
  assert.equal(result.variancePercentagePoints, -1.0714);
  assert.match(result.wording, /does not prove project causality/i);
});
