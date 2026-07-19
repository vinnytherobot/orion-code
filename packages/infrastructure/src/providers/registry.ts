import type { ILLMProvider, LLMProviderConfig } from './BaseProvider.js';
import { OllamaProvider } from './OllamaProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';
import { AnthropicProvider } from './AnthropicProvider.js';
import { GroqProvider } from './GroqProvider.js';

export interface ProviderInfo {
  name: string;
  displayName: string;
  description: string;
  requiresApiKey: boolean;
  defaultModel: string;
  defaultBaseUrl: string;
}

export const PROVIDER_CATALOG: ProviderInfo[] = [
  {
    name: 'ollama',
    displayName: 'Ollama',
    description: 'Local inference - free, private, no API key needed',
    requiresApiKey: false,
    defaultModel: 'llama3',
    defaultBaseUrl: 'http://127.0.0.1:11434',
  },
  {
    name: 'openai',
    displayName: 'OpenAI',
    description: 'GPT models (gpt-4o, gpt-4-turbo) - requires API key',
    requiresApiKey: true,
    defaultModel: 'gpt-4o',
    defaultBaseUrl: 'https://api.openai.com/v1',
  },
  {
    name: 'anthropic',
    displayName: 'Anthropic',
    description: 'Claude models (claude-sonnet-4) - requires API key',
    requiresApiKey: true,
    defaultModel: 'claude-sonnet-4-20250514',
    defaultBaseUrl: 'https://api.anthropic.com',
  },
  {
    name: 'groq',
    displayName: 'Groq',
    description: 'Ultra-fast inference (llama-3.3-70b, mixtral) - requires API key',
    requiresApiKey: true,
    defaultModel: 'llama-3.3-70b-versatile',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
  },
];

export function createProvider(name: string, config: LLMProviderConfig): ILLMProvider {
  switch (name) {
    case 'ollama':
      return new OllamaProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'groq':
      return new GroqProvider(config);
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}

export function getProviderInfo(name: string): ProviderInfo | undefined {
  return PROVIDER_CATALOG.find(p => p.name === name);
}
