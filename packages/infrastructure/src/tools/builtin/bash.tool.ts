import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { AppError, fail, ok } from '@orion/shared';
import type { Tool, ToolRunResult } from '../ToolRegistry.js';

const execFileAsync = promisify(execFile);

/**
 * Bash tool. Executes a single command in the agent's worktree.
 *
 * SECURITY: commands are matched against an allowlist of program names.
 * The first token (the program) must be in the allowlist; arguments are
 * passed through verbatim. This is intentionally narrow — extending it
 * is easy, but we want to be deliberate about which programs agents can
 * shell out to.
 *
 * Default allowlist (matches AGENTS.md §"Tool System" — read-only-ish):
 *   ls, cat, head, tail, find, grep, wc, tree, mkdir, mv, cp, rm,
 *   echo, pwd, touch, which, env, npm, pnpm, yarn, bun, node, tsc,
 *   vitest, jest, eslint, prettier, biome, git, docker.
 */
const DEFAULT_ALLOWLIST = new Set([
  'ls',
  'cat',
  'head',
  'tail',
  'find',
  'grep',
  'wc',
  'tree',
  'mkdir',
  'mv',
  'cp',
  'rm',
  'echo',
  'pwd',
  'touch',
  'which',
  'env',
  'npm',
  'pnpm',
  'yarn',
  'bun',
  'node',
  'tsc',
  'tsx',
  'vitest',
  'jest',
  'eslint',
  'prettier',
  'biome',
  'git',
  'docker',
  'psql',
  'sqlite3',
]);

export interface BashToolOptions {
  /** Override the default allowlist. */
  allowlist?: Set<string>;
  /** Maximum execution time in ms (default 60s). */
  timeoutMs?: number;
  /** Maximum stdout/stderr capture size in bytes (default 1MB). */
  maxBuffer?: number;
}

export const bashTool: Tool = {
  name: 'bash',
  description:
    'Run a shell command in the worktree. The first token (the program) must be in ' +
    'the bash allowlist. Returns stdout, stderr and exit code.',
  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'e.g. "npm test"' },
      timeout_ms: { type: 'number' },
    },
    required: ['command'],
  },
  run(input, ctx): Promise<ToolRunResult> {
    return runBash(input, ctx);
  },
};

export async function runBash(
  input: Record<string, unknown>,
  ctx: import('../ToolRegistry.js').ToolContext,
  options: BashToolOptions = {},
): Promise<ToolRunResult> {
  const command = String(input.command ?? '').trim();
  const timeoutMs =
    typeof input.timeout_ms === 'number'
      ? Math.min(input.timeout_ms, options.timeoutMs ?? 120_000)
      : options.timeoutMs ?? 60_000;
  const maxBuffer = options.maxBuffer ?? 1024 * 1024;

  if (!command) {
    return fail(AppError.validation('command is required'));
  }
  const program = command.split(/\s+/)[0]!;
  const allowlist = options.allowlist ?? DEFAULT_ALLOWLIST;
  if (!allowlist.has(program)) {
    return fail(
      AppError.forbidden(
        `Program "${program}" is not in the bash allowlist. Allowed: ${[...allowlist].join(', ')}`,
      ),
    );
  }

  try {
    // We pass the command via `bash -c` so shell parsing matches what the
    // agent typed, but we deliberately do NOT spawn a login shell to
    // limit the attack surface.
    const { stdout, stderr } = await execFileAsync(
      'bash',
      ['-c', command],
      {
        cwd: ctx.worktreePath,
        env: { ...process.env, LC_ALL: 'C' },
        timeout: timeoutMs,
        maxBuffer,
      },
    );
    return ok({
      command,
      stdout,
      stderr,
      exitCode: 0,
    });
  } catch (err) {
    // `execFileAsync` rejects with an `Error` that has `.code`, `.stdout`
    // and `.stderr` on non-zero exits.
    const e = err as {
      code?: number | string;
      stdout?: string;
      stderr?: string;
      message?: string;
      killed?: boolean;
    };
    const exitCode = typeof e.code === 'number' ? e.code : 1;
    if (e.killed) {
      return fail(
        AppError.internal(`bash command killed (likely timeout): ${command}`),
      );
    }
    return ok({
      command,
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? e.message ?? String(err),
      exitCode,
    });
  }
}