import type { IUnitOfWork } from '@orion/domain';
import { getDatabase } from './database.js';

type AppDb = ReturnType<typeof getDatabase>;

export class DrizzleUnitOfWork implements IUnitOfWork {
  private active = false;
  private tx: Parameters<Parameters<AppDb['transaction']>[0]>[0] | null = null;

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

  getTransaction(): typeof this.tx {
    return this.tx;
  }
}

export function createUnitOfWork(): DrizzleUnitOfWork {
  return new DrizzleUnitOfWork();
}
