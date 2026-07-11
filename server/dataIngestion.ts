import { createHash } from 'node:crypto';
import ExcelJS from 'exceljs';

export type ImportIssue = { field: string; code: string; severity: 'warning' | 'error'; message: string };
export type SourceDefinition = { required_fields: string[]; optional_fields: string[]; supported_units: string[]; target_entity_key: string };

export function parseCsv(content: string) {
  const rows: string[][] = []; let row: string[] = []; let field = ''; let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (character === '"' && quoted && content[index + 1] === '"') { field += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { row.push(field.trim()); field = ''; }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && content[index + 1] === '\n') index += 1;
      row.push(field.trim()); field = ''; if (row.some(Boolean)) rows.push(row); row = [];
    } else field += character;
  }
  row.push(field.trim()); if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) throw new Error('The CSV must contain a header and at least one data row.');
  const headers = rows[0].map((value, index) => value || `column_${index + 1}`);
  return { headers, rows: rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))) };
}

export async function parseExcel(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(buffer as any); const sheet = workbook.worksheets[0]; if (!sheet) throw new Error('The workbook does not contain a worksheet.');
  const rows: string[][] = []; sheet.eachRow({ includeEmpty: false }, (worksheetRow) => { const values = worksheetRow.values as any[]; rows.push(values.slice(1).map((cell) => cell instanceof Date ? cell.toISOString().slice(0, 10) : typeof cell === 'object' && cell?.text ? cell.text : String(cell ?? '').trim())); });
  if (rows.length < 2) throw new Error('The workbook must contain a header and at least one data row.'); const headers = rows[0].map((value, index) => value || `column_${index + 1}`); return { headers, rows: rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))) };
}

const aliases: Record<string, string[]> = {
  facility_id: ['facility', 'facility id', 'facility_id', 'plant', 'plant id'], date: ['date', 'activity date', 'invoice date'],
  source_type: ['source', 'source type', 'energy type', 'fuel type'], quantity: ['quantity', 'consumption', 'amount', 'usage', 'value'],
  unit: ['unit', 'uom', 'measurement unit'], reporting_period: ['reporting period', 'period', 'financial year'],
  source_document: ['source document', 'document', 'invoice', 'evidence'], supplier: ['supplier', 'vendor'], invoice_number: ['invoice number', 'invoice no'],
  cost: ['cost', 'amount paid', 'invoice amount'], currency: ['currency'], notes: ['notes', 'remarks', 'description'],
  flow_type: ['flow type', 'water flow'], waste_type: ['waste type', 'category'], parameter: ['parameter', 'pollutant'],
  material: ['material', 'raw material'], batch: ['batch', 'batch number'], shift: ['shift'], product: ['product', 'finished good'],
};
const normalize = (value: string) => value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');

export function suggestMapping(headers: string[], definition: SourceDefinition) {
  const targets = [...definition.required_fields, ...definition.optional_fields]; const mapping: Record<string, string> = {};
  for (const header of headers) {
    const normalized = normalize(header); const target = targets.find((candidate) => normalize(candidate) === normalized || (aliases[candidate] ?? []).includes(normalized));
    if (target) mapping[header] = target;
  }
  return mapping;
}

export function transformRows(rows: Record<string, string>[], mapping: Record<string, string>, definition: SourceDefinition) {
  const quantities = rows.map((row) => Number(Object.entries(mapping).find(([, target]) => target === 'quantity') ? row[Object.entries(mapping).find(([, target]) => target === 'quantity')![0]] : NaN)).filter(Number.isFinite).sort((a, b) => a - b);
  const median = quantities.length ? quantities[Math.floor(quantities.length / 2)] : 0; const seen = new Set<string>();
  return rows.map((sourceData, index) => {
    const mappedData = Object.fromEntries(Object.entries(mapping).map(([source, target]) => [target, sourceData[source]])); const issues: ImportIssue[] = [];
    for (const field of definition.required_fields) if (mappedData[field] === undefined || mappedData[field] === '') issues.push({ field, code: 'missing_required', severity: 'error', message: `${field.replace(/_/g, ' ')} is required.` });
    if (mappedData.quantity !== undefined && (!Number.isFinite(Number(mappedData.quantity)) || Number(mappedData.quantity) < 0)) issues.push({ field: 'quantity', code: 'invalid_number', severity: 'error', message: 'Quantity must be a non-negative number.' });
    if (mappedData.date && Number.isNaN(Date.parse(mappedData.date))) issues.push({ field: 'date', code: 'invalid_date', severity: 'error', message: 'Date is not recognized.' });
    if (mappedData.unit && definition.supported_units.length && !definition.supported_units.map(normalize).includes(normalize(mappedData.unit))) issues.push({ field: 'unit', code: 'invalid_unit', severity: 'error', message: `Unit ${mappedData.unit} is not supported for this source.` });
    if (median > 0 && Number(mappedData.quantity) > median * 10) issues.push({ field: 'quantity', code: 'possible_anomaly', severity: 'warning', message: 'Quantity is more than ten times the median import value.' });
    const normalizedData: Record<string, any> = { ...mappedData, quantity: mappedData.quantity === undefined || mappedData.quantity === '' ? mappedData.quantity : Number(mappedData.quantity), date: mappedData.date ? new Date(mappedData.date).toISOString().slice(0, 10) : mappedData.date };
    const signature = createHash('sha256').update(JSON.stringify([definition.target_entity_key, normalizedData.facility_id, normalizedData.date, normalizedData.source_type, normalizedData.quantity, normalizedData.unit, normalizedData.external_record_id])).digest('hex');
    if (seen.has(signature)) issues.push({ field: '', code: 'duplicate_in_file', severity: 'error', message: 'This row duplicates another row in the same file.' }); seen.add(signature);
    const errors = issues.filter((issue) => issue.severity === 'error').length; const warnings = issues.length - errors; const confidence = Math.max(0, 100 - errors * 30 - warnings * 10);
    return { rowNumber: index + 2, sourceData, mappedData, normalizedData, issues, duplicateSignature: signature, confidenceScore: confidence, status: errors ? (issues.some((issue) => issue.code.startsWith('duplicate')) ? 'duplicate' : 'invalid') : 'valid' };
  });
}
