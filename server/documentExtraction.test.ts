import assert from 'node:assert/strict';
import test from 'node:test';

import { chunkDocumentText, extractDocumentText, selectRelevantChunks, validateEvidenceFile } from './documentExtraction.js';

test('plain evidence text is normalized and chunked with bounded sizes', async () => {
  const text = await extractDocumentText(Buffer.from(`Electricity invoice\n\n\nGrid consumption ${'data '.repeat(600)}`), 'text/plain');
  const chunks = chunkDocumentText(text, 500, 50); assert.ok(chunks.length > 1); assert.ok(chunks.every((chunk) => chunk.length <= 510));
});

test('retrieval prioritizes chunks matching the user question', () => {
  const selected = selectRelevantChunks('electricity invoice', [{ chunk_index: 0, content: 'Water permit' }, { chunk_index: 1, content: 'Electricity invoice and meter reading' }], 1);
  assert.equal(selected[0].chunk_index, 1); assert.equal(selected[0].relevanceScore, 2);
});

test('evidence signature validation rejects renamed binary content', () => {
  assert.equal(validateEvidenceFile(Buffer.from('%PDF-1.7'), 'application/pdf'), true);
  assert.equal(validateEvidenceFile(Buffer.from('not a pdf'), 'application/pdf'), false);
  assert.equal(validateEvidenceFile(Buffer.from([0, 1, 2]), 'text/plain'), false);
});
