import type { IUnitOfWork } from '@orion/domain';

/**
 * DrizzleUnitOfWork - Unit of Work implementation for Drizzle ORM.
 *
 * NOTE: This is currently a no-op implementation. Drizzle's transaction model
 * is callback-based (db.transaction(async (tx) => { ... })), which doesn't
 * map well to the begin/commit/rollback pattern expected by the IUnitOfWork
 * interface. The use cases (AuthUseCase, PlanUseCase, ImplementUseCase) use
 * this UoW optionally, so removing it won't break functionality.
 *
 * TODO: Either implement proper transaction support using Drizzle's callback
 * model, or remove the UoW pattern entirely and use Drizzle transactions
 * directly in the use cases.
 */
export class DrizzleUnitOfWork implements IUnitOfWork {
  private active = false;

  async begin(): Promise<void> {
    if (this.active) return;
    this.active = true;
  }

  async commit(): Promise<void> {
    if (!this.active) return;
    this.active = false;
  }

  async rollback(): Promise<void> {
    if (!this.active) return;
    this.active = false;
  }

  isActive(): boolean {
    return this.active;
  }
}

export function createUnitOfWork(): DrizzleUnitOfWork {
  return new DrizzleUnitOfWork();
}
