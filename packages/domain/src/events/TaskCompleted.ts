import type { DomainEvent } from './DomainEvent.js';

export interface TaskCompletedEvent extends DomainEvent {
  type: 'task.completed';
  taskId: string;
  agentId: string | null;
  result: string;
  occurredAt: Date;
}

export function createTaskCompletedEvent(
  taskId: string,
  agentId: string | null,
  result: string,
): TaskCompletedEvent {
  return {
    type: 'task.completed',
    taskId,
    agentId,
    result,
    occurredAt: new Date(),
  };
}
