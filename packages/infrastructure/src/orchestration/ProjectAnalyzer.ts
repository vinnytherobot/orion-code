import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Snapshot of what a project looks like on disk. The Planner uses this
 * as grounding context so the LLM doesn't hallucinate dependencies or
 * frameworks.
 */
export interface ProjectSnapshot {
  rootPath: string;
  stack: string[];
  /** Bun/Node/npm/pnpm/yarn. */
  packageManager: string | null;
  /** Detected test framework (jest, vitest, mocha, ...) or null. */
  testFramework: string | null;
  /** Detected framework (next, nest, express, fastify, hono, ...). */
  framework: string | null;
  /** Raw list of dep categories found in package.json. */
  dependencies: string[];
  hasTypeScript: boolean;
  hasDocker: boolean;
  hasCI: boolean;
  topLevelFiles: string[];
}

const FRAMEWORK_HINTS: Record<string, string[]> = {
  next: ['next'],
  nest: ['@nestjs/core'],
  express: ['express'],
  fastify: ['fastify'],
  hono: ['hono'],
  astro: ['astro'],
  remix: ['@remix-run/react'],
  vite: ['vite'],
  tsx: ['tsx'],
  vitest: ['vitest'],
  jest: ['jest'],
  mocha: ['mocha'],
  playwright: ['@playwright/test'],
  cypress: ['cypress'],
  prisma: ['prisma', '@prisma/client'],
  drizzle: ['drizzle-orm'],
  typeorm: ['typeorm'],
};

export class ProjectAnalyzer {
  /**
   * Inspects the project directory and returns a snapshot. The
   * analyzer is read-only and never throws — every failure is captured
   * as an empty / null field so the Planner can still proceed.
   */
  analyze(rootPath: string): ProjectSnapshot {
    const root = resolve(rootPath);
    const empty: ProjectSnapshot = {
      rootPath: root,
      stack: [],
      packageManager: null,
      testFramework: null,
      framework: null,
      dependencies: [],
      hasTypeScript: false,
      hasDocker: false,
      hasCI: false,
      topLevelFiles: [],
    };

    if (!existsSync(root)) {
      return empty;
    }

    let topLevel: string[] = [];
    try {
      topLevel = readdirSync(root);
    } catch {
      return empty;
    }

    const pkg = this.readJson(resolve(root, 'package.json'));
    const deps: string[] = pkg
      ? [
          ...Object.keys((pkg['dependencies'] as Record<string, string>) ?? {}),
          ...Object.keys((pkg['devDependencies'] as Record<string, string>) ?? {}),
        ]
      : [];

    const packageManager = this.detectPackageManager(root, topLevel);
    const hasTypeScript =
      topLevel.includes('tsconfig.json') || deps.includes('typescript');
    const hasDocker =
      topLevel.includes('Dockerfile') ||
      topLevel.includes('docker-compose.yml') ||
      topLevel.includes('docker-compose.yaml');
    const hasCI = existsSync(resolve(root, '.github', 'workflows'));
    const framework = this.detectFramework(deps);
    const testFramework = this.detectTestFramework(deps);
    const stack = this.estimateStack(deps, framework, hasTypeScript);

    return {
      rootPath: root,
      stack,
      packageManager,
      testFramework,
      framework,
      dependencies: deps,
      hasTypeScript,
      hasDocker,
      hasCI,
      topLevelFiles: topLevel.filter((f) => !f.startsWith('.')),
    };
  }

  /**
   * Returns a one-paragraph plain-text summary used as the system
   * pre-context for the Planner prompt.
   */
  describe(snapshot: ProjectSnapshot): string {
    const lines: string[] = [];
    lines.push(`Project root: ${snapshot.rootPath}`);
    if (snapshot.framework) lines.push(`Framework: ${snapshot.framework}`);
    if (snapshot.packageManager) lines.push(`Package manager: ${snapshot.packageManager}`);
    lines.push(`Language: ${snapshot.hasTypeScript ? 'TypeScript' : 'JavaScript'}`);
    if (snapshot.testFramework) lines.push(`Tests: ${snapshot.testFramework}`);
    if (snapshot.hasDocker) lines.push('Docker: yes');
    if (snapshot.hasCI) lines.push('CI: yes (GitHub Actions)');
    if (snapshot.stack.length > 0) {
      lines.push(`Stack: ${snapshot.stack.join(', ')}`);
    }
    return lines.join('\n');
  }

  private readJson(path: string): Record<string, unknown> | null {
    if (!existsSync(path)) return null;
    try {
      return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private detectPackageManager(root: string, topLevel: string[]): string | null {
    if (existsSync(resolve(root, 'bun.lockb')) || topLevel.includes('bun.lockb')) return 'bun';
    if (existsSync(resolve(root, 'pnpm-lock.yaml'))) return 'pnpm';
    if (existsSync(resolve(root, 'yarn.lock'))) return 'yarn';
    if (existsSync(resolve(root, 'package-lock.json'))) return 'npm';
    return null;
  }

  private detectFramework(deps: string[]): string | null {
    for (const [name, hints] of Object.entries(FRAMEWORK_HINTS)) {
      if (hints.some((h) => deps.includes(h))) return name;
    }
    return null;
  }

  private detectTestFramework(deps: string[]): string | null {
    if (deps.includes('vitest')) return 'vitest';
    if (deps.includes('jest')) return 'jest';
    if (deps.includes('mocha')) return 'mocha';
    if (deps.includes('@playwright/test')) return 'playwright';
    if (deps.includes('cypress')) return 'cypress';
    return null;
  }

  private estimateStack(deps: string[], framework: string | null, hasTypeScript: boolean): string[] {
    const stack: string[] = [];
    if (hasTypeScript) stack.push('typescript');
    if (framework) stack.push(framework);
    if (deps.includes('drizzle-orm')) stack.push('drizzle');
    if (deps.includes('fastify')) stack.push('fastify');
    if (deps.includes('@orion/domain')) stack.push('orion');
    return stack;
  }
}
