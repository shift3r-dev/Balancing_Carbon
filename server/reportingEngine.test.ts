import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReportSnapshot, createCsvExport, createExcelXmlExport, createPdfExport, validateReportSnapshot } from './reportingEngine.js';

const snapshot = buildReportSnapshot([
  { id: 'calc-1', emissions_t_co2e: 12.5, factor_version: '2025.1', calculated_at: '2026-04-01T00:00:00Z', activity: { id: 'activity-1', source_type: 'Grid Electricity', scope: 'scope-2', facility_id: 'facility-1', facility_name: 'Plant A', verification_status: 'approved', evidence_count: 1 } },
  { id: 'calc-2', emissions_t_co2e: 3.2, factor_version: '2025.1', calculated_at: '2026-04-02T00:00:00Z', activity: { id: 'activity-2', source_type: 'Diesel', scope: 'scope-1', facility_id: 'facility-1', facility_name: 'Plant A', verification_status: 'draft', evidence_count: 0 } },
]);

test('report snapshots preserve scope and provenance totals', () => {
  assert.equal(snapshot.emissionsTco2e, 15.7); assert.equal(snapshot.scope1Tco2e, 3.2); assert.equal(snapshot.scope2Tco2e, 12.5); assert.equal(snapshot.calculationReferences.length, 2);
});
test('report validation requires review when evidence or approval is incomplete', () => {
  const validation = validateReportSnapshot(snapshot); assert.equal(validation.status, 'needs-review'); assert.equal(validation.metrics.activityEvidenceCoverage, 50); assert.equal(validation.metrics.approvedActivityCoverage, 50);
});
test('exports produce non-empty portable report artifacts', () => {
  const report = { title: 'FY26 report', type: 'Management Carbon Report', period: 'FY 2025-26', workflow_status: 'draft', currentVersion: { calculation_snapshot: snapshot, validation_snapshot: validateReportSnapshot(snapshot) } };
  assert.match(createCsvExport(report), /Total emissions/); assert.match(createExcelXmlExport(report), /Workbook/); assert.match(createPdfExport(report).toString('utf8'), /%PDF-1.4/);
});
