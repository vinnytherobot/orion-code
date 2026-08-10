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
export { GroqProvider } from './providers/GroqProvider.js';
export { ProviderAdapter } from './adapters/ProviderAdapter.js';
export {
  PROVIDER_CATALOG,
  createProvider,
  getProviderInfo,
} from './providers/registry.js';
export type { ProviderInfo } from './providers/registry.js';
export {
  loadProviderConfig,
  saveProviderConfig,
  getCurrentProvider,
  setCurrentProvider,
  getProviderApiKey,
  setProviderApiKey,
  getProviderConfig,
  setProviderConfig,
  getEffectiveProviderConfig,
} from './providers/config.js';
export type { EffectiveProviderConfig } from './providers/config.js';

// Cache
export { InMemoryCache } from './cache/InMemoryCache.js';

// Filesystem
export { StateManager } from './filesystem/StateManager.js';
export { HistoryManager } from './filesystem/HistoryManager.js';
export type { HistoryEntry } from './filesystem/HistoryManager.js';

// Git
export { WorktreeManager } from './git/WorktreeManager.js';
export { MergeResolver } from './git/MergeResolver.js';
export type { MergeOutcome } from './git/MergeResolver.js';

// Database
export { getDatabase, resetDatabase, checkDatabaseHealth } from './db/database.js';

// Legacy Auth Repositories (to be migrated)
export { UserRepository } from './db/repositories/user.repository.js';
export { ApiKeyRepository } from './db/repositories/apikey.repository.js';
export { RefreshTokenRepository } from './db/repositories/refresh-token.repository.js';

// Orchestration
export { Orchestrator } from './orchestration/Orchestrator.js';
export { AgentExecutor } from './orchestration/AgentExecutor.js';
export { MessageBus } from './orchestration/MessageBus.js';
export type { AgentMessage } from './orchestration/MessageBus.js';
export { LockManager } from './orchestration/LockManager.js';
export type { LockToken } from './orchestration/LockManager.js';
export { PlannerService } from './orchestration/PlannerService.js';
export type { PlannedSubtask, PlannerResult } from './orchestration/PlannerService.js';
export { IntentClassifier } from './orchestration/IntentClassifier.js';
export type { Intent } from './orchestration/IntentClassifier.js';
export { ProjectAnalyzer } from './orchestration/ProjectAnalyzer.js';
export type { ProjectSnapshot } from './orchestration/ProjectAnalyzer.js';
export { Scheduler } from './orchestration/Scheduler.js';
export type { SchedulableTask, Wave } from './orchestration/Scheduler.js';
export { ToolRegistry } from './tools/ToolRegistry.js';
export type { Tool, ToolContext, ToolRunResult } from './tools/ToolRegistry.js';
export { readFileTool } from './tools/builtin/read-file.tool.js';
export { writeFileTool } from './tools/builtin/write-file.tool.js';
export { editFileTool } from './tools/builtin/edit-file.tool.js';
export { globTool } from './tools/builtin/glob.tool.js';
export { grepTool } from './tools/builtin/grep.tool.js';
export { bashTool } from './tools/builtin/bash.tool.js';

// Repositories
export { AgentRepository } from './db/repositories/agent.repository.js';
export { TaskRepository } from './db/repositories/task.repository.js';
export { ProjectDomainRepository } from './db/repositories/project-domain.repository.js';
export { ExecutionLogRepository } from './db/repositories/execution-log.repository.js';
export { ChatMessageRepository } from './db/repositories/chat-message.repository.js';
export { ChatSessionRepository } from './db/repositories/chat-session.repository.js';
export type { ChatSessionWithCount } from './db/repositories/chat-session.repository.js';

// Domain-Aware Auth Repositories
export { UserDomainRepository } from './db/repositories/user-domain.repository.js';
export { ApiKeyDomainRepository } from './db/repositories/apikey-domain.repository.js';
export { RefreshTokenDomainRepository } from './db/repositories/refreshtoken-domain.repository.js';

// Events
export { InMemoryEventBus } from './events/InMemoryEventBus.js';

// Unit of Work
export { DrizzleUnitOfWork, createUnitOfWork } from './db/unit-of-work.js';
