export interface CopilotGenerationInput {
  system: string;
  question: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: unknown;
  signal?: AbortSignal;
}

export interface CopilotGenerationResult {
  answer: string;
  citationIds: string[];
  suggestedActions: string[];
  limitations: string[];
  promptTokens?: number;
  completionTokens?: number;
  durationMs: number;
}

export interface CarbonCopilotProvider {
  readonly model: string;
  health(): Promise<{ available: boolean; modelAvailable: boolean }>;
  generate(input: CopilotGenerationInput): Promise<CopilotGenerationResult>;
}

export const cleanStringList = (value: unknown) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string').slice(0, 8)
  : [];

export const copilotResponseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    answer: { type: 'string' },
    citationIds: { type: 'array', items: { type: 'string' } },
    suggestedActions: { type: 'array', items: { type: 'string' } },
    limitations: { type: 'array', items: { type: 'string' } },
  },
  required: ['answer', 'citationIds', 'suggestedActions', 'limitations'],
} as const;
