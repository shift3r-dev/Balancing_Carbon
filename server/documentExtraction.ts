import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

const textTypes = new Set(['text/plain', 'text/csv', 'text/markdown', 'application/json']);

export function validateEvidenceFile(buffer: Buffer, mimeType: string) {
  if (!buffer.length) return false;
  if (mimeType === 'application/pdf') return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return buffer[0] === 0x50 && buffer[1] === 0x4b;
  if (textTypes.has(mimeType)) return !buffer.subarray(0, Math.min(buffer.length, 8192)).includes(0);
  return false;
}

export async function extractDocumentText(buffer: Buffer, mimeType: string) {
  if (!validateEvidenceFile(buffer, mimeType)) throw new Error('File content does not match the declared evidence type.');
  if (textTypes.has(mimeType)) return normalize(buffer.toString('utf8'));
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer }); return normalize(result.value);
  }
  if (mimeType === 'application/pdf') {
    const parser = new PDFParse({ data: buffer });
    try { const result = await parser.getText(); return normalize(result.text); }
    finally { await parser.destroy(); }
  }
  throw new Error('Unsupported document type.');
}

export function normalize(value: string) {
  return value.replace(/\u0000/g, '').replace(/\r\n/g, '\n').replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 500000);
}

export function chunkDocumentText(value: string, targetSize = 1800, overlap = 180) {
  const text = normalize(value); if (!text) return [];
  const chunks: string[] = []; let start = 0;
  while (start < text.length && chunks.length < 300) {
    let end = Math.min(text.length, start + targetSize);
    if (end < text.length) { const paragraph = text.lastIndexOf('\n', end); const sentence = text.lastIndexOf('. ', end); const boundary = Math.max(paragraph, sentence); if (boundary > start + Math.floor(targetSize * 0.6)) end = boundary + 1; }
    const chunk = text.slice(start, end).trim(); if (chunk) chunks.push(chunk);
    if (end >= text.length) break; start = Math.max(start + 1, end - overlap);
  }
  return chunks;
}

export function selectRelevantChunks(question: string, records: any[], limit = 8) {
  const terms = [...new Set(question.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])].filter((term) => !['what','which','that','this','with','from','about','have','your'].includes(term));
  return records.map((record) => { const content = String(record.content ?? '').toLowerCase(); const score = terms.reduce((sum, term) => sum + (content.includes(term) ? 1 : 0), 0); return { ...record, relevanceScore: score }; }).sort((a, b) => b.relevanceScore - a.relevanceScore || Number(a.chunk_index) - Number(b.chunk_index)).slice(0, limit);
}
