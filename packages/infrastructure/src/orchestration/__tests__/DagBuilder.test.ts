import { describe, it, expect } from 'vitest';
import { DagBuilder } from '../DagBuilder.js';

describe('DagBuilder', () => {
  const builder = new DagBuilder();

  it('should build DAG with architect first', () => {
    const subtasks = builder.build(['architect', 'backend']);
    expect(subtasks[0].role).toBe('architect');
    expect(subtasks[0].dependencies).toHaveLength(0);
    expect(subtasks[1].role).toBe('backend');
    expect(subtasks[1].dependencies).toContain('0-architect');
  });

  it('should build DAG with database before backend', () => {
    const subtasks = builder.build(['database', 'backend']);
    expect(subtasks[0].role).toBe('database');
    expect(subtasks[1].role).toBe('backend');
    expect(subtasks[1].dependencies).toContain('0-database');
  });

  it('should build DAG with architect, database, backend', () => {
    const subtasks = builder.build(['architect', 'database', 'backend']);
    expect(subtasks).toHaveLength(3);
    expect(subtasks[0].role).toBe('architect');
    expect(subtasks[1].role).toBe('database');
    expect(subtasks[2].role).toBe('backend');
    expect(subtasks[2].dependencies).toContain('0-architect');
    expect(subtasks[2].dependencies).toContain('1-database');
  });

  it('should add qa after implementation', () => {
    const subtasks = builder.build(['architect', 'backend', 'qa']);
    expect(subtasks[2].role).toBe('qa');
    expect(subtasks[2].dependencies).toContain('0-architect');
    expect(subtasks[2].dependencies).toContain('1-backend');
  });

  it('should add reviewer at the end', () => {
    const subtasks = builder.build(['architect', 'backend', 'reviewer']);
    expect(subtasks[2].role).toBe('reviewer');
    expect(subtasks[2].dependencies).toContain('0-architect');
    expect(subtasks[2].dependencies).toContain('1-backend');
  });

  it('should handle single agent', () => {
    const subtasks = builder.build(['backend']);
    expect(subtasks).toHaveLength(1);
    expect(subtasks[0].role).toBe('backend');
    expect(subtasks[0].dependencies).toHaveLength(0);
  });

  it('should handle empty agents', () => {
    const subtasks = builder.build([]);
    expect(subtasks).toHaveLength(0);
  });
});
