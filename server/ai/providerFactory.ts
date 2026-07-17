import { runtimeConfig } from '../config/runtime.js';
import type { CarbonCopilotProvider } from './aiProvider.js';
import { GeminiProvider } from './geminiProvider.js';
import { OllamaProvider } from './ollamaProvider.js';

export function getAiConfigurationIssue(): string | null {
  if (!runtimeConfig.ai.enabled) return 'AI is disabled.';
  if (runtimeConfig.ai.provider === 'ollama') return null;
  if (runtimeConfig.ai.provider === 'gemini') {
    if (!runtimeConfig.ai.allowExternal) return 'External AI providers are disabled.';
    if (!runtimeConfig.ai.apiKey) return 'GEMINI_API_KEY is not configured.';
    return null;
  }
  return `Unsupported AI provider: ${runtimeConfig.ai.provider || '(empty)'}.`;
}

export function createAiProvider(): CarbonCopilotProvider {
  const issue = getAiConfigurationIssue();
  if (issue) throw new Error(issue);
  if (runtimeConfig.ai.provider === 'gemini') {
    return new GeminiProvider(runtimeConfig.ai.baseUrl, runtimeConfig.ai.apiKey, runtimeConfig.ai.model, runtimeConfig.ai.timeoutMs);
  }
  return new OllamaProvider(runtimeConfig.ai.baseUrl, runtimeConfig.ai.model, runtimeConfig.ai.contextLength, runtimeConfig.ai.timeoutMs);
}
