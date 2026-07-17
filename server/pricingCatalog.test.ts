import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultImplementationServices, defaultPricingAddons, defaultPricingPlans } from '../shared/pricingCatalog.ts';

test('pricing catalog exposes the four launch tiers in order', () => {
  assert.deepEqual(defaultPricingPlans.map((plan) => plan.name), ['Free', 'Starter', 'Professional', 'Enterprise']);
  assert.deepEqual(defaultPricingPlans.map((plan) => plan.monthlyPrice), [0, 9999, 49999, 0]);
  assert.equal(defaultPricingPlans.at(-1)?.contactSales, true);
});

test('every tier declares the same comparison surface and governed limits', () => {
  const featureKeys = defaultPricingPlans[0].features.map((feature) => feature.key);
  for (const plan of defaultPricingPlans) {
    assert.deepEqual(plan.features.map((feature) => feature.key), featureKeys);
    assert.ok(plan.limits.some((limit) => limit.key === 'facilities'));
    assert.ok(plan.limits.some((limit) => limit.key === 'ocr_pages_month'));
    assert.ok(plan.limits.some((limit) => limit.key === 'ai_reports_month'));
    assert.ok(plan.limits.some((limit) => limit.key === 'storage_gb'));
  }
});

test('professional and enterprise capacity match launch positioning', () => {
  const professional = defaultPricingPlans.find((plan) => plan.slug === 'professional')!;
  const enterprise = defaultPricingPlans.find((plan) => plan.slug === 'enterprise')!;
  assert.equal(professional.limits.find((limit) => limit.key === 'facilities')?.type, 'unlimited');
  assert.equal(professional.limits.find((limit) => limit.key === 'ocr_pages_month')?.value, 5000);
  assert.equal(enterprise.limits.find((limit) => limit.key === 'team_members')?.type, 'unlimited');
  assert.ok(enterprise.features.some((feature) => feature.key === 'custom_ai' && feature.availability === 'custom'));
});

test('catalog includes modular add-ons and implementation services', () => {
  assert.ok(defaultPricingAddons.length >= 18);
  assert.ok(defaultImplementationServices.length >= 8);
  assert.ok(defaultPricingAddons.some((addon) => addon.key === 'supplier-portal'));
  assert.ok(defaultPricingAddons.some((addon) => addon.key === 'custom-api'));
});
