// Value Objects
export { TaskId } from "./value-objects/TaskId.js";
export { AgentStatus } from "./value-objects/AgentStatus.js";
export type { AgentStatusValue } from "./value-objects/AgentStatus.js";
export { TaskStatus } from "./value-objects/TaskStatus.js";
export type { TaskStatusValue } from "./value-objects/TaskStatus.js";

// Entities
export { Task } from "./entities/Task.js";
export type { TaskProps } from "./entities/Task.js";
export { Agent } from "./entities/Agent.js";
export type { AgentProps } from "./entities/Agent.js";
export { Project } from "./entities/Project.js";
export type { ProjectProps, ProjectAnalysis } from "./entities/Project.js";

// Repository Interfaces
export type { IAgentRepository } from "./repositories/IAgentRepository.js";
export type { ITaskRepository } from "./repositories/ITaskRepository.js";

// Domain Events
export { createTaskCompletedEvent } from "./events/TaskCompleted.js";
export type { TaskCompletedEvent } from "./events/TaskCompleted.js";
