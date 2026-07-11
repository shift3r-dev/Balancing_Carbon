import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, suggestMapping, transformRows } from './dataIngestion.js';

const definition = { target_entity_key: 'activity', required_fields: ['facility_id', 'date', 'source_type', 'quantity', 'unit'], optional_fields: ['source_document'], supported_units: ['kWh', 'MWh'] };
test('CSV parsing preserves quoted commas and mapping suggests operational fields', () => { const parsed = parseCsv('Plant,Date,Energy Type,Consumption,UOM,Evidence\nplant-1,2026-01-01,"Grid, Electricity",1200,kWh,bill.pdf'); assert.equal(parsed.rows[0]['Energy Type'], 'Grid, Electricity'); assert.deepEqual(suggestMapping(parsed.headers, definition), { Plant: 'facility_id', Date: 'date', 'Energy Type': 'source_type', Consumption: 'quantity', UOM: 'unit', Evidence: 'source_document' }); });
test('quality engine detects invalid units and duplicate rows', () => { const rows = [{ Plant: 'plant-1', Date: '2026-01-01', Type: 'Grid Electricity', Qty: '12', Unit: 'litre' }, { Plant: 'plant-1', Date: '2026-01-01', Type: 'Grid Electricity', Qty: '12', Unit: 'litre' }]; const result = transformRows(rows, { Plant: 'facility_id', Date: 'date', Type: 'source_type', Qty: 'quantity', Unit: 'unit' }, definition); assert.equal(result[0].status, 'invalid'); assert.ok(result[1].issues.some((issue) => issue.code === 'duplicate_in_file')); });
