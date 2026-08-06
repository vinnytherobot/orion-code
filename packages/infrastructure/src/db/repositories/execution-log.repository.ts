import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database.js';
import { executionLogs } from '../schemas/orchestration.js';

export interface ExecutionLogInput {
  taskId: string;
  agentId: string;
  input?: string;
  output?: string;
  error?: string;
  durationMs?: number;
  tokensUsed?: number;
}

/**
 * Persists one row per agent execution into the execution_logs table,
 * providing an auditable trail of every orchestration run.
 */
export class ExecutionLogRepository {
  private db = getDatabase();

  async log(entry: ExecutionLogInput): Promise<void> {
    await this.db.insert(executionLogs).values({
      id: randomUUID(),
      taskId: entry.taskId,
      agentId: entry.agentId,
      input: entry.input,
      output: entry.output,
      error: entry.error,
      durationMs: entry.durationMs,
      tokensUsed: entry.tokensUsed,
      createdAt: new Date(),
    });
  }
}