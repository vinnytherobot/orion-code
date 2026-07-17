import type { IAgentExecutorPort, AgentExecutionResult } from '@orion/application';
import type { AgentResponseDTO, TaskResponseDTO } from '@orion/application';
import type { Result } from '@orion/shared';
import { AppError, ok, fail } from '@orion/shared';
import type { ILLMProvider, LLMMessage } from '../providers/BaseProvider.js';

interface AgentPromptConfig {
  systemPrompt: string;
  taskTemplate: string;
}

const AGENT_PROMPTS: Record<string, AgentPromptConfig> = {
  planner: {
    systemPrompt: `You are a Planner Agent. Your role is to break down complex tasks into smaller, manageable subtasks.
    
Rules:
1. Analyze the task thoroughly
2. Identify dependencies between subtasks
3. Create a clear execution order
4. Estimate complexity for each subtask
5. Output a structured JSON plan`,
    taskTemplate: `Break down this task into subtasks:\n\nTask: {title}\nDescription: {description}\n\nOutput JSON array of subtasks with: title, description, dependencies (array of subtask indices), estimatedComplexity (1-5)`,
  },
  
  backend: {
    systemPrompt: `You are a Backend Agent. Your role is to implement backend business logic.
    
Rules:
1. Follow DDD principles
2. Create clean, testable code
3. Implement proper error handling
4. Use TypeScript best practices
5. Output complete, runnable code`,
    taskTemplate: `Implement backend for:\n\nTask: {title}\nDescription: {description}\n\nOutput complete TypeScript code with proper structure`,
  },
  
  frontend: {
    systemPrompt: `You are a Frontend Agent. Your role is to implement user interfaces.
    
Rules:
1. Create responsive layouts
2. Follow accessibility guidelines
3. Use component patterns
4. Implement proper state management
5. Output complete React/Ink components`,
    taskTemplate: `Implement frontend for:\n\nTask: {title}\nDescription: {description}\n\nOutput complete component code`,
  },
  
  qa: {
    systemPrompt: `You are a QA Agent. Your role is to create comprehensive tests.
    
Rules:
1. Write unit tests
2. Create integration tests
3. Cover edge cases
4. Achieve good coverage
5. Output test files with assertions`,
    taskTemplate: `Create tests for:\n\nTask: {title}\nDescription: {description}\n\nOutput complete test files`,
  },
};

const DEFAULT_SYSTEM_PROMPT = 'You are a helpful AI assistant.';
const DEFAULT_TASK_TEMPLATE = 'Complete this task:\n\nTask: {title}\nDescription: {description}';

function getPromptForRole(role: string): { systemPrompt: string; taskTemplate: string } {
  const prompt = AGENT_PROMPTS[role];
  if (prompt) {
    return { systemPrompt: prompt.systemPrompt, taskTemplate: prompt.taskTemplate };
  }
  return { systemPrompt: DEFAULT_SYSTEM_PROMPT, taskTemplate: DEFAULT_TASK_TEMPLATE };
}

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

  async execute(
    agent: AgentResponseDTO,
    task: TaskResponseDTO
  ): Promise<Result<AgentExecutionResult, AppError>> {
    const isAvailable = await this.llmProvider.isAvailable();
    if (!isAvailable) {
      return fail(AppError.internal(`${this.llmProvider.name} is not available`));
    }

    const { systemPrompt, taskTemplate } = getPromptForRole(agent.role);
    
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: taskTemplate
          .replace('{title}', task.title)
          .replace('{description}', task.description),
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

  private extractArtifacts(output: string): string[] {
    const artifacts: string[] = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(output)) !== null) {
      const language = match[1] || 'text';
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
