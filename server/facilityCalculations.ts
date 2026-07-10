import { prototypeEmissionFactors, resolveEmissionFactor } from './carbonAccounting.js';

export const FUEL_EMISSION_FACTORS: Record<string, number> = Object.fromEntries(
  prototypeEmissionFactors.filter((factor) => factor.scope === 'scope-1').map((factor) => [factor.sourceType, factor.factorValue]),
);

export const GRID_ELECTRICITY_FACTOR = resolveEmissionFactor('Grid Electricity')?.factorValue ?? 0.716;

export function calculateFacilityEmissions(input: {
  productionOutput: number;
  electricityConsumption: number;
  fuelConsumption: number;
  fuelType: string;
  renewableEnergyUsage: number;
}) {
  const gridElectricity = Math.max(0, input.electricityConsumption - input.renewableEnergyUsage);
  const fuelFactor = FUEL_EMISSION_FACTORS[input.fuelType] ?? 0;

  const emissionsScope1 = (input.fuelConsumption * fuelFactor) / 1000;
  const emissionsScope2 = (gridElectricity * GRID_ELECTRICITY_FACTOR) / 1000;
  const totalFootprint = emissionsScope1 + emissionsScope2;
  const carbonIntensity = input.productionOutput > 0
    ? totalFootprint / input.productionOutput
    : 0;

  return {
    emissionsScope1: Number(emissionsScope1.toFixed(4)),
    emissionsScope2: Number(emissionsScope2.toFixed(4)),
    totalFootprint: Number(totalFootprint.toFixed(4)),
    carbonIntensity: Number(carbonIntensity.toFixed(4)),
  };
}
