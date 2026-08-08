import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AppError, fail, ok } from '@orion/shared';
import type { Tool, ToolRunResult } from '../ToolRegistry.js';

const READ_PREFIXES = ['src/', 'docker/', '.github/', 'docs/', 'tests/', 'README.md'];

export const readFileTool: Tool = {
  name: 'read_file',
  description:
    'Read the contents of a file in the project worktree. Returns UTF-8 text.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path relative to the worktree root.' },
    },
    required: ['path'],
  },
  requiresPermission: READ_PREFIXES,
  async run(input, ctx): Promise<ToolRunResult> {
    const target = String(input.path ?? '');
    if (!target) {
      return fail(AppError.validation('path is required'));
    }
    const absolute = resolve(ctx.worktreePath, target);
    try {
      const content = await readFile(absolute, 'utf-8');
      return ok({ path: target, content });
    } catch (err) {
      return fail(
        AppError.notFound(
          `Cannot read ${target}: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },
};