export type ReportingActivity = {
  id: string;
  source_type?: string;
  scope?: 'scope-1' | 'scope-2' | string | null;
  facility_id?: string;
  facility_name?: string;
  verification_status?: string;
  activity_date?: string;
  evidence_count?: number;
};

export type ReportingCalculation = {
  id: string;
  emissions_t_co2e?: number | string | null;
  factor_version?: string;
  calculated_at?: string;
  activity: ReportingActivity;
};

export type ReportSnapshot = {
  generatedAt: string;
  calculationCount: number;
  activityCount: number;
  emissionsTco2e: number;
  scope1Tco2e: number;
  scope2Tco2e: number;
  scope3Tco2e: number;
  approvedActivityCount: number;
  activityEvidenceCount: number;
  facilities: Array<{ id: string; name: string; emissionsTco2e: number }>;
  sources: Array<{ name: string; emissionsTco2e: number }>;
  calculationReferences: Array<{ id: string; activityId: string; factorVersion: string; calculatedAt: string }>;
  display?: { total: { value: number; unit: string }; scope1: { value: number; unit: string }; scope2: { value: number; unit: string }; scope3: { value: number; unit: string } };
};

export type ReportValidation = {
  status: 'ready' | 'needs-review' | 'blocked';
  errors: string[];
  warnings: string[];
  metrics: { activityEvidenceCoverage: number; approvedActivityCoverage: number; calculationCoverage: number };
};

const round = (value: number) => Math.round(value * 1000) / 1000;

export function buildReportSnapshot(calculations: ReportingCalculation[], generatedAt = new Date().toISOString()): ReportSnapshot {
  const activityIds = new Set<string>();
  const facilities = new Map<string, { id: string; name: string; emissionsTco2e: number }>();
  const sources = new Map<string, number>();
  let scope1Tco2e = 0;
  let scope2Tco2e = 0;
  let scope3Tco2e = 0;
  let activityEvidenceCount = 0;
  let approvedActivityCount = 0;

  for (const calculation of calculations) {
    const activity = calculation.activity;
    const emissions = Number(calculation.emissions_t_co2e ?? 0);
    const safeEmissions = Number.isFinite(emissions) ? emissions : 0;
    activityIds.add(activity.id);
    if (activity.scope === 'scope-1') scope1Tco2e += safeEmissions;
    if (activity.scope === 'scope-2') scope2Tco2e += safeEmissions;
    if (activity.scope === 'scope-3') scope3Tco2e += safeEmissions;
    if ((activity.evidence_count ?? 0) > 0) activityEvidenceCount += 1;
    if (['verified', 'approved'].includes(activity.verification_status ?? '')) approvedActivityCount += 1;

    const facilityId = activity.facility_id ?? 'unassigned';
    const facility = facilities.get(facilityId) ?? { id: facilityId, name: activity.facility_name || 'Unassigned facility', emissionsTco2e: 0 };
    facility.emissionsTco2e += safeEmissions;
    facilities.set(facilityId, facility);
    const source = activity.source_type || 'Unclassified source';
    sources.set(source, (sources.get(source) ?? 0) + safeEmissions);
  }

  return {
    generatedAt,
    calculationCount: calculations.length,
    activityCount: activityIds.size,
    emissionsTco2e: round(scope1Tco2e + scope2Tco2e + scope3Tco2e),
    scope1Tco2e: round(scope1Tco2e),
    scope2Tco2e: round(scope2Tco2e),
    scope3Tco2e: round(scope3Tco2e),
    approvedActivityCount,
    activityEvidenceCount,
    facilities: [...facilities.values()].map((item) => ({ ...item, emissionsTco2e: round(item.emissionsTco2e) })).sort((a, b) => b.emissionsTco2e - a.emissionsTco2e),
    sources: [...sources.entries()].map(([name, emissionsTco2e]) => ({ name, emissionsTco2e: round(emissionsTco2e) })).sort((a, b) => b.emissionsTco2e - a.emissionsTco2e),
    calculationReferences: calculations.map((calculation) => ({ id: calculation.id, activityId: calculation.activity.id, factorVersion: calculation.factor_version ?? '', calculatedAt: calculation.calculated_at ?? '' })),
  };
}

export function validateReportSnapshot(snapshot: ReportSnapshot): ReportValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!snapshot.calculationCount) errors.push('No current carbon calculations are available for this reporting period.');
  if (snapshot.activityCount && snapshot.activityEvidenceCount < snapshot.activityCount) warnings.push(`${snapshot.activityCount - snapshot.activityEvidenceCount} activity record(s) do not have linked evidence.`);
  if (snapshot.activityCount && snapshot.approvedActivityCount < snapshot.activityCount) warnings.push(`${snapshot.activityCount - snapshot.approvedActivityCount} activity record(s) still need verification or approval.`);
  if (!snapshot.scope1Tco2e && !snapshot.scope2Tco2e && !snapshot.scope3Tco2e && snapshot.calculationCount) warnings.push('Current calculations contain zero reported emissions; confirm the activity data and factors.');
  const activityEvidenceCoverage = snapshot.activityCount ? round((snapshot.activityEvidenceCount / snapshot.activityCount) * 100) : 0;
  const approvedActivityCoverage = snapshot.activityCount ? round((snapshot.approvedActivityCount / snapshot.activityCount) * 100) : 0;
  return { status: errors.length ? 'blocked' : warnings.length ? 'needs-review' : 'ready', errors, warnings, metrics: { activityEvidenceCoverage, approvedActivityCoverage, calculationCoverage: snapshot.calculationCount ? 100 : 0 } };
}

const escapeXml = (value: unknown) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const escapeCsv = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export function reportRows(report: any) {
  const version = report.currentVersion;
  const snapshot = version?.calculation_snapshot as ReportSnapshot | undefined;
  const validation = version?.validation_snapshot as ReportValidation | undefined;
  const rows: Array<[string, string, string]> = [
    ['Report', 'Title', report.title], ['Report', 'Type', report.type], ['Report', 'Period', report.period], ['Report', 'Workflow status', report.workflow_status ?? 'draft'],
  ];
  if (snapshot) {
    rows.push(['Carbon inventory', 'Total emissions', snapshot.display ? `${snapshot.display.total.value} ${snapshot.display.total.unit}` : `${snapshot.emissionsTco2e.toFixed(3)} tCO2e`]);
    rows.push(['Carbon inventory', 'Scope 1', snapshot.display ? `${snapshot.display.scope1.value} ${snapshot.display.scope1.unit}` : `${snapshot.scope1Tco2e.toFixed(3)} tCO2e`]);
    rows.push(['Carbon inventory', 'Scope 2', snapshot.display ? `${snapshot.display.scope2.value} ${snapshot.display.scope2.unit}` : `${snapshot.scope2Tco2e.toFixed(3)} tCO2e`]);
    rows.push(['Carbon inventory', 'Scope 3', snapshot.display ? `${snapshot.display.scope3.value} ${snapshot.display.scope3.unit}` : `${snapshot.scope3Tco2e.toFixed(3)} tCO2e`]);
    rows.push(['Data quality', 'Evidence coverage', `${snapshot.activityCount ? ((snapshot.activityEvidenceCount / snapshot.activityCount) * 100).toFixed(1) : '0.0'}%`]);
    rows.push(['Data quality', 'Approved activity coverage', `${snapshot.activityCount ? ((snapshot.approvedActivityCount / snapshot.activityCount) * 100).toFixed(1) : '0.0'}%`]);
    for (const source of snapshot.sources) rows.push(['Emission source', source.name, `${source.emissionsTco2e.toFixed(3)} tCO2e`]);
    for (const facility of snapshot.facilities) rows.push(['Facility', facility.name, `${facility.emissionsTco2e.toFixed(3)} tCO2e`]);
  }
  for (const error of validation?.errors ?? []) rows.push(['Validation error', '', error]);
  for (const warning of validation?.warnings ?? []) rows.push(['Validation warning', '', warning]);
  return rows;
}

export function createCsvExport(report: any) {
  return ['Category,Metric,Value', ...reportRows(report).map((row) => row.map(escapeCsv).join(','))].join('\n');
}

export function createExcelXmlExport(report: any) {
  const cells = (row: string[]) => `<Row>${row.map((value) => `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`).join('')}</Row>`;
  return `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Report"><Table>${cells(['Category', 'Metric', 'Value'])}${reportRows(report).map(cells).join('')}</Table></Worksheet></Workbook>`;
}

function pdfEscape(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)').replace(/[^\x20-\x7E]/g, '?');
}

/** A small, dependency-free PDF used for immutable reporting snapshots. */
export function createPdfExport(report: any) {
  const lines = [report.title, `Type: ${report.type} | Period: ${report.period}`, '', ...reportRows(report).map((row) => row.filter(Boolean).join(' - '))];
  const pages = [] as string[][];
  for (let index = 0; index < lines.length; index += 44) pages.push(lines.slice(index, index + 44));
  const objects: string[] = ['<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const pageRefs: number[] = [];
  for (const page of pages) {
    const pageObject = objects.length + 1;
    const streamObject = pageObject + 1;
    pageRefs.push(pageObject);
    const stream = `BT\n/F1 10 Tf\n50 790 Td\n${page.map((line, index) => `${index ? '0 -16 Td\n' : ''}(${pdfEscape(line)}) Tj`).join('\n')}\nET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamObject} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`);
  }
  objects[1] = `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(' ')}] /Count ${pageRefs.length} >>`;
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf, 'utf8')); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}
