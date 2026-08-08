import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AppError, fail, ok } from '@orion/shared';
import type { Tool, ToolRunResult } from '../ToolRegistry.js';

const EDIT_PREFIXES = ['src/', 'docker/', '.github/', 'docs/', 'tests/', 'README.md'];

/**
 * Patch-style file edit: applies a search/replace pair. Safer than
 * `write_file` for incremental edits because the LLM only needs to
 * provide the surrounding context + replacement instead of rewriting
 * the whole file.
 *
 * `replace_all` defaults to false; if true, every occurrence is replaced
 * (useful for renaming symbols).
 */
export const editFileTool: Tool = {
  name: 'edit_file',
  description:
    'Patch-style edit. Finds `old_text` in the file and replaces it with `new_text`. ' +
    'By default the first occurrence only; pass replace_all=true for renames.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      old_text: { type: 'string' },
      new_text: { type: 'string' },
      replace_all: { type: 'boolean' },
    },
    required: ['path', 'old_text', 'new_text'],
  },
  requiresPermission: EDIT_PREFIXES,
  async run(input, ctx): Promise<ToolRunResult> {
    const target = String(input.path ?? '');
    const oldText = String(input.old_text ?? '');
    const newText = String(input.new_text ?? '');
    const replaceAll = input.replace_all === true;

    if (!target || !oldText) {
      return fail(AppError.validation('path and old_text are required'));
    }

    const absolute = resolve(ctx.worktreePath, target);
    const editOp = async () => {
      const current = await readFile(absolute, 'utf-8');
      let updated: string;
      let occurrences: number;
      if (replaceAll) {
        occurrences = current.split(oldText).length - 1;
        updated = current.split(oldText).join(newText);
      } else {
        const idx = current.indexOf(oldText);
        if (idx === -1) {
          throw AppError.notFound(`old_text not found in ${target}`);
        }
        occurrences = 1;
        updated =
          current.slice(0, idx) + newText + current.slice(idx + oldText.length);
      }
      await writeFile(absolute, updated, 'utf-8');
      return { path: target, occurrences, bytes: Buffer.byteLength(updated, 'utf-8') };
    };

    const locked = await ctx.lockManager.withLock(
      target,
      ctx.agent.id,
      editOp,
    );
    return locked.isOk() ? ok(locked.value) : fail(locked.error);
  },
};