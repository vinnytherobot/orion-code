export interface ProviderInfo {
  name: string;
  displayName: string;
  description: string;
  requiresApiKey: boolean;
  defaultModel: string;
  defaultBaseUrl: string;
}

export interface IProviderPort {
  getAvailableProviders(): ProviderInfo[];
  getCurrentProvider(): { name: string; model: string };
  switchProvider(name: string, apiKey?: string, model?: string): Promise<{ name: string; model: string }>;
}
