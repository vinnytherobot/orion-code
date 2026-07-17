// Value Objects
export { TaskId } from './value-objects/TaskId.js';
export { AgentStatus } from './value-objects/AgentStatus.js';
export type { AgentStatusValue } from './value-objects/AgentStatus.js';
export { TaskStatus } from './value-objects/TaskStatus.js';
export type { TaskStatusValue } from './value-objects/TaskStatus.js';
export { UserId } from './value-objects/UserId.js';
export { Email } from './value-objects/Email.js';
export { PasswordHash } from './value-objects/PasswordHash.js';

// Entities
export { Task } from './entities/Task.js';
export type { TaskProps } from './entities/Task.js';
export { Agent } from './entities/Agent.js';
export type { AgentProps } from './entities/Agent.js';
export { Project } from './entities/Project.js';
export type { ProjectProps, ProjectAnalysis } from './entities/Project.js';
export { User } from './entities/User.js';
export type { UserProps } from './entities/User.js';
export { ApiKey } from './entities/ApiKey.js';
export type { ApiKeyProps } from './entities/ApiKey.js';
export { RefreshToken } from './entities/RefreshToken.js';
export type { RefreshTokenProps } from './entities/RefreshToken.js';

// Repository Interfaces
export type { IAgentRepository } from './repositories/IAgentRepository.js';
export type { ITaskRepository } from './repositories/ITaskRepository.js';
export type { IUserRepository } from './repositories/IUserRepository.js';
export type { IApiKeyRepository } from './repositories/IApiKeyRepository.js';
export type { IRefreshTokenRepository } from './repositories/IRefreshTokenRepository.js';
export type { IProjectRepository } from './repositories/IProjectRepository.js';

// Domain Events
export { createTaskCompletedEvent } from './events/TaskCompleted.js';
export type { TaskCompletedEvent } from './events/TaskCompleted.js';
export type { DomainEvent } from './events/DomainEvent.js';
export type { IDomainEventBus } from './events/IDomainEventBus.js';

// Domain Services
export { TaskAssignmentService } from './services/TaskAssignmentService.js';
export type { IUnitOfWork } from './services/IUnitOfWork.js';
