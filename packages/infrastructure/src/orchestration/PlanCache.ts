import type { PlannedSubtask } from './PlannerService.js';

export class PlanCache {
  private cache = new Map<string, PlannedSubtask[]>();

  get(key: string): PlannedSubtask[] | null {
    const plan = this.cache.get(key);
    return plan ? [...plan] : null;
  }

  set(key: string, plan: PlannedSubtask[]): void {
    this.cache.set(key, plan);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
