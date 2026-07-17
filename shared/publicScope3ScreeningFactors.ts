type ScreeningFactor = {
  id: string; factor_key: string; source_type: string; scope: 'scope-3'; country: string; region: string;
  source_name: string; version: string; publication_year: number; effective_from: string; factor_value: number;
  factor_unit: string; activity_unit: string; reference_url: string; status: 'active'; approval_status: 'published';
  quality_rating: 'screening'; is_custom: false; organisation_id: null; source_catalog_id: string;
};

const row = (category: string, sourceType: string, factorValue: number, unit: string): ScreeningFactor => ({
  id: `efr-public-s3-${category}`,
  factor_key: `public-scope3-${category}`,
  source_type: sourceType,
  scope: 'scope-3',
  country: 'Global',
  region: 'Screening estimate',
  source_name: 'Balancing Carbon illustrative Scope 3 screening coefficient; replace with supplier-specific or authoritative data before reporting',
  version: 'screening-2026.1',
  publication_year: 2026,
  effective_from: '2026-01-01',
  factor_value: factorValue,
  factor_unit: `kgCO2e/${unit}`,
  activity_unit: unit,
  reference_url: '',
  status: 'active',
  approval_status: 'published',
  quality_rating: 'screening',
  is_custom: false,
  organisation_id: null,
  source_catalog_id: `s3-${category}`,
});

export const publicScope3ScreeningFactors: ScreeningFactor[] = [
  row('01-purchased-goods-services', 'Purchased goods and services', 0.5, 'kg'),
  row('02-capital-goods', 'Capital goods', 0.0004, 'INR'),
  row('03-fuel-energy-related', 'Fuel- and energy-related activities', 0.12, 'kWh'),
  row('04-upstream-transport', 'Upstream transportation and distribution', 0.12, 'tonne-km'),
  row('05-waste-operations', 'Waste generated in operations', 0.45, 'kg'),
  row('06-business-travel', 'Business travel', 0.15, 'passenger-km'),
  row('07-employee-commuting', 'Employee commuting', 0.12, 'passenger-km'),
  row('08-upstream-leased-assets', 'Upstream leased assets', 0.716, 'kWh'),
  row('09-downstream-transport', 'Downstream transportation and distribution', 0.12, 'tonne-km'),
  row('10-processing-sold-products', 'Processing of sold products', 0.716, 'kWh'),
  row('11-use-sold-products', 'Use of sold products', 0.716, 'kWh'),
  row('12-end-life-sold-products', 'End-of-life treatment of sold products', 0.45, 'kg'),
  row('13-downstream-leased-assets', 'Downstream leased assets', 0.716, 'kWh'),
  row('14-franchises', 'Franchises', 0.716, 'kWh'),
  row('15-investments', 'Investments', 0.0002, 'INR'),
];
