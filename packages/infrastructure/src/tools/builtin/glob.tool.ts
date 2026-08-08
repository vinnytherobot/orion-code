import { readdir, stat } from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { AppError, fail, ok } from '@orion/shared';
import type { Tool, ToolRunResult } from '../ToolRegistry.js';

const READ_PREFIXES = ['src/', 'docker/', '.github/', 'docs/', 'tests/', 'README.md'];

/**
 * Minimal glob: `pattern` uses the same syntax as `git`'s pathspec
 * (e.g. `src/**` + `.ts`). Walks the directory tree under the worktree
 * skipping `node_modules` and `.git`. Returns a list of matching paths
 * relative to the worktree root.
 */
async function walk(
  dir: string,
  pattern: RegExp,
  results: string[],
  max = 5_000,
): Promise<void> {
  if (results.length >= max) return;
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (results.length >= max) return;
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.orion') {
      continue;
    }
    const absolute = resolve(dir, entry.name);
    const rel = relative(dir, absolute).split(sep).join('/');
    if (entry.isDirectory()) {
      await walk(absolute, pattern, results, max);
    } else if (pattern.test(rel)) {
      results.push(rel);
    }
  }
}

function compilePattern(glob: string): RegExp {
  // Convert a git-style pathspec to a regex: `**` → `.*`, `*` → `[^/]*`.
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\*\\\*/g, '.*')
    .replace(/\\\*/g, '[^/]*')
    .replace(/\\\?/g, '[^/]');
  return new RegExp(`^${escaped}$`);
}

export const globTool: Tool = {
  name: 'glob',
  description:
    'List files in the worktree matching a glob pattern (e.g. "src/**/*.ts"). ' +
    'Skips node_modules, .git and .orion.',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: { type: 'string' },
      max: { type: 'number' },
    },
    required: ['pattern'],
  },
  requiresPermission: READ_PREFIXES,
  async run(input, ctx): Promise<ToolRunResult> {
    const pattern = String(input.pattern ?? '');
    const max = typeof input.max === 'number' ? input.max : 5_000;
    if (!pattern) {
      return fail(AppError.validation('pattern is required'));
    }
    try {
      const worktreeExists = await stat(ctx.worktreePath)
        .then((s) => s.isDirectory())
        .catch(() => false);
      if (!worktreeExists) {
        return fail(AppError.notFound(`worktree ${ctx.worktreePath} not found`));
      }
      const re = compilePattern(pattern);
      const results: string[] = [];
      await walk(ctx.worktreePath, re, results, max);
      return ok({ pattern, count: results.length, files: results });
    } catch (err) {
      return fail(
        AppError.internal(err instanceof Error ? err.message : String(err)),
      );
    }
  },
};