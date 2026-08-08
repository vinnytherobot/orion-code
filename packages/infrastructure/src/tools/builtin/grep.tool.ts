import { readFile, readdir } from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { AppError, fail, ok } from '@orion/shared';
import type { Tool, ToolRunResult } from '../ToolRegistry.js';

const READ_PREFIXES = ['src/', 'docker/', '.github/', 'docs/', 'tests/', 'README.md'];

interface Match {
  file: string;
  line: number;
  text: string;
}

async function walk(
  dir: string,
  re: RegExp,
  matches: Match[],
  max: number,
): Promise<void> {
  if (matches.length >= max) return;
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (matches.length >= max) return;
    if (
      entry.name === 'node_modules' ||
      entry.name === '.git' ||
      entry.name === '.orion' ||
      entry.name === 'dist' ||
      entry.name === 'build'
    ) {
      continue;
    }
    const absolute = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(absolute, re, matches, max);
    } else {
      try {
        const content = await readFile(absolute, 'utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (re.test(lines[i]!)) {
            matches.push({
              file: relative(dir, absolute).split(sep).join('/'),
              line: i + 1,
              text: lines[i]!,
            });
            if (matches.length >= max) return;
          }
        }
      } catch {
        // unreadable file — skip
      }
    }
  }
}

export const grepTool: Tool = {
  name: 'grep',
  description:
    'Search the worktree for files matching a regex. Returns up to `max` matches ' +
    'with file, line number and text.',
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
    const max = typeof input.max === 'number' ? input.max : 200;
    if (!pattern) {
      return fail(AppError.validation('pattern is required'));
    }
    let re: RegExp;
    try {
      re = new RegExp(pattern);
    } catch (err) {
      return fail(
        AppError.validation(
          `Invalid regex: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
    const matches: Match[] = [];
    await walk(ctx.worktreePath, re, matches, max);
    return ok({ pattern, count: matches.length, matches });
  },
};