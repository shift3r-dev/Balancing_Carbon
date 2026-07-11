import test from 'node:test';
import assert from 'node:assert/strict';
import 'dotenv/config';

import { evaluateMetadataCondition, renderMetadataForm } from './metadataEngine.js';

test('metadata condition engine supports nested and comparison conditions without evaluating code', () => {
  const values = { industry: 'steel', capacity: 120, brsr: true };
  assert.equal(evaluateMetadataCondition({ all: [{ field: 'industry', operator: 'equals', value: 'steel' }, { field: 'capacity', operator: 'greater-than', value: 100 }] }, values), true);
  assert.equal(evaluateMetadataCondition({ any: [{ field: 'industry', operator: 'equals', value: 'cement' }, { field: 'brsr', operator: 'equals', value: true }] }, values), true);
  assert.equal(evaluateMetadataCondition({ field: 'capacity', operator: 'less-than', value: 100 }, values), false);
});

test('metadata renderer applies conditional visibility and field state', () => {
  const form: any = {
    sections: [{ id: 'operations', title: 'Operations' }], validations: [], permissions: [],
    visibility: [{ field_id: 'furnace', action: 'show', inline_condition: { field: 'industry', operator: 'equals', value: 'steel' } }, { field_id: 'capacity', action: 'require', inline_condition: { field: 'industry', operator: 'equals', value: 'steel' } }],
    fields: [{ id: 'industry', field_key: 'industry', label: 'Industry', section_id: 'operations', is_required: true }, { id: 'furnace', field_key: 'furnace', label: 'Furnace', section_id: 'operations', is_required: false }, { id: 'capacity', field_key: 'capacity', label: 'Capacity', section_id: 'operations', is_required: false }],
  };
  const rendered = renderMetadataForm(form, { industry: 'steel' }, { permissions: [], roleIds: [] });
  assert.equal(rendered.fields.find((field: any) => field.id === 'furnace').visible, true);
  assert.equal(rendered.fields.find((field: any) => field.id === 'capacity').required, true);
});
