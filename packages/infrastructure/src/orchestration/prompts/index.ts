import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const promptCache = new Map<string, string>();

export interface ProjectContext {
  rootPath?: string;
  framework?: string | null;
  packageManager?: string | null;
  testFramework?: string | null;
  stack?: string[];
  hasTypeScript?: boolean;
  hasDocker?: boolean;
  hasCI?: boolean;
}

/**
 * Loads a system prompt from the prompts directory.
 * Prompts are cached after first load for performance.
 */
export function loadPrompt(role: string): string {
  const cached = promptCache.get(role);
  if (cached) return cached;

  try {
    const promptPath = join(__dirname, `${role}.md`);
    const content = readFileSync(promptPath, 'utf-8').trim();
    promptCache.set(role, content);
    return content;
  } catch {
    // Fallback to default prompt if role-specific prompt not found
    const defaultPath = join(__dirname, 'default.md');
    const content = readFileSync(defaultPath, 'utf-8').trim();
    promptCache.set(role, content);
    return content;
  }
}

/**
 * Loads a system prompt enriched with project context.
 * The context is appended to the base prompt so the LLM knows
 * the existing stack and conventions.
 */
export function loadPromptWithContext(role: string, context?: ProjectContext): string {
  const basePrompt = loadPrompt(role);

  if (!context) return basePrompt;

  const contextLines: string[] = [];

  if (context.stack && context.stack.length > 0) {
    contextLines.push(`Stack: ${context.stack.join(', ')}`);
  }
  if (context.framework) {
    contextLines.push(`Framework: ${context.framework}`);
  }
  if (context.packageManager) {
    contextLines.push(`Package manager: ${context.packageManager}`);
  }
  if (context.testFramework) {
    contextLines.push(`Test framework: ${context.testFramework}`);
  }
  if (context.hasTypeScript !== undefined) {
    contextLines.push(`Language: ${context.hasTypeScript ? 'TypeScript' : 'JavaScript'}`);
  }
  if (context.hasDocker) {
    contextLines.push('Docker: yes');
  }
  if (context.hasCI) {
    contextLines.push('CI: yes (GitHub Actions)');
  }

  if (contextLines.length === 0) return basePrompt;

  return `${basePrompt}\n\n## Project Context\n${contextLines.join('\n')}`;
}

/**
 * Loads all prompts and returns them as a Record.
 * Useful for initialization or testing.
 */
export function loadAllPrompts(): Record<string, string> {
  const roles = [
    'planner', 'architect', 'backend', 'database', 'frontend',
    'documentation', 'qa', 'reviewer', 'devops', 'security',
    'performance', 'git', 'default',
  ];

  const prompts: Record<string, string> = {};
  for (const role of roles) {
    prompts[role] = loadPrompt(role);
  }
  return prompts;
}

/**
 * Clears the prompt cache. Useful for testing or hot-reloading prompts.
 */
export function clearPromptCache(): void {
  promptCache.clear();
}
