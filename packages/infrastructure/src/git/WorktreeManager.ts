import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const execFileAsync = promisify(execFile);

export interface GitRunResult {
  stdout: string;
  stderr: string;
}

export interface WorktreeCreateInput {
  projectPath: string;
  taskId: string;
  branchName: string;
}

export interface CommitInput {
  worktreePath: string;
  message: string;
  authorName?: string;
  authorEmail?: string;
}

/**
 * Thin wrapper around `git worktree` / `git merge` so the orchestrator can
 * isolate each task's writes to its own branch and merge them into the
 * project's main branch after the Reviewer Agent approves them.
 *
 * We shell out to the `git` binary instead of pulling in `simple-git` to
 * keep the dependency surface small: git is already a hard requirement of
 * AGENTS.md (the Git Agent commits and pushes), so this is free.
 */
export class WorktreeManager {
  private gitEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
    return {
      ...process.env,
      // Force English output so we can pattern-match stderr reliably.
      LC_ALL: 'C',
      // Avoid pager prompts in `git log` / `git diff`.
      GIT_PAGER: 'cat',
      ...extra,
    };
  }

  private async runGit(
    cwd: string,
    args: string[],
    extraEnv: Record<string, string> = {},
  ): Promise<GitRunResult> {
    return execFileAsync('git', args, {
      cwd,
      env: this.gitEnv(extraEnv),
      maxBuffer: 16 * 1024 * 1024,
    }) as Promise<GitRunResult>;
  }

  /**
   * Validates that `projectPath` is a git working tree with a clean
   * index. Throws otherwise — the orchestrator surfaces this as a
   * task-level failure.
   */
  async validateProjectRepo(projectPath: string): Promise<void> {
    if (!existsSync(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }
    try {
      await this.runGit(projectPath, ['rev-parse', '--git-dir']);
    } catch {
      throw new Error(`Project path is not a git repository: ${projectPath}`);
    }
    const { stdout } = await this.runGit(projectPath, ['status', '--porcelain']);
    if (stdout.trim().length > 0) {
      throw new Error(
        `Project repo has uncommitted changes; commit or stash before implementing: ${projectPath}`,
      );
    }
  }

  /**
   * Creates an isolated worktree at `<projectPath>/.orion/worktrees/<taskId>`
   * on a new branch `<branchName>` based on the project's current HEAD.
   * Returns the worktree path.
   */
  async createWorktree(input: WorktreeCreateInput): Promise<string> {
    const projectPath = resolve(input.projectPath);
    await this.validateProjectRepo(projectPath);

    const worktreesRoot = join(projectPath, '.orion', 'worktrees');
    const worktreePath = join(worktreesRoot, input.taskId);

    // Ensure parent dir exists for older git versions that don't create it.
    await mkdir(worktreesRoot, { recursive: true });

    // If the worktree already exists (e.g. retry), remove it first.
    if (existsSync(worktreePath)) {
      await this.removeWorktree(projectPath, worktreePath);
    }

    await this.runGit(projectPath, [
      'worktree',
      'add',
      '-b',
      input.branchName,
      worktreePath,
      'HEAD',
    ]);
    return worktreePath;
  }

  async removeWorktree(projectPath: string, worktreePath: string): Promise<void> {
    try {
      await this.runGit(projectPath, [
        'worktree',
        'remove',
        '--force',
        worktreePath,
      ]);
    } catch {
      // Fallback to manual cleanup if git refuses (e.g. locked worktree).
      if (existsSync(worktreePath)) {
        await rm(worktreePath, { recursive: true, force: true });
      }
      await this.runGit(projectPath, ['worktree', 'prune']).catch(() => {});
    }
  }

  /**
   * Stages everything in the worktree and creates a single commit. The
   * author is overridden to make Orion-generated commits easy to spot.
   */
  async commitAll(input: CommitInput): Promise<string | null> {
    const worktreePath = resolve(input.worktreePath);
    const authorName = input.authorName ?? 'Orion Code';
    const authorEmail = input.authorEmail ?? 'orion@local';
    const env = {
      GIT_AUTHOR_NAME: authorName,
      GIT_AUTHOR_EMAIL: authorEmail,
      GIT_COMMITTER_NAME: authorName,
      GIT_COMMITTER_EMAIL: authorEmail,
    };

    await this.runGit(worktreePath, ['add', '-A'], env);
    const { stdout: status } = await this.runGit(worktreePath, [
      'status',
      '--porcelain',
    ]);
    if (status.trim().length === 0) {
      return null; // Nothing to commit.
    }

    const { stdout } = await this.runGit(worktreePath, [
      'commit',
      '-m',
      input.message,
      '--no-verify',
    ], env);
    const match = stdout.match(/\[([^\]]+)\s+([a-f0-9]+)\]/);
    return match?.[2] ?? null;
  }

  /**
   * Returns true if the worktree branch has commits ahead of the project
   * HEAD (i.e. there is something worth merging).
   */
  async hasChanges(projectPath: string, branchName: string): Promise<boolean> {
    try {
      const { stdout } = await this.runGit(projectPath, [
        'rev-list',
        '--count',
        `HEAD..${branchName}`,
      ]);
      return Number.parseInt(stdout.trim(), 10) > 0;
    } catch {
      return false;
    }
  }

  async currentBranch(projectPath: string): Promise<string> {
    const { stdout } = await this.runGit(projectPath, [
      'rev-parse',
      '--abbrev-ref',
      'HEAD',
    ]);
    return stdout.trim();
  }

  async listWorktrees(projectPath: string): Promise<string[]> {
    const { stdout } = await this.runGit(projectPath, [
      'worktree',
      'list',
      '--porcelain',
    ]);
    return stdout
      .split('\n')
      .filter((line) => line.startsWith('worktree '))
      .map((line) => line.slice('worktree '.length).trim());
  }
}