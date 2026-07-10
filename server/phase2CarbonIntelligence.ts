import { resolveEmissionFactor, type ActivityScope } from './carbonAccounting.js';

export type FindingType = 'fact' | 'observation' | 'questionnaire' | 'investigation-area' | 'data-gap';
export type FindingSeverity = 'info' | 'low' | 'medium' | 'high';
export type ScenarioType =
  | 'grid-electricity-reduction'
  | 'diesel-reduction'
  | 'renewable-electricity-substitution'
  | 'production-normalized-efficiency';

export interface IntelligenceActivityRecord {
  id?: string;
  facilityId: string;
  date: string;
  sourceType: string;
  activityType?: string;
  quantity: number;
  unit: string;
  scope: ActivityScope;
  emissionsTCO2e: number;
  emissionFactorId?: string;
  emissionFactorValue?: number;
  emissionFactorUnit?: string;
  auditTrail?: Record<string, unknown>;
}

export interface IntelligenceProductionRecord {
  id?: string;
  facilityId: string;
  date: string;
  quantity: number;
  unit: string;
}

export interface DiagnosticQuestionResponse {
  id?: string;
  facilityId?: string;
  questionId: string;
  industry: string;
  category: string;
  questionText: string;
  answerType: 'yes-no' | 'select' | 'number' | 'text';
  answer: string;
  evidenceReference?: string;
  updatedAt?: string;
}

export interface DiagnosticFinding {
  id: string;
  organisationId?: string;
  facilityId?: string;
  category: string;
  findingType: FindingType;
  severity: FindingSeverity;
  title: string;
  description: string;
  metricName?: string;
  currentValue?: number;
  previousValue?: number;
  unit?: string;
  evidence?: Record<string, unknown>;
  calculationMetadata?: Record<string, unknown>;
  generatedAt: string;
}

export interface DataCompletenessResult {
  activityCoveragePercent: number;
  productionCoveragePercent: number;
  questionnaireCompletionPercent: number;
  warnings: string[];
}

export interface MonthComparison {
  currentMonth: string;
  previousMonth: string;
  currentElectricityKWh: number;
  previousElectricityKWh: number;
  currentProductionTonnes: number | null;
  previousProductionTonnes: number | null;
  electricityChangePercent: number;
  productionChangePercent: number | null;
  currentElectricityIntensity: number | null;
  previousElectricityIntensity: number | null;
  electricityIntensityChangePercent: number | null;
  warnings: string[];
}

export interface ScenarioResult {
  scenarioType: ScenarioType;
  baselineStartDate: string;
  baselineEndDate: string;
  baselineEmissionsTCO2e: number;
  scenarioEmissionsTCO2e: number;
  estimatedReductionTCO2e: number;
  estimatedReductionPercent: number;
  calculationMetadata: Record<string, unknown>;
}

const round = (value: number, digits = 4) => Number(value.toFixed(digits));
const monthKey = (date: string) => date.slice(0, 7);
const isTonne = (unit: string) => {
  const normalized = unit.trim().toLowerCase();
  return normalized === 't' || normalized === 'ton' || normalized.includes('tonne');
};

export const diagnosticQuestionTemplate: Omit<DiagnosticQuestionResponse, 'answer'>[] = [
  { questionId: 'energy-monthly-monitoring', industry: 'Automotive Components / Precision Engineering', category: 'Energy Management', questionText: 'Does the facility monitor electricity consumption monthly?', answerType: 'yes-no' },
  { questionId: 'energy-major-machine-submetering', industry: 'Automotive Components / Precision Engineering', category: 'Energy Management', questionText: 'Are major machines individually sub-metered?', answerType: 'yes-no' },
  { questionId: 'energy-peak-demand-monitored', industry: 'Automotive Components / Precision Engineering', category: 'Energy Management', questionText: 'Is peak demand monitored?', answerType: 'yes-no' },
  { questionId: 'compressed-air-used', industry: 'Automotive Components / Precision Engineering', category: 'Compressed Air', questionText: 'Does the facility use compressed air?', answerType: 'yes-no' },
  { questionId: 'compressed-air-leak-survey', industry: 'Automotive Components / Precision Engineering', category: 'Compressed Air', questionText: 'Has a compressed-air leak survey been completed in the last 12 months?', answerType: 'yes-no' },
  { questionId: 'motors-vfd-used', industry: 'Automotive Components / Precision Engineering', category: 'Motors and Machinery', questionText: 'Are variable frequency drives used where technically appropriate?', answerType: 'yes-no' },
  { questionId: 'process-heating-used', industry: 'Automotive Components / Precision Engineering', category: 'Process Heating', questionText: 'Does the facility use furnaces, boilers, ovens, or other thermal processes?', answerType: 'yes-no' },
  { questionId: 'waste-heat-recovery', industry: 'Automotive Components / Precision Engineering', category: 'Process Heating', questionText: 'Is exhaust or waste heat recovery used?', answerType: 'yes-no' },
  { questionId: 'renewable-target', industry: 'Automotive Components / Precision Engineering', category: 'Renewable Energy', questionText: 'Is there an approved renewable-energy target?', answerType: 'yes-no' },
  { questionId: 'monthly-deviations-investigated', industry: 'Automotive Components / Precision Engineering', category: 'Management', questionText: 'Are monthly deviations investigated?', answerType: 'yes-no' },
];

function filterPeriod<T extends { date: string }>(rows: T[], startDate: string, endDate: string) {
  return rows.filter((row) => row.date >= startDate && row.date <= endDate);
}

function sumEmissions(records: IntelligenceActivityRecord[]) {
  return records.reduce((sum, record) => sum + Number(record.emissionsTCO2e || 0), 0);
}

function sumSourceQuantity(records: IntelligenceActivityRecord[], sourceType: string) {
  return records
    .filter((record) => record.sourceType.toLowerCase() === sourceType.toLowerCase())
    .reduce((sum, record) => sum + Number(record.quantity || 0), 0);
}

function sumProductionTonnes(records: IntelligenceProductionRecord[]) {
  const tonneRows = records.filter((record) => isTonne(record.unit));
  if (tonneRows.length === 0) return null;
  return tonneRows.reduce((sum, record) => sum + Number(record.quantity || 0), 0);
}

export function calculateDataCompleteness(input: {
  activityRecords: IntelligenceActivityRecord[];
  productionRecords: IntelligenceProductionRecord[];
  questionnaireResponses: DiagnosticQuestionResponse[];
  startDate: string;
  endDate: string;
  expectedMonths?: number;
}): DataCompletenessResult {
  const expectedMonths = input.expectedMonths ?? 12;
  const activityMonths = new Set(filterPeriod(input.activityRecords, input.startDate, input.endDate).map((record) => monthKey(record.date)));
  const productionMonths = new Set(filterPeriod(input.productionRecords, input.startDate, input.endDate).map((record) => monthKey(record.date)));
  const answered = input.questionnaireResponses.filter((response) => response.answer.trim() !== '').length;
  const warnings: string[] = [];
  const activityCoveragePercent = round((Math.min(activityMonths.size, expectedMonths) / expectedMonths) * 100, 2);
  const productionCoveragePercent = round((Math.min(productionMonths.size, expectedMonths) / expectedMonths) * 100, 2);
  const questionnaireCompletionPercent = round((answered / diagnosticQuestionTemplate.length) * 100, 2);
  if (productionCoveragePercent < 100) warnings.push(`Production data completeness: ${productionCoveragePercent}%. Annual carbon-intensity analysis is incomplete.`);
  if (activityCoveragePercent < 100) warnings.push(`Activity data completeness: ${activityCoveragePercent}%. Missing months are not treated as zero consumption.`);
  if (questionnaireCompletionPercent < 100) warnings.push(`Diagnostic questionnaire completion: ${questionnaireCompletionPercent}%. Some investigation areas may be hidden.`);
  return { activityCoveragePercent, productionCoveragePercent, questionnaireCompletionPercent, warnings };
}

export function compareMonthlyPerformance(input: {
  activityRecords: IntelligenceActivityRecord[];
  productionRecords: IntelligenceProductionRecord[];
  currentMonth: string;
  previousMonth: string;
}): MonthComparison {
  const currentActivities = input.activityRecords.filter((record) => monthKey(record.date) === input.currentMonth);
  const previousActivities = input.activityRecords.filter((record) => monthKey(record.date) === input.previousMonth);
  const currentProductionRecords = input.productionRecords.filter((record) => monthKey(record.date) === input.currentMonth);
  const previousProductionRecords = input.productionRecords.filter((record) => monthKey(record.date) === input.previousMonth);
  const currentElectricityKWh = sumSourceQuantity(currentActivities, 'Grid Electricity');
  const previousElectricityKWh = sumSourceQuantity(previousActivities, 'Grid Electricity');
  const currentProductionTonnes = sumProductionTonnes(currentProductionRecords);
  const previousProductionTonnes = sumProductionTonnes(previousProductionRecords);
  const warnings: string[] = [];
  if (currentActivities.length === 0 || previousActivities.length === 0) warnings.push('One comparison month has no activity records; do not treat missing records as zero.');
  if (currentProductionTonnes === null || previousProductionTonnes === null) warnings.push('Production data is missing or incompatible for one comparison month.');
  const currentElectricityIntensity = currentProductionTonnes && currentProductionTonnes > 0 ? currentElectricityKWh / currentProductionTonnes : null;
  const previousElectricityIntensity = previousProductionTonnes && previousProductionTonnes > 0 ? previousElectricityKWh / previousProductionTonnes : null;
  return {
    currentMonth: input.currentMonth,
    previousMonth: input.previousMonth,
    currentElectricityKWh: round(currentElectricityKWh, 2),
    previousElectricityKWh: round(previousElectricityKWh, 2),
    currentProductionTonnes,
    previousProductionTonnes,
    electricityChangePercent: previousElectricityKWh > 0 ? round(((currentElectricityKWh - previousElectricityKWh) / previousElectricityKWh) * 100, 2) : 0,
    productionChangePercent: currentProductionTonnes !== null && previousProductionTonnes && previousProductionTonnes > 0
      ? round(((currentProductionTonnes - previousProductionTonnes) / previousProductionTonnes) * 100, 2)
      : null,
    currentElectricityIntensity: currentElectricityIntensity === null ? null : round(currentElectricityIntensity, 2),
    previousElectricityIntensity: previousElectricityIntensity === null ? null : round(previousElectricityIntensity, 2),
    electricityIntensityChangePercent: currentElectricityIntensity !== null && previousElectricityIntensity && previousElectricityIntensity > 0
      ? round(((currentElectricityIntensity - previousElectricityIntensity) / previousElectricityIntensity) * 100, 2)
      : null,
    warnings,
  };
}

export function generateDiagnosticFindings(input: {
  organisationId?: string;
  facilityId?: string;
  activityRecords: IntelligenceActivityRecord[];
  productionRecords: IntelligenceProductionRecord[];
  questionnaireResponses: DiagnosticQuestionResponse[];
  startDate: string;
  endDate: string;
  currentMonth?: string;
  previousMonth?: string;
}): DiagnosticFinding[] {
  const generatedAt = new Date().toISOString();
  const records = filterPeriod(input.activityRecords, input.startDate, input.endDate);
  const total = sumEmissions(records);
  const sourceTotals = new Map<string, number>();
  for (const record of records) sourceTotals.set(record.sourceType, (sourceTotals.get(record.sourceType) ?? 0) + record.emissionsTCO2e);
  const [topSource, topEmissions] = [...sourceTotals.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  const findings: DiagnosticFinding[] = [];
  if (topSource && total > 0) {
    const share = (topEmissions / total) * 100;
    findings.push({
      id: `finding-top-source-${topSource.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      organisationId: input.organisationId,
      facilityId: input.facilityId,
      category: 'Source Mix',
      findingType: 'fact',
      severity: share > 60 ? 'high' : 'medium',
      title: `${topSource} is the largest emission source`,
      description: `${topSource} contributed ${round(share, 1)}% of operational emissions for the selected period.`,
      metricName: 'source_emissions_share',
      currentValue: round(share, 2),
      unit: '%',
      evidence: { sourceType: topSource, emissionsTCO2e: round(topEmissions, 4), totalEmissionsTCO2e: round(total, 4) },
      calculationMetadata: { methodology: 'source_emissions / total_operational_emissions' },
      generatedAt,
    });
  }
  const completeness = calculateDataCompleteness({
    activityRecords: input.activityRecords,
    productionRecords: input.productionRecords,
    questionnaireResponses: input.questionnaireResponses,
    startDate: input.startDate,
    endDate: input.endDate,
  });
  for (const warning of completeness.warnings) {
    findings.push({
      id: `finding-data-gap-${findings.length + 1}`,
      organisationId: input.organisationId,
      facilityId: input.facilityId,
      category: 'Data Completeness',
      findingType: 'data-gap',
      severity: 'medium',
      title: warning.split(':')[0],
      description: warning,
      evidence: { ...completeness },
      generatedAt,
    });
  }
  if (input.currentMonth && input.previousMonth) {
    const comparison = compareMonthlyPerformance({
      activityRecords: input.activityRecords,
      productionRecords: input.productionRecords,
      currentMonth: input.currentMonth,
      previousMonth: input.previousMonth,
    });
    if ((comparison.electricityIntensityChangePercent ?? 0) > 5) {
      findings.push({
        id: 'finding-electricity-intensity-increased',
        organisationId: input.organisationId,
        facilityId: input.facilityId,
        category: 'Energy Intensity',
        findingType: 'observation',
        severity: 'high',
        title: 'Electricity intensity increased while production declined or changed',
        description: `Grid electricity changed by ${comparison.electricityChangePercent}% and electricity intensity changed by ${comparison.electricityIntensityChangePercent}% versus ${comparison.previousMonth}.`,
        metricName: 'electricity_intensity',
        currentValue: comparison.currentElectricityIntensity ?? undefined,
        previousValue: comparison.previousElectricityIntensity ?? undefined,
        unit: 'kWh/tonne',
        evidence: { comparison },
        calculationMetadata: { methodology: 'grid_electricity_kwh / tonne_production' },
        generatedAt,
      });
    }
  }
  const compressedAirUsed = input.questionnaireResponses.find((item) => item.questionId === 'compressed-air-used')?.answer.toLowerCase();
  const leakSurvey = input.questionnaireResponses.find((item) => item.questionId === 'compressed-air-leak-survey')?.answer.toLowerCase();
  if (compressedAirUsed === 'yes' && leakSurvey === 'no') {
    findings.push({
      id: 'finding-compressed-air-leak-survey',
      organisationId: input.organisationId,
      facilityId: input.facilityId,
      category: 'Compressed Air',
      findingType: 'investigation-area',
      severity: 'medium',
      title: 'Compressed-air system may warrant investigation',
      description: 'The facility reports compressed-air use but has not completed a leak survey in the past 12 months.',
      evidence: { compressedAirUsed, leakSurvey },
      generatedAt,
    });
  }
  return findings;
}

function validatePercent(percent: number) {
  if (!Number.isFinite(percent)) throw new Error('Scenario percentage must be finite.');
  if (percent < 0 || percent > 100) throw new Error('Scenario percentage must be between 0 and 100.');
}

export function calculateReductionScenario(input: {
  scenarioType: ScenarioType;
  activityRecords: IntelligenceActivityRecord[];
  productionRecords?: IntelligenceProductionRecord[];
  baselineStartDate: string;
  baselineEndDate: string;
  assumptions: Record<string, unknown>;
}): ScenarioResult {
  const records = filterPeriod(input.activityRecords, input.baselineStartDate, input.baselineEndDate);
  const baselineEmissionsTCO2e = round(sumEmissions(records), 6);
  let scenarioEmissionsTCO2e = baselineEmissionsTCO2e;
  const metadata: Record<string, unknown> = { scenarioType: input.scenarioType, baselineRecordIds: records.map((record) => record.id).filter(Boolean) };

  if (input.scenarioType === 'grid-electricity-reduction') {
    const reductionPercent = Number(input.assumptions.reductionPercent);
    validatePercent(reductionPercent);
    const factor = resolveEmissionFactor('Grid Electricity');
    if (!factor) throw new Error('Grid electricity factor is unavailable.');
    const baselineKWh = sumSourceQuantity(records, 'Grid Electricity');
    const scenarioKWh = baselineKWh * (1 - reductionPercent / 100);
    const baselineGridEmissions = (baselineKWh * factor.factorValue) / 1000;
    const scenarioGridEmissions = (scenarioKWh * factor.factorValue) / 1000;
    scenarioEmissionsTCO2e = baselineEmissionsTCO2e - baselineGridEmissions + scenarioGridEmissions;
    Object.assign(metadata, { baselineKWh, scenarioKWh, reductionPercent, factorId: factor.id, factorValue: factor.factorValue, factorUnit: factor.factorUnit, factorSource: factor.sourceName, formula: 'scenario_kwh = baseline_kwh * (1 - reduction_percent); emissions = kwh * factor / 1000' });
  }
  if (input.scenarioType === 'diesel-reduction') {
    const reductionPercent = Number(input.assumptions.reductionPercent);
    validatePercent(reductionPercent);
    const factor = resolveEmissionFactor('Diesel');
    if (!factor) throw new Error('Diesel factor is unavailable.');
    const baselineLitres = sumSourceQuantity(records, 'Diesel');
    const scenarioLitres = baselineLitres * (1 - reductionPercent / 100);
    const baselineDieselEmissions = (baselineLitres * factor.factorValue) / 1000;
    const scenarioDieselEmissions = (scenarioLitres * factor.factorValue) / 1000;
    scenarioEmissionsTCO2e = baselineEmissionsTCO2e - baselineDieselEmissions + scenarioDieselEmissions;
    Object.assign(metadata, { baselineLitres, scenarioLitres, reductionPercent, factorId: factor.id, factorValue: factor.factorValue, factorUnit: factor.factorUnit, factorSource: factor.sourceName, formula: 'scenario_litres = baseline_litres * (1 - reduction_percent); emissions = litres * factor / 1000' });
  }
  if (input.scenarioType === 'renewable-electricity-substitution') {
    const substitutionPercent = Number(input.assumptions.substitutionPercent);
    validatePercent(substitutionPercent);
    const factor = resolveEmissionFactor('Grid Electricity');
    if (!factor) throw new Error('Grid electricity factor is unavailable.');
    const baselineKWh = sumSourceQuantity(records, 'Grid Electricity');
    const substitutedKWh = baselineKWh * (substitutionPercent / 100);
    const scenarioGridKWh = baselineKWh - substitutedKWh;
    const baselineGridEmissions = (baselineKWh * factor.factorValue) / 1000;
    const scenarioGridEmissions = (scenarioGridKWh * factor.factorValue) / 1000;
    scenarioEmissionsTCO2e = baselineEmissionsTCO2e - baselineGridEmissions + scenarioGridEmissions;
    Object.assign(metadata, { accountingTreatment: 'Operational energy substitution estimate using location-based grid factor. This is not a market-based Scope 2 claim.', baselineKWh, substitutedKWh, scenarioGridKWh, substitutionPercent, factorId: factor.id, factorValue: factor.factorValue, factorUnit: factor.factorUnit, factorSource: factor.sourceName, formula: 'scenario_grid_kwh = baseline_grid_kwh * (1 - substitution_percent)' });
  }
  if (input.scenarioType === 'production-normalized-efficiency') {
    const improvementPercent = Number(input.assumptions.improvementPercent);
    validatePercent(improvementPercent);
    const factor = resolveEmissionFactor('Grid Electricity');
    if (!factor) throw new Error('Grid electricity factor is unavailable.');
    const production = sumProductionTonnes(filterPeriod(input.productionRecords ?? [], input.baselineStartDate, input.baselineEndDate));
    if (!production || production <= 0) throw new Error('Tonne production data is required for production-normalized efficiency scenarios.');
    const baselineKWh = sumSourceQuantity(records, 'Grid Electricity');
    const baselineIntensity = baselineKWh / production;
    const scenarioIntensity = baselineIntensity * (1 - improvementPercent / 100);
    const scenarioKWh = scenarioIntensity * production;
    const baselineGridEmissions = (baselineKWh * factor.factorValue) / 1000;
    const scenarioGridEmissions = (scenarioKWh * factor.factorValue) / 1000;
    scenarioEmissionsTCO2e = baselineEmissionsTCO2e - baselineGridEmissions + scenarioGridEmissions;
    Object.assign(metadata, { productionTonnes: production, baselineIntensity, scenarioIntensity, baselineKWh, scenarioKWh, improvementPercent, factorId: factor.id, factorValue: factor.factorValue, factorUnit: factor.factorUnit, factorSource: factor.sourceName, formula: 'scenario_kwh_per_tonne = baseline_kwh_per_tonne * (1 - improvement_percent)' });
  }

  scenarioEmissionsTCO2e = round(scenarioEmissionsTCO2e, 6);
  const estimatedReductionTCO2e = round(baselineEmissionsTCO2e - scenarioEmissionsTCO2e, 6);
  return {
    scenarioType: input.scenarioType,
    baselineStartDate: input.baselineStartDate,
    baselineEndDate: input.baselineEndDate,
    baselineEmissionsTCO2e,
    scenarioEmissionsTCO2e,
    estimatedReductionTCO2e,
    estimatedReductionPercent: baselineEmissionsTCO2e > 0 ? round((estimatedReductionTCO2e / baselineEmissionsTCO2e) * 100, 4) : 0,
    calculationMetadata: metadata,
  };
}

export function calculateExpectedVsObserved(input: {
  expectedReductionPercent: number;
  baselineIntensity: number;
  observedIntensity: number;
}) {
  if (!Number.isFinite(input.expectedReductionPercent) || !Number.isFinite(input.baselineIntensity) || !Number.isFinite(input.observedIntensity)) {
    throw new Error('Expected and observed values must be finite.');
  }
  if (input.baselineIntensity <= 0) throw new Error('Baseline intensity must be greater than zero.');
  const observedImprovementPercent = ((input.baselineIntensity - input.observedIntensity) / input.baselineIntensity) * 100;
  return {
    expectedReductionPercent: round(input.expectedReductionPercent, 4),
    observedImprovementPercent: round(observedImprovementPercent, 4),
    variancePercentagePoints: round(observedImprovementPercent - input.expectedReductionPercent, 4),
    wording: 'Observed performance change only. This does not prove project causality or verified carbon reduction.',
  };
}
