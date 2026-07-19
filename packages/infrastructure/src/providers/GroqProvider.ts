import type { Result } from '@orion/shared';
import { AppError, fail, ok } from '@orion/shared';
import type { ILLMProvider, LLMMessage, LLMProviderConfig, LLMResponse } from './BaseProvider.js';

export class GroqProvider implements ILLMProvider {
  readonly name = 'groq';
  readonly defaultModel: string;

  private config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;
    this.defaultModel = config.model ?? 'llama-3.3-70b-versatile';
  }

  async chat(
    messages: LLMMessage[],
    overrides?: Partial<LLMProviderConfig>,
  ): Promise<Result<LLMResponse, AppError>> {
    const model = overrides?.model ?? this.defaultModel;
    const maxTokens = overrides?.maxTokens ?? this.config.maxTokens ?? 4096;
    const temperature = overrides?.temperature ?? this.config.temperature ?? 0.7;
    const baseUrl = overrides?.baseUrl ?? this.config.baseUrl ?? 'https://api.groq.com/openai/v1';

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        return fail(AppError.internal(`Groq API error (${response.status}): ${body}`));
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string }; finish_reason: string }>;
        usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
        model: string;
      };

      const choice = data.choices[0];
      if (!choice) {
        return fail(AppError.internal('Groq returned no choices'));
      }

      return ok({
        content: choice.message.content,
        model: data.model,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        finishReason:
          choice.finish_reason === 'stop'
            ? 'stop'
            : choice.finish_reason === 'length'
              ? 'length'
              : 'error',
      });
    } catch (error) {
      return fail(
        AppError.internal(
          `Groq request failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const baseUrl = this.config.baseUrl ?? 'https://api.groq.com/openai/v1';
      const response = await fetch(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
