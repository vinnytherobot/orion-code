import type { IAgentExecutorPort, AgentExecutionResult } from '@orion/application';
import type { AgentResponseDTO, TaskResponseDTO } from '@orion/application';
import type { Result } from '@orion/shared';
import { AppError, fail, ok } from '@orion/shared';
import type { Agent } from '@orion/domain';
import type { ILLMProvider, LLMMessage } from '../providers/BaseProvider.js';
import type { ToolRegistry, ToolContext } from '../tools/ToolRegistry.js';
import type { LockManager } from './LockManager.js';
import { loadPromptWithContext, type ProjectContext } from './prompts/index.js';

export interface ChatStructuredRequest<T> {
  systemPrompt: string;
  userPrompt: string;
  /** Optional validator that throws if the LLM output is malformed. */
  validate?: (raw: unknown) => T;
  /** Number of retries on parse / validation failure. Defaults to 3. */
  retries?: number;
}

export interface ExecuteAgentInput {
  agent: Agent;
  task: TaskResponseDTO;
  /** Working directory for the agent (a worktree path). */
  worktreePath: string;
  toolRegistry: ToolRegistry;
  lockManager: LockManager;
  /** Hard cap on the number of tool-call turns. Defaults to 10. */
  maxTurns?: number;
  /** Optional abort signal (e.g. for orchestrator timeout). */
  signal?: AbortSignal;
  /** Called with each turn's output for real-time streaming. */
  onOutput?: (event: { type: 'thinking' | 'tool_call' | 'tool_result' | 'error' | 'done'; agentId: string; agentName: string; role: string; content: string; turn: number }) => void;
  /** Optional project context for prompt enrichment. */
  projectContext?: ProjectContext;
}

/**
 * The agent loop:
 *
 *   1. Send system prompt + tool list + task description to the LLM.
 *   2. The LLM responds with either:
 *        a. action=tool_use → call the tool, append the result, loop.
 *        b. action=done → return success.
 *        c. Free-form text → treat as done with the text as summary.
 *   3. Permission enforcement is handled by the ToolRegistry; tool
 *      failures are reported back to the LLM so it can retry.
 */
export class AgentExecutor implements IAgentExecutorPort {
  private llmProvider: ILLMProvider;

  constructor(llmProvider: ILLMProvider) {
    this.llmProvider = llmProvider;
  }

  getProvider(): ILLMProvider {
    return this.llmProvider;
  }

  setProvider(provider: ILLMProvider): void {
    this.llmProvider = provider;
  }

  /**
   * Calls the LLM and expects a JSON document that conforms to
   * `validate`. Used by the Planner to extract structured subtasks.
   * Retries on parse failure with a corrective nudge.
   */
  async chatStructured<T>(
    request: ChatStructuredRequest<T>,
  ): Promise<Result<T, AppError>> {
    const retries = request.retries ?? 3;
    let lastError = 'Unknown parsing error';

    for (let attempt = 0; attempt < retries; attempt++) {
      const messages: LLMMessage[] = [
        { role: 'system', content: request.systemPrompt },
        {
          role: 'user',
          content:
            attempt === 0
              ? request.userPrompt
              : `${request.userPrompt}\n\nYour previous response was not valid JSON: ${lastError}. Reply with STRICT JSON only, no prose.`,
        },
      ];

      let response = await this.llmProvider.chat(messages, { temperature: 0 });
      // Retry on rate limits with backoff.
      for (let r = 0; response.isFail() && r < 2; r++) {
        const isRateLimit = response.error.message.includes('429') || response.error.message.toLowerCase().includes('rate limit');
        if (!isRateLimit) break;
        await new Promise((resolve) => setTimeout(resolve, 3000 * (r + 1)));
        response = await this.llmProvider.chat(messages, { temperature: 0 });
      }
      if (response.isFail()) {
        lastError = response.error.message;
        continue;
      }

      const parsed = extractJson(response.value.content);
      if (parsed === null) {
        lastError = `No JSON object found in response: ${response.value.content.slice(0, 200)}`;
        continue;
      }

      if (request.validate) {
        try {
          return ok(request.validate(parsed));
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          continue;
        }
      }
      return ok(parsed as T);
    }

    return fail(AppError.internal(`chatStructured failed after ${retries} attempts: ${lastError}`));
  }

  /**
   * The agent loop. Returns the final assistant message as the
   * execution output. Records every tool call in the result.
   */
  async executeAgent(input: ExecuteAgentInput): Promise<Result<AgentExecutionResult, AppError>> {
    const isAvailable = await this.llmProvider.isAvailable();
    if (!isAvailable) {
      return fail(AppError.internal(`${this.llmProvider.name} is not available`));
    }

    const systemPrompt = loadPromptWithContext(input.agent.role, input.projectContext);
    const toolList = this.formatToolList(input.toolRegistry);
    const maxTurns = input.maxTurns ?? 10;
    const ctx: ToolContext = {
      agent: input.agent,
      worktreePath: input.worktreePath,
      lockManager: input.lockManager,
      signal: input.signal,
    };

    const toolNames = input.toolRegistry.names().join(', ');
    const messages: LLMMessage[] = [
      { role: 'system', content: `${systemPrompt}\n\nAVAILABLE TOOLS (${toolNames}):\n${toolList}\n\nIMPORTANT: Only call tools that are listed above. Do NOT invent tool names.` },
      {
        role: 'user',
        content: `Task: ${input.task.title}\nDescription: ${input.task.description}`,
      },
    ];

    const toolCalls: Array<{ name: string; input: Record<string, unknown>; output: string }> = [];

    for (let turn = 0; turn < maxTurns; turn++) {
      if (input.signal?.aborted) {
        return fail(AppError.internal('Agent execution aborted'));
      }

      // Retry loop for rate-limited LLM calls with exponential backoff.
      let response = await this.llmProvider.chat(messages, { temperature: 0 });
      for (let retry = 0; response.isFail() && retry < 3; retry++) {
        const errMsg = response.error.message;
        const isRateLimit = errMsg.includes('429') || errMsg.toLowerCase().includes('rate limit');
        if (!isRateLimit) break;
        const delayMs = Math.min(2000 * 2 ** retry, 15_000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        response = await this.llmProvider.chat(messages, { temperature: 0 });
      }
      if (response.isFail()) {
        return fail(response.error);
      }
      const content = response.value.content;

      // Stream LLM response to subscribers.
      input.onOutput?.({
        type: 'thinking',
        agentId: input.agent.id,
        agentName: input.agent.name,
        role: input.agent.role,
        content: content.slice(0, 500),
        turn,
      });

      const action = extractAction(content);
      if (action === null) {
        // The LLM responded with free-form text instead of a tool call
        // or done action. If we haven't made any tool calls yet, this
        // means the LLM is describing what it WOULD do instead of
        // actually doing it. Force it to use tools.
        if (toolCalls.length === 0) {
          messages.push({ role: 'assistant', content });
          messages.push({
            role: 'user',
            content: 'You must use the provided tools to complete this task. Do not describe what you would do — actually do it by calling the tools. Respond with a JSON object: {"action": "tool_use", "name": "tool_name", "input": {...}} or {"action": "done", "summary": "what you did"}',
          });
          continue;
        }
        // Tool calls were made — treat remaining text as final summary.
        return ok({
          success: true,
          output: content,
          artifacts: this.extractArtifacts(content),
          toolCalls,
        });
      }

      if (action.type === 'done') {
        const finalText = action.summary ?? content;
        return ok({
          success: true,
          output: finalText,
          artifacts: this.extractArtifacts(finalText),
          toolCalls,
        });
      }

      if (!action.name || !action.input) {
        return fail(AppError.internal('Tool use action missing name or input'));
      }

      // Stream tool call to subscribers.
      input.onOutput?.({
        type: 'tool_call',
        agentId: input.agent.id,
        agentName: input.agent.name,
        role: input.agent.role,
        content: `${action.name}(${JSON.stringify(action.input).slice(0, 200)})`,
        turn,
      });

      const toolRun = await input.toolRegistry.run(action.name, action.input, ctx);
      const toolOutput = toolRun.isOk()
        ? JSON.stringify(toolRun.value)
        : `ERROR: ${toolRun.error.message}`;
      toolCalls.push({ name: action.name, input: action.input, output: toolOutput });

      // Stream tool result to subscribers.
      input.onOutput?.({
        type: 'tool_result',
        agentId: input.agent.id,
        agentName: input.agent.name,
        role: input.agent.role,
        content: toolOutput.slice(0, 500),
        turn,
      });

      messages.push({ role: 'assistant', content });
      messages.push({ role: 'user', content: `tool_result(${action.name}): ${toolOutput}` });
    }

    return fail(AppError.internal(`Agent loop exceeded ${maxTurns} turns`));
  }

  /**
   * Legacy execute path used by the non-tool-use Orchestrator (kept for
   * backwards compatibility during the migration).
   */
  async execute(
    agent: AgentResponseDTO,
    task: TaskResponseDTO,
  ): Promise<Result<AgentExecutionResult, AppError>> {
    const isAvailable = await this.llmProvider.isAvailable();
    if (!isAvailable) {
      return fail(AppError.internal(`${this.llmProvider.name} is not available`));
    }

    const prompt = loadPrompt(agent.role);
    const messages: LLMMessage[] = [
      { role: 'system', content: prompt },
      {
        role: 'user',
        content: `Task: ${task.title}\nDescription: ${task.description}`,
      },
    ];

    let lastError: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      let response = await this.llmProvider.chat(messages);
      // Retry on rate limits with backoff.
      for (let r = 0; response.isFail() && r < 2; r++) {
        const isRateLimit = response.error.message.includes('429') || response.error.message.toLowerCase().includes('rate limit');
        if (!isRateLimit) break;
        await new Promise((resolve) => setTimeout(resolve, 3000 * (r + 1)));
        response = await this.llmProvider.chat(messages);
      }
      if (response.isFail()) {
        lastError = response.error.message;
        continue;
      }
      const output = response.value.content;
      if (output && output.length > 10) {
        return ok({
          success: true,
          output,
          artifacts: this.extractArtifacts(output),
        });
      }
      lastError = 'Empty or invalid response from LLM';
    }
    return fail(AppError.internal(`Execution failed after 3 attempts: ${lastError}`));
  }

  async cancel(_taskId: string): Promise<Result<void, AppError>> {
    return ok(undefined);
  }

  private formatToolList(registry: ToolRegistry): string {
    return JSON.stringify(registry.schemasForLLM(), null, 2);
  }

  private extractArtifacts(output: string): string[] {
    const artifacts: string[] = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match: RegExpExecArray | null;
    while ((match = codeBlockRegex.exec(output)) !== null) {
      const language = match[1] ?? 'text';
      const ext = this.getExtensionForLanguage(language);
      if (ext) {
        artifacts.push(`output${ext}`);
      }
    }
    return artifacts;
  }

  private getExtensionForLanguage(language: string): string | null {
    const extMap: Record<string, string> = {
      typescript: '.ts',
      javascript: '.js',
      python: '.py',
      sql: '.sql',
      bash: '.sh',
      dockerfile: '.dockerfile',
      yaml: '.yml',
      json: '.json',
      markdown: '.md',
    };
    return extMap[language.toLowerCase()] || null;
  }
}

interface ExtractedAction {
  type: 'tool_use' | 'done';
  name?: string;
  input?: Record<string, unknown>;
  summary?: string;
}

/**
 * Detects the LLM response format. We accept three shapes, in order:
 *   1. A JSON object with `action: "tool_use"` or `action: "done"`.
 *   2. A JSON object with `name` and `input` (Anthropic-style).
 *   3. Otherwise, return null and the caller treats the response as
 *      free-form text.
 */
function extractAction(content: string): ExtractedAction | null {
  const json = extractJson(content);
  if (!json) return null;
  if (typeof json !== 'object') return null;

  const obj = json as Record<string, unknown>;
  if (obj.action === 'done') {
    return { type: 'done', summary: typeof obj.summary === 'string' ? obj.summary : undefined };
  }
  if (obj.action === 'tool_use' && typeof obj.name === 'string') {
    return {
      type: 'tool_use',
      name: obj.name,
      input: (obj.input as Record<string, unknown>) ?? {},
    };
  }
  if (typeof obj.name === 'string') {
    return {
      type: 'tool_use',
      name: obj.name,
      input: (obj.input as Record<string, unknown>) ?? {},
    };
  }
  return null;
}

/**
 * Extracts the first balanced JSON object from a string. Handles
 * content wrapped in ```json ... ``` fences and tolerates trailing prose.
 */
function extractJson(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const text = fenced && fenced[1] ? fenced[1] : content;

  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === undefined) break;
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const slice = text.slice(start, i + 1);
        try {
          return JSON.parse(slice);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}