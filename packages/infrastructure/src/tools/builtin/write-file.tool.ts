import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { AppError, fail, ok } from '@orion/shared';
import type { Tool, ToolRunResult } from '../ToolRegistry.js';

const WRITE_PREFIXES = ['src/', 'docker/', '.github/', 'docs/', 'tests/', 'README.md'];

/**
 * Writes a file in the agent's worktree. Honors the lock manager so two
 * agents writing the same path are serialized — the second one waits.
 */
export const writeFileTool: Tool = {
  name: 'write_file',
  description:
    'Create or overwrite a file in the project worktree. Auto-creates parent directories. ' +
    'Serialized per-path via the lock manager.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path relative to the worktree root.' },
      content: { type: 'string', description: 'UTF-8 file content.' },
    },
    required: ['path', 'content'],
  },
  requiresPermission: WRITE_PREFIXES,
  async run(input, ctx): Promise<ToolRunResult> {
    const target = String(input.path ?? '');
    const content = String(input.content ?? '');
    if (!target) {
      return fail(AppError.validation('path is required'));
    }

    const absolute = resolve(ctx.worktreePath, target);
    const writeOp = async () => {
      await mkdir(dirname(absolute), { recursive: true });
      await writeFile(absolute, content, 'utf-8');
      return { path: target, bytes: Buffer.byteLength(content, 'utf-8') };
    };

    const locked = await ctx.lockManager.withLock(
      target,
      ctx.agent.id,
      writeOp,
    );
    return locked.isOk() ? ok(locked.value) : fail(locked.error);
  },
};