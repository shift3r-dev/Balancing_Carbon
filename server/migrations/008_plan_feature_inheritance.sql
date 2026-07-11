-- Corrects Phase 3 plan inheritance. Higher-tier plans include every lower-tier feature.
-- The public catalog currently contains Starter, Professional, and Enterprise.

insert into plan_features (id, plan_id, feature_key, label, category, availability, sort_order)
select 'feature-' || target.plan_id || '-' || source.feature_key,
       target.plan_id, source.feature_key, source.label, source.category, source.availability, source.sort_order
from plan_features source
cross join (values ('plan-professional'), ('plan-enterprise')) as target(plan_id)
where source.plan_id = 'plan-starter'
on conflict (plan_id, feature_key) do update set label=excluded.label, category=excluded.category, availability=excluded.availability, sort_order=excluded.sort_order;

insert into plan_features (id, plan_id, feature_key, label, category, availability, sort_order)
select 'feature-' || target.plan_id || '-' || source.feature_key,
       target.plan_id, source.feature_key, source.label, source.category, source.availability, source.sort_order + 100
from plan_features source
cross join (values ('plan-enterprise')) as target(plan_id)
where source.plan_id = 'plan-professional'
on conflict (plan_id, feature_key) do update set label=excluded.label, category=excluded.category, availability=excluded.availability, sort_order=excluded.sort_order;
