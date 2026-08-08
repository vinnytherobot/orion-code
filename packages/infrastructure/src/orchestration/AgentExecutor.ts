import type { IAgentExecutorPort, AgentExecutionResult } from '@orion/application';
import type { AgentResponseDTO, TaskResponseDTO } from '@orion/application';
import type { Result } from '@orion/shared';
import { AppError, fail, ok } from '@orion/shared';
import type { Agent } from '@orion/domain';
import type { ILLMProvider, LLMMessage } from '../providers/BaseProvider.js';
import type { ToolRegistry, ToolContext } from '../tools/ToolRegistry.js';
import type { LockManager } from './LockManager.js';

/**
 * System prompts for the 12 agent roles documented in AGENTS.md. Each
 * prompt tells the LLM what the agent is responsible for, what it
 * should NOT do, and the JSON format for tool calls.
 *
 * During the agent loop, the executor appends the JSON schema of the
 * tools available to the agent (as defined by the ToolRegistry and
 * filtered by `Agent.permissions`). The LLM is asked to respond with
 * either a `tool_use` payload or a final `done` payload.
 */
const AGENT_PROMPTS: Record<string, string> = {
  planner: [
    'You are the Planner Agent. You break down a high-level request into',
    'an ordered set of subtasks. You never write code yourself.',
    '',
    'Rules:',
    '1. Read the project analysis (provided separately) to understand the',
    '   existing stack.',
    '2. Decompose the request into 4-8 subtasks with clear dependencies.',
    '3. Each subtask must end with a `done` action, NOT a tool call.',
    '4. Output STRICT JSON only (no prose). Use the schema provided.',
    '',
    'Output format:',
    '{ "subtasks": [ { "title", "description", "role", "dependencies", "estimated_complexity" } ] }',
  ].join('\n'),

  architect: [
    'You are the Architect Agent. You make architecture decisions:',
    'folder structure, dependency boundaries, conventions. You do not write',
    'implementation code.',
    '',
    'When you need to inspect the project, call read_file / glob / grep.',
    'When you are done, respond with `done` and a one-paragraph summary.',
  ].join('\n'),

  backend: [
    'You are the Backend Agent. You implement business logic in',
    'TypeScript following DDD principles.',
    '',
    'Rules:',
    '1. Use the read_file / write_file / edit_file / glob / grep / bash tools,',
    '   the JSON format provided in the tool list.',
    '2. Permissions are enforced server-side: you only have write access to',
    '   the prefixes listed in your permissions. Trying to write outside',
    '   those paths will be rejected.',
    '3. End your work with a `done` action and a summary of the files you',
    '   created or modified.',
  ].join('\n'),

  database: [
    'You are the Database Agent. You design schemas, write',
    'migrations, define indexes, and optimize queries. You typically work',
    'with Drizzle ORM in this project. End with `done` and list the',
    'migrations you wrote.',
  ].join('\n'),

  frontend: [
    'You are the Frontend Agent. You build user interfaces',
    'following the project design system. End with `done` and list the',
    'components you created or modified.',
  ].join('\n'),

  documentation: [
    'You are the Documentation Agent. You keep the README',
    'and docs in sync. You write OpenAPI/Swagger specs when relevant. End',
    'with `done` and a list of the docs you updated.',
  ].join('\n'),

  qa: [
    'You are the QA Agent. You write tests (unit / integration / e2e).',
    'You run the test suite via the bash tool and report failures. End with',
    '`done` and the test results.',
  ].join('\n'),

  reviewer: [
    'You are the Reviewer Agent. You do NOT write code. You',
    'review the worktree produced by other agents using read_file / grep /',
    'bash (read-only) and emit a verdict.',
    '',
    'Output STRICT JSON:',
    '{ "approved": true|false, "issues": [{"file", "line", "severity", "comment"}], "summary": "..." }',
    '',
    'If approved=false, the orchestrator will re-run the originating task',
    'with your comments as additional context.',
  ].join('\n'),

  devops: [
    'You are the DevOps Agent. You manage Dockerfiles, CI/CD',
    'pipelines, and infrastructure. End with `done` and the list of files',
    'you touched.',
  ].join('\n'),

  security: [
    'You are the Security Agent. You audit the worktree for',
    'vulnerabilities, exposed secrets, missing auth checks. You do NOT fix',
    'issues — you only report them in the same format as the Reviewer',
    'Agent.',
  ].join('\n'),

  performance: [
    'You are the Performance Agent. You check for slow',
    'queries, missing indexes, hot paths. Read-only via the tools. End with',
    '`done` and a list of findings.',
  ].join('\n'),

  git: [
    'You are the Git Agent. You produce clear, conventional-commit',
    'messages and create branches / commits when invoked. End with `done`',
    'and the resulting commit SHA.',
  ].join('\n'),
};

const DEFAULT_PROMPT = [
  'You are a helpful AI agent. Use the available tools to',
  'complete the task. End with a `done` action and a concise summary.',
].join('\n');

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

      const response = await this.llmProvider.chat(messages, {
        temperature: 0,
      });
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

    const systemPrompt = AGENT_PROMPTS[input.agent.role] ?? DEFAULT_PROMPT;
    const toolList = this.formatToolList(input.toolRegistry);
    const maxTurns = input.maxTurns ?? 10;
    const ctx: ToolContext = {
      agent: input.agent,
      worktreePath: input.worktreePath,
      lockManager: input.lockManager,
      signal: input.signal,
    };

    const messages: LLMMessage[] = [
      { role: 'system', content: `${systemPrompt}\n\nYou can call these tools (JSON schema):\n${toolList}` },
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
      const response = await this.llmProvider.chat(messages, { temperature: 0 });
      if (response.isFail()) {
        return fail(response.error);
      }
      const content = response.value.content;

      const action = extractAction(content);
      if (action === null) {
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
      const toolRun = await input.toolRegistry.run(action.name, action.input, ctx);
      const toolOutput = toolRun.isOk()
        ? JSON.stringify(toolRun.value)
        : `ERROR: ${toolRun.error.message}`;
      toolCalls.push({ name: action.name, input: action.input, output: toolOutput });

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

    const prompt = AGENT_PROMPTS[agent.role] ?? DEFAULT_PROMPT;
    const messages: LLMMessage[] = [
      { role: 'system', content: prompt },
      {
        role: 'user',
        content: `Task: ${task.title}\nDescription: ${task.description}`,
      },
    ];

    let lastError: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await this.llmProvider.chat(messages);
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