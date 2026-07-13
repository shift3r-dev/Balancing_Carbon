import assert from 'node:assert/strict';import test from 'node:test';import {marginalAbatementCost,netZeroTrajectory,supplierScore,targetProgress} from './sustainabilityIntelligence.js';
test('MACC annualizes capex and subtracts annual savings',()=>assert.equal(marginalAbatementCost({capex:100000,annualSavings:30000,annualReduction:20,lifetimeYears:5}),-500));
test('MACC returns null without quantified abatement',()=>assert.equal(marginalAbatementCost({capex:1,annualSavings:0,annualReduction:0,lifetimeYears:5}),null));
test('net-zero trajectory preserves baseline and residual endpoints',()=>{const rows=netZeroTrajectory({baselineYear:2025,targetYear:2030,baseline:100,residual:10});assert.deepEqual(rows.at(0),{year:2025,target:100});assert.deepEqual(rows.at(-1),{year:2030,target:10});});
test('supplier score rewards provenance and engagement without inventing intensity benchmarks',()=>assert.equal(supplierScore({dataQuality:'third-party-verified',engagement:'verified',renewableShare:50,hasEmissions:true,hasEvidence:true}),90));
test('target progress is bounded',()=>assert.equal(targetProgress({baseline:100,target:50,current:40,direction:'decrease'}),100));
