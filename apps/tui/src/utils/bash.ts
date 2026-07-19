import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface BashResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function execCommand(cmd: string): Promise<BashResult> {
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: process.cwd(),
      timeout: 30000,
      maxBuffer: 1024 * 1024,
      shell: 'cmd.exe',
    });
    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
    };
  } catch (error: any) {
    return {
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || error.message,
      exitCode: error.code || 1,
    };
  }
}