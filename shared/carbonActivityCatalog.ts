export type CarbonScope = 'scope-1' | 'scope-2' | 'scope-3';

export type CarbonCalculationMethod =
  | 'activity-factor'
  | 'distance-factor'
  | 'spend-factor'
  | 'refrigerant-balance'
  | 'fuel-efficiency'
  | 'supplier-specific';

export interface CarbonSourceDefinition {
  id: string;
  scope: CarbonScope;
  category: string;
  ghgCategory: string;
  name: string;
  description: string;
  defaultMethod: CarbonCalculationMethod;
  units: string[];
  evidenceHint: string;
  supplierRelevant?: boolean;
}

const scope1: CarbonSourceDefinition[] = [
  { id: 's1-stationary-diesel', scope: 'scope-1', category: 'stationary-combustion', ghgCategory: 'Stationary combustion', name: 'Diesel', description: 'Boilers, furnaces, generators and other fixed combustion equipment.', defaultMethod: 'activity-factor', units: ['litre', 'kg', 'tonne'], evidenceHint: 'Fuel invoice, tank issue record or meter reading.' },
  { id: 's1-stationary-natural-gas', scope: 'scope-1', category: 'stationary-combustion', ghgCategory: 'Stationary combustion', name: 'Natural Gas', description: 'Pipeline or stored natural gas used by fixed equipment.', defaultMethod: 'activity-factor', units: ['SCM', 'Nm3', 'kWh'], evidenceHint: 'Gas bill or calibrated meter export.' },
  { id: 's1-stationary-lpg', scope: 'scope-1', category: 'stationary-combustion', ghgCategory: 'Stationary combustion', name: 'LPG', description: 'LPG used in fixed plant and process equipment.', defaultMethod: 'activity-factor', units: ['litre', 'kg', 'tonne'], evidenceHint: 'Cylinder register or fuel invoice.' },
  { id: 's1-stationary-coal', scope: 'scope-1', category: 'stationary-combustion', ghgCategory: 'Stationary combustion', name: 'Coal', description: 'Coal and coke combusted for process heat or power.', defaultMethod: 'activity-factor', units: ['kg', 'tonne'], evidenceHint: 'Weighbridge record, purchase invoice or stock ledger.' },
  { id: 's1-stationary-furnace-oil', scope: 'scope-1', category: 'stationary-combustion', ghgCategory: 'Stationary combustion', name: 'Furnace Oil', description: 'Liquid fuel used for boilers, kilns and thermal processes.', defaultMethod: 'activity-factor', units: ['litre', 'kg', 'tonne'], evidenceHint: 'Fuel invoice and consumption log.' },
  { id: 's1-stationary-biomass', scope: 'scope-1', category: 'stationary-combustion', ghgCategory: 'Stationary combustion', name: 'Biomass', description: 'Biogenic fuel consumption with fossil and biogenic emissions disclosed separately.', defaultMethod: 'activity-factor', units: ['kg', 'tonne'], evidenceHint: 'Purchase and moisture-content records.' },
  { id: 's1-mobile-diesel', scope: 'scope-1', category: 'mobile-combustion', ghgCategory: 'Mobile combustion', name: 'Mobile Diesel', description: 'Company-owned road vehicles and mobile machinery.', defaultMethod: 'activity-factor', units: ['litre', 'km'], evidenceHint: 'Fuel card, odometer or fleet telematics.' },
  { id: 's1-mobile-petrol', scope: 'scope-1', category: 'mobile-combustion', ghgCategory: 'Mobile combustion', name: 'Mobile Petrol', description: 'Company-owned petrol vehicles and equipment.', defaultMethod: 'activity-factor', units: ['litre', 'km'], evidenceHint: 'Fuel card, odometer or fleet telematics.' },
  { id: 's1-process-cement', scope: 'scope-1', category: 'process-emissions', ghgCategory: 'Process emissions', name: 'Cement and Lime Process', description: 'Calcination and other carbonate decomposition emissions.', defaultMethod: 'activity-factor', units: ['kg', 'tonne'], evidenceHint: 'Clinker, lime or carbonate production records.' },
  { id: 's1-process-industrial', scope: 'scope-1', category: 'process-emissions', ghgCategory: 'Process emissions', name: 'Industrial Process Emissions', description: 'Direct process chemistry emissions not caused by fuel combustion.', defaultMethod: 'activity-factor', units: ['kg', 'tonne', 'm3'], evidenceHint: 'Mass balance, laboratory or production record.' },
  { id: 's1-fugitive-refrigerant', scope: 'scope-1', category: 'fugitive-emissions', ghgCategory: 'Fugitive emissions', name: 'Refrigerant Leakage', description: 'Refrigerants released from cooling and fire-suppression equipment.', defaultMethod: 'refrigerant-balance', units: ['kg'], evidenceHint: 'Service log, charge register and recovery certificate.' },
  { id: 's1-fugitive-other', scope: 'scope-1', category: 'fugitive-emissions', ghgCategory: 'Fugitive emissions', name: 'Other Fugitive Gas', description: 'Direct releases of greenhouse gases from owned equipment or processes.', defaultMethod: 'activity-factor', units: ['kg'], evidenceHint: 'Leak test, inventory balance or engineering estimate.' },
];

const scope2: CarbonSourceDefinition[] = [
  { id: 's2-grid-location', scope: 'scope-2', category: 'purchased-electricity', ghgCategory: 'Purchased electricity', name: 'Grid Electricity', description: 'Purchased electricity calculated with a location-based grid factor.', defaultMethod: 'activity-factor', units: ['kWh', 'MWh'], evidenceHint: 'Utility bill, meter export or tariff statement.' },
  { id: 's2-grid-market', scope: 'scope-2', category: 'purchased-electricity', ghgCategory: 'Purchased electricity', name: 'Market-based Electricity', description: 'Purchased electricity calculated using contractual instruments or residual mix.', defaultMethod: 'activity-factor', units: ['kWh', 'MWh'], evidenceHint: 'Supplier factor, PPA, REC or energy attribute certificate.' },
  { id: 's2-renewable', scope: 'scope-2', category: 'renewable-electricity', ghgCategory: 'Purchased electricity', name: 'Contracted Renewable Electricity', description: 'Renewable electricity supported by eligible contractual instruments.', defaultMethod: 'activity-factor', units: ['kWh', 'MWh'], evidenceHint: 'PPA and retired certificate evidence.' },
  { id: 's2-steam', scope: 'scope-2', category: 'purchased-steam', ghgCategory: 'Purchased steam', name: 'Purchased Steam', description: 'Steam supplied by an external utility or adjacent facility.', defaultMethod: 'activity-factor', units: ['kg', 'tonne', 'kWh', 'MWh'], evidenceHint: 'Supplier bill and supplier-specific factor.' },
  { id: 's2-heat', scope: 'scope-2', category: 'purchased-heat', ghgCategory: 'Purchased heat', name: 'Purchased Heat', description: 'District or supplier-provided heat.', defaultMethod: 'activity-factor', units: ['kWh', 'MWh', 'GJ'], evidenceHint: 'Heat invoice and supplier factor.' },
  { id: 's2-cooling', scope: 'scope-2', category: 'purchased-cooling', ghgCategory: 'Purchased cooling', name: 'Purchased Cooling', description: 'District or supplier-provided chilled water and cooling.', defaultMethod: 'activity-factor', units: ['kWh', 'MWh', 'GJ', 'TRh'], evidenceHint: 'Cooling invoice and supplier factor.' },
];

const scope3Categories: Array<[string, string, string, CarbonCalculationMethod, string[]]> = [
  ['01-purchased-goods-services', 'Purchased goods and services', 'Cradle-to-gate emissions from purchased materials and services.', 'supplier-specific', ['kg', 'tonne', 'INR', 'USD']],
  ['02-capital-goods', 'Capital goods', 'Cradle-to-gate emissions from purchased capital assets.', 'spend-factor', ['INR', 'USD', 'kg', 'tonne']],
  ['03-fuel-energy-related', 'Fuel- and energy-related activities', 'Upstream fuel and energy emissions not included in Scope 1 or Scope 2.', 'activity-factor', ['kWh', 'MWh', 'litre', 'kg', 'tonne']],
  ['04-upstream-transport', 'Upstream transportation and distribution', 'Third-party inbound freight and warehousing.', 'distance-factor', ['tonne-km', 'vehicle-km', 'INR', 'USD']],
  ['05-waste-operations', 'Waste generated in operations', 'Treatment and disposal of operational waste by third parties.', 'activity-factor', ['kg', 'tonne']],
  ['06-business-travel', 'Business travel', 'Employee travel in non-owned transport and accommodation.', 'distance-factor', ['passenger-km', 'room-night', 'INR', 'USD']],
  ['07-employee-commuting', 'Employee commuting', 'Travel between employee homes and workplaces.', 'distance-factor', ['passenger-km', 'vehicle-km']],
  ['08-upstream-leased-assets', 'Upstream leased assets', 'Operation of leased assets not included in Scope 1 or Scope 2.', 'activity-factor', ['kWh', 'MWh', 'litre', 'kg']],
  ['09-downstream-transport', 'Downstream transportation and distribution', 'Third-party outbound freight and warehousing.', 'distance-factor', ['tonne-km', 'vehicle-km', 'INR', 'USD']],
  ['10-processing-sold-products', 'Processing of sold products', 'Downstream processing of intermediate products sold by the company.', 'activity-factor', ['kg', 'tonne', 'kWh', 'MWh']],
  ['11-use-sold-products', 'Use of sold products', 'Lifetime emissions resulting from customers using sold products.', 'activity-factor', ['unit', 'kWh', 'MWh', 'litre']],
  ['12-end-life-sold-products', 'End-of-life treatment of sold products', 'Waste treatment of products at the end of their useful lives.', 'activity-factor', ['kg', 'tonne', 'unit']],
  ['13-downstream-leased-assets', 'Downstream leased assets', 'Operation of assets owned and leased to other entities.', 'activity-factor', ['kWh', 'MWh', 'litre', 'kg']],
  ['14-franchises', 'Franchises', 'Operational emissions from franchises not included in Scope 1 or Scope 2.', 'activity-factor', ['kWh', 'MWh', 'litre', 'kg']],
  ['15-investments', 'Investments', 'Financed emissions associated with investments and lending.', 'supplier-specific', ['INR', 'USD', 'tCO2e']],
];

const scope3: CarbonSourceDefinition[] = scope3Categories.map(([id, name, description, method, units], index) => ({
  id: `s3-${id}`,
  scope: 'scope-3',
  category: `scope3-category-${String(index + 1).padStart(2, '0')}`,
  ghgCategory: `Category ${index + 1}: ${name}`,
  name,
  description,
  defaultMethod: method,
  units,
  evidenceHint: index === 0 ? 'Supplier-specific product footprint, EPD, invoice or purchase ledger.' : 'Source document, calculation basis and supplier evidence.',
  supplierRelevant: true,
}));

export const carbonActivityCatalog: CarbonSourceDefinition[] = [...scope1, ...scope2, ...scope3];

export function sourcesForScope(scope: CarbonScope) {
  return carbonActivityCatalog.filter((source) => source.scope === scope);
}

export function findCarbonSource(id: string) {
  return carbonActivityCatalog.find((source) => source.id === id) ?? null;
}
