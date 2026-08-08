import type { AppError, Result } from '@orion/shared';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'error';
}

export interface LLMProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ILLMProvider {
  readonly name: string;
  readonly defaultModel: string;

  chat(
    messages: LLMMessage[],
    config?: Partial<LLMProviderConfig>,
  ): Promise<Result<LLMResponse, AppError>>;
  isAvailable(): Promise<boolean>;

  /**
   * Optional streaming variant of `chat`. Yields content chunks as they
   * arrive. Providers that don't support streaming should omit this —
   * callers fall back to `chat()` when it's undefined.
   */
  chatStream?(
    messages: LLMMessage[],
    config?: Partial<LLMProviderConfig>,
  ): AsyncGenerator<string, void, undefined>;
}
