import assert from 'node:assert/strict';
import test from 'node:test';

import { OllamaProvider } from './ollamaProvider.js';

test('Ollama provider reports model availability', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ models: [{ name: 'qwen3:8b' }] }), { status: 200 });
  try {
    const provider = new OllamaProvider('http://localhost:11434', 'qwen3:8b', 8192, 1000);
    assert.deepEqual(await provider.health(), { available: true, modelAvailable: true });
  } finally { globalThis.fetch = original; }
});

test('Ollama provider parses grounded structured output', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    message: { content: JSON.stringify({ answer: 'Electricity is the largest recorded source [E1].', citationIds: ['E1'], suggestedActions: ['Validate the latest bill.'], limitations: ['Only recorded activity was considered.'] }) },
    prompt_eval_count: 120, eval_count: 24,
  }), { status: 200 });
  try {
    const provider = new OllamaProvider('http://localhost:11434', 'qwen3:8b', 8192, 1000);
    const result = await provider.generate({ system: 'Read only.', question: 'Largest source?', history: [], context: { citationCatalog: [{ id: 'E1' }] } });
    assert.equal(result.answer, 'Electricity is the largest recorded source [E1].');
    assert.deepEqual(result.citationIds, ['E1']); assert.equal(result.promptTokens, 120); assert.equal(result.completionTokens, 24);
  } finally { globalThis.fetch = original; }
});

test('Ollama provider honors caller cancellation', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, options) => await new Promise<Response>((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true });
  });
  try {
    const controller = new AbortController(); const provider = new OllamaProvider('http://localhost:11434', 'qwen3:8b', 8192, 10000);
    const request = provider.generate({ system: 'Read only.', question: 'Cancel me.', history: [], context: {}, signal: controller.signal }); controller.abort();
    await assert.rejects(request, (error: any) => error?.name === 'AbortError');
  } finally { globalThis.fetch = original; }
});
