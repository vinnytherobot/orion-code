import type { Result } from '@orion/shared';
import { AppError, fail, ok } from '@orion/shared';
import type { ILLMProvider, LLMMessage, LLMProviderConfig, LLMResponse } from './BaseProvider.js';

export class OllamaProvider implements ILLMProvider {
  readonly name = 'ollama';
  readonly defaultModel: string;

  private config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;
    this.defaultModel = config.model ?? 'llama3';
  }

  async chat(
    messages: LLMMessage[],
    overrides?: Partial<LLMProviderConfig>,
  ): Promise<Result<LLMResponse, AppError>> {
    const model = overrides?.model ?? this.defaultModel;
    const baseUrl = overrides?.baseUrl ?? this.config.baseUrl ?? 'http://localhost:11434';

    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: false,
          options: {
            ...(this.config.temperature != null ? { temperature: this.config.temperature } : {}),
            ...(this.config.maxTokens != null ? { num_predict: this.config.maxTokens } : {}),
          },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        return fail(AppError.internal(`Ollama API error (${response.status}): ${body}`));
      }

      const data = (await response.json()) as {
        message: { content: string };
        model: string;
        eval_count: number;
        prompt_eval_count: number;
        done: boolean;
      };

      return ok({
        content: data.message.content,
        model: data.model,
        usage: {
          promptTokens: data.prompt_eval_count,
          completionTokens: data.eval_count,
          totalTokens: data.prompt_eval_count + data.eval_count,
        },
        finishReason: data.done ? 'stop' : 'length',
      });
    } catch (error) {
      return fail(
        AppError.internal(
          `Ollama request failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const baseUrl = this.config.baseUrl ?? 'http://localhost:11434';
      console.log(`[Ollama] Checking availability at ${baseUrl}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
      clearTimeout(timeout);
      console.log(`[Ollama] Response status: ${response.status}`);
      return response.ok;
    } catch (error) {
      console.log(`[Ollama] Availability check failed: ${error}`);
      return false;
    }
  }
}
