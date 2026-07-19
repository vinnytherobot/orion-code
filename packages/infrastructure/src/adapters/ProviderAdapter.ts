import type { IProviderPort, ProviderInfo } from '@orion/application';
import {
  PROVIDER_CATALOG,
  createProvider,
  getProviderInfo,
} from '../providers/registry.js';
import {
  setCurrentProvider,
  setProviderApiKey,
  getProviderApiKey,
} from '../providers/config.js';
import type { LLMProviderConfig } from '../providers/BaseProvider.js';
import type { AgentExecutor } from '../orchestration/AgentExecutor.js';

export class ProviderAdapter implements IProviderPort {
  constructor(private readonly agentExecutor: AgentExecutor) {}

  getAvailableProviders(): ProviderInfo[] {
    return PROVIDER_CATALOG;
  }

  getCurrentProvider(): { name: string; model: string } {
    const provider = this.agentExecutor.getProvider();
    return {
      name: provider.name,
      model: provider.defaultModel,
    };
  }

  async switchProvider(name: string, apiKey?: string, model?: string): Promise<{ name: string; model: string }> {
    const info = getProviderInfo(name);
    if (!info) {
      throw new Error(`Provider '${name}' not found`);
    }

    if (info.requiresApiKey && !apiKey) {
      const existingKey = getProviderApiKey(name);
      if (!existingKey) {
        throw new Error(`Provider '${name}' requires an API key`);
      }
    }

    const config: LLMProviderConfig = {
      apiKey: apiKey || getProviderApiKey(name) || 'ollama',
      baseUrl: info.defaultBaseUrl,
      model: model || info.defaultModel,
    };

    const provider = createProvider(name, config);
    this.agentExecutor.setProvider(provider);

    setCurrentProvider(name);
    if (apiKey) {
      setProviderApiKey(name, apiKey);
    }

    return { name: provider.name, model: provider.defaultModel };
  }
}
