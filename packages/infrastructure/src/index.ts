// Providers
export type {
  ILLMProvider,
  LLMMessage,
  LLMResponse,
  LLMProviderConfig,
} from "./providers/BaseProvider.js";
export { OpenAIProvider } from "./providers/OpenAIProvider.js";
export { AnthropicProvider } from "./providers/AnthropicProvider.js";
export { OllamaProvider } from "./providers/OllamaProvider.js";

// Cache
export { InMemoryCache } from "./cache/InMemoryCache.js";

// Filesystem
export { StateManager } from "./filesystem/StateManager.js";
export { HistoryManager } from "./filesystem/HistoryManager.js";
export type { HistoryEntry } from "./filesystem/HistoryManager.js";

// Database
export { getDatabase, resetDatabase, schema } from "./db/database.js";
export type { AppDatabase } from "./db/database.js";
export { UserRepository } from "./db/user.repository.js";
export { ApiKeyRepository } from "./db/apikey.repository.js";
export { RefreshTokenRepository } from "./db/refresh-token.repository.js";
export type { User, NewUser, ApiKey, NewApiKey, RefreshToken, NewRefreshToken } from "./db/schemas/schema.js";
