import { describe, it, expect } from 'vitest';
import { ComplexityAssessor } from '../ComplexityAssessor.js';

describe('ComplexityAssessor', () => {
  const assessor = new ComplexityAssessor();

  describe('trivial tasks', () => {
    it('should classify "create a file called teste.md" as trivial', () => {
      const result = assessor.assess({ request: 'create a file called teste.md', intent: 'add-feature' });
      expect(result.tier).toBe('trivial');
      expect(result.score).toBe(1);
      expect(result.suggestedRoles).toHaveLength(1);
      expect(result.suggestedRoles[0]).toBe('backend');
    });

    it('should classify "write a comment in auth.ts" as trivial', () => {
      const result = assessor.assess({ request: 'write a comment in auth.ts', intent: 'add-feature' });
      expect(result.tier).toBe('trivial');
      expect(result.score).toBe(1);
    });

    it('should classify "rename foo to bar" as trivial', () => {
      const result = assessor.assess({ request: 'rename foo to bar', intent: 'refactor' });
      expect(result.tier).toBe('trivial');
      expect(result.score).toBe(1);
    });

    it('should classify "add a line to package.json" as trivial', () => {
      const result = assessor.assess({ request: 'add a line to package.json', intent: 'add-feature' });
      expect(result.tier).toBe('trivial');
      expect(result.score).toBe(1);
    });

    it('should suggest single role for trivial tasks', () => {
      const result = assessor.assess({ request: 'create a file called test.txt', intent: 'add-feature' });
      expect(result.suggestedRoles).toHaveLength(1);
      expect(result.skippedRoles.length).toBeGreaterThan(0);
    });
  });

  describe('moderate tasks', () => {
    it('should classify "add an endpoint for users" as moderate', () => {
      const result = assessor.assess({ request: 'add an endpoint for users', intent: 'add-feature' });
      expect(result.tier).toBe('moderate');
      expect(result.score).toBeGreaterThanOrEqual(2);
      expect(result.score).toBeLessThanOrEqual(3);
    });

    it('should classify "fix the login error" as moderate', () => {
      const result = assessor.assess({ request: 'fix the login error', intent: 'fix-bug' });
      expect(result.tier).toBe('moderate');
    });

    it('should classify "write unit tests for auth" as moderate or complex', () => {
      const result = assessor.assess({ request: 'write unit tests for auth', intent: 'add-testing' });
      expect(['moderate', 'complex']).toContain(result.tier);
    });

    it('should suggest 2-3 roles for moderate tasks', () => {
      const result = assessor.assess({ request: 'add an API endpoint for users', intent: 'add-feature' });
      expect(result.suggestedRoles.length).toBeGreaterThanOrEqual(1);
      expect(result.suggestedRoles.length).toBeLessThanOrEqual(3);
    });
  });

  describe('complex tasks', () => {
    it('should classify "build authentication system" as complex', () => {
      const result = assessor.assess({ request: 'build authentication system with JWT and refresh tokens', intent: 'add-feature' });
      expect(result.tier).toBe('complex');
      expect(result.score).toBeGreaterThanOrEqual(4);
    });

    it('should classify "refactor the entire data layer" as complex', () => {
      const result = assessor.assess({ request: 'refactor the entire data layer to use DDD', intent: 'refactor' });
      expect(result.tier).toBe('complex');
    });

    it('should classify "implement user management with RBAC" as complex', () => {
      const result = assessor.assess({ request: 'implement user management with role-based access control', intent: 'add-feature' });
      expect(result.tier).toBe('complex');
    });

    it('should include reviewer for complex tasks', () => {
      const result = assessor.assess({ request: 'build a complete feature module with tests', intent: 'add-feature' });
      expect(result.suggestedRoles).toContain('reviewer');
    });
  });

  describe('edge cases', () => {
    it('should handle empty request gracefully', () => {
      const result = assessor.assess({ request: '', intent: 'unknown' });
      expect(result.tier).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(1);
    });

    it('should handle very long request', () => {
      const result = assessor.assess({
        request: 'build a complete authentication system with role-based access control, JWT tokens, refresh tokens, and database migrations',
        intent: 'add-feature',
      });
      expect(result.tier).toBe('complex');
    });

    it('should handle requests with special characters', () => {
      const result = assessor.assess({ request: 'fix the $pecial ch@racter bug!', intent: 'fix-bug' });
      expect(result.tier).toBeDefined();
    });
  });
});
