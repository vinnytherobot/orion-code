// Providers
export type {
  ILLMProvider,
  LLMMessage,
  LLMResponse,
  LLMProviderConfig,
} from './providers/BaseProvider.js';
export { OpenAIProvider } from './providers/OpenAIProvider.js';
export { AnthropicProvider } from './providers/AnthropicProvider.js';
export { OllamaProvider } from './providers/OllamaProvider.js';

// Cache
export { InMemoryCache } from './cache/InMemoryCache.js';

// Filesystem
export { StateManager } from './filesystem/StateManager.js';
export { HistoryManager } from './filesystem/HistoryManager.js';
export type { HistoryEntry } from './filesystem/HistoryManager.js';

// Database
export { getDatabase, resetDatabase } from './db/database.js';

// Legacy Auth Repositories (to be migrated)
export { UserRepository } from './db/repositories/user.repository.js';
export { ApiKeyRepository } from './db/repositories/apikey.repository.js';
export { RefreshTokenRepository } from './db/repositories/refresh-token.repository.js';

// Orchestration
export { Orchestrator } from './orchestration/Orchestrator.js';
export { AgentExecutor } from './orchestration/AgentExecutor.js';
export { MessageBus } from './orchestration/MessageBus.js';
export type { AgentMessage } from './orchestration/MessageBus.js';

// Repositories
export { AgentRepository } from './db/repositories/agent.repository.js';
export { TaskRepository } from './db/repositories/task.repository.js';
export { ProjectDomainRepository } from './db/repositories/project-domain.repository.js';

// Domain-Aware Auth Repositories
export { UserDomainRepository } from './db/repositories/user-domain.repository.js';
export { ApiKeyDomainRepository } from './db/repositories/apikey-domain.repository.js';
export { RefreshTokenDomainRepository } from './db/repositories/refreshtoken-domain.repository.js';

// Events
export { InMemoryEventBus } from './events/InMemoryEventBus.js';

// Unit of Work
export { DrizzleUnitOfWork, createUnitOfWork } from './db/unit-of-work.js';
