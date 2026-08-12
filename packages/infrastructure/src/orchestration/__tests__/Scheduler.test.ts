import { describe, it, expect, beforeEach } from 'vitest';
import { Scheduler } from '../Scheduler.js';

describe('Scheduler', () => {
  let scheduler: Scheduler;

  beforeEach(() => {
    scheduler = new Scheduler();
  });

  describe('build', () => {
    it('should schedule tasks with no dependencies in wave 0', () => {
      const tasks = [
        { id: 'task-1', dependencies: [] },
        { id: 'task-2', dependencies: [] },
        { id: 'task-3', dependencies: [] },
      ];

      const result = scheduler.build(tasks);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].taskIds).toEqual(['task-1', 'task-2', 'task-3']);
      }
    });

    it('should schedule dependent tasks in separate waves', () => {
      const tasks = [
        { id: 'task-1', dependencies: [] },
        { id: 'task-2', dependencies: ['task-1'] },
        { id: 'task-3', dependencies: ['task-2'] },
      ];

      const result = scheduler.build(tasks);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(3);
        expect(result.value[0].taskIds).toEqual(['task-1']);
        expect(result.value[1].taskIds).toEqual(['task-2']);
        expect(result.value[2].taskIds).toEqual(['task-3']);
      }
    });

    it('should handle parallel dependent tasks', () => {
      const tasks = [
        { id: 'task-1', dependencies: [] },
        { id: 'task-2', dependencies: [] },
        { id: 'task-3', dependencies: ['task-1', 'task-2'] },
      ];

      const result = scheduler.build(tasks);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].taskIds).toContain('task-1');
        expect(result.value[0].taskIds).toContain('task-2');
        expect(result.value[1].taskIds).toEqual(['task-3']);
      }
    });

    it('should detect cycles', () => {
      const tasks = [
        { id: 'task-1', dependencies: ['task-2'] },
        { id: 'task-2', dependencies: ['task-1'] },
      ];

      const result = scheduler.build(tasks);
      expect(result.isFail()).toBe(true);
    });

    it('should detect unknown dependencies', () => {
      const tasks = [
        { id: 'task-1', dependencies: ['non-existent'] },
      ];

      const result = scheduler.build(tasks);
      expect(result.isFail()).toBe(true);
    });

    it('should handle empty task list', () => {
      const result = scheduler.build([]);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });
  });

  describe('waveOf', () => {
    it('should return wave index for task', () => {
      const tasks = [
        { id: 'task-1', dependencies: [] },
        { id: 'task-2', dependencies: ['task-1'] },
      ];

      const result = scheduler.build(tasks);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(scheduler.waveOf(result.value, 'task-1')).toBe(0);
        expect(scheduler.waveOf(result.value, 'task-2')).toBe(1);
      }
    });

    it('should return -1 for non-existent task', () => {
      const tasks = [
        { id: 'task-1', dependencies: [] },
      ];

      const result = scheduler.build(tasks);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(scheduler.waveOf(result.value, 'non-existent')).toBe(-1);
      }
    });
  });
});
