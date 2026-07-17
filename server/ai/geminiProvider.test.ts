import assert from 'node:assert/strict';
import test from 'node:test';

import { GeminiProvider } from './geminiProvider.js';

test('Gemini provider reports configured model availability', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://generativelanguage.test/v1beta/models/gemini-3.5-flash');
    assert.equal((options?.headers as Record<string, string>)['x-goog-api-key'], 'test-key');
    return new Response(JSON.stringify({
      name: 'models/gemini-3.5-flash',
      supportedGenerationMethods: ['generateContent', 'countTokens'],
    }), { status: 200 });
  };
  try {
    const provider = new GeminiProvider('https://generativelanguage.test/v1beta', 'test-key', 'gemini-3.5-flash', 1000);
    assert.deepEqual(await provider.health(), { available: true, modelAvailable: true });
  } finally { globalThis.fetch = original; }
});

test('Gemini provider requests structured output and parses usage', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://generativelanguage.test/v1beta/models/gemini-3.5-flash:generateContent');
    const body = JSON.parse(String(options?.body));
    assert.equal(body.systemInstruction.parts[0].text, 'Read only.');
    assert.equal(body.generationConfig.maxOutputTokens, 1800);
    assert.equal(body.generationConfig.responseMimeType, 'application/json');
    assert.equal(body.generationConfig.responseJsonSchema.type, 'object');
    assert.equal(body.contents[0].role, 'model');
    assert.match(body.contents.at(-1).parts[0].text, /Answer the current question directly/);
    assert.match(body.contents.at(-1).parts[0].text, /Do not repeat or paraphrase a previous assistant answer/);
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({
        answer: 'Electricity is the largest recorded source [E1].',
        citationIds: ['E1'],
        suggestedActions: ['Validate the latest bill.'],
        limitations: ['Only recorded activity was considered.'],
      }) }] } }],
      usageMetadata: { promptTokenCount: 90, candidatesTokenCount: 30 },
    }), { status: 200 });
  };
  try {
    const provider = new GeminiProvider('https://generativelanguage.test/v1beta', 'test-key', 'gemini-3.5-flash', 1000);
    const result = await provider.generate({
      system: 'Read only.',
      question: 'Largest source?',
      history: [{ role: 'assistant', content: 'Earlier answer.' }],
      context: { citationCatalog: [{ id: 'E1' }] },
    });
    assert.equal(result.answer, 'Electricity is the largest recorded source [E1].');
    assert.deepEqual(result.citationIds, ['E1']);
    assert.equal(result.promptTokens, 90);
    assert.equal(result.completionTokens, 30);
  } finally { globalThis.fetch = original; }
});

test('Gemini provider returns a sanitized provider error', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: {
    status: 'INVALID_ARGUMENT', message: 'The request\nwas rejected.',
  } }), { status: 400 });
  try {
    const provider = new GeminiProvider('https://generativelanguage.test/v1beta', 'test-key', 'gemini-3.5-flash', 1000);
    await assert.rejects(
      provider.generate({ system: 'Read only.', question: 'Summarize.', history: [], context: {} }),
      /Gemini request failed \(400\/INVALID_ARGUMENT\)\. The request was rejected\./,
    );
  } finally { globalThis.fetch = original; }
});

test('Gemini provider honors caller cancellation', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, options) => await new Promise<Response>((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true });
  });
  try {
    const controller = new AbortController();
    const provider = new GeminiProvider('https://generativelanguage.test/v1beta', 'test-key', 'gemini-3.5-flash', 10000);
    const request = provider.generate({ system: 'Read only.', question: 'Cancel me.', history: [], context: {}, signal: controller.signal });
    controller.abort();
    await assert.rejects(request, (error: any) => error?.name === 'AbortError');
  } finally { globalThis.fetch = original; }
});
