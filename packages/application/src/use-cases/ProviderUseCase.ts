import type { IProviderPort, ProviderInfo } from '../ports/IProviderPort.js';

export class ProviderUseCase {
  constructor(private readonly providerPort: IProviderPort) {}

  getAvailableProviders(): ProviderInfo[] {
    return this.providerPort.getAvailableProviders();
  }

  getCurrentProvider(): { name: string; model: string } {
    return this.providerPort.getCurrentProvider();
  }

  async switchProvider(name: string, apiKey?: string): Promise<{ name: string; model: string }> {
    return this.providerPort.switchProvider(name, apiKey);
  }
}
