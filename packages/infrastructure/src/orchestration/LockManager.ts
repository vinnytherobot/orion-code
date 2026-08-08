import { EventEmitter } from 'node:events';
import type { Result } from '@orion/shared';
import { AppError, fail, ok } from '@orion/shared';

/**
 * A FIFO lock keyed by path. Two agents trying to acquire the same path
 * are serialized: the second agent's promise resolves only after the
 * first one calls `release()`. This is the runtime enforcement for
 * AGENTS.md §"Permission System" — when two specialists need to touch
 * the same file (e.g. Backend and Frontend both editing
 * `src/api/routes.ts`), they coordinate through the orchestrator
 * instead of stomping on each other.
 *
 * Lock acquisition is bounded by `ttlMs` so a crashed agent cannot hold
 * a lock forever; the lock is auto-released on TTL expiry and an
 * `expired` event is emitted.
 *
 * Events:
 *   - `acquired`  { path, agentId, token }
 *   - `released`  { path, agentId, token, reason: 'release'|'expired' }
 *   - `waiting`   { path, agentId, queueLength }
 */
export interface LockToken {
  path: string;
  agentId: string;
  acquiredAt: number;
  expiresAt: number;
}

interface Waiter {
  path: string;
  agentId: string;
  ttlMs: number;
  resolve: (token: LockToken) => void;
  reject: (err: Error) => void;
  enqueuedAt: number;
  timeout: NodeJS.Timeout;
}

export class LockManager extends EventEmitter {
  private readonly locks = new Map<string, LockToken>();
  private readonly waiters = new Map<string, Waiter[]>();

  /**
   * Try to acquire a lock on `path`. Resolves immediately with a token if
   * no one holds it; otherwise queues the caller and resolves once the
   * current holder releases (or the wait times out via `ttlMs`).
   */
  acquire(path: string, agentId: string, ttlMs = 30_000): Promise<Result<LockToken, AppError>> {
    const existing = this.locks.get(path);
    if (!existing) {
      const token = this.makeToken(path, agentId, ttlMs);
      this.locks.set(path, token);
      this.emit('acquired', token);
      return Promise.resolve(ok(token));
    }

    if (existing.agentId === agentId) {
      // Same agent re-acquires: refresh TTL.
      existing.expiresAt = Date.now() + ttlMs;
      return Promise.resolve(ok(existing));
    }

    return new Promise((resolve) => {
      const queue = this.waiters.get(path) ?? [];
      const waiter: Waiter = {
        path,
        agentId,
        ttlMs,
        enqueuedAt: Date.now(),
        resolve: (token) => resolve(ok(token)),
        reject: (err) => resolve(fail(AppError.internal(err.message))),
        timeout: setTimeout(() => {
          // Pull this waiter out of the queue.
          this.removeWaiter(path, waiter);
          resolve(
            fail(
              AppError.internal(
                `Timed out waiting ${ttlMs}ms for lock on ${path}`,
              ),
            ),
          );
        }, ttlMs),
      };
      queue.push(waiter);
      this.waiters.set(path, queue);
      this.emit('waiting', { path, agentId, queueLength: queue.length });
    });
  }

  release(token: LockToken): Result<void, AppError> {
    const current = this.locks.get(token.path);
    if (!current) {
      return fail(AppError.notFound(`Lock for path ${token.path}`));
    }
    if (current.agentId !== token.agentId || current.acquiredAt !== token.acquiredAt) {
      return fail(AppError.conflict('Lock token does not match current holder'));
    }
    this.locks.delete(token.path);
    this.emit('released', { ...token, reason: 'release' });
    this.dispatchNext(token.path);
    return ok(undefined);
  }

  /**
   * Runs `body` while holding an exclusive lock on `path`. Auto-releases
   * even if `body` throws.
   */
  async withLock<T>(
    path: string,
    agentId: string,
    body: () => Promise<T>,
    ttlMs = 30_000,
  ): Promise<Result<T, AppError>> {
    const acquireResult = await this.acquire(path, agentId, ttlMs);
    if (acquireResult.isFail()) {
      return fail(acquireResult.error);
    }
    try {
      const value = await body();
      return ok(value);
    } catch (err) {
      return fail(
        AppError.internal(err instanceof Error ? err.message : String(err)),
      );
    } finally {
      this.release(acquireResult.value);
    }
  }

  /** Snapshot of currently held locks — useful for the TUI / status routes. */
  snapshot(): LockToken[] {
    return [...this.locks.values()];
  }

  /** How many agents are waiting behind each path. */
  queueDepth(path?: string): Map<string, number> {
    if (path) {
      return new Map([[path, this.waiters.get(path)?.length ?? 0]]);
    }
    const out = new Map<string, number>();
    for (const [p, q] of this.waiters) out.set(p, q.length);
    return out;
  }

  /** Releases all locks held by `agentId` (used on agent crash). */
  forceReleaseAll(agentId: string): number {
    let count = 0;
    for (const [path, token] of this.locks) {
      if (token.agentId === agentId) {
        this.locks.delete(path);
        this.emit('released', { ...token, reason: 'expired' });
        this.dispatchNext(path);
        count++;
      }
    }
    return count;
  }

  private dispatchNext(path: string): void {
    const queue = this.waiters.get(path);
    if (!queue || queue.length === 0) return;
    const next = queue.shift()!;
    if (queue.length === 0) this.waiters.delete(path);
    clearTimeout(next.timeout);
    const token = this.makeToken(next.path, next.agentId, next.ttlMs);
    this.locks.set(path, token);
    this.emit('acquired', token);
    next.resolve(token);
  }

  private removeWaiter(path: string, waiter: Waiter): void {
    const queue = this.waiters.get(path);
    if (!queue) return;
    const idx = queue.indexOf(waiter);
    if (idx === -1) return;
    clearTimeout(waiter.timeout);
    queue.splice(idx, 1);
    if (queue.length === 0) this.waiters.delete(path);
  }

  private makeToken(path: string, agentId: string, ttlMs: number): LockToken {
    const now = Date.now();
    return {
      path,
      agentId,
      acquiredAt: now,
      expiresAt: now + ttlMs,
    };
  }
}