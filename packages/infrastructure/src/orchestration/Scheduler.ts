/**
 * The Scheduler turns a flat list of tasks (each with a list of
 * upstream ids) into a list of "waves" — each wave is a set of tasks
 * that can run in parallel.
 *
 * Wave 0 contains tasks with no dependencies. Wave 1 contains tasks
 * whose dependencies are all in wave 0. And so on. If the dependency
 * graph is a DAG, the algorithm terminates; otherwise `build()`
 * reports a cycle.
 */

import type { Result } from '@orion/shared';
import { AppError, ok, fail } from '@orion/shared';

export interface SchedulableTask {
  id: string;
  dependencies: readonly string[];
}

export interface Wave {
  index: number;
  taskIds: string[];
}

export class Scheduler {
  /**
   * Builds the wave list. Returns a Result with the waves on success,
   * or an error if the graph has a cycle or references an unknown dependency.
   */
  build(tasks: readonly SchedulableTask[]): Result<Wave[], AppError> {
    const known = new Set(tasks.map((t) => t.id));
    for (const t of tasks) {
      for (const dep of t.dependencies) {
        if (!known.has(dep)) {
          return fail(AppError.validation(`Task ${t.id} references unknown dependency ${dep}`));
        }
      }
    }

    const inDegree = new Map<string, number>();
    const children = new Map<string, string[]>();
    for (const t of tasks) {
      inDegree.set(t.id, t.dependencies.length);
      for (const dep of t.dependencies) {
        const list = children.get(dep) ?? [];
        list.push(t.id);
        children.set(dep, list);
      }
    }

    const waves: Wave[] = [];
    const remaining = new Set(tasks.map((t) => t.id));
    let waveIndex = 0;

    while (remaining.size > 0) {
      const ready = [...remaining].filter((id) => (inDegree.get(id) ?? 0) === 0).sort();
      if (ready.length === 0) {
        return fail(AppError.internal(`Cycle detected: remaining ${[...remaining].join(', ')}`));
      }
      waves.push({ index: waveIndex, taskIds: ready });
      for (const id of ready) {
        remaining.delete(id);
        for (const child of children.get(id) ?? []) {
          inDegree.set(child, (inDegree.get(child) ?? 0) - 1);
        }
      }
      waveIndex++;
    }

    return ok(waves);
  }

  /**
   * Returns the wave that contains the given task id, or -1 if the
   * task is not in the schedule.
   */
  waveOf(waves: readonly Wave[], taskId: string): number {
    for (const w of waves) {
      if (w.taskIds.includes(taskId)) return w.index;
    }
    return -1;
  }
}
