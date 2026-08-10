import { describe, it, expect, beforeEach } from 'vitest';
import { PlanCache } from '../PlanCache.js';
import type { PlannedSubtask } from '../PlannerService.js';

describe('PlanCache', () => {
  let cache: PlanCache;

  beforeEach(() => {
    cache = new PlanCache();
  });

  it('should return null for cache miss', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('should store and retrieve plan', () => {
    const plan: PlannedSubtask[] = [
      { localId: '0-architect', title: 'Architect', description: '', role: 'architect', dependencies: [], estimatedComplexity: 3 },
    ];
    cache.set('add-feature:test', plan);
    expect(cache.get('add-feature:test')).toEqual(plan);
  });

  it('should overwrite existing plan', () => {
    const plan1: PlannedSubtask[] = [
      { localId: '0-backend', title: 'Backend 1', description: '', role: 'backend', dependencies: [], estimatedComplexity: 3 },
    ];
    const plan2: PlannedSubtask[] = [
      { localId: '0-backend', title: 'Backend 2', description: '', role: 'backend', dependencies: [], estimatedComplexity: 4 },
    ];
    cache.set('test', plan1);
    cache.set('test', plan2);
    expect(cache.get('test')).toEqual(plan2);
  });

  it('should clear cache', () => {
    cache.set('test', []);
    cache.clear();
    expect(cache.get('test')).toBeNull();
  });

  it('should return cache size', () => {
    cache.set('a', []);
    cache.set('b', []);
    expect(cache.size).toBe(2);
  });

  it('should return a defensive copy to prevent mutation', () => {
    const plan: PlannedSubtask[] = [
      { localId: '0-backend', title: 'Backend', description: '', role: 'backend', dependencies: [], estimatedComplexity: 3 },
    ];
    cache.set('mutate:test', plan);

    const retrieved = cache.get('mutate:test');
    retrieved!.push({ localId: '1-frontend', title: 'Frontend', description: '', role: 'frontend', dependencies: [], estimatedComplexity: 2 });

    expect(cache.get('mutate:test')).toHaveLength(1);
  });
});
