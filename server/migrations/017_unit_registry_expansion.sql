-- Phase 7 follow-up: broaden registry coverage for all public calculator inputs.
-- Apply after 016. Additive and safe for databases where 016 has already been applied.

insert into unit_categories(id,code,name,canonical_unit_code,sort_order) values
  ('unitcat-count','count','Count','person',16),
  ('unitcat-ratio','ratio','Ratio','PUE',17)
on conflict(id) do update set name=excluded.name, canonical_unit_code=excluded.canonical_unit_code, sort_order=excluded.sort_order;

insert into unit_registry(id,code,name,symbol,category_id,measurement_system,canonical_unit_id,factor_to_canonical,conversion_formula,display_precision) values
  ('unit-energy-therm','therm','Therm','therm','unitcat-energy','imperial','unit-energy-kwh',29.307107,'linear',3),
  ('unit-energy-kcal','kcal','Kilocalorie','kcal','unitcat-energy','metric','unit-energy-kwh',0.0011622222,'linear',3),
  ('unit-volume-imperial-gallon','gallon-imperial','Imperial gallon','imp gal','unitcat-volume','imperial','unit-volume-m3',0.00454609,'linear',3),
  ('unit-mass-short-ton','short-ton','US short ton','short ton','unitcat-mass','imperial','unit-mass-kg',907.18474,'linear',3),
  ('unit-mass-ounce','oz','Ounce','oz','unitcat-mass','imperial','unit-mass-kg',0.028349523125,'linear',3),
  ('unit-distance-foot','ft','Foot','ft','unitcat-distance','imperial','unit-distance-km',0.0003048,'linear',3),
  ('unit-distance-yard','yard','Yard','yd','unitcat-distance','imperial','unit-distance-km',0.0009144,'linear',3),
  ('unit-time-day','day','Day','day','unitcat-time','universal','unit-time-hour',24,'linear',2),
  ('unit-time-second','second','Second','s','unitcat-time','universal','unit-time-hour',0.0002777778,'linear',2),
  ('unit-water-kl','water-kL','Water kilolitre','kL','unitcat-water','metric','unit-water-m3',1,'linear',3),
  ('unit-power-kva','kVA','Kilovolt-ampere','kVA','unitcat-power','universal',null,1,'linear',2),
  ('unit-count-person','person','Person','people','unitcat-count','universal',null,1,'linear',0),
  ('unit-count-unit','count-unit','Count','count','unitcat-count','universal','unit-count-person',1,'linear',0),
  ('unit-count-plant','plant','Plant','plant','unitcat-count','universal','unit-count-person',1,'linear',0),
  ('unit-count-meter','meter-count','Meter','meter','unitcat-count','universal','unit-count-person',1,'linear',0),
  ('unit-count-incident','incident','Incident','incident','unitcat-count','universal','unit-count-person',1,'linear',0),
  ('unit-count-supplier','supplier','Supplier','supplier','unitcat-count','universal','unit-count-person',1,'linear',0),
  ('unit-ratio-pue','PUE','Power Usage Effectiveness','PUE','unitcat-ratio','universal',null,1,'linear',2),
  ('unit-ratio-percent','percent','Percent','%','unitcat-ratio','universal','unit-ratio-pue',0.01,'linear',2),
  ('unit-ratio-pf','power-factor','Power factor','PF','unitcat-ratio','universal','unit-ratio-pue',1,'linear',2)
on conflict(id) do update set name=excluded.name, symbol=excluded.symbol, factor_to_canonical=excluded.factor_to_canonical, status='active';

update unit_registry set canonical_unit_id=id where canonical_unit_id is null;

insert into unit_aliases(id,unit_id,alias,normalized_alias) values
  ('alias-therm','unit-energy-therm','therms','therms'), ('alias-kcal','unit-energy-kcal','kilocalorie','kilocalorie'),
  ('alias-short-ton','unit-mass-short-ton','us ton','us ton'), ('alias-foot','unit-distance-foot','feet','feet'),
  ('alias-day','unit-time-day','days','days'), ('alias-second','unit-time-second','seconds','seconds'), ('alias-water-kl','unit-water-kl','kilolitres','kilolitres'),
  ('alias-person','unit-count-person','people','people'), ('alias-pf','unit-ratio-pf','cos phi','cos phi')
on conflict(normalized_alias,language_code) do nothing;

insert into unit_system_defaults(id,measurement_system,category_id,unit_id) values
  ('usd-metric-time','metric','unitcat-time','unit-time-day'), ('usd-metric-count','metric','unitcat-count','unit-count-person'), ('usd-metric-ratio','metric','unitcat-ratio','unit-ratio-pue'),
  ('usd-imperial-distance','imperial','unitcat-distance','unit-distance-mile')
on conflict(measurement_system,category_id) do update set unit_id=excluded.unit_id;

insert into unit_display_rules(id,category_id,measurement_system,preferred_unit_id,minimum_display_value,maximum_display_value,sort_order) values
  ('udr-time-metric','unitcat-time','metric','unit-time-day',1,999,1), ('udr-count-metric','unitcat-count','metric','unit-count-person',1,999999,1)
on conflict(id) do update set preferred_unit_id=excluded.preferred_unit_id, minimum_display_value=excluded.minimum_display_value, maximum_display_value=excluded.maximum_display_value;

insert into organization_units(id,organisation_id,category_id,unit_id,display_mode)
select 'org-unit-' || o.id || '-' || c.id, o.id, c.id, coalesce(d.unit_id, u.id), 'auto'
from organisations o cross join unit_categories c
left join unit_system_defaults d on d.measurement_system='metric' and d.category_id=c.id
left join unit_registry u on u.code=c.canonical_unit_code
where coalesce(d.unit_id, u.id) is not null
on conflict(organisation_id,category_id) do nothing;
