import { describe, expect, it, vi } from 'vitest';
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

  it('should handle duplicate agents', () => {
    const subtasks = builder.build(['backend', 'backend', 'backend']);
    expect(subtasks).toHaveLength(3);
    expect(subtasks[0].localId).toBe('0-backend');
    expect(subtasks[1].localId).toBe('1-backend');
    expect(subtasks[2].localId).toBe('2-backend');
    // Each duplicate should have unique localId
    const localIds = subtasks.map((s) => s.localId);
    const uniqueIds = new Set(localIds);
    expect(uniqueIds.size).toBe(3);
  });

  it('should filter out unknown roles', () => {
    const consoleSpy = vi.spyOn(console, 'warn');
    const subtasks = builder.build(['backend', 'unknown-role', 'frontend']);
    expect(subtasks).toHaveLength(2);
    expect(subtasks[0].role).toBe('backend');
    expect(subtasks[1].role).toBe('frontend');
    expect(consoleSpy).toHaveBeenCalledWith('DagBuilder: Unknown role "unknown-role" ignored');
    consoleSpy.mockRestore();
  });

  it('should handle all valid roles', () => {
    const allRoles = [
      'architect',
      'database',
      'backend',
      'frontend',
      'documentation',
      'qa',
      'reviewer',
      'devops',
      'security',
      'performance',
      'git',
    ];
    const subtasks = builder.build(allRoles);
    expect(subtasks).toHaveLength(11);
    // Verify all roles are present
    const roles = subtasks.map((s) => s.role);
    expect(roles).toEqual(expect.arrayContaining(allRoles));
    // Verify ordering follows ROLE_PRIORITY
    expect(subtasks[0].role).toBe('architect');
    expect(subtasks[1].role).toBe('database');
    expect(subtasks[2].role).toBe('backend');
    expect(subtasks[3].role).toBe('frontend');
  });

  it('should return empty array when all roles are unknown', () => {
    const consoleSpy = vi.spyOn(console, 'warn');
    const subtasks = builder.build(['unknown1', 'unknown2']);
    expect(subtasks).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledTimes(2);
    consoleSpy.mockRestore();
  });

  it('should generate sequential IDs regardless of duplicates', () => {
    const subtasks = builder.build(['architect', 'backend', 'backend']);
    expect(subtasks[0].localId).toBe('0-architect');
    expect(subtasks[1].localId).toBe('1-backend');
    expect(subtasks[2].localId).toBe('2-backend');
  });
});
