-- Phase 3 pricing finalization. Apply after 007 and 008 on existing projects.
-- Enterprise+ is retained only as archived historical data and cannot be selected.

update plans
set
  name = case id when 'plan-starter' then 'Starter' when 'plan-professional' then 'Professional' when 'plan-enterprise' then 'Enterprise' else name end,
  description = case id
    when 'plan-starter' then 'Essential carbon accounting for a single organisation.'
    when 'plan-professional' then 'Carbon operations and compliance for growing teams.'
    when 'plan-enterprise' then 'Governance and scale for complex carbon programmes.'
    else description
  end,
  monthly_price = case id when 'plan-starter' then 4999 when 'plan-professional' then 14999 when 'plan-enterprise' then 49999 else monthly_price end,
  yearly_price = case id when 'plan-starter' then 49990 when 'plan-professional' then 149990 when 'plan-enterprise' then 499990 else yearly_price end,
  currency = case when id in ('plan-starter', 'plan-professional', 'plan-enterprise') then 'INR' else currency end,
  trial_days = case when id in ('plan-starter', 'plan-professional', 'plan-enterprise') then 14 else trial_days end,
  recommended = id = 'plan-professional',
  badge = case when id = 'plan-professional' then 'Most Popular' else '' end,
  active = id in ('plan-starter', 'plan-professional', 'plan-enterprise'),
  sort_order = case id when 'plan-starter' then 1 when 'plan-professional' then 2 when 'plan-enterprise' then 3 else sort_order end
where id in ('plan-starter', 'plan-professional', 'plan-enterprise', 'plan-enterprise-plus');

delete from plan_limits where plan_id in ('plan-starter', 'plan-professional', 'plan-enterprise') and limit_key = 'ai_requests_month';
delete from plan_features where plan_id in ('plan-starter', 'plan-professional', 'plan-enterprise') and feature_key = 'ai_insights';

insert into plan_features (id, plan_id, feature_key, label, category, availability, sort_order) values
  ('feature-plan-professional-calculation-insights', 'plan-professional', 'calculation_insights', 'Calculation Insights', 'Analytics', 'included', 2),
  ('feature-plan-professional-rest-api', 'plan-professional', 'rest_api', 'REST API', 'Integrations', 'coming-soon', 7),
  ('feature-plan-professional-priority-support', 'plan-professional', 'priority_support', 'Priority Support', 'Support', 'coming-soon', 8),
  ('feature-plan-enterprise-erp-integrations', 'plan-enterprise', 'erp_integrations', 'ERP Integrations', 'Integrations', 'coming-soon', 2),
  ('feature-plan-enterprise-sso', 'plan-enterprise', 'sso', 'SSO', 'Security', 'coming-soon', 3),
  ('feature-plan-enterprise-scim', 'plan-enterprise', 'scim', 'SCIM', 'Security', 'coming-soon', 4),
  ('feature-plan-enterprise-forecasting', 'plan-enterprise', 'forecasting', 'Forecasting', 'Analytics', 'coming-soon', 7),
  ('feature-plan-enterprise-white-label', 'plan-enterprise', 'white_label', 'White Label', 'Administration', 'coming-soon', 8),
  ('feature-plan-enterprise-success-manager', 'plan-enterprise', 'success_manager', 'Dedicated Success Manager', 'Support', 'coming-soon', 9)
on conflict (plan_id, feature_key) do update set label = excluded.label, category = excluded.category, availability = excluded.availability, sort_order = excluded.sort_order;

-- Preserve an existing Enterprise+ subscription for audit and manual support;
-- only future selection is disabled by plans.active = false above.

