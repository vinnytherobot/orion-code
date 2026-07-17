import { AppError, type Result, fail, ok } from '@orion/shared';
import type { Agent } from '../entities/Agent.js';
import type { Task } from '../entities/Task.js';

export class TaskAssignmentService {
  assignTaskToAgent(task: Task, agent: Agent): Result<void, AppError> {
    const assignResult = task.assignTo(agent.id);
    if (assignResult.isFail()) {
      return fail(assignResult.error);
    }

    const agentAssignResult = agent.assignTask(task.id.toString());
    if (agentAssignResult.isFail()) {
      return fail(agentAssignResult.error);
    }

    return ok(undefined);
  }

  completeTaskAssignment(task: Task, agent: Agent, result: string): Result<void, AppError> {
    const completeResult = task.complete(result);
    if (completeResult.isFail()) {
      return fail(completeResult.error);
    }

    const agentCompleteResult = agent.completeTask();
    if (agentCompleteResult.isFail()) {
      return fail(agentCompleteResult.error);
    }

    return ok(undefined);
  }

  failTaskAssignment(task: Task, agent: Agent, reason: string): Result<void, AppError> {
    const failResult = task.fail(reason);
    if (failResult.isFail()) {
      return fail(failResult.error);
    }

    agent.reset();
    return ok(undefined);
  }
}
