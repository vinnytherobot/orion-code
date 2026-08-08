import type { Result } from '@orion/shared';
import { AppError, ok } from '@orion/shared';
import type { WorktreeManager } from './WorktreeManager.js';

export interface MergeInput {
  projectPath: string;
  taskId: string;
  branchName: string;
  /** Title used in the merge commit message. */
  title: string;
}

export interface MergeOutcome {
  status: 'merged' | 'nothing-to-merge' | 'conflict';
  branchName: string;
  mergeCommitSha?: string;
  conflictFiles?: string[];
}

/**
 * Merges an agent's worktree branch into the project's current branch
 * using `--no-ff` so each Orion task shows up as a merge commit in the
 * project's history (matching AGENTS.md §"Git Agent").
 *
 * On conflict, returns `status: 'conflict'` with the list of conflicting
 * files — the orchestrator surfaces this as a task failure that the
 * user can resolve manually (re-run the task, or run `git merge
 * --abort`).
 */
export class MergeResolver {
  constructor(private readonly worktree: WorktreeManager) {}

  async merge(input: MergeInput): Promise<Result<MergeOutcome, AppError>> {
    const { projectPath, branchName, title } = input;

    const hasChanges = await this.worktree.hasChanges(projectPath, branchName);
    if (!hasChanges) {
      return ok({ status: 'nothing-to-merge', branchName });
    }

    try {
      const result = await this.tryMerge(projectPath, branchName, title);
      return ok(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const conflictFiles = await this.detectConflicts(projectPath);
      await this.abortMerge(projectPath).catch(() => {});
      return ok({
        status: 'conflict',
        branchName,
        conflictFiles: conflictFiles.length > 0 ? conflictFiles : [message],
      });
    }
  }

  private async abortMerge(projectPath: string): Promise<void> {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);
    await execFileAsync('git', ['merge', '--abort'], {
      cwd: projectPath,
      env: { ...process.env, LC_ALL: 'C' },
    });
  }

  private async tryMerge(
    projectPath: string,
    branchName: string,
    title: string,
  ): Promise<MergeOutcome> {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      LC_ALL: 'C',
      GIT_PAGER: 'cat',
      GIT_AUTHOR_NAME: 'Orion Code',
      GIT_AUTHOR_EMAIL: 'orion@local',
      GIT_COMMITTER_NAME: 'Orion Code',
      GIT_COMMITTER_EMAIL: 'orion@local',
    };

    await execFileAsync(
      'git',
      ['merge', '--no-ff', '-m', `Orion: ${title}`, branchName],
      { cwd: projectPath, env, maxBuffer: 16 * 1024 * 1024 },
    );

    const { stdout } = await execFileAsync(
      'git',
      ['rev-parse', 'HEAD'],
      { cwd: projectPath, env },
    );
    return {
      status: 'merged',
      branchName,
      mergeCommitSha: stdout.trim(),
    };
  }

  private async detectConflicts(projectPath: string): Promise<string[]> {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);

    try {
      const { stdout } = await execFileAsync(
        'git',
        ['diff', '--name-only', '--diff-filter=U'],
        { cwd: projectPath, env: { ...process.env, LC_ALL: 'C' } },
      );
      return stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }
}