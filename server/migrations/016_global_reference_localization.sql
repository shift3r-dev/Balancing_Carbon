-- Phase 7: global localization, unit registry, and enterprise reference data.
-- Apply after 015. This migration is additive and keeps legacy record columns intact.

create table if not exists reference_categories (
  id text primary key, code text not null unique, name text not null, description text not null default '',
  status text not null default 'published' check(status in ('draft','published','archived','deprecated')),
  sort_order integer not null default 0, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists reference_values (
  id text primary key, category_id text not null references reference_categories(id) on delete cascade,
  code text not null, name text not null, description text not null default '', display_name text not null default '', short_name text not null default '', symbol text not null default '',
  parent_id text references reference_values(id) on delete set null, country_code text default '', region_code text default '', industry_code text default '',
  version text not null default '1', status text not null default 'published' check(status in ('draft','published','archived','deprecated')),
  sort_order integer not null default 0, metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null, updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(category_id, code, version)
);
create table if not exists reference_translations (
  id text primary key, reference_value_id text not null references reference_values(id) on delete cascade, language_code text not null,
  name text not null default '', description text not null default '', display_name text not null default '', symbol text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(reference_value_id, language_code)
);
create table if not exists reference_relationships (
  id text primary key, from_value_id text not null references reference_values(id) on delete cascade, to_value_id text not null references reference_values(id) on delete cascade,
  relationship_type text not null, metadata jsonb not null default '{}'::jsonb, status text not null default 'published' check(status in ('draft','published','archived','deprecated')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(from_value_id, to_value_id, relationship_type)
);
create table if not exists reference_versions (
  id text primary key, reference_value_id text not null references reference_values(id) on delete cascade, version text not null,
  snapshot jsonb not null, change_summary text not null default '', created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(),
  unique(reference_value_id, version)
);
create table if not exists reference_audit_logs (
  id text primary key, reference_value_id text references reference_values(id) on delete set null, action text not null,
  before_value jsonb not null default '{}'::jsonb, after_value jsonb not null default '{}'::jsonb, acted_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists reference_import_jobs (
  id text primary key, category_id text references reference_categories(id) on delete set null, format text not null check(format in ('csv','excel','json')),
  status text not null default 'queued' check(status in ('queued','processing','completed','failed')), metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), completed_at timestamptz
);
create table if not exists reference_export_jobs (
  id text primary key, category_id text references reference_categories(id) on delete set null, format text not null check(format in ('csv','excel','json')),
  status text not null default 'queued' check(status in ('queued','processing','completed','failed')), metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), completed_at timestamptz
);

create table if not exists unit_categories (
  id text primary key, code text not null unique, name text not null, canonical_unit_code text not null default '', description text not null default '',
  status text not null default 'active' check(status in ('active','archived')), sort_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists unit_registry (
  id text primary key, code text not null unique, name text not null, symbol text not null, category_id text not null references unit_categories(id) on delete restrict,
  measurement_system text not null default 'metric' check(measurement_system in ('metric','imperial','hybrid','universal')), canonical_unit_id text references unit_registry(id) on delete restrict,
  factor_to_canonical numeric, offset_to_canonical numeric not null default 0, conversion_formula text not null default 'linear' check(conversion_formula in ('linear','affine','custom')),
  storage_precision integer not null default 9, calculation_precision integer not null default 12, display_precision integer not null default 2, reporting_precision integer not null default 3, api_precision integer not null default 6,
  minimum_value numeric, maximum_value numeric, supports_input boolean not null default true, supports_output boolean not null default true, supports_reports boolean not null default true,
  supports_dashboard boolean not null default true, supports_api boolean not null default true, supports_import boolean not null default true, supports_export boolean not null default true,
  localization_labels jsonb not null default '{}'::jsonb, status text not null default 'active' check(status in ('draft','active','archived','deprecated')), metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists unit_conversion_rules (
  id text primary key, from_unit_id text not null references unit_registry(id) on delete cascade, to_unit_id text not null references unit_registry(id) on delete cascade,
  multiplier numeric not null default 1, offset_value numeric not null default 0, formula text not null default 'linear' check(formula in ('linear','affine','custom')),
  status text not null default 'active' check(status in ('draft','active','archived','deprecated')), source text not null default 'registry', version text not null default '1',
  effective_from date, effective_to date, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(from_unit_id, to_unit_id, version)
);
create table if not exists unit_aliases (
  id text primary key, unit_id text not null references unit_registry(id) on delete cascade, alias text not null, normalized_alias text not null,
  language_code text not null default 'en', status text not null default 'active' check(status in ('active','archived')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(normalized_alias, language_code)
);
create table if not exists unit_precision (
  id text primary key, unit_id text not null references unit_registry(id) on delete cascade, context text not null check(context in ('storage','calculation','display','report','api','dashboard')),
  precision integer not null check(precision >= 0 and precision <= 15), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(unit_id, context)
);
create table if not exists unit_display_rules (
  id text primary key, category_id text not null references unit_categories(id) on delete cascade, measurement_system text not null check(measurement_system in ('metric','imperial','hybrid','universal')),
  preferred_unit_id text references unit_registry(id) on delete set null, minimum_display_value numeric not null default 1, maximum_display_value numeric not null default 999,
  sort_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists unit_system_defaults (
  id text primary key, measurement_system text not null check(measurement_system in ('metric','imperial','hybrid','universal')), category_id text not null references unit_categories(id) on delete cascade,
  unit_id text not null references unit_registry(id) on delete restrict, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(measurement_system, category_id)
);
create table if not exists conversion_constants (
  id text primary key, code text not null unique, value numeric not null, unit text not null default '', description text not null default '', source text not null default 'registry', status text not null default 'active' check(status in ('active','archived')), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists unit_validation_rules (
  id text primary key, subject_type text not null, subject_code text not null, allowed_category_ids jsonb not null default '[]'::jsonb,
  allowed_unit_ids jsonb not null default '[]'::jsonb, canonical_unit_id text references unit_registry(id) on delete set null, required boolean not null default true,
  status text not null default 'active' check(status in ('active','archived')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(subject_type, subject_code)
);

create table if not exists organization_localization (
  organisation_id text primary key references organisations(id) on delete cascade, language_code text not null default 'en', country_code text not null default 'IN', region_code text not null default '',
  currency_code text not null default 'INR', time_zone text not null default 'Asia/Kolkata', date_format text not null default 'DD/MM/YYYY', number_format text not null default 'en-IN',
  decimal_precision integer not null default 2 check(decimal_precision between 0 and 8), thousands_separator text not null default ',', measurement_system text not null default 'metric' check(measurement_system in ('metric','imperial','hybrid')),
  reporting_standard_code text not null default 'BRSR', theme text not null default 'system', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists organization_units (
  id text primary key, organisation_id text not null references organisations(id) on delete cascade, category_id text not null references unit_categories(id) on delete cascade,
  unit_id text not null references unit_registry(id) on delete restrict, display_mode text not null default 'auto' check(display_mode in ('auto','fixed')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(organisation_id, category_id)
);
create table if not exists user_localization (
  id text primary key, user_id uuid not null unique references auth.users(id) on delete cascade, organisation_id text not null references organisations(id) on delete cascade,
  language_code text, time_zone text, date_format text, number_format text, decimal_precision integer check(decimal_precision between 0 and 8), theme text,
  unit_overrides jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists conversion_history (
  id text primary key, organisation_id text references organisations(id) on delete set null, user_id uuid references auth.users(id) on delete set null,
  from_unit_id text references unit_registry(id) on delete set null, to_unit_id text references unit_registry(id) on delete set null,
  input_value numeric not null, output_value numeric not null, conversion_factor numeric, conversion_path jsonb not null default '[]'::jsonb,
  context text not null default 'api', status text not null default 'completed' check(status in ('completed','failed')), error_message text not null default '', created_at timestamptz not null default now()
);

-- Compatibility views: all listed reference data is sourced from the registry rather than duplicated tables.
create or replace view measurement_systems as select 'metric'::text as code, 'Metric'::text as name union all select 'imperial', 'Imperial' union all select 'hybrid', 'Hybrid';
create or replace view measurement_units as select id, code, name, symbol, category_id, measurement_system, canonical_unit_id, status from unit_registry;
create or replace view currencies as select id, code, name, symbol, status, metadata from reference_values where category_id = 'refcat-currency' and deleted_at is null;
create or replace view languages as select id, code, name, symbol, status, metadata from reference_values where category_id = 'refcat-language' and deleted_at is null;
create or replace view timezones as select id, code, name, symbol, status, metadata from reference_values where category_id = 'refcat-timezone' and deleted_at is null;
create or replace view reporting_standards as select id, code, name, symbol, status, metadata from reference_values where category_id = 'refcat-reporting-standard' and deleted_at is null;

alter table energy_records add column if not exists input_quantity numeric;
alter table energy_records add column if not exists input_unit text;
alter table energy_records add column if not exists canonical_quantity numeric;
alter table energy_records add column if not exists canonical_unit text;
alter table energy_records add column if not exists conversion_factor numeric;
alter table energy_records add column if not exists conversion_path jsonb not null default '[]'::jsonb;
alter table activity_records add column if not exists input_quantity numeric;
alter table activity_records add column if not exists input_unit text;
alter table activity_records add column if not exists canonical_quantity numeric;
alter table activity_records add column if not exists canonical_unit text;
alter table activity_records add column if not exists conversion_factor numeric;
alter table activity_records add column if not exists conversion_path jsonb not null default '[]'::jsonb;
alter table production_records add column if not exists input_quantity numeric;
alter table production_records add column if not exists input_unit text;
alter table production_records add column if not exists canonical_quantity numeric;
alter table production_records add column if not exists canonical_unit text;
alter table production_records add column if not exists conversion_factor numeric;
alter table production_records add column if not exists conversion_path jsonb not null default '[]'::jsonb;
alter table emission_factor_registry add column if not exists activity_unit_id text references unit_registry(id) on delete set null;
alter table emission_factor_registry add column if not exists canonical_activity_unit_id text references unit_registry(id) on delete set null;
alter table emission_factor_registry add column if not exists conversion_method text not null default 'registry';

insert into reference_categories(id,code,name,description,sort_order) values
 ('refcat-country','country','Countries','ISO country and regional context.',1), ('refcat-currency','currency','Currencies','ISO 4217 currency metadata.',2), ('refcat-language','language','Languages','Supported application languages.',3), ('refcat-timezone','timezone','Time zones','IANA time zones.',4),
 ('refcat-reporting-standard','reporting-standard','Reporting standards','Configurable sustainability reporting standards.',5), ('refcat-industry','industry','Industries','Industry master data.',6), ('refcat-fuel-type','fuel-type','Fuel types','Fuel source master data.',7),
 ('refcat-activity-category','activity-category','Activity categories','Carbon activity categories.',8), ('refcat-facility-type','facility-type','Facility types','Facility type master data.',9), ('refcat-document-type','document-type','Document types','Evidence document types.',10)
on conflict(id) do update set name=excluded.name, description=excluded.description, sort_order=excluded.sort_order;

insert into reference_values(id,category_id,code,name,display_name,symbol,sort_order,metadata) values
 ('ref-country-in','refcat-country','IN','India','India','IN',1,'{"currency":"INR","timeZone":"Asia/Kolkata"}'), ('ref-country-us','refcat-country','US','United States','United States','US',2,'{"currency":"USD","timeZone":"America/New_York"}'), ('ref-country-gb','refcat-country','GB','United Kingdom','United Kingdom','GB',3,'{"currency":"GBP","timeZone":"Europe/London"}'), ('ref-country-de','refcat-country','DE','Germany','Germany','DE',4,'{"currency":"EUR","timeZone":"Europe/Berlin"}'), ('ref-country-ae','refcat-country','AE','United Arab Emirates','United Arab Emirates','AE',5,'{"currency":"AED","timeZone":"Asia/Dubai"}'), ('ref-country-au','refcat-country','AU','Australia','Australia','AU',6,'{"currency":"AUD","timeZone":"Australia/Sydney"}'),
 ('ref-currency-inr','refcat-currency','INR','Indian Rupee','Indian Rupee','INR',1,'{"locale":"en-IN"}'), ('ref-currency-usd','refcat-currency','USD','US Dollar','US Dollar','USD',2,'{"locale":"en-US"}'), ('ref-currency-eur','refcat-currency','EUR','Euro','Euro','EUR',3,'{"locale":"de-DE"}'), ('ref-currency-gbp','refcat-currency','GBP','Pound Sterling','Pound Sterling','GBP',4,'{"locale":"en-GB"}'), ('ref-currency-aed','refcat-currency','AED','UAE Dirham','UAE Dirham','AED',5,'{"locale":"ar-AE"}'), ('ref-currency-aud','refcat-currency','AUD','Australian Dollar','Australian Dollar','AUD',6,'{"locale":"en-AU"}'),
 ('ref-language-en','refcat-language','en','English','English','en',1,'{}'), ('ref-language-de','refcat-language','de','German','Deutsch','de',2,'{}'), ('ref-language-fr','refcat-language','fr','French','Français','fr',3,'{}'), ('ref-language-ar','refcat-language','ar','Arabic','العربية','ar',4,'{}'), ('ref-language-ja','refcat-language','ja','Japanese','日本語','ja',5,'{}'),
 ('ref-timezone-kolkata','refcat-timezone','Asia/Kolkata','India Standard Time','India Standard Time','Asia/Kolkata',1,'{}'), ('ref-timezone-london','refcat-timezone','Europe/London','United Kingdom Time','United Kingdom Time','Europe/London',2,'{}'), ('ref-timezone-new-york','refcat-timezone','America/New_York','US Eastern Time','US Eastern Time','America/New_York',3,'{}'), ('ref-timezone-berlin','refcat-timezone','Europe/Berlin','Central European Time','Central European Time','Europe/Berlin',4,'{}'), ('ref-timezone-dubai','refcat-timezone','Asia/Dubai','Gulf Standard Time','Gulf Standard Time','Asia/Dubai',5,'{}'), ('ref-timezone-sydney','refcat-timezone','Australia/Sydney','Australian Eastern Time','Australian Eastern Time','Australia/Sydney',6,'{}'),
 ('ref-standard-brsr','refcat-reporting-standard','BRSR','Business Responsibility and Sustainability Reporting','BRSR','BRSR',1,'{"frameworkId":"framework-brsr"}'), ('ref-standard-cdp','refcat-reporting-standard','CDP','Carbon Disclosure Project','CDP','CDP',2,'{"frameworkId":"framework-cdp"}'), ('ref-standard-gri','refcat-reporting-standard','GRI','Global Reporting Initiative','GRI','GRI',3,'{"frameworkId":"framework-gri"}'), ('ref-standard-issb','refcat-reporting-standard','ISSB','International Sustainability Standards Board','ISSB','ISSB',4,'{"frameworkId":"framework-issb"}'), ('ref-standard-csrd','refcat-reporting-standard','CSRD','Corporate Sustainability Reporting Directive','CSRD','CSRD',5,'{"frameworkId":"framework-csrd"}')
on conflict(category_id,code,version) do update set name=excluded.name, display_name=excluded.display_name, symbol=excluded.symbol, metadata=excluded.metadata;

insert into unit_categories(id,code,name,canonical_unit_code,sort_order) values
 ('unitcat-energy','energy','Energy','kWh',1), ('unitcat-fuel','fuel','Fuel','fuel-litre',2), ('unitcat-electricity','electricity','Electricity','kWh',3), ('unitcat-mass','mass','Mass','kg',4), ('unitcat-volume','volume','Volume','m3',5), ('unitcat-water','water','Water','water-m3',6), ('unitcat-distance','distance','Distance','km',7), ('unitcat-pressure','pressure','Pressure','bar',8), ('unitcat-temperature','temperature','Temperature','K',9), ('unitcat-power','power','Power','kW',10), ('unitcat-area','area','Area','m2',11), ('unitcat-time','time','Time','hour',12), ('unitcat-production','production','Production','production-kg',13), ('unitcat-currency','currency','Currency','currency-INR',14), ('unitcat-carbon','carbon','Carbon','kgCO2e',15)
on conflict(id) do update set name=excluded.name, canonical_unit_code=excluded.canonical_unit_code, sort_order=excluded.sort_order;

insert into unit_registry(id,code,name,symbol,category_id,measurement_system,canonical_unit_id,factor_to_canonical,conversion_formula,display_precision) values
 ('unit-energy-wh','Wh','Watt-hour','Wh','unitcat-energy','metric','unit-energy-kwh',0.001,'linear',0), ('unit-energy-kwh','kWh','Kilowatt-hour','kWh','unitcat-energy','metric',null,1,'linear',2), ('unit-energy-mwh','MWh','Megawatt-hour','MWh','unitcat-energy','metric','unit-energy-kwh',1000,'linear',3), ('unit-energy-gwh','GWh','Gigawatt-hour','GWh','unitcat-energy','metric','unit-energy-kwh',1000000,'linear',3), ('unit-energy-mj','MJ','Megajoule','MJ','unitcat-energy','metric','unit-energy-kwh',0.2777777778,'linear',3), ('unit-energy-gj','GJ','Gigajoule','GJ','unitcat-energy','metric','unit-energy-kwh',277.7777778,'linear',3), ('unit-energy-tj','TJ','Terajoule','TJ','unitcat-energy','metric','unit-energy-kwh',277777.7778,'linear',3), ('unit-energy-btu','BTU','British thermal unit','BTU','unitcat-energy','imperial','unit-energy-kwh',0.0002930711,'linear',3), ('unit-energy-mmbtu','MMBtu','Million British thermal units','MMBtu','unitcat-energy','imperial','unit-energy-kwh',293.07107,'linear',3),
 ('unit-volume-litre','litre','Litre','L','unitcat-volume','metric','unit-volume-m3',0.001,'linear',3), ('unit-volume-gallon','gallon-us','US gallon','gal','unitcat-volume','imperial','unit-volume-m3',0.003785411784,'linear',3), ('unit-volume-m3','m3','Cubic metre','m3','unitcat-volume','metric',null,1,'linear',3), ('unit-volume-scm','SCM','Standard cubic metre','SCM','unitcat-volume','universal','unit-volume-m3',1,'linear',3), ('unit-fuel-litre','fuel-litre','Fuel litre','L','unitcat-fuel','metric',null,1,'linear',3), ('unit-fuel-gallon','fuel-gallon','Fuel gallon','gal','unitcat-fuel','imperial','unit-fuel-litre',3.785411784,'linear',3), ('unit-fuel-scm','fuel-scm','Fuel standard cubic metre','SCM','unitcat-fuel','universal',null,1,'linear',3),
 ('unit-mass-g','g','Gram','g','unitcat-mass','metric','unit-mass-kg',0.001,'linear',3), ('unit-mass-kg','kg','Kilogram','kg','unitcat-mass','metric',null,1,'linear',3), ('unit-mass-tonne','tonne','Metric tonne','t','unitcat-mass','metric','unit-mass-kg',1000,'linear',3), ('unit-mass-lb','lb','Pound','lb','unitcat-mass','imperial','unit-mass-kg',0.45359237,'linear',3),
 ('unit-distance-m','m','Metre','m','unitcat-distance','metric','unit-distance-km',0.001,'linear',3), ('unit-distance-km','km','Kilometre','km','unitcat-distance','metric',null,1,'linear',3), ('unit-distance-mile','mile','Mile','mi','unitcat-distance','imperial','unit-distance-km',1.609344,'linear',3),
 ('unit-temperature-k','K','Kelvin','K','unitcat-temperature','universal',null,1,'affine',2), ('unit-temperature-c','celsius','Degrees Celsius','°C','unitcat-temperature','metric','unit-temperature-k',1,'affine',2), ('unit-temperature-f','fahrenheit','Degrees Fahrenheit','°F','unitcat-temperature','imperial','unit-temperature-k',0.5555555556,'affine',2),
 ('unit-carbon-kg','kgCO2e','Kilograms CO2e','kgCO2e','unitcat-carbon','metric',null,1,'linear',3), ('unit-carbon-tonne','tCO2e','Tonnes CO2e','tCO2e','unitcat-carbon','metric','unit-carbon-kg',1000,'linear',3), ('unit-carbon-megatonne','MtCO2e','Megatonnes CO2e','MtCO2e','unitcat-carbon','metric','unit-carbon-kg',1000000000,'linear',6),
 ('unit-production-kg','production-kg','Production kilogram','kg','unitcat-production','metric',null,1,'linear',3), ('unit-production-tonne','production-tonne','Production tonne','t','unitcat-production','metric','unit-production-kg',1000,'linear',3), ('unit-production-piece','piece','Piece','pc','unitcat-production','universal',null,1,'linear',0), ('unit-production-unit','unit','Unit','unit','unitcat-production','universal',null,1,'linear',0),
 ('unit-water-m3','water-m3','Water cubic metre','m3','unitcat-water','metric',null,1,'linear',3), ('unit-water-litre','water-litre','Water litre','L','unitcat-water','metric','unit-water-m3',0.001,'linear',3), ('unit-water-gallon','water-gallon','Water gallon','gal','unitcat-water','imperial','unit-water-m3',0.003785411784,'linear',3),
 ('unit-pressure-bar','bar','Bar','bar','unitcat-pressure','metric',null,1,'linear',3), ('unit-power-kw','kW','Kilowatt','kW','unitcat-power','metric',null,1,'linear',3), ('unit-area-m2','m2','Square metre','m2','unitcat-area','metric',null,1,'linear',3), ('unit-time-hour','hour','Hour','h','unitcat-time','universal',null,1,'linear',2), ('unit-currency-inr','currency-INR','Indian Rupee','INR','unitcat-currency','universal',null,1,'linear',2)
on conflict(id) do update set name=excluded.name, symbol=excluded.symbol, factor_to_canonical=excluded.factor_to_canonical, display_precision=excluded.display_precision, status='active';

update unit_registry set canonical_unit_id=id where canonical_unit_id is null;
insert into unit_conversion_rules(id,from_unit_id,to_unit_id,multiplier,offset_value,formula,source) values
 ('ucr-c-to-k','unit-temperature-c','unit-temperature-k',1,273.15,'affine','registry'), ('ucr-k-to-c','unit-temperature-k','unit-temperature-c',1,-273.15,'affine','registry'), ('ucr-f-to-k','unit-temperature-f','unit-temperature-k',0.5555555556,255.3722222222,'affine','registry'), ('ucr-k-to-f','unit-temperature-k','unit-temperature-f',1.8,-459.67,'affine','registry')
on conflict(from_unit_id,to_unit_id,version) do update set multiplier=excluded.multiplier, offset_value=excluded.offset_value, formula=excluded.formula;

insert into unit_aliases(id,unit_id,alias,normalized_alias) values
 ('alias-kwh-1','unit-energy-kwh','kwh','kwh'), ('alias-kwh-2','unit-energy-kwh','kwhr','kwhr'), ('alias-mwh-1','unit-energy-mwh','mwh','mwh'), ('alias-litre-1','unit-volume-litre','l','l'), ('alias-litre-2','unit-volume-litre','liter','liter'), ('alias-litre-3','unit-volume-litre','litres','litres'), ('alias-litre-4','unit-volume-litre','litre','litre'), ('alias-fuel-litre-1','unit-fuel-litre','fuel litre','fuel litre'), ('alias-scm-1','unit-volume-scm','scm','scm'), ('alias-m3-1','unit-volume-m3','m³','m3'), ('alias-m3-2','unit-volume-m3','m3','m3'), ('alias-kg-1','unit-mass-kg','kilogram','kilogram'), ('alias-kg-2','unit-mass-kg','kilograms','kilograms'), ('alias-tonne-1','unit-mass-tonne','tonne','tonne'), ('alias-tonne-2','unit-mass-tonne','tonnes','tonnes'), ('alias-carbon-t-1','unit-carbon-tonne','tco2e','tco2e'), ('alias-carbon-kg-1','unit-carbon-kg','kg co2e','kg co2e')
on conflict(normalized_alias,language_code) do nothing;

insert into unit_system_defaults(id,measurement_system,category_id,unit_id) values
 ('usd-metric-energy','metric','unitcat-energy','unit-energy-kwh'), ('usd-metric-carbon','metric','unitcat-carbon','unit-carbon-tonne'), ('usd-metric-production','metric','unitcat-production','unit-production-tonne'), ('usd-imperial-energy','imperial','unitcat-energy','unit-energy-mmbtu'), ('usd-imperial-mass','imperial','unitcat-mass','unit-mass-lb'), ('usd-hybrid-energy','hybrid','unitcat-energy','unit-energy-kwh'), ('usd-hybrid-carbon','hybrid','unitcat-carbon','unit-carbon-tonne')
on conflict(measurement_system,category_id) do update set unit_id=excluded.unit_id;
insert into unit_display_rules(id,category_id,measurement_system,preferred_unit_id,minimum_display_value,maximum_display_value,sort_order) values
 ('udr-energy-metric','unitcat-energy','metric','unit-energy-mwh',1,999,1), ('udr-carbon-metric','unitcat-carbon','metric','unit-carbon-tonne',1,999,1), ('udr-production-metric','unitcat-production','metric','unit-production-tonne',1,999,1), ('udr-energy-imperial','unitcat-energy','imperial','unit-energy-mmbtu',1,999,1)
on conflict(id) do update set preferred_unit_id=excluded.preferred_unit_id, minimum_display_value=excluded.minimum_display_value, maximum_display_value=excluded.maximum_display_value;

insert into unit_validation_rules(id,subject_type,subject_code,allowed_category_ids,allowed_unit_ids,canonical_unit_id) values
 ('uvr-grid','emission-source','Grid Electricity','["unitcat-energy"]','[]','unit-energy-kwh'), ('uvr-solar','emission-source','On-site Solar','["unitcat-energy"]','[]','unit-energy-kwh'), ('uvr-wind','emission-source','On-site Wind','["unitcat-energy"]','[]','unit-energy-kwh'), ('uvr-diesel','emission-source','Diesel','["unitcat-volume"]','[]','unit-volume-m3'), ('uvr-petrol','emission-source','Petrol','["unitcat-volume"]','[]','unit-volume-m3'), ('uvr-lpg','emission-source','LPG','["unitcat-volume"]','[]','unit-volume-m3'), ('uvr-natural-gas','emission-source','Natural Gas','["unitcat-volume"]','[]','unit-volume-m3'), ('uvr-furnace-oil','emission-source','Furnace Oil','["unitcat-volume"]','[]','unit-volume-m3'), ('uvr-biomass','emission-source','Biomass','["unitcat-mass"]','[]','unit-mass-kg'), ('uvr-coal','emission-source','Coal','["unitcat-mass"]','[]','unit-mass-kg'), ('uvr-steam','emission-source','Purchased Steam','["unitcat-mass"]','[]','unit-mass-kg'), ('uvr-heat','emission-source','Purchased Heat','["unitcat-energy"]','[]','unit-energy-kwh'), ('uvr-production','production','production','["unitcat-production","unitcat-mass"]','[]','unit-production-kg')
on conflict(subject_type,subject_code) do update set allowed_category_ids=excluded.allowed_category_ids, allowed_unit_ids=excluded.allowed_unit_ids, canonical_unit_id=excluded.canonical_unit_id;

update energy_records set input_quantity=coalesce(input_quantity,quantity), input_unit=coalesce(input_unit,unit), canonical_quantity=coalesce(canonical_quantity,quantity), canonical_unit=coalesce(canonical_unit,unit), conversion_factor=coalesce(conversion_factor,1) where input_quantity is null or canonical_quantity is null;
update activity_records set input_quantity=coalesce(input_quantity,quantity), input_unit=coalesce(input_unit,unit), canonical_quantity=coalesce(canonical_quantity,quantity), canonical_unit=coalesce(canonical_unit,unit), conversion_factor=coalesce(conversion_factor,1) where input_quantity is null or canonical_quantity is null;
update production_records set input_quantity=coalesce(input_quantity,quantity), input_unit=coalesce(input_unit,unit), canonical_quantity=coalesce(canonical_quantity,quantity), canonical_unit=coalesce(canonical_unit,unit), conversion_factor=coalesce(conversion_factor,1) where input_quantity is null or canonical_quantity is null;
update emission_factor_registry set activity_unit_id = case activity_unit when 'kWh' then 'unit-energy-kwh' when 'litre' then 'unit-volume-litre' when 'kg' then 'unit-mass-kg' when 'SCM' then 'unit-volume-scm' else activity_unit_id end, canonical_activity_unit_id = case activity_unit when 'kWh' then 'unit-energy-kwh' when 'litre' then 'unit-volume-m3' when 'kg' then 'unit-mass-kg' when 'SCM' then 'unit-volume-m3' else canonical_activity_unit_id end;

insert into organization_localization(organisation_id,language_code,country_code,currency_code,time_zone,measurement_system,reporting_standard_code)
select id,'en',case when coalesce(country,'India')='India' then 'IN' else 'IN' end,coalesce(nullif(currency,''),'INR'),coalesce(nullif(time_zone,''),'Asia/Kolkata'),'metric',coalesce(nullif(reporting_framework,''),'BRSR') from organisations
on conflict(organisation_id) do nothing;
insert into organization_units(id,organisation_id,category_id,unit_id,display_mode)
select 'org-unit-' || o.id || '-' || c.id, o.id, c.id, coalesce(d.unit_id, u.id), 'auto' from organisations o cross join unit_categories c
left join unit_system_defaults d on d.measurement_system='metric' and d.category_id=c.id
left join unit_registry u on u.code=c.canonical_unit_code
where coalesce(d.unit_id, u.id) is not null
on conflict(organisation_id,category_id) do nothing;

create or replace function create_default_organization_localization() returns trigger language plpgsql as $$
begin
  insert into organization_localization(organisation_id) values(new.id) on conflict(organisation_id) do nothing;
  return new;
end; $$;
drop trigger if exists trg_organizations_default_localization on organisations;
create trigger trg_organizations_default_localization after insert on organisations for each row execute function create_default_organization_localization();

create index if not exists idx_reference_values_category on reference_values(category_id,status,sort_order) where deleted_at is null;
create index if not exists idx_reference_values_search on reference_values using gin(to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(code,'') || ' ' || coalesce(display_name,'')));
create index if not exists idx_unit_registry_category on unit_registry(category_id,status) where deleted_at is null;
create index if not exists idx_unit_aliases_lookup on unit_aliases(normalized_alias,language_code) where deleted_at is null;
create index if not exists idx_conversion_history_org on conversion_history(organisation_id,created_at desc);
drop trigger if exists trg_reference_categories_updated_at on reference_categories; create trigger trg_reference_categories_updated_at before update on reference_categories for each row execute function set_updated_at();
drop trigger if exists trg_reference_values_updated_at on reference_values; create trigger trg_reference_values_updated_at before update on reference_values for each row execute function set_updated_at();
drop trigger if exists trg_unit_categories_updated_at on unit_categories; create trigger trg_unit_categories_updated_at before update on unit_categories for each row execute function set_updated_at();
drop trigger if exists trg_unit_registry_updated_at on unit_registry; create trigger trg_unit_registry_updated_at before update on unit_registry for each row execute function set_updated_at();
drop trigger if exists trg_unit_conversion_rules_updated_at on unit_conversion_rules; create trigger trg_unit_conversion_rules_updated_at before update on unit_conversion_rules for each row execute function set_updated_at();
drop trigger if exists trg_unit_aliases_updated_at on unit_aliases; create trigger trg_unit_aliases_updated_at before update on unit_aliases for each row execute function set_updated_at();
drop trigger if exists trg_org_localization_updated_at on organization_localization; create trigger trg_org_localization_updated_at before update on organization_localization for each row execute function set_updated_at();
drop trigger if exists trg_org_units_updated_at on organization_units; create trigger trg_org_units_updated_at before update on organization_units for each row execute function set_updated_at();
drop trigger if exists trg_user_localization_updated_at on user_localization; create trigger trg_user_localization_updated_at before update on user_localization for each row execute function set_updated_at();

alter table reference_categories enable row level security; alter table reference_values enable row level security; alter table reference_translations enable row level security; alter table reference_relationships enable row level security; alter table reference_versions enable row level security; alter table reference_audit_logs enable row level security; alter table reference_import_jobs enable row level security; alter table reference_export_jobs enable row level security;
alter table unit_categories enable row level security; alter table unit_registry enable row level security; alter table unit_conversion_rules enable row level security; alter table unit_aliases enable row level security; alter table unit_precision enable row level security; alter table unit_display_rules enable row level security; alter table unit_system_defaults enable row level security; alter table conversion_constants enable row level security; alter table unit_validation_rules enable row level security;
alter table organization_localization enable row level security; alter table organization_units enable row level security; alter table user_localization enable row level security; alter table conversion_history enable row level security;

insert into permissions(id,key,description) values
 ('perm-reference-read','reference.read','Read enterprise reference data'), ('perm-reference-create','reference.create','Create enterprise reference data'), ('perm-reference-edit','reference.edit','Edit enterprise reference data'), ('perm-reference-publish','reference.publish','Publish enterprise reference data'), ('perm-reference-archive','reference.archive','Archive enterprise reference data'), ('perm-reference-import','reference.import','Import enterprise reference data'), ('perm-reference-export','reference.export','Export enterprise reference data')
on conflict(id) do update set key=excluded.key, description=excluded.description;
insert into role_permissions(role_id,permission_id)
select r.id,p.id from roles r cross join permissions p where r.id in ('role-super-admin','role-platform-admin','role-organisation-admin') and p.key like 'reference.%'
on conflict do nothing;
insert into role_permissions(role_id,permission_id)
select 'role-sustainability-manager',id from permissions where key in ('reference.read','reference.export')
on conflict do nothing;
