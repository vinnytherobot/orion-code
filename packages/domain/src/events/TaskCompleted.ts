export interface TaskCompletedEvent {
  type: "task.completed";
  taskId: string;
  agentId: string | null;
  result: string;
  completedAt: Date;
}

export function createTaskCompletedEvent(
  taskId: string,
  agentId: string | null,
  result: string,
): TaskCompletedEvent {
  return {
    type: "task.completed",
    taskId,
    agentId,
    result,
    completedAt: new Date(),
  };
}
