import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

interface ProviderConfigData {
  currentProvider: string;
  providers: Record<string, {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  }>;
}

const CONFIG_DIR = path.join(os.homedir(), '.orion');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: ProviderConfigData = {
  currentProvider: 'ollama',
  providers: {
    ollama: {
      baseUrl: 'http://127.0.0.1:11434',
      model: 'llama3',
    },
  },
};

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadProviderConfig(): ProviderConfigData {
  try {
    ensureConfigDir();
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(data) as ProviderConfigData;
    }
  } catch {
    // Fall through to default
  }
  return { ...DEFAULT_CONFIG };
}

export function saveProviderConfig(config: ProviderConfigData): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export function getCurrentProvider(): string {
  const config = loadProviderConfig();
  return config.currentProvider;
}

export function setCurrentProvider(name: string): void {
  const config = loadProviderConfig();
  config.currentProvider = name;
  saveProviderConfig(config);
}

export function getProviderApiKey(name: string): string | undefined {
  const config = loadProviderConfig();
  return config.providers[name]?.apiKey;
}

export function setProviderApiKey(name: string, apiKey: string): void {
  const config = loadProviderConfig();
  if (!config.providers[name]) {
    config.providers[name] = {};
  }
  config.providers[name].apiKey = apiKey;
  saveProviderConfig(config);
}

export function getProviderConfig(name: string): { apiKey?: string; baseUrl?: string; model?: string } | undefined {
  const config = loadProviderConfig();
  return config.providers[name];
}

export interface EffectiveProviderConfig {
  name: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

/**
 * Resolves the provider that should be used at startup, with the following
 * priority (highest first):
 *   1. Environment variables (ORION_PROVIDER, ORION_<NAME>_API_KEY/BASE_URL/MODEL,
 *      and the generic ORION_PROVIDER_API_KEY).
 *   2. The persisted per-user config file (~/.orion/config.json).
 * Env-driven resolution is what makes a Docker deployment work without any
 * plaintext home-file writes inside the container.
 */
export function getEffectiveProviderConfig(): EffectiveProviderConfig {
  const name = process.env.ORION_PROVIDER || loadProviderConfig().currentProvider || 'ollama';
  const prefix = name.toUpperCase();

  const saved = getProviderConfig(name) ?? {};

  const apiKey = process.env.ORION_PROVIDER_API_KEY || saved.apiKey;
  const baseUrl = process.env[`ORION_${prefix}_BASE_URL`] || saved.baseUrl;
  const model = process.env[`ORION_${prefix}_MODEL`] || saved.model;

  return { name, apiKey, baseUrl, model };
}

export function setProviderConfig(name: string, data: { apiKey?: string; baseUrl?: string; model?: string }): void {
  const config = loadProviderConfig();
  if (!config.providers[name]) {
    config.providers[name] = {};
  }
  if (data.apiKey !== undefined) config.providers[name].apiKey = data.apiKey;
  if (data.baseUrl !== undefined) config.providers[name].baseUrl = data.baseUrl;
  if (data.model !== undefined) config.providers[name].model = data.model;
  saveProviderConfig(config);
}
