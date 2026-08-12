import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolRegistry, type Tool, type ToolContext } from '../ToolRegistry.js';
import { Agent } from '@orion/domain';
import { LockManager } from '../../orchestration/LockManager.js';
import { ok } from '@orion/shared';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;
  let mockAgent: Agent;
  let mockContext: ToolContext;

  beforeEach(() => {
    registry = new ToolRegistry();
    mockAgent = Agent.create({
      id: 'agent-1',
      projectId: 'proj-1',
      name: 'Test Agent',
      role: 'backend',
      permissions: ['src/'],
    });
    mockContext = {
      agent: mockAgent,
      worktreePath: '/tmp/worktree',
      lockManager: new LockManager(),
    };
  });

  describe('permission enforcement', () => {
    it('should allow tool execution when agent has required permission', async () => {
      const mockTool: Tool = {
        name: 'readFile',
        description: 'Read a file',
        inputSchema: {
          type: 'object',
          properties: { path: { type: 'string' } },
          required: ['path'],
        },
        requiresPermission: 'src/',
        run: vi.fn().mockResolvedValue(ok({})),
      };

      registry.register(mockTool);
      const result = await registry.run('readFile', { path: 'src/main.ts' }, mockContext);

      expect(result.isOk()).toBe(true);
    });

    it('should deny tool execution when agent lacks required permission', async () => {
      const mockTool: Tool = {
        name: 'dockerBuild',
        description: 'Build Docker image',
        inputSchema: {
          type: 'object',
          properties: { path: { type: 'string' } },
          required: ['path'],
        },
        requiresPermission: 'docker/',
        run: vi.fn().mockResolvedValue(ok({})),
      };

      registry.register(mockTool);
      const result = await registry.run('dockerBuild', { path: 'docker/Dockerfile' }, mockContext);

      expect(result.isFail()).toBe(true);
    });

    it('should check both tool requirements and agent permissions', async () => {
      const mockTool: Tool = {
        name: 'restrictedTool',
        description: 'A restricted tool',
        inputSchema: {
          type: 'object',
          properties: { path: { type: 'string' } },
          required: ['path'],
        },
        requiresPermission: ['src/', 'config/'],
        run: vi.fn().mockResolvedValue(ok({})),
      };

      registry.register(mockTool);

      // Agent has src/ permission, tool requires src/ or config/
      const result1 = await registry.run('restrictedTool', { path: 'src/main.ts' }, mockContext);
      expect(result1.isOk()).toBe(true);

      // Agent has src/ permission, but path is config/ which is also required
      const result2 = await registry.run('restrictedTool', { path: 'config/settings.json' }, mockContext);
      expect(result2.isFail()).toBe(true);
    });

    it('should allow tool without permission requirement', async () => {
      const mockTool: Tool = {
        name: 'glob',
        description: 'Find files',
        inputSchema: {
          type: 'object',
          properties: { pattern: { type: 'string' } },
          required: ['pattern'],
        },
        run: vi.fn().mockResolvedValue(ok({})),
      };

      registry.register(mockTool);
      const result = await registry.run('glob', { pattern: '**/*.ts' }, mockContext);

      expect(result.isOk()).toBe(true);
    });
  });

  describe('tool management', () => {
    it('should register and retrieve tools', () => {
      const mockTool: Tool = {
        name: 'testTool',
        description: 'Test tool',
        inputSchema: { type: 'object', properties: {} },
        run: vi.fn(),
      };

      registry.register(mockTool);
      expect(registry.get('testTool')).toBe(mockTool);
      expect(registry.names()).toContain('testTool');
    });

    it('should return undefined for non-existent tool', () => {
      expect(registry.get('nonExistent')).toBeUndefined();
    });

    it('should register multiple tools at once', () => {
      const tool1: Tool = {
        name: 'tool1',
        description: 'Tool 1',
        inputSchema: { type: 'object', properties: {} },
        run: vi.fn(),
      };
      const tool2: Tool = {
        name: 'tool2',
        description: 'Tool 2',
        inputSchema: { type: 'object', properties: {} },
        run: vi.fn(),
      };

      registry.registerAll([tool1, tool2]);
      expect(registry.names()).toContain('tool1');
      expect(registry.names()).toContain('tool2');
    });

    it('should generate schemas for LLM', () => {
      const mockTool: Tool = {
        name: 'testTool',
        description: 'Test tool',
        inputSchema: {
          type: 'object',
          properties: { path: { type: 'string' } },
          required: ['path'],
        },
        run: vi.fn(),
      };

      registry.register(mockTool);
      const schemas = registry.schemasForLLM();

      expect(schemas).toHaveLength(1);
      expect(schemas[0].name).toBe('testTool');
      expect(schemas[0].description).toBe('Test tool');
      expect(schemas[0].input_schema).toEqual(mockTool.inputSchema);
    });
  });

  describe('error handling', () => {
    it('should return error for non-existent tool', async () => {
      const result = await registry.run('nonExistent', {}, mockContext);
      expect(result.isFail()).toBe(true);
    });

    it('should include available tools in error message', async () => {
      const mockTool: Tool = {
        name: 'existingTool',
        description: 'Existing tool',
        inputSchema: { type: 'object', properties: {} },
        run: vi.fn(),
      };

      registry.register(mockTool);
      const result = await registry.run('nonExistent', {}, mockContext);

      expect(result.isFail()).toBe(true);
      if (result.isFail()) {
        expect(result.error.message).toContain('existingTool');
      }
    });
  });
});
