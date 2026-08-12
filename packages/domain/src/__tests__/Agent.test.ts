import { describe, it, expect } from 'vitest';
import { Agent } from '../entities/Agent.js';

describe('Agent', () => {
  describe('canAccess', () => {
    it('should allow access to paths with matching prefix', () => {
      const agent = Agent.create({
        id: '1',
        projectId: 'proj-1',
        name: 'Test Agent',
        role: 'backend',
        permissions: ['src/'],
      });

      expect(agent.canAccess('src/main.ts')).toBe(true);
      expect(agent.canAccess('src/utils/helper.ts')).toBe(true);
    });

    it('should deny access to paths without matching prefix', () => {
      const agent = Agent.create({
        id: '1',
        projectId: 'proj-1',
        name: 'Test Agent',
        role: 'backend',
        permissions: ['src/'],
      });

      expect(agent.canAccess('docker/Dockerfile')).toBe(false);
      expect(agent.canAccess('package.json')).toBe(false);
    });

    it('should prevent path traversal attacks', () => {
      const agent = Agent.create({
        id: '1',
        projectId: 'proj-1',
        name: 'Test Agent',
        role: 'backend',
        permissions: ['src/'],
      });

      // Path traversal attempts should be normalized and denied
      expect(agent.canAccess('src/../etc/passwd')).toBe(false);
      expect(agent.canAccess('src/../../etc/passwd')).toBe(false);
    });

    it('should handle multiple permissions', () => {
      const agent = Agent.create({
        id: '1',
        projectId: 'proj-1',
        name: 'Test Agent',
        role: 'devops',
        permissions: ['src/', 'docker/'],
      });

      expect(agent.canAccess('src/main.ts')).toBe(true);
      expect(agent.canAccess('docker/Dockerfile')).toBe(true);
      expect(agent.canAccess('package.json')).toBe(false);
    });

    it('should deny access with empty permissions', () => {
      const agent = Agent.create({
        id: '1',
        projectId: 'proj-1',
        name: 'Test Agent',
        role: 'reviewer',
        permissions: [],
      });

      expect(agent.canAccess('src/main.ts')).toBe(false);
    });
  });

  describe('assignTask', () => {
    it('should assign task to idle agent', () => {
      const agent = Agent.create({
        id: '1',
        projectId: 'proj-1',
        name: 'Test Agent',
        role: 'backend',
      });

      const result = agent.assignTask('task-1');
      expect(result.isOk()).toBe(true);
      expect(agent.currentTaskId).toBe('task-1');
      expect(agent.status.isRunning()).toBe(true);
    });

    it('should fail to assign task to non-idle agent', () => {
      const agent = Agent.create({
        id: '1',
        projectId: 'proj-1',
        name: 'Test Agent',
        role: 'backend',
      });

      agent.assignTask('task-1');
      const result = agent.assignTask('task-2');
      expect(result.isFail()).toBe(true);
    });
  });

  describe('completeTask', () => {
    it('should complete running task', () => {
      const agent = Agent.create({
        id: '1',
        projectId: 'proj-1',
        name: 'Test Agent',
        role: 'backend',
      });

      agent.assignTask('task-1');
      const result = agent.completeTask();
      expect(result.isOk()).toBe(true);
      expect(agent.currentTaskId).toBeNull();
      expect(agent.status.isTerminal()).toBe(true);
    });

    it('should fail to complete non-running agent', () => {
      const agent = Agent.create({
        id: '1',
        projectId: 'proj-1',
        name: 'Test Agent',
        role: 'backend',
      });

      const result = agent.completeTask();
      expect(result.isFail()).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset agent to idle state', () => {
      const agent = Agent.create({
        id: '1',
        projectId: 'proj-1',
        name: 'Test Agent',
        role: 'backend',
      });

      agent.assignTask('task-1');
      agent.reset();
      expect(agent.currentTaskId).toBeNull();
      expect(agent.status.isIdle()).toBe(true);
    });
  });
});
