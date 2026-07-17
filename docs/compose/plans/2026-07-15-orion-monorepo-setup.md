# Orion Code - Monorepo Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the complete monorepo structure with all packages and apps, configured and ready for development.

**Architecture:** Monorepo with npm workspaces + Turborepo. DDD layers as separate packages (`domain`, `application`, `infrastructure`, `shared`). Two apps (`backend`, `frontend` TUI). Each package is independent with unidirectional dependencies.

**Tech Stack:** TypeScript 5.4+, ESM, Commander.js, Vitest, ESLint, Prettier, Turborepo

## Global Constraints

- All packages use `"type": "module"` (ESM)
- Node.js >= 18.0.0 required
- TypeScript strict mode enabled
- No circular dependencies allowed
- `domain` NEVER depends on `application` or `infrastructure`
- `shared` has zero internal dependencies
- All `tsconfig.json` extend `../../tsconfig.base.json` (apps) or `../../tsconfig.base.json` (packages)

---

### Task 1: Root Monorepo Configuration

**Covers:** S3, S8

**Files:**
- Modify: `package.json` (exists, update)
- Modify: `turbo.json` (exists, update)
- Modify: `tsconfig.base.json` (exists, update)
- Create: `.gitignore`
- Create: `.prettierrc`
- Create: `.eslintrc.cjs`

**Interfaces:**
- Produces: Root workspace config that recognizes `apps/*` and `packages/*`

- [ ] **Step 1: Update root package.json**

```json
{
  "name": "orion-tui",
  "version": "0.1.0",
  "private": true,
  "description": "Multi-Agent TUI - Orquestrador Inteligente de Agentes de IA",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "clean": "turbo run clean",
    "typecheck": "turbo run typecheck",
    "format": "prettier --write \"**/*.{ts,tsx,json}\""
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0",
    "prettier": "^3.2.0",
    "eslint": "^8.57.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "packageManager": "npm@10.0.0"
}
```

- [ ] **Step 2: Update turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

- [ ] **Step 3: Update tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "incremental": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": false,
    "noPropertyAccessFromIndexSignature": false
  },
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
*.tsbuildinfo
.turbo/
.env
.env.local
*.log
coverage/
.DS_Store
```

- [ ] **Step 5: Create .prettierrc**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

- [ ] **Step 6: Create .eslintrc.cjs**

```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  ignorePatterns: ['dist/', 'node_modules/'],
};
```

- [ ] **Step 7: Commit**

```bash
git add package.json turbo.json tsconfig.base.json .gitignore .prettierrc .eslintrc.cjs
git commit -chore: configure root monorepo with turbo, typescript, eslint, prettier"
```

---

### Task 2: Shared Package

**Covers:** S4, S6

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/errors/AppError.ts`
- Create: `packages/shared/src/errors/ValidationError.ts`
- Create: `packages/shared/src/types/Result.ts`
- Create: `packages/shared/src/utils/logger.ts`
- Create: `packages/shared/src/config/OrionConfig.ts`
- Create: `packages/shared/src/config/ConfigLoader.ts`

**Interfaces:**
- Produces:
  - `Result<T, E>` - Success/Failure type
  - `AppError` - Base error class
  - `ValidationError` - Validation error class
  - `Logger` - Logger utility
  - `OrionConfig` - Configuration interface
  - `ConfigLoader` - Config loader

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@orion/shared",
  "version": "0.1.0",
  "description": "Utilitários compartilhados do Orion Code",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "eslint src --ext .ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "vitest": "^1.2.0",
    "typescript": "^5.4.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create Result type**

```typescript
// packages/shared/src/types/Result.ts

export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export const Result = {
  ok<T>(data: T): Result<T, never> {
    return { success: true, data };
  },

  fail<E>(error: E): Result<never, E> {
    return { success: false, error };
  },

  isOk<T, E>(result: Result<T, E>): result is { success: true; data: T } {
    return result.success;
  },

  isFail<T, E>(result: Result<T, E>): result is { success: false; error: E } {
    return !result.success;
  },
};
```

- [ ] **Step 4: Create AppError**

```typescript
// packages/shared/src/errors/AppError.ts

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }

  static notFound(message: string): AppError {
    return new AppError(message, 'NOT_FOUND', 404);
  }

  static unauthorized(message: string): AppError {
    return new AppError(message, 'UNAUTHORIZED', 401);
  }

  static forbidden(message: string): AppError {
    return new AppError(message, 'FORBIDDEN', 403);
  }

  static badRequest(message: string): AppError {
    return new AppError(message, 'BAD_REQUEST', 400);
  }

  static internal(message: string): AppError {
    return new AppError(message, 'INTERNAL_ERROR', 500);
  }
}
```

- [ ] **Step 5: Create ValidationError**

```typescript
// packages/shared/src/errors/ValidationError.ts

import { AppError } from './AppError.js';

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export class ValidationError extends AppError {
  public readonly errors: ValidationErrorDetail[];

  constructor(errors: ValidationErrorDetail[]) {
    super('Validation failed', 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    this.errors = errors;
  }

  static fromField(field: string, message: string): ValidationError {
    return new ValidationError([{ field, message }]);
  }
}
```

- [ ] **Step 6: Create Logger**

```typescript
// packages/shared/src/utils/logger.ts

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private context: string;
  private level: LogLevel;

  constructor(context: string, level: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.level = level;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`[${this.context}] DEBUG:`, message, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(`[${this.context}] INFO:`, message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[${this.context}] WARN:`, message, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[${this.context}] ERROR:`, message, ...args);
    }
  }

  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`, this.level);
  }
}

export function createLogger(context: string, level?: LogLevel): Logger {
  return new Logger(context, level);
}
```

- [ ] **Step 7: Create OrionConfig**

```typescript
// packages/shared/src/config/OrionConfig.ts

export interface ProviderConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'gemini' | 'openrouter' | 'azure';
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export interface AgentModelConfig {
  planner?: string;
  architect?: string;
  backend?: string;
  database?: string;
  frontend?: string;
  documentation?: string;
  qa?: string;
  reviewer?: string;
  devops?: string;
  security?: string;
  performance?: string;
  git?: string;
}

export interface OrionConfig {
  provider: ProviderConfig['provider'];
  apiKey?: string;
  model?: string;
  reviewer?: string;
  parallelAgents: number;
  defaultBranch: string;
  architecture: 'ddd' | 'clean' | 'mvc' | 'hexagonal';
  agentModels?: AgentModelConfig;
  plugins?: string[];
}
```

- [ ] **Step 8: Create ConfigLoader**

```typescript
// packages/shared/src/config/ConfigLoader.ts

import { OrionConfig } from './OrionConfig.js';

const DEFAULT_CONFIG: OrionConfig = {
  provider: 'anthropic',
  parallelAgents: 4,
  defaultBranch: 'development',
  architecture: 'ddd',
};

export function loadConfig(overrides?: Partial<OrionConfig>): OrionConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
  };
}

export function validateConfig(config: OrionConfig): string[] {
  const errors: string[] = [];

  if (config.parallelAgents < 1 || config.parallelAgents > 20) {
    errors.push('parallelAgents must be between 1 and 20');
  }

  if (!config.defaultBranch) {
    errors.push('defaultBranch is required');
  }

  return errors;
}
```

- [ ] **Step 9: Create index.ts barrel export**

```typescript
// packages/shared/src/index.ts

export { Result } from './types/Result.js';
export type { Result as ResultType } from './types/Result.js';

export { AppError } from './errors/AppError.js';
export { ValidationError } from './errors/ValidationError.js';
export type { ValidationErrorDetail } from './errors/ValidationError.js';

export { Logger, createLogger, LogLevel } from './utils/logger.js';

export type {
  OrionConfig,
  ProviderConfig,
  AgentModelConfig,
} from './config/OrionConfig.js';
export { loadConfig, validateConfig } from './config/ConfigLoader.js';
```

- [ ] **Step 10: Commit**

```bash
git add packages/shared/
git commit -m "feat: create @orion/shared package with Result, errors, logger, config"
```

---

### Task 3: Domain Package

**Covers:** S4, S5

**Files:**
- Create: `packages/domain/package.json`
- Create: `packages/domain/tsconfig.json`
- Create: `packages/domain/src/index.ts`
- Create: `packages/domain/src/entities/Agent.ts`
- Create: `packages/domain/src/entities/Task.ts`
- Create: `packages/domain/src/entities/Project.ts`
- Create: `packages/domain/src/value-objects/TaskId.ts`
- Create: `packages/domain/src/value-objects/AgentStatus.ts`
- Create: `packages/domain/src/value-objects/TaskStatus.ts`
- Create: `packages/domain/src/repositories/IAgentRepository.ts`
- Create: `packages/domain/src/repositories/ITaskRepository.ts`
- Create: `packages/domain/src/events/TaskCompleted.ts`

**Interfaces:**
- Consumes: `Result`, `AppError` from `@orion/shared`
- Produces:
  - `Agent` - Agent entity
  - `Task` - Task entity
  - `Project` - Project entity
  - `TaskId` - Value object
  - `AgentStatus` - Value object
  - `TaskStatus` - Value object
  - `IAgentRepository` - Repository interface
  - `ITaskRepository` - Repository interface
  - `TaskCompletedEvent` - Domain event

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@orion/domain",
  "version": "0.1.0",
  "description": "Camada de domínio do Orion Code",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "eslint src --ext .ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@orion/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "vitest": "^1.2.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create TaskId value object**

```typescript
// packages/domain/src/value-objects/TaskId.ts

import { randomUUID } from 'crypto';

export class TaskId {
  private constructor(private readonly value: string) {}

  static create(): TaskId {
    return new TaskId(randomUUID());
  }

  static from(value: string): TaskId {
    return new TaskId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: TaskId): boolean {
    return this.value === other.value;
  }
}
```

- [ ] **Step 4: Create AgentStatus value object**

```typescript
// packages/domain/src/value-objects/AgentStatus.ts

export type AgentStatusValue = 'idle' | 'running' | 'waiting' | 'failed' | 'completed';

export class AgentStatus {
  private constructor(private readonly value: AgentStatusValue) {}

  static idle(): AgentStatus {
    return new AgentStatus('idle');
  }

  static running(): AgentStatus {
    return new AgentStatus('running');
  }

  static waiting(): AgentStatus {
    return new AgentStatus('waiting');
  }

  static failed(): AgentStatus {
    return new AgentStatus('failed');
  }

  static completed(): AgentStatus {
    return new AgentStatus('completed');
  }

  isRunning(): boolean {
    return this.value === 'running';
  }

  isIdle(): boolean {
    return this.value === 'idle';
  }

  isTerminal(): boolean {
    return this.value === 'completed' || this.value === 'failed';
  }

  toString(): AgentStatusValue {
    return this.value;
  }

  equals(other: AgentStatus): boolean {
    return this.value === other.value;
  }
}
```

- [ ] **Step 5: Create TaskStatus value object**

```typescript
// packages/domain/src/value-objects/TaskStatus.ts

export type TaskStatusValue =
  | 'pending'
  | 'planning'
  | 'running'
  | 'waiting'
  | 'review'
  | 'testing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export class TaskStatus {
  private constructor(private readonly value: TaskStatusValue) {}

  static pending(): TaskStatus {
    return new TaskStatus('pending');
  }

  static planning(): TaskStatus {
    return new TaskStatus('planning');
  }

  static running(): TaskStatus {
    return new TaskStatus('running');
  }

  static waiting(): TaskStatus {
    return new TaskStatus('waiting');
  }

  static review(): TaskStatus {
    return new TaskStatus('review');
  }

  static testing(): TaskStatus {
    return new TaskStatus('testing');
  }

  static completed(): TaskStatus {
    return new TaskStatus('completed');
  }

  static failed(): TaskStatus {
    return new TaskStatus('failed');
  }

  static cancelled(): TaskStatus {
    return new TaskStatus('cancelled');
  }

  isPending(): boolean {
    return this.value === 'pending';
  }

  isRunning(): boolean {
    return this.value === 'running';
  }

  isTerminal(): boolean {
    return this.value === 'completed' || this.value === 'failed' || this.value === 'cancelled';
  }

  toString(): TaskStatusValue {
    return this.value;
  }

  equals(other: TaskStatus): boolean {
    return this.value === other.value;
  }
}
```

- [ ] **Step 6: Create Task entity**

```typescript
// packages/domain/src/entities/Task.ts

import { TaskId } from '../value-objects/TaskId.js';
import { TaskStatus } from '../value-objects/TaskStatus.js';

export interface TaskProps {
  id: TaskId;
  title: string;
  description: string;
  status: TaskStatus;
  dependencies: TaskId[];
  assignedAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Task {
  private constructor(private props: TaskProps) {}

  static create(title: string, description: string): Task {
    const now = new Date();
    return new Task({
      id: TaskId.create(),
      title,
      description,
      status: TaskStatus.pending(),
      dependencies: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: TaskProps): Task {
    return new Task(props);
  }

  get id(): TaskId {
    return this.props.id;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string {
    return this.props.description;
  }

  get status(): TaskStatus {
    return this.props.status;
  }

  get dependencies(): TaskId[] {
    return this.props.dependencies;
  }

  get assignedAgent(): string | undefined {
    return this.props.assignedAgent;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  start(): void {
    if (!this.props.status.isPending()) {
      throw new Error('Cannot start a task that is not pending');
    }
    this.props.status = TaskStatus.running();
    this.props.updatedAt = new Date();
  }

  complete(): void {
    if (!this.props.status.isRunning()) {
      throw new Error('Cannot complete a task that is not running');
    }
    this.props.status = TaskStatus.completed();
    this.props.updatedAt = new Date();
  }

  fail(): void {
    this.props.status = TaskStatus.failed();
    this.props.updatedAt = new Date();
  }

  assignTo(agentName: string): void {
    this.props.assignedAgent = agentName;
    this.props.updatedAt = new Date();
  }

  addDependency(taskId: TaskId): void {
    if (!this.props.dependencies.some((d) => d.equals(taskId))) {
      this.props.dependencies.push(taskId);
      this.props.updatedAt = new Date();
    }
  }
}
```

- [ ] **Step 7: Create Agent entity**

```typescript
// packages/domain/src/entities/Agent.ts

import { AgentStatus } from '../value-objects/AgentStatus.js';
import { Task } from './Task.js';

export interface AgentProps {
  name: string;
  type: 'planner' | 'architect' | 'backend' | 'database' | 'frontend' | 'documentation' | 'qa' | 'devops' | 'security' | 'performance' | 'reviewer' | 'git';
  status: AgentStatus;
  currentTask?: Task;
  permissions: string[];
}

export class Agent {
  private constructor(private props: AgentProps) {}

  static create(name: string, type: AgentProps['type'], permissions: string[]): Agent {
    return new Agent({
      name,
      type,
      status: AgentStatus.idle(),
      permissions,
    });
  }

  get name(): string {
    return this.props.name;
  }

  get type(): AgentProps['type'] {
    return this.props.type;
  }

  get status(): AgentStatus {
    return this.props.status;
  }

  get currentTask(): Task | undefined {
    return this.props.currentTask;
  }

  get permissions(): string[] {
    return [...this.props.permissions];
  }

  assignTask(task: Task): void {
    if (!this.props.status.isIdle()) {
      throw new Error('Agent is not idle');
    }
    this.props.currentTask = task;
    this.props.status = AgentStatus.running();
  }

  completeTask(): void {
    if (!this.props.status.isRunning()) {
      throw new Error('Agent is not running');
    }
    this.props.currentTask = undefined;
    this.props.status = AgentStatus.completed();
  }

  reset(): void {
    this.props.currentTask = undefined;
    this.props.status = AgentStatus.idle();
  }

  canAccess(path: string): boolean {
    return this.props.permissions.some((p) => path.startsWith(p));
  }
}
```

- [ ] **Step 8: Create Project entity**

```typescript
// packages/domain/src/entities/Project.ts

export interface ProjectAnalysis {
  language: string;
  framework: string;
  architecture: string;
  database: string;
  orm: string;
  queue?: string;
  cache?: string;
  testing: string;
  cicd?: string;
  docker: boolean;
  structure: string[];
}

export interface ProjectProps {
  name: string;
  rootPath: string;
  analysis?: ProjectAnalysis;
}

export class Project {
  private constructor(private props: ProjectProps) {}

  static create(name: string, rootPath: string): Project {
    return new Project({ name, rootPath });
  }

  get name(): string {
    return this.props.name;
  }

  get rootPath(): string {
    return this.props.rootPath;
  }

  get analysis(): ProjectAnalysis | undefined {
    return this.props.analysis;
  }

  setAnalysis(analysis: ProjectAnalysis): void {
    this.props.analysis = analysis;
  }
}
```

- [ ] **Step 9: Create IAgentRepository**

```typescript
// packages/domain/src/repositories/IAgentRepository.ts

import { Agent } from '../entities/Agent.js';

export interface IAgentRepository {
  findByName(name: string): Promise<Agent | null>;
  findAll(): Promise<Agent[]>;
  save(agent: Agent): Promise<void>;
  delete(name: string): Promise<void>;
}
```

- [ ] **Step 10: Create ITaskRepository**

```typescript
// packages/domain/src/repositories/ITaskRepository.ts

import { Task } from '../entities/Task.js';
import { TaskId } from '../value-objects/TaskId.js';

export interface ITaskRepository {
  findById(id: TaskId): Promise<Task | null>;
  findAll(): Promise<Task[]>;
  findByStatus(status: string): Promise<Task[]>;
  save(task: Task): Promise<void>;
  delete(id: TaskId): Promise<void>;
}
```

- [ ] **Step 11: Create TaskCompletedEvent**

```typescript
// packages/domain/src/events/TaskCompleted.ts

import { TaskId } from '../value-objects/TaskId.js';

export interface TaskCompletedEvent {
  type: 'TASK_COMPLETED';
  taskId: TaskId;
  taskTitle: string;
  completedAt: Date;
}

export function createTaskCompletedEvent(taskId: TaskId, taskTitle: string): TaskCompletedEvent {
  return {
    type: 'TASK_COMPLETED',
    taskId,
    taskTitle,
    completedAt: new Date(),
  };
}
```

- [ ] **Step 12: Create index.ts barrel export**

```typescript
// packages/domain/src/index.ts

export { Agent } from './entities/Agent.js';
export type { AgentProps } from './entities/Agent.js';

export { Task } from './entities/Task.js';
export type { TaskProps } from './entities/Task.js';

export { Project } from './entities/Project.js';
export type { ProjectProps, ProjectAnalysis } from './entities/Project.js';

export { TaskId } from './value-objects/TaskId.js';
export { AgentStatus } from './value-objects/AgentStatus.js';
export type { AgentStatusValue } from './value-objects/AgentStatus.js';
export { TaskStatus } from './value-objects/TaskStatus.js';
export type { TaskStatusValue } from './value-objects/TaskStatus.js';

export type { IAgentRepository } from './repositories/IAgentRepository.js';
export type { ITaskRepository } from './repositories/ITaskRepository.js';

export { createTaskCompletedEvent } from './events/TaskCompleted.js';
export type { TaskCompletedEvent } from './events/TaskCompleted.js';
```

- [ ] **Step 13: Commit**

```bash
git add packages/domain/
git commit -m "feat: create @orion/domain package with entities, value objects, repositories"
```

---

### Task 4: Application Package

**Covers:** S4, S5

**Files:**
- Create: `packages/application/package.json`
- Create: `packages/application/tsconfig.json`
- Create: `packages/application/src/index.ts`
- Create: `packages/application/src/use-cases/AnalyzeProjectUseCase.ts`
- Create: `packages/application/src/use-cases/PlanUseCase.ts`
- Create: `packages/application/src/use-cases/ImplementUseCase.ts`
- Create: `packages/application/src/dtos/TaskDTO.ts`
- Create: `packages/application/src/dtos/AgentDTO.ts`
- Create: `packages/application/src/ports/IOrchestratorPort.ts`
- Create: `packages/application/src/ports/IAgentExecutorPort.ts`

**Interfaces:**
- Consumes: `Agent`, `Task`, `Project`, `TaskId`, `IAgentRepository`, `ITaskRepository`, `Result`, `AppError`, `Logger`
- Produces:
  - `AnalyzeProjectUseCase` - Analyzes project structure
  - `PlanUseCase` - Creates execution plan
  - `ImplementUseCase` - Orchestrates implementation
  - `IOrchestratorPort` - Orchestrator interface
  - `IAgentExecutorPort` - Agent executor interface

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@orion/application",
  "version": "0.1.0",
  "description": "Casos de uso do Orion Code",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "eslint src --ext .ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@orion/shared": "workspace:*",
    "@orion/domain": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "vitest": "^1.2.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create TaskDTO**

```typescript
// packages/application/src/dtos/TaskDTO.ts

export interface CreateTaskDTO {
  title: string;
  description: string;
  dependencies?: string[];
}

export interface TaskResponseDTO {
  id: string;
  title: string;
  description: string;
  status: string;
  dependencies: string[];
  assignedAgent?: string;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 4: Create AgentDTO**

```typescript
// packages/application/src/dtos/AgentDTO.ts

export interface CreateAgentDTO {
  name: string;
  type: string;
  permissions: string[];
}

export interface AgentResponseDTO {
  name: string;
  type: string;
  status: string;
  currentTask?: string;
}
```

- [ ] **Step 5: Create IOrchestratorPort**

```typescript
// packages/application/src/ports/IOrchestratorPort.ts

export interface IOrchestratorPort {
  execute(request: string): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  cancel(): Promise<void>;
  getStatus(): Promise<string>;
}
```

- [ ] **Step 6: Create IAgentExecutorPort**

```typescript
// packages/application/src/ports/IAgentExecutorPort.ts

import { Task } from '@orion/domain';

export interface IAgentExecutorPort {
  executeTask(agentName: string, task: Task): Promise<string>;
  getAgentStatus(agentName: string): Promise<string>;
}
```

- [ ] **Step 7: Create AnalyzeProjectUseCase**

```typescript
// packages/application/src/use-cases/AnalyzeProjectUseCase.ts

import { Project, ProjectAnalysis } from '@orion/domain';
import { Result, AppError, Logger } from '@orion/shared';

export interface AnalyzeProjectInput {
  projectPath: string;
}

export interface AnalyzeProjectOutput {
  analysis: ProjectAnalysis;
}

export class AnalyzeProjectUseCase {
  private logger = new Logger('AnalyzeProjectUseCase');

  async execute(input: AnalyzeProjectInput): Promise<Result<AnalyzeProjectOutput, AppError>> {
    this.logger.info(`Analyzing project at: ${input.projectPath}`);

    try {
      const project = Project.create('current', input.projectPath);

      // Analysis logic will be implemented in infrastructure
      const analysis: ProjectAnalysis = {
        language: 'typescript',
        framework: 'unknown',
        architecture: 'unknown',
        database: 'none',
        orm: 'none',
        testing: 'none',
        docker: false,
        structure: [],
      };

      project.setAnalysis(analysis);

      return Result.ok({ analysis });
    } catch (error) {
      return Result.fail(AppError.internal('Failed to analyze project'));
    }
  }
}
```

- [ ] **Step 8: Create PlanUseCase**

```typescript
// packages/application/src/use-cases/PlanUseCase.ts

import { Task, TaskId } from '@orion/domain';
import { Result, AppError, Logger } from '@orion/shared';
import { CreateTaskDTO, TaskResponseDTO } from '../dtos/TaskDTO.js';

export interface PlanInput {
  request: string;
  projectContext: string;
}

export interface PlanOutput {
  epic: string;
  tasks: TaskResponseDTO[];
}

export class PlanUseCase {
  private logger = new Logger('PlanUseCase');

  async execute(input: PlanInput): Promise<Result<PlanOutput, AppError>> {
    this.logger.info(`Creating plan for: ${input.request}`);

    try {
      // Plan logic will be implemented with AI provider
      const tasks: Task[] = [];

      const taskDTOs: TaskResponseDTO[] = tasks.map((task) => ({
        id: task.id.toString(),
        title: task.title,
        description: task.description,
        status: task.status.toString(),
        dependencies: task.dependencies.map((d) => d.toString()),
        assignedAgent: task.assignedAgent,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      }));

      return Result.ok({
        epic: input.request,
        tasks: taskDTOs,
      });
    } catch (error) {
      return Result.fail(AppError.internal('Failed to create plan'));
    }
  }
}
```

- [ ] **Step 9: Create ImplementUseCase**

```typescript
// packages/application/src/use-cases/ImplementUseCase.ts

import { Task, TaskId } from '@orion/domain';
import { Result, AppError, Logger } from '@orion/shared';
import { IOrchestratorPort } from '../ports/IOrchestratorPort.js';

export interface ImplementInput {
  request: string;
}

export interface ImplementOutput {
  success: boolean;
  message: string;
}

export class ImplementUseCase {
  private logger = new Logger('ImplementUseCase');

  constructor(private orchestrator: IOrchestratorPort) {}

  async execute(input: ImplementInput): Promise<Result<ImplementOutput, AppError>> {
    this.logger.info(`Implementing: ${input.request}`);

    try {
      await this.orchestrator.execute(input.request);

      return Result.ok({
        success: true,
        message: 'Implementation completed successfully',
      });
    } catch (error) {
      return Result.fail(AppError.internal('Implementation failed'));
    }
  }
}
```

- [ ] **Step 10: Create index.ts barrel export**

```typescript
// packages/application/src/index.ts

export { AnalyzeProjectUseCase } from './use-cases/AnalyzeProjectUseCase.js';
export type { AnalyzeProjectInput, AnalyzeProjectOutput } from './use-cases/AnalyzeProjectUseCase.js';

export { PlanUseCase } from './use-cases/PlanUseCase.js';
export type { PlanInput, PlanOutput } from './use-cases/PlanUseCase.js';

export { ImplementUseCase } from './use-cases/ImplementUseCase.js';
export type { ImplementInput, ImplementOutput } from './use-cases/ImplementUseCase.js';

export type { CreateTaskDTO, TaskResponseDTO } from './dtos/TaskDTO.js';
export type { CreateAgentDTO, AgentResponseDTO } from './dtos/AgentDTO.js';

export type { IOrchestratorPort } from './ports/IOrchestratorPort.js';
export type { IAgentExecutorPort } from './ports/IAgentExecutorPort.js';
```

- [ ] **Step 11: Commit**

```bash
git add packages/application/
git commit -m "feat: create @orion/application package with use cases and ports"
```

---

### Task 5: Infrastructure Package

**Covers:** S4, S5

**Files:**
- Create: `packages/infrastructure/package.json`
- Create: `packages/infrastructure/tsconfig.json`
- Create: `packages/infrastructure/src/index.ts`
- Create: `packages/infrastructure/src/providers/BaseProvider.ts`
- Create: `packages/infrastructure/src/providers/OpenAIProvider.ts`
- Create: `packages/infrastructure/src/providers/AnthropicProvider.ts`
- Create: `packages/infrastructure/src/providers/OllamaProvider.ts`
- Create: `packages/infrastructure/src/filesystem/StateManager.ts`
- Create: `packages/infrastructure/src/filesystem/HistoryManager.ts`
- Create: `packages/infrastructure/src/cache/InMemoryCache.ts`

**Interfaces:**
- Consumes: `Agent`, `Task`, `IAgentRepository`, `ITaskRepository`, `Result`, `AppError`, `Logger`, `OrionConfig`
- Produces:
  - `OpenAIProvider` - OpenAI LLM provider
  - `AnthropicProvider` - Anthropic LLM provider
  - `OllamaProvider` - Ollama LLM provider
  - `StateManager` - State persistence
  - `HistoryManager` - Execution history
  - `InMemoryCache` - Cache implementation

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@orion/infrastructure",
  "version": "0.1.0",
  "description": "Implementações de infraestrutura do Orion Code",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "eslint src --ext .ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@orion/shared": "workspace:*",
    "@orion/domain": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "vitest": "^1.2.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create BaseProvider interface**

```typescript
// packages/infrastructure/src/providers/BaseProvider.ts

export interface LLMResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ILLMProvider {
  name: string;
  chat(messages: LLMMessage[], model?: string): Promise<LLMResponse>;
  isAvailable(): Promise<boolean>;
}
```

- [ ] **Step 4: Create OpenAIProvider**

```typescript
// packages/infrastructure/src/providers/OpenAIProvider.ts

import { ILLMProvider, LLMMessage, LLMResponse } from './BaseProvider.js';

export class OpenAIProvider implements ILLMProvider {
  name = 'openai';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: LLMMessage[], model?: string): Promise<LLMResponse> {
    // Implementation will use OpenAI SDK
    throw new Error('Not implemented');
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }
}
```

- [ ] **Step 5: Create AnthropicProvider**

```typescript
// packages/infrastructure/src/providers/AnthropicProvider.ts

import { ILLMProvider, LLMMessage, LLMResponse } from './BaseProvider.js';

export class AnthropicProvider implements ILLMProvider {
  name = 'anthropic';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: LLMMessage[], model?: string): Promise<LLMResponse> {
    // Implementation will use Anthropic SDK
    throw new Error('Not implemented');
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }
}
```

- [ ] **Step 6: Create OllamaProvider**

```typescript
// packages/infrastructure/src/providers/OllamaProvider.ts

import { ILLMProvider, LLMMessage, LLMResponse } from './BaseProvider.js';

export class OllamaProvider implements ILLMProvider {
  name = 'ollama';
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async chat(messages: LLMMessage[], model?: string): Promise<LLMResponse> {
    // Implementation will use Ollama API
    throw new Error('Not implemented');
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

- [ ] **Step 7: Create StateManager**

```typescript
// packages/infrastructure/src/filesystem/StateManager.ts

import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export class StateManager {
  private stateDir: string;

  constructor(projectRoot: string) {
    this.stateDir = join(projectRoot, '.orion');
  }

  async initialize(): Promise<void> {
    if (!existsSync(this.stateDir)) {
      await mkdir(this.stateDir, { recursive: true });
    }
  }

  async save(key: string, data: unknown): Promise<void> {
    await this.initialize();
    const filePath = join(this.stateDir, `${key}.json`);
    await writeFile(filePath, JSON.stringify(data, null, 2));
  }

  async load<T>(key: string): Promise<T | null> {
    const filePath = join(this.stateDir, `${key}.json`);
    if (!existsSync(filePath)) {
      return null;
    }
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.stateDir, `${key}.json`);
    if (existsSync(filePath)) {
      const { unlink } = await import('fs/promises');
      await unlink(filePath);
    }
  }
}
```

- [ ] **Step 8: Create HistoryManager**

```typescript
// packages/infrastructure/src/filesystem/HistoryManager.ts

import { writeFile, readFile, mkdir, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export interface ExecutionRecord {
  id: string;
  timestamp: string;
  request: string;
  tasks: unknown[];
  status: string;
  duration: number;
}

export class HistoryManager {
  private historyDir: string;

  constructor(projectRoot: string) {
    this.historyDir = join(projectRoot, '.orion', 'history');
  }

  async initialize(): Promise<void> {
    if (!existsSync(this.historyDir)) {
      await mkdir(this.historyDir, { recursive: true });
    }
  }

  async save(record: ExecutionRecord): Promise<void> {
    await this.initialize();
    const filePath = join(this.historyDir, `execution-${record.id}.json`);
    await writeFile(filePath, JSON.stringify(record, null, 2));
  }

  async load(id: string): Promise<ExecutionRecord | null> {
    const filePath = join(this.historyDir, `execution-${id}.json`);
    if (!existsSync(filePath)) {
      return null;
    }
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as ExecutionRecord;
  }

  async list(): Promise<ExecutionRecord[]> {
    if (!existsSync(this.historyDir)) {
      return [];
    }
    const files = await readdir(this.historyDir);
    const records: ExecutionRecord[] = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await readFile(join(this.historyDir, file), 'utf-8');
        records.push(JSON.parse(content) as ExecutionRecord);
      }
    }
    return records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}
```

- [ ] **Step 9: Create InMemoryCache**

```typescript
// packages/infrastructure/src/cache/InMemoryCache.ts

export class InMemoryCache {
  private cache = new Map<string, { value: unknown; expiresAt?: number }>();

  set<T>(key: string, value: T, ttlMs?: number): void {
    const expiresAt = ttlMs ? Date.now() + ttlMs : undefined;
    this.cache.set(key, { value, expiresAt });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}
```

- [ ] **Step 10: Create index.ts barrel export**

```typescript
// packages/infrastructure/src/index.ts

export type { ILLMProvider, LLMMessage, LLMResponse } from './providers/BaseProvider.js';
export { OpenAIProvider } from './providers/OpenAIProvider.js';
export { AnthropicProvider } from './providers/AnthropicProvider.js';
export { OllamaProvider } from './providers/OllamaProvider.js';

export { StateManager } from './filesystem/StateManager.js';
export { HistoryManager } from './filesystem/HistoryManager.js';
export type { ExecutionRecord } from './filesystem/HistoryManager.js';

export { InMemoryCache } from './cache/InMemoryCache.js';
```

- [ ] **Step 11: Commit**

```bash
git add packages/infrastructure/
git commit -m "feat: create @orion/infrastructure package with providers, state, cache"
```

---

### Task 6: Backend App

**Covers:** S3, S5

**Files:**
- Create: `apps/backend/package.json`
- Create: `apps/backend/tsconfig.json`
- Create: `apps/backend/src/index.ts`
- Create: `apps/backend/src/cli.ts`
- Create: `apps/backend/src/commands/init.ts`
- Create: `apps/backend/src/commands/implement.ts`
- Create: `apps/backend/src/commands/review.ts`
- Create: `apps/backend/src/commands/test.ts`
- Create: `apps/backend/src/commands/docs.ts`
- Create: `apps/backend/src/commands/release.ts`

**Interfaces:**
- Consumes: All packages (`@orion/shared`, `@orion/domain`, `@orion/application`, `@orion/infrastructure`)
- Produces: Backend binary `orion`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@orion/backend",
  "version": "0.1.0",
  "description": "Backend principal do Orion",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "orion": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/cli.ts",
    "lint": "eslint src --ext .ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@orion/shared": "workspace:*",
    "@orion/domain": "workspace:*",
    "@orion/application": "workspace:*",
    "@orion/infrastructure": "workspace:*",
    "commander": "^12.0.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.0",
    "inquirer": "^9.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "tsx": "^4.7.0",
    "vitest": "^1.2.0",
    "typescript": "^5.4.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create TUI entry point**

```typescript
// apps/backend/src/cli.ts

#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { implementCommand } from './commands/implement.js';
import { reviewCommand } from './commands/review.js';
import { testCommand } from './commands/test.js';
import { docsCommand } from './commands/docs.js';
import { releaseCommand } from './commands/release.js';

const program = new Command();

program
  .name('orion')
  .description('Multi-Agent TUI - Orquestrador Inteligente de Agentes de IA')
  .version('0.1.0');

program.addCommand(initCommand);
program.addCommand(implementCommand);
program.addCommand(reviewCommand);
program.addCommand(testCommand);
program.addCommand(docsCommand);
program.addCommand(releaseCommand);

program.parse();
```

- [ ] **Step 4: Create init command**

```typescript
// apps/backend/src/commands/init.ts

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

export const initCommand = new Command('init')
  .description('Inicializar Orion no projeto atual')
  .action(async () => {
    const spinner = ora('Analisando projeto...').start();

    try {
      // Analysis logic
      spinner.succeed('Projeto analisado com sucesso');
      console.log(chalk.green('Orion inicializado!'));
    } catch (error) {
      spinner.fail('Falha ao inicializar');
      console.error(chalk.red('Erro:'), error);
      process.exit(1);
    }
  });
```

- [ ] **Step 5: Create implement command**

```typescript
// apps/backend/src/commands/implement.ts

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

export const implementCommand = new Command('implement')
  .description('Implementar funcionalidade usando agentes')
  .argument('<request>', 'Descrição da funcionalidade')
  .action(async (request: string) => {
    const spinner = ora('Planejando implementação...').start();

    try {
      // Implementation logic
      spinner.succeed('Implementação concluída');
      console.log(chalk.green('Funcionalidade implementada!'));
    } catch (error) {
      spinner.fail('Falha na implementação');
      console.error(chalk.red('Erro:'), error);
      process.exit(1);
    }
  });
```

- [ ] **Step 6: Create review command**

```typescript
// apps/backend/src/commands/review.ts

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

export const reviewCommand = new Command('review')
  .description('Revisar código do projeto')
  .action(async () => {
    const spinner = ora('Iniciando revisão...').start();

    try {
      // Review logic
      spinner.succeed('Revisão concluída');
      console.log(chalk.green('Revisão finalizada!'));
    } catch (error) {
      spinner.fail('Falha na revisão');
      console.error(chalk.red('Erro:'), error);
      process.exit(1);
    }
  });
```

- [ ] **Step 7: Create test command**

```typescript
// apps/backend/src/commands/test.ts

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

export const testCommand = new Command('test')
  .description('Executar testes do projeto')
  .action(async () => {
    const spinner = ora('Executando testes...').start();

    try {
      // Test logic
      spinner.succeed('Testes concluídos');
      console.log(chalk.green('Todos os testes passaram!'));
    } catch (error) {
      spinner.fail('Falha nos testes');
      console.error(chalk.red('Erro:'), error);
      process.exit(1);
    }
  });
```

- [ ] **Step 8: Create docs command**

```typescript
// apps/backend/src/commands/docs.ts

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

export const docsCommand = new Command('docs')
  .description('Gerar documentação do projeto')
  .action(async () => {
    const spinner = ora('Gerando documentação...').start();

    try {
      // Documentation logic
      spinner.succeed('Documentação gerada');
      console.log(chalk.green('Documentação atualizada!'));
    } catch (error) {
      spinner.fail('Falha ao gerar documentação');
      console.error(chalk.red('Erro:'), error);
      process.exit(1);
    }
  });
```

- [ ] **Step 9: Create release command**

```typescript
// apps/backend/src/commands/release.ts

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

export const releaseCommand = new Command('release')
  .description('Criar release com changelog e PR')
  .action(async () => {
    const spinner = ora('Preparando release...').start();

    try {
      // Release logic
      spinner.succeed('Release criada');
      console.log(chalk.green('Release pronta!'));
    } catch (error) {
      spinner.fail('Falha ao criar release');
      console.error(chalk.red('Erro:'), error);
      process.exit(1);
    }
  });
```

- [ ] **Step 10: Create index.ts barrel export**

```typescript
// apps/backend/src/index.ts

export { initCommand } from './commands/init.js';
export { implementCommand } from './commands/implement.js';
export { reviewCommand } from './commands/review.js';
export { testCommand } from './commands/test.js';
export { docsCommand } from './commands/docs.js';
export { releaseCommand } from './commands/release.js';
```

- [ ] **Step 11: Commit**

```bash
git add apps/backend/
git commit -m "feat: create @orion/backend with commander.js commands"
```

---

### Task 7: Frontend App (TUI)

**Covers:** S3, S5

**Files:**
- Create: `apps/frontend/package.json`
- Create: `apps/frontend/tsconfig.json`
- Create: `apps/frontend/src/index.ts`
- Create: `apps/frontend/src/App.tsx`
- Create: `apps/frontend/src/components/StatusBar.tsx`
- Create: `apps/frontend/src/components/TaskList.tsx`
- Create: `apps/frontend/src/components/AgentPanel.tsx`

**Interfaces:**
- Consumes: `@orion/shared`, `@orion/domain`
- Produces: TUI interface using Ink

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@orion/frontend",
  "version": "0.1.0",
  "description": "Interface TUI do Orion",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.tsx",
    "lint": "eslint src --ext .tsx",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@orion/shared": "workspace:*",
    "@orion/domain": "workspace:*",
    "ink": "^4.1.0",
    "react": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.0",
    "tsx": "^4.7.0",
    "vitest": "^1.2.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create StatusBar component**

```tsx
// apps/frontend/src/components/StatusBar.tsx

import React from 'react';
import { Box, Text } from 'ink';

interface StatusBarProps {
  status: string;
  currentAgent?: string;
  progress?: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({ status, currentAgent, progress }) => {
  return (
    <Box borderStyle="single" padding={1}>
      <Text>
        Status: <Text bold>{status}</Text>
        {currentAgent && <> | Agent: <Text color="cyan">{currentAgent}</Text></>}
        {progress !== undefined && <> | Progress: <Text color="green">{progress}%</Text></>}
      </Text>
    </Box>
  );
};
```

- [ ] **Step 4: Create TaskList component**

```tsx
// apps/frontend/src/components/TaskList.tsx

import React from 'react';
import { Box, Text } from 'ink';

interface Task {
  id: string;
  title: string;
  status: string;
  assignedAgent?: string;
}

interface TaskListProps {
  tasks: Task[];
}

export const TaskList: React.FC<TaskListProps> = ({ tasks }) => {
  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'running': return '⏳';
      case 'pending': return '⬜';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  return (
    <Box flexDirection="column" borderStyle="single" padding={1}>
      <Text bold>Tasks:</Text>
      {tasks.map((task) => (
        <Text key={task.id}>
          {statusIcon(task.status)} {task.title}
          {task.assignedAgent && <Text color="cyan"> [{task.assignedAgent}]</Text>}
        </Text>
      ))}
    </Box>
  );
};
```

- [ ] **Step 5: Create AgentPanel component**

```tsx
// apps/frontend/src/components/AgentPanel.tsx

import React from 'react';
import { Box, Text } from 'ink';

interface Agent {
  name: string;
  type: string;
  status: string;
  currentTask?: string;
}

interface AgentPanelProps {
  agents: Agent[];
}

export const AgentPanel: React.FC<AgentPanelProps> = ({ agents }) => {
  const statusColor = (status: string) => {
    switch (status) {
      case 'running': return 'yellow';
      case 'idle': return 'green';
      case 'failed': return 'red';
      default: return 'white';
    }
  };

  return (
    <Box flexDirection="column" borderStyle="single" padding={1}>
      <Text bold>Agents:</Text>
      {agents.map((agent) => (
        <Text key={agent.name}>
          <Text color={statusColor(agent.status)}>●</Text>{' '}
          {agent.name} ({agent.type})
          {agent.currentTask && <Text color="cyan"> → {agent.currentTask}</Text>}
        </Text>
      ))}
    </Box>
  );
};
```

- [ ] **Step 6: Create App component**

```tsx
// apps/frontend/src/App.tsx

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { StatusBar } from './components/StatusBar.js';
import { TaskList } from './components/TaskList.js';
import { AgentPanel } from './components/AgentPanel.js';

interface AppProps {
  request?: string;
}

export const App: React.FC<AppProps> = ({ request }) => {
  const [status, setStatus] = useState('idle');
  const [tasks, setTasks] = useState([]);
  const [agents, setAgents] = useState([]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        ════════════════════════════════════════
      </Text>
      <Text bold color="cyan">
        Orion Code - Multi-Agent Orchestrator
      </Text>
      <Text bold color="cyan">
        ════════════════════════════════════════
      </Text>

      {request && (
        <Box marginTop={1}>
          <Text>Request: <Text bold>{request}</Text></Text>
        </Box>
      )}

      <Box marginTop={1}>
        <StatusBar status={status} />
      </Box>

      <Box marginTop={1}>
        <TaskList tasks={tasks} />
      </Box>

      <Box marginTop={1}>
        <AgentPanel agents={agents} />
      </Box>
    </Box>
  );
};
```

- [ ] **Step 7: Create index.ts entry point**

```tsx
// apps/frontend/src/index.tsx

import React from 'react';
import { render } from 'ink';
import { App } from './App.js';

const args = process.argv.slice(2);
const request = args.join(' ');

render(<App request={request} />);
```

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/
git commit -m "feat: create @orion/frontend TUI with Ink and React components"
```

---

### Task 8: Install Dependencies and Verify Build

**Covers:** S3, S8

**Files:**
- Modify: All package.json files (dependencies installed)

- [ ] **Step 1: Install root dependencies**

```bash
npm install
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
npm run typecheck
```

Expected: No errors

- [ ] **Step 3: Build all packages**

```bash
npm run build
```

Expected: All packages compiled successfully

- [ ] **Step 4: Run linting**

```bash
npm run lint
```

Expected: No errors (warnings acceptable)

- [ ] **Step 5: Run tests**

```bash
npm run test
```

Expected: All tests pass

- [ ] **Step 6: Test TUI binary**

```bash
npx orion --help
```

Expected: Help message displayed

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: install dependencies and verify build"
```
