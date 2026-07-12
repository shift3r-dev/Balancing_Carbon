import assert from 'node:assert/strict';
import test from 'node:test';

import { createStudioDocx, createStudioPdf, createStudioPptx, createStudioXlsx, numberedStudioPages } from './reportStudioEngine.js';

const report = { title: 'ESG Report', type: 'Integrated', period: 'FY 2026-27', brandKit: {}, studioPages: [{ id: 'p1', page_number: 1, title: 'Highlights', report_studio_blocks: [{ id: 'b1', block_type: 'chart', position: 0, title: 'Emissions', content: { text: 'Recorded emissions performance.', kpis: [{ label: 'Total', value: 12.5, unit: 'tCO2e' }] }, source_label: 'Carbon ledger' }, { id: 'b2', block_type: 'table', position: 1, title: 'Sources', content: { rows: [['Source','tCO2e'],['Grid',12.5]] } }] }] };

test('studio numbering assigns deterministic figure and table references', () => { const pages = numberedStudioPages(report.studioPages); assert.equal(pages[0].report_studio_blocks?.[0].autoNumber, 'Figure 1'); assert.equal(pages[0].report_studio_blocks?.[1].autoNumber, 'Table 1'); });
test('studio resolves cross references during composition', () => { const pages = numberedStudioPages([{ id: 'p1', page_number: 1, report_studio_blocks: [{ id: 'chart-1', block_type: 'chart', position: 0, title: 'Scope split', content: { rows: [] } }, { id: 'text-1', block_type: 'narrative', position: 1, content: { text: 'See [[block:chart-1]].' } }] }]); assert.equal((pages[0].report_studio_blocks as any[])[1].content.text, 'See Figure 1.'); });
test('studio produces valid PDF and Office package signatures', async () => { const [pdf,docx,pptx,xlsx] = await Promise.all([createStudioPdf(report),createStudioDocx(report),createStudioPptx(report),createStudioXlsx(report)]); assert.equal(pdf.subarray(0,4).toString(),'%PDF'); for(const value of [docx,pptx,xlsx]) assert.equal(value.subarray(0,2).toString(),'PK'); });
