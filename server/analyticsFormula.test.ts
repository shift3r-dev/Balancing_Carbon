import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateAnalyticsFormula } from './analyticsFormula.js';
import { linearProjection } from './analyticsProjection.js';

test('analytics formulas honor precedence and KPI variables', () => assert.equal(evaluateAnalyticsFormula('emissions_total * 1000 / production_total', { emissions_total: 12, production_total: 240 }), 50));
test('analytics formulas handle division by zero without invalid dashboard values', () => assert.equal(evaluateAnalyticsFormula('emissions_total / production_total', { emissions_total: 12, production_total: 0 }), 0));
test('analytics formulas reject functions and property access', () => { assert.throws(() => evaluateAnalyticsFormula('constructor.constructor(1)', {}), /Unsupported formula token|Unknown KPI/); assert.throws(() => evaluateAnalyticsFormula('max(a, b)', { a: 1, b: 2 }), /Unsupported formula token|Unexpected formula token/); });
test('analytics formulas reject unknown KPI identifiers', () => assert.throws(() => evaluateAnalyticsFormula('unknown + 1', {}), /Unknown KPI variable/));
test('analytics projection is deterministic and identifies its method', () => { const result=linearProjection([{period:'2026-01',value:10},{period:'2026-02',value:20},{period:'2026-03',value:30}],2); assert.deepEqual(result.map(item=>[item.period,item.value,item.method]),[['2026-04',40,'ordinary-least-squares'],['2026-05',50,'ordinary-least-squares']]); });
test('analytics projection requires at least two observations', () => assert.deepEqual(linearProjection([{period:'2026-01',value:10}]),[]));
