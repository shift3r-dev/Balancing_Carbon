export type ActivityScope = 'scope-1' | 'scope-2' | 'scope-3';
export type CalculationMethod = 'activity-factor' | 'distance-factor' | 'spend-factor' | 'refrigerant-balance' | 'fuel-efficiency' | 'supplier-specific';
export type ActivityType =
  | 'electricity'
  | 'renewable-electricity'
  | 'fuel'
  | 'steam'
  | 'heat'
  | 'other';

export interface EmissionFactor {
  id: string;
  sourceType: string;
  displayName: string;
  scope: ActivityScope;
  factorValue: number;
  factorUnit: string;
  activityUnit: string;
  compatibleUnits: string[];
  geography: string;
  reportingYear: string;
  methodology: string;
  sourceName: string;
  sourceReference: string;
  version: string;
  validFrom: string;
  validTo?: string;
  isActive: boolean;
  notes: string;
}

export interface ActivityCalculationInput {
  quantity: number | string;
  activityUnit: string;
  sourceType: string;
  emissionFactor: EmissionFactor;
}

export interface ActivityCalculationResult {
  quantity: number;
  normalizedQuantity: number;
  normalizedUnit: string;
  emissionFactorId: string;
  emissionFactorValue: number;
  emissionFactorUnit: string;
  emissionsKgCO2e: number;
  emissionsTCO2e: number;
  methodology: string;
  factorSource: string;
  factorVersion: string;
  calculatedAt: string;
}

export interface ProfessionalCalculationInput extends ActivityCalculationInput {
  method?: CalculationMethod;
  beginningInventory?: number | string;
  purchases?: number | string;
  endingInventory?: number | string;
  recoveredOrReturned?: number | string;
  distance?: number | string;
  fuelEfficiency?: number | string;
}

export interface ProfessionalCalculationResult extends ActivityCalculationResult {
  calculationMethod: CalculationMethod;
  formula: string;
  inputSnapshot: Record<string, number | string>;
  confidenceScore: number;
  warnings: string[];
}

export interface AggregatedActivityRecord {
  facilityId: string;
  sourceType: string;
  quantity: number;
  unit: string;
  scope: ActivityScope;
  emissionsTCO2e: number;
}

export interface FacilityAggregate {
  electricityConsumption: number;
  renewableEnergyUsage: number;
  fuelConsumption: number;
  fuelType: string;
  emissionsScope1: number;
  emissionsScope2: number;
  carbonIntensity: number;
  totalEmissions: number;
  renewableShare: number;
  highestEmittingSource: string;
}

const unitAliases: Record<string, string> = {
  kwh: 'kWh',
  kwhr: 'kWh',
  litre: 'litre',
  liter: 'litre',
  litres: 'litre',
  liters: 'litre',
  l: 'litre',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  scm: 'SCM',
  m3: 'SCM',
  'm³': 'SCM',
  tonne: 'tonne',
  tonnes: 'tonne',
  mwh: 'MWh',
  gj: 'GJ',
  nm3: 'Nm3',
  'tonne-km': 'tonne-km',
  'passenger-km': 'passenger-km',
  'vehicle-km': 'vehicle-km',
  inr: 'INR',
  usd: 'USD',
};

export const prototypeEmissionFactors: EmissionFactor[] = [
  {
    id: 'ef-grid-electricity-india-2025-prototype',
    sourceType: 'Grid Electricity',
    displayName: 'Grid electricity, location-based',
    scope: 'scope-2',
    factorValue: 0.716,
    factorUnit: 'kgCO2e/kWh',
    activityUnit: 'kWh',
    compatibleUnits: ['kWh'],
    geography: 'India',
    reportingYear: '2025',
    methodology: 'Scope 2 location-based electricity emissions',
    sourceName: 'Prototype factor - replace with authoritative source before audit use',
    sourceReference: 'Prototype registry seeded in application code',
    version: '1.0',
    validFrom: '2025-04-01',
    isActive: true,
    notes: 'Prototype grid factor retained for product testing; do not present as audit-grade.',
  },
  {
    id: 'ef-onsite-solar-india-2025-prototype',
    sourceType: 'On-site Solar',
    displayName: 'On-site solar electricity',
    scope: 'scope-2',
    factorValue: 0,
    factorUnit: 'kgCO2e/kWh',
    activityUnit: 'kWh',
    compatibleUnits: ['kWh'],
    geography: 'India',
    reportingYear: '2025',
    methodology: 'Zero direct operational emissions for on-site renewable generation',
    sourceName: 'Prototype factor - replace with documented accounting policy before audit use',
    sourceReference: 'Prototype registry seeded in application code',
    version: '1.0',
    validFrom: '2025-04-01',
    isActive: true,
    notes: 'This is not market-based Scope 2 accounting and does not model certificates or residual mix.',
  },
  {
    id: 'ef-onsite-wind-india-2025-prototype',
    sourceType: 'On-site Wind',
    displayName: 'On-site wind electricity',
    scope: 'scope-2',
    factorValue: 0,
    factorUnit: 'kgCO2e/kWh',
    activityUnit: 'kWh',
    compatibleUnits: ['kWh'],
    geography: 'India',
    reportingYear: '2025',
    methodology: 'Zero direct operational emissions for renewable generation',
    sourceName: 'Prototype factor - replace with documented accounting policy before audit use',
    sourceReference: 'Prototype registry seeded in application code',
    version: '1.0',
    validFrom: '2025-04-01',
    isActive: true,
    notes: 'This is not market-based Scope 2 accounting and does not model certificates or residual mix.',
  },
  {
    id: 'ef-diesel-india-2025-prototype',
    sourceType: 'Diesel',
    displayName: 'Diesel combustion',
    scope: 'scope-1',
    factorValue: 2.68,
    factorUnit: 'kgCO2e/litre',
    activityUnit: 'litre',
    compatibleUnits: ['litre'],
    geography: 'India',
    reportingYear: '2025',
    methodology: 'Combustion emission factor',
    sourceName: 'Prototype factor - replace with authoritative source before audit use',
    sourceReference: 'Prototype registry seeded in application code',
    version: '1.0',
    validFrom: '2025-04-01',
    isActive: true,
    notes: 'Prototype factor retained for continuity with existing demo data.',
  },
  {
    id: 'ef-petrol-india-2025-prototype',
    sourceType: 'Petrol',
    displayName: 'Petrol combustion',
    scope: 'scope-1',
    factorValue: 2.31,
    factorUnit: 'kgCO2e/litre',
    activityUnit: 'litre',
    compatibleUnits: ['litre'],
    geography: 'India',
    reportingYear: '2025',
    methodology: 'Combustion emission factor',
    sourceName: 'Prototype factor - replace with authoritative source before audit use',
    sourceReference: 'Prototype registry seeded in application code',
    version: '1.0',
    validFrom: '2025-04-01',
    isActive: true,
    notes: 'Prototype factor retained for continuity with existing demo data.',
  },
  {
    id: 'ef-lpg-india-2025-prototype',
    sourceType: 'LPG',
    displayName: 'LPG combustion',
    scope: 'scope-1',
    factorValue: 1.51,
    factorUnit: 'kgCO2e/litre',
    activityUnit: 'litre',
    compatibleUnits: ['litre'],
    geography: 'India',
    reportingYear: '2025',
    methodology: 'Combustion emission factor',
    sourceName: 'Prototype factor - replace with authoritative source before audit use',
    sourceReference: 'Prototype registry seeded in application code',
    version: '1.0',
    validFrom: '2025-04-01',
    isActive: true,
    notes: 'Prototype factor chosen to match existing product test expectations.',
  },
  {
    id: 'ef-natural-gas-india-2025-prototype',
    sourceType: 'Natural Gas',
    displayName: 'Natural gas combustion',
    scope: 'scope-1',
    factorValue: 2.02,
    factorUnit: 'kgCO2e/SCM',
    activityUnit: 'SCM',
    compatibleUnits: ['SCM'],
    geography: 'India',
    reportingYear: '2025',
    methodology: 'Combustion emission factor',
    sourceName: 'Prototype factor - replace with authoritative source before audit use',
    sourceReference: 'Prototype registry seeded in application code',
    version: '1.0',
    validFrom: '2025-04-01',
    isActive: true,
    notes: 'SCM and m3 are treated as compatible aliases in this prototype.',
  },
  {
    id: 'ef-furnace-oil-india-2025-prototype',
    sourceType: 'Furnace Oil',
    displayName: 'Furnace oil combustion',
    scope: 'scope-1',
    factorValue: 3.15,
    factorUnit: 'kgCO2e/litre',
    activityUnit: 'litre',
    compatibleUnits: ['litre'],
    geography: 'India',
    reportingYear: '2025',
    methodology: 'Combustion emission factor',
    sourceName: 'Prototype factor - replace with authoritative source before audit use',
    sourceReference: 'Prototype registry seeded in application code',
    version: '1.0',
    validFrom: '2025-04-01',
    isActive: true,
    notes: 'Prototype factor retained for continuity with existing demo data.',
  },
  {
    id: 'ef-biomass-india-2025-prototype',
    sourceType: 'Biomass',
    displayName: 'Biomass combustion component',
    scope: 'scope-1',
    factorValue: 0.05,
    factorUnit: 'kgCO2e/kg',
    activityUnit: 'kg',
    compatibleUnits: ['kg'],
    geography: 'India',
    reportingYear: '2025',
    methodology: 'Prototype biogenic emissions component',
    sourceName: 'Prototype factor - replace with authoritative source before audit use',
    sourceReference: 'Prototype registry seeded in application code',
    version: '1.0',
    validFrom: '2025-04-01',
    isActive: true,
    notes: 'Prototype factor retained for continuity with existing demo data.',
  },
  {
    id: 'ef-coal-india-2025-prototype',
    sourceType: 'Coal',
    displayName: 'Coal combustion',
    scope: 'scope-1',
    factorValue: 2.42,
    factorUnit: 'kgCO2e/kg',
    activityUnit: 'kg',
    compatibleUnits: ['kg'],
    geography: 'India',
    reportingYear: '2025',
    methodology: 'Combustion emission factor',
    sourceName: 'Prototype factor - replace with authoritative source before audit use',
    sourceReference: 'Prototype registry seeded in application code',
    version: '1.0',
    validFrom: '2025-04-01',
    isActive: true,
    notes: 'Prototype factor for architecture support only.',
  },
  {
    id: 'ef-purchased-steam-india-2025-prototype',
    sourceType: 'Purchased Steam',
    displayName: 'Purchased steam',
    scope: 'scope-2',
    factorValue: 0.184,
    factorUnit: 'kgCO2e/kg',
    activityUnit: 'kg',
    compatibleUnits: ['kg'],
    geography: 'India',
    reportingYear: '2025',
    methodology: 'Purchased energy prototype factor',
    sourceName: 'Prototype factor - replace with supplier-specific source before audit use',
    sourceReference: 'Prototype registry seeded in application code',
    version: '1.0',
    validFrom: '2025-04-01',
    isActive: true,
    notes: 'Prototype only; supplier-specific steam factors are required for real reporting.',
  },
  {
    id: 'ef-purchased-heat-india-2025-prototype',
    sourceType: 'Purchased Heat',
    displayName: 'Purchased heat',
    scope: 'scope-2',
    factorValue: 0.184,
    factorUnit: 'kgCO2e/kWh',
    activityUnit: 'kWh',
    compatibleUnits: ['kWh'],
    geography: 'India',
    reportingYear: '2025',
    methodology: 'Purchased energy prototype factor',
    sourceName: 'Prototype factor - replace with supplier-specific source before audit use',
    sourceReference: 'Prototype registry seeded in application code',
    version: '1.0',
    validFrom: '2025-04-01',
    isActive: true,
    notes: 'Prototype only; supplier-specific heat factors are required for real reporting.',
  },
];

export function normalizeUnit(unit: string): string {
  const normalized = unit.trim().toLowerCase();
  return unitAliases[normalized] ?? unit.trim();
}

export function deriveActivityType(sourceType: string): ActivityType {
  const lower = sourceType.toLowerCase();
  if (lower.includes('solar') || lower.includes('renewable') || lower.includes('wind')) return 'renewable-electricity';
  if (lower.includes('electricity') || lower.includes('grid')) return 'electricity';
  if (lower.includes('steam')) return 'steam';
  if (lower.includes('heat')) return 'heat';
  if (['diesel', 'petrol', 'lpg', 'natural gas', 'furnace oil', 'coal', 'biomass'].includes(lower)) return 'fuel';
  return 'other';
}

export function resolveEmissionFactor(sourceType: string): EmissionFactor | null {
  const normalizedSource = sourceType.trim().toLowerCase();
  const aliases: Record<string, string> = {
    'renewable electricity': 'on-site solar',
    'solar electricity': 'on-site solar',
    solar: 'on-site solar',
    'wind electricity': 'on-site wind',
    wind: 'on-site wind',
    'grid power': 'grid electricity',
  };
  const lookup = aliases[normalizedSource] ?? normalizedSource;
  return prototypeEmissionFactors.find((factor) =>
    factor.isActive && factor.sourceType.toLowerCase() === lookup
  ) ?? null;
}

export function calculateActivityEmissions(input: ActivityCalculationInput): ActivityCalculationResult {
  const quantity = Number(input.quantity);
  if (!Number.isFinite(quantity)) {
    throw new Error('Activity quantity must be a finite number.');
  }
  if (quantity < 0) {
    throw new Error('Activity quantity cannot be negative.');
  }

  const normalizedUnit = normalizeUnit(input.activityUnit);
  const compatibleUnits = input.emissionFactor.compatibleUnits.map(normalizeUnit);
  if (!compatibleUnits.includes(normalizedUnit)) {
    throw new Error(
      `Unit ${input.activityUnit} is incompatible with ${input.sourceType} factor unit ${input.emissionFactor.factorUnit}.`
    );
  }

  const emissionsKgCO2e = quantity * input.emissionFactor.factorValue;
  const emissionsTCO2e = emissionsKgCO2e / 1000;

  return {
    quantity,
    normalizedQuantity: quantity,
    normalizedUnit,
    emissionFactorId: input.emissionFactor.id,
    emissionFactorValue: input.emissionFactor.factorValue,
    emissionFactorUnit: input.emissionFactor.factorUnit,
    emissionsKgCO2e: Number(emissionsKgCO2e.toFixed(6)),
    emissionsTCO2e: Number(emissionsTCO2e.toFixed(6)),
    methodology: input.emissionFactor.methodology,
    factorSource: input.emissionFactor.sourceName,
    factorVersion: input.emissionFactor.version,
    calculatedAt: new Date().toISOString(),
  };
}

function finiteNonNegative(value: number | string | undefined, label: string, fallback = 0) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label} must be a non-negative finite number.`);
  return parsed;
}

export function calculateProfessionalEmissions(input: ProfessionalCalculationInput): ProfessionalCalculationResult {
  const method = input.method ?? 'activity-factor';
  let activityQuantity = finiteNonNegative(input.quantity, 'Activity quantity');
  const snapshot: Record<string, number | string> = { method, reportedQuantity: activityQuantity, reportedUnit: input.activityUnit };
  const warnings: string[] = [];
  let formula = 'activity quantity x emission factor';

  if (method === 'refrigerant-balance') {
    const beginning = finiteNonNegative(input.beginningInventory, 'Beginning inventory');
    const purchases = finiteNonNegative(input.purchases, 'Purchases');
    const ending = finiteNonNegative(input.endingInventory, 'Ending inventory');
    const returned = finiteNonNegative(input.recoveredOrReturned, 'Recovered or returned amount');
    activityQuantity = beginning + purchases - ending - returned;
    if (activityQuantity < 0) throw new Error('Refrigerant balance cannot produce a negative release. Check inventory and recovery values.');
    Object.assign(snapshot, { beginningInventory: beginning, purchases, endingInventory: ending, recoveredOrReturned: returned, calculatedRelease: activityQuantity });
    formula = '(beginning inventory + purchases - ending inventory - recovered) x GWP factor';
  } else if (method === 'fuel-efficiency') {
    const distance = finiteNonNegative(input.distance, 'Distance');
    const efficiency = finiteNonNegative(input.fuelEfficiency, 'Fuel efficiency');
    if (efficiency <= 0) throw new Error('Fuel efficiency must be greater than zero.');
    activityQuantity = distance / efficiency;
    Object.assign(snapshot, { distance, fuelEfficiency: efficiency, calculatedFuel: activityQuantity });
    formula = '(distance / fuel efficiency) x fuel emission factor';
  } else if (method === 'distance-factor') {
    formula = 'transport activity (distance or tonne-km) x emission factor';
  } else if (method === 'spend-factor') {
    formula = 'spend in factor currency x environmentally extended input-output factor';
    warnings.push('Spend-based estimates have lower data quality than supplier-specific or physical activity data.');
  } else if (method === 'supplier-specific') {
    formula = 'supplier activity quantity x supplier-specific product or service factor';
  }

  const calculated = calculateActivityEmissions({ ...input, quantity: activityQuantity });
  const confidenceScore = method === 'supplier-specific' ? 90 : method === 'spend-factor' ? 55 : method === 'distance-factor' ? 75 : 85;
  if (!input.emissionFactor.sourceReference) warnings.push('The selected factor has no source reference; review it before approval.');

  return { ...calculated, calculationMethod: method, formula, inputSnapshot: snapshot, confidenceScore, warnings };
}

export function aggregateFacilityActivities(
  records: AggregatedActivityRecord[],
  productionOutput: number,
  productionUnit: string,
): FacilityAggregate {
  let electricityConsumption = 0;
  let renewableEnergyUsage = 0;
  let fuelConsumption = 0;
  let emissionsScope1 = 0;
  let emissionsScope2 = 0;
  const sourceTotals = new Map<string, number>();
  const fuelTotals = new Map<string, number>();

  for (const record of records) {
    const quantity = Number(record.quantity);
    const emissions = Number(record.emissionsTCO2e);
    if (!Number.isFinite(quantity) || !Number.isFinite(emissions)) continue;

    if (record.scope === 'scope-1') {
      emissionsScope1 += emissions;
      fuelConsumption += quantity;
      fuelTotals.set(record.sourceType, (fuelTotals.get(record.sourceType) ?? 0) + quantity);
    }
    if (record.scope === 'scope-2') {
      emissionsScope2 += emissions;
      electricityConsumption += quantity;
      if (deriveActivityType(record.sourceType) === 'renewable-electricity') {
        renewableEnergyUsage += quantity;
      }
    }
    sourceTotals.set(record.sourceType, (sourceTotals.get(record.sourceType) ?? 0) + emissions);
  }

  const totalEmissions = emissionsScope1 + emissionsScope2;
  const canCalculateIntensity = productionUnit.toLowerCase().includes('tonne') && productionOutput > 0;
  const carbonIntensity = canCalculateIntensity ? totalEmissions / productionOutput : 0;
  const renewableShare = electricityConsumption > 0 ? (renewableEnergyUsage / electricityConsumption) * 100 : 0;
  const highestEmittingSource = [...sourceTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  const fuelType = [...fuelTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Multiple';

  return {
    electricityConsumption: Number(electricityConsumption.toFixed(4)),
    renewableEnergyUsage: Number(renewableEnergyUsage.toFixed(4)),
    fuelConsumption: Number(fuelConsumption.toFixed(4)),
    fuelType,
    emissionsScope1: Number(emissionsScope1.toFixed(6)),
    emissionsScope2: Number(emissionsScope2.toFixed(6)),
    carbonIntensity: Number(carbonIntensity.toFixed(8)),
    totalEmissions: Number(totalEmissions.toFixed(6)),
    renewableShare: Number(renewableShare.toFixed(4)),
    highestEmittingSource,
  };
}
