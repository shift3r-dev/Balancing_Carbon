import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import ExcelJS from 'exceljs';
import { createRequire } from 'node:module';
import PDFDocument from 'pdfkit';

export type StudioBlock = { id: string; block_type: string; position: number; column_index?: number; title?: string; content?: any; style?: any; data_binding?: any; source_label?: string; report_block_evidence?: any[] };
export type StudioPage = { id: string; page_number: number; title?: string; layout?: string; background_color?: string; report_studio_blocks?: StudioBlock[] };

export function orderedStudioPages(value: unknown): StudioPage[] {
  if (!Array.isArray(value)) return [];
  return value.map((page: any) => ({ ...page, report_studio_blocks: Array.isArray(page.report_studio_blocks) ? [...page.report_studio_blocks].sort((a, b) => Number(a.position) - Number(b.position) || Number(a.column_index) - Number(b.column_index)) : [] })).sort((a, b) => Number(a.page_number) - Number(b.page_number));
}

export function numberedStudioPages(value: unknown) {
  const pages = orderedStudioPages(value); let figure = 0, table = 0;
  const numbered = pages.map((page, pageIndex) => ({ ...page, displayNumber: pageIndex + 1, report_studio_blocks: (page.report_studio_blocks ?? []).map((block) => {
    const number = block.block_type === 'chart' || block.block_type === 'image' ? `Figure ${++figure}` : block.block_type === 'table' ? `Table ${++table}` : '';
    return { ...block, autoNumber: number, crossReferenceLabel: number ? `${number}: ${block.title || block.content?.caption || 'Untitled'}` : '' };
  }) }));
  const labels = new Map(numbered.flatMap((page) => (page.report_studio_blocks ?? []).map((block: any) => [block.id, block.autoNumber || block.title || 'referenced section'] as const)));
  return numbered.map((page) => ({ ...page, report_studio_blocks: (page.report_studio_blocks ?? []).map((block: any) => ({ ...block, content: { ...(block.content ?? {}), ...Object.fromEntries(Object.entries(block.content ?? {}).map(([key, item]) => [key, typeof item === 'string' ? item.replace(/\[\[block:([^\]]+)\]\]/g, (_match, blockId) => labels.get(blockId) ?? 'referenced item') : item])) } })) }));
}

const blockText = (block: any) => String(block.content?.text ?? block.content?.narrative ?? block.content?.value ?? '').trim();
const tableRows = (block: any): any[][] => Array.isArray(block.content?.rows) ? block.content.rows : Array.isArray(block.content?.table) ? block.content.table.map((row: any) => [row.name ?? row.label ?? '', row.value ?? row.emissionsTco2e ?? '']) : [];
const kpis = (block: any): any[] => Array.isArray(block.content?.kpis) ? block.content.kpis : [];
const hex = (value: unknown, fallback: string) => /^#[0-9a-f]{6}$/i.test(String(value ?? '')) ? String(value).slice(1) : fallback.replace('#','');

export async function createStudioDocx(report: any) {
  const children: any[] = [new Paragraph({ text: report.title, heading: HeadingLevel.TITLE }), new Paragraph({ children: [new TextRun({ text: `${report.type} | ${report.period}`, italics: true })] })];
  for (const page of numberedStudioPages(report.studioPages)) {
    if (page.title) children.push(new Paragraph({ text: page.title, heading: HeadingLevel.HEADING_1 }));
    for (const block of page.report_studio_blocks ?? []) {
      if (block.title) children.push(new Paragraph({ text: `${block.autoNumber ? `${block.autoNumber}: ` : ''}${block.title}`, heading: block.block_type === 'heading' ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3 }));
      const text = blockText(block); if (text) children.push(new Paragraph({ text }));
      if (kpis(block).length) children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: kpis(block).map((item: any) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(item.label ?? ''), bold: true })] }), new Paragraph(`${item.value ?? ''} ${item.unit ?? ''}`)] })) })] }));
      const rows = tableRows(block); if (rows.length) children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rows.map((row) => new TableRow({ children: row.map((cell) => new TableCell({ children: [new Paragraph(String(cell ?? ''))] })) })) }));
      if (block.source_label) children.push(new Paragraph({ children: [new TextRun({ text: `Source: ${block.source_label}`, italics: true, size: 18 })] }));
    }
  }
  return Buffer.from(await Packer.toBuffer(new Document({ sections: [{ children }] })) as Uint8Array);
}

export async function createStudioXlsx(report: any) {
  const workbook = new ExcelJS.Workbook(); workbook.creator = 'Balancing Carbon'; const summary = workbook.addWorksheet('Report');
  summary.addRow(['Report', report.title]); summary.addRow(['Type', report.type]); summary.addRow(['Period', report.period]); summary.addRow([]);
  for (const page of numberedStudioPages(report.studioPages)) { summary.addRow([`Page ${page.displayNumber}`, page.title ?? '']); for (const block of page.report_studio_blocks ?? []) { summary.addRow([block.autoNumber || block.block_type, block.title ?? '', blockText(block), block.source_label ?? '']); for (const item of kpis(block)) summary.addRow(['KPI', item.label, item.value, item.unit]); for (const row of tableRows(block)) summary.addRow(row); summary.addRow([]); } }
  summary.columns = [{ width: 24 }, { width: 36 }, { width: 70 }, { width: 30 }]; summary.getRow(1).font = { bold: true, size: 16 };
  const buffer = await workbook.xlsx.writeBuffer(); return Buffer.from(buffer as ArrayBuffer);
}

export async function createStudioPptx(report: any) {
  // Vercel's serverless loader can resolve pptxgenjs's ESM file as CommonJS.
  // Load its supported CommonJS export only when a PPTX is requested.
  const loaded = createRequire(`${process.cwd()}/package.json`)('pptxgenjs');
  const PptxConstructor = loaded.default ?? loaded; const pptx = new PptxConstructor(); pptx.layout = 'LAYOUT_WIDE'; pptx.author = 'Balancing Carbon'; pptx.subject = report.type; pptx.title = report.title;
  const brand = report.brandKit ?? {}; const primary = hex(brand.primary_color, '173f2a'), accent = hex(brand.accent_color, 'd39b35');
  for (const page of numberedStudioPages(report.studioPages)) { const slide = pptx.addSlide(); slide.background = { color: hex(page.background_color, 'ffffff') }; slide.addText(page.title || report.title, { x: 0.6, y: 0.35, w: 12, h: 0.45, fontFace: brand.heading_font || 'Arial', fontSize: 24, bold: true, color: primary }); let y = 1.05;
      for (const block of page.report_studio_blocks ?? []) { if (y > 6.4) break; const heading = `${block.autoNumber ? `${block.autoNumber}: ` : ''}${block.title ?? ''}`; if (heading) { slide.addText(heading, { x: 0.7, y, w: 11.8, h: 0.3, fontSize: 13, bold: true, color: primary }); y += 0.35; } const text = blockText(block); if (text) { slide.addText(text.slice(0, 1500), { x: 0.7, y, w: 11.8, h: Math.min(1.4, Math.max(0.45, text.length / 700)), fontSize: 10, color: '333333', breakLine: false, margin: 0.04 }); y += Math.min(1.5, Math.max(0.55, text.length / 650)); } if (kpis(block).length) { const width = Math.min(2.7, 11.5 / kpis(block).length); kpis(block).slice(0,4).forEach((item: any,index: number) => { slide.addShape(pptx.ShapeType.rect,{x:0.7+index*(width+0.15),y,w:width,h:0.75,fill:{color:'F4F7F4'},line:{color:'D9E2DA'}}); slide.addText(`${item.label}\n${item.value} ${item.unit ?? ''}`,{x:0.85+index*(width+0.15),y:y+0.1,w:width-0.3,h:0.5,fontSize:10,bold:true,color:index===0?accent:primary}); }); y += 0.9; } }
    slide.addText(`${report.period} | ${brand.footer_text ?? 'Balancing Carbon'}`, { x: 0.6, y: 7.15, w: 12, h: 0.2, fontSize: 8, color: '777777', align: 'right' }); }
  const output = await pptx.write({ outputType: 'nodebuffer' }); return Buffer.from(output as any);
}

export function createStudioPdf(report: any): Promise<Buffer> {
  return new Promise((resolve, reject) => { const document = new PDFDocument({ size: 'A4', margins: { top: 55, bottom: 55, left: 55, right: 55 }, info: { Title: report.title, Author: 'Balancing Carbon' } }); const chunks: Buffer[] = []; document.on('data', (chunk) => chunks.push(Buffer.from(chunk))); document.on('end', () => resolve(Buffer.concat(chunks))); document.on('error', reject); const brand = report.brandKit ?? {}; const primary = `#${hex(brand.primary_color, '173f2a')}`;
    document.fillColor(primary).fontSize(24).text(report.title); document.moveDown(0.3).fillColor('#555555').fontSize(10).text(`${report.type} | ${report.period}`); document.moveDown();
    for (const page of numberedStudioPages(report.studioPages)) { if (document.y > 650) document.addPage(); if (page.title) document.fillColor(primary).fontSize(18).text(page.title).moveDown(0.4); for (const block of page.report_studio_blocks ?? []) { if (document.y > 700) document.addPage(); const heading = `${block.autoNumber ? `${block.autoNumber}: ` : ''}${block.title ?? ''}`; if (heading) document.fillColor(primary).fontSize(12).text(heading).moveDown(0.2); const text = blockText(block); if (text) document.fillColor('#222222').fontSize(9.5).text(text, { lineGap: 2 }).moveDown(0.5); for (const item of kpis(block)) document.fillColor(primary).fontSize(10).text(`${item.label}: ${item.value} ${item.unit ?? ''}`); if (kpis(block).length) document.moveDown(0.5); for (const row of tableRows(block).slice(0,30)) document.fillColor('#333333').fontSize(8.5).text(row.map((cell) => String(cell ?? '')).join('  |  ')); if (block.source_label) document.moveDown(0.2).fillColor('#666666').fontSize(7.5).text(`Source: ${block.source_label}`); document.moveDown(0.6); } }
    document.end(); });
}
