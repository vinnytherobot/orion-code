import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TechLeadRouter } from '../TechLeadRouter.js';
import type { ProjectAnalyzer } from '../ProjectAnalyzer.js';
import type { AgentExecutor } from '../AgentExecutor.js';

describe('TechLeadRouter', () => {
  let router: TechLeadRouter;
  let mockAnalyzer: ProjectAnalyzer;
  let mockExecutor: AgentExecutor;

  beforeEach(() => {
    mockAnalyzer = {
      analyze: vi.fn().mockReturnValue({ rootPath: '/test', stack: [] }),
      describe: vi.fn().mockReturnValue('Test project'),
    } as any;

    mockExecutor = {
      chatStructured: vi.fn(),
    } as any;

    router = new TechLeadRouter(mockAnalyzer, mockExecutor);
  });

  it('should route "add feature" request without LLM', async () => {
    // "Implement" matches the add-feature intent in IntentClassifier
    const result = await router.route({ rootPath: '/test', request: 'Implement JWT authentication' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.subtasks.length).toBeGreaterThan(0);
      expect(result.value.subtasks.some(s => s.role === 'architect')).toBe(true);
      expect(mockExecutor.chatStructured).not.toHaveBeenCalled();
    }
  });

  it('should route "fix bug" request without LLM', async () => {
    const result = await router.route({ rootPath: '/test', request: 'Fix login error' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.subtasks.some(s => s.role === 'backend')).toBe(true);
      expect(mockExecutor.chatStructured).not.toHaveBeenCalled();
    }
  });

  it('should use LLM fallback for unknown intent', async () => {
    vi.mocked(mockExecutor.chatStructured).mockResolvedValue({
      isOk: () => true,
      isFail: () => false,
      value: {
        subtasks: [
          { title: 'Task 1', description: 'Do something', role: 'backend', dependencies: [], estimated_complexity: 3 },
        ],
      },
    });

    const result = await router.route({ rootPath: '/test', request: 'Do something custom' });

    expect(result.isOk()).toBe(true);
    expect(mockExecutor.chatStructured).toHaveBeenCalled();
  });

  it('should cache plans', async () => {
    // "Implement" matches add-feature → triggers non-LLM path
    await router.route({ rootPath: '/test', request: 'Implement JWT authentication' });
    await router.route({ rootPath: '/test', request: 'Implement JWT authentication' });

    // Second call should use cache, not recompute
    expect(mockExecutor.chatStructured).not.toHaveBeenCalled();
  });
});
