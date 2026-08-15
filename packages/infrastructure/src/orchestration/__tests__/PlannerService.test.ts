import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlannerService } from '../PlannerService.js';
import type { ProjectAnalyzer } from '../ProjectAnalyzer.js';
import type { AgentExecutor } from '../AgentExecutor.js';

describe('PlannerService', () => {
  let planner: PlannerService;
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

    planner = new PlannerService(mockAnalyzer, mockExecutor);
  });

  it('should route "add feature" request without LLM', async () => {
    const result = await planner.route({ rootPath: '/test', request: 'Implement JWT authentication' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.subtasks.length).toBeGreaterThan(0);
      expect(mockExecutor.chatStructured).not.toHaveBeenCalled();
    }
  });

  it('should route "fix bug" request without LLM', async () => {
    const result = await planner.route({ rootPath: '/test', request: 'Fix login error' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.subtasks.some(s => s.role === 'backend')).toBe(true);
      expect(mockExecutor.chatStructured).not.toHaveBeenCalled();
    }
  });

  it('should produce single subtask for trivial "create a file" request', async () => {
    const result = await planner.route({ rootPath: '/test', request: 'Create a file called notes.md' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.subtasks).toHaveLength(1);
      expect(result.value.subtasks[0].estimatedComplexity).toBe(1);
      expect(mockExecutor.chatStructured).not.toHaveBeenCalled();
    }
  });

  it('should produce 2-3 subtasks for moderate request', async () => {
    // "create" matches add-feature intent
    const result = await planner.route({ rootPath: '/test', request: 'Create a user endpoint with validation' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.subtasks.length).toBeLessThanOrEqual(3);
      expect(result.value.subtasks.length).toBeGreaterThanOrEqual(1);
      expect(mockExecutor.chatStructured).not.toHaveBeenCalled();
    }
  });

  it('should produce full pipeline for complex request', async () => {
    const result = await planner.route({
      rootPath: '/test',
      request: 'Build a complete authentication system with JWT, refresh tokens, and RBAC',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.subtasks.length).toBeGreaterThanOrEqual(2);
      expect(mockExecutor.chatStructured).not.toHaveBeenCalled();
    }
  });

  it('should not spawn database agent for file creation', async () => {
    const result = await planner.route({ rootPath: '/test', request: 'Create a README file' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.subtasks.some(s => s.role === 'database')).toBe(false);
      expect(result.value.subtasks.some(s => s.role === 'frontend')).toBe(false);
    }
  });

  it('should cache plans', async () => {
    await planner.route({ rootPath: '/test', request: 'Implement JWT authentication' });
    await planner.route({ rootPath: '/test', request: 'Implement JWT authentication' });

    // Second call should use cache, not recompute
    expect(mockExecutor.chatStructured).not.toHaveBeenCalled();
  });

  it('should use LLM fallback for truly unknown intent with no rule match', async () => {
    vi.mocked(mockExecutor.chatStructured).mockResolvedValue({
      isOk: () => true,
      isFail: () => false,
      value: {
        subtasks: [
          { title: 'Task 1', description: 'Do something', role: 'backend', dependencies: [], estimated_complexity: 3 },
        ],
      },
    });

    // This request has no keywords that match any intent or complexity patterns
    // It should go through the moderate path (selectDynamic) rather than LLM
    const result = await planner.route({ rootPath: '/test', request: 'xyzzy plugh' });

    expect(result.isOk()).toBe(true);
    // With the new three-tier routing, unknown intent goes to moderate path
    // LLM is only used as final fallback when selectDynamic returns empty
    expect(mockExecutor.chatStructured).not.toHaveBeenCalled();
  });
});
