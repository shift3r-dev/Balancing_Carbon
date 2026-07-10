export type ActivityScope = 'scope-1' | 'scope-2';
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
    id: 'ef-solar-electricity-india-2025-prototype',
    sourceType: 'Solar Electricity',
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
    id: 'ef-wind-electricity-india-2025-prototype',
    sourceType: 'Wind Electricity',
    displayName: 'Wind electricity',
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
  {
    id: 'ef-other-fuel-india-2025-prototype',
    sourceType: 'Other Fuel',
    displayName: 'Other direct fuel',
    scope: 'scope-1',
    factorValue: 1,
    factorUnit: 'kgCO2e/unit',
    activityUnit: 'unit',
    compatibleUnits: ['unit'],
    geography: 'India',
    reportingYear: '2025',
    methodology: 'Placeholder fuel factor',
    sourceName: 'Prototype factor - replace before use',
    sourceReference: 'Prototype registry seeded in application code',
    version: '1.0',
    validFrom: '2025-04-01',
    isActive: true,
    notes: 'Placeholder only. Do not use for audit reporting.',
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
    'renewable electricity': 'solar electricity',
    'on-site solar': 'solar electricity',
    solar: 'solar electricity',
    wind: 'wind electricity',
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
