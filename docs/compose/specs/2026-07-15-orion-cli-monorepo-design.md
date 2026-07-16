# Orion TUI - Design Specification

## [S1] Problem

Build a multi-agent TUI that acts as a virtual Tech Lead, orchestrating specialized agents for software development. The TUI must be modular, extensible, and follow DDD and Clean Architecture principles.

## [S2] Solution Overview

Monorepo with clear separation between applications (`apps/`) and shared packages (`packages/`). Each DDD layer is an independent package with unidirectional dependencies.

## [S3] Architecture

### Folder Structure

```
orion-cli/
├── apps/
│   ├── backend/                  # Main Backend + API server
│   │   ├── src/
│   │   │   ├── cli.ts           # Entry point TUI
│   │   │   ├── server.ts        # Entry point API
│   │   │   └── commands/        # Commander.js commands
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── frontend/                 # TUI interface (Ink/React)
│       ├── src/
│       │   ├── App.tsx
│       │   └── components/
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── domain/                   # Domain layer (pure)
│   │   ├── src/
│   │   │   ├── entities/        # Agent, Task, Project, etc.
│   │   │   ├── value-objects/   # TaskId, AgentStatus, etc.
│   │   │   ├── repositories/    # Interfaces (IAgentRepo, ITaskRepo)
│   │   │   └── events/          # Domain events
│   │   ├── package.json
│   │   └── tsconfig.json
│
│   ├── application/              # Use cases
│   │   ├── src/
│   │   │   ├── use-cases/       # ImplementUseCase, ReviewUseCase, etc.
│   │   │   ├── dtos/            # Input/Output DTOs
│   │   │   └── ports/           # Input interfaces
│   │   ├── package.json
│   │   └── tsconfig.json
│
│   ├── infrastructure/           # Concrete implementations
│   │   ├── src/
│   │   │   ├── database/        # Repositories, ORM, migrations
│   │   │   ├── providers/       # OpenAI, Anthropic, Ollama, etc.
│   │   │   ├── cache/           # Redis, in-memory
│   │   │   ├── queue/           # BullMQ, etc.
│   │   │   └── filesystem/      # State, history, config
│   │   ├── package.json
│   │   └── tsconfig.json
│
│   └── shared/                   # Shared utilities
│       ├── src/
│       │   ├── errors/          # Custom errors
│       │   ├── types/           # Generic types
│       │   ├── utils/           # Helpers
│       │   └── config/          # Config loader
│       ├── package.json
│       └── tsconfig.json
│
├── package.json                  # Root workspace
├── turbo.json                    # Turborepo pipeline
├── tsconfig.base.json            # TS config base
├── .eslintrc.cjs                 # Lint config
├── .prettierrc                   # Format config
├── PROJECT.md
└── AGENTS.md
```

### Package Dependencies

```
shared (zero deps)
    ↑
domain (depends on shared)
    ↑
application (depends on domain + shared)
    ↑
infrastructure (depends on domain + shared)
    ↑
apps (depends on application + infrastructure)
```

### Dependency Rules

- `domain` NEVER depends on `application` or `infrastructure`
- `application` defines interfaces; `infrastructure` implements
- `shared` does not depend on any other package
- `apps` orchestrates everything but does not expose business logic

## [S4] Components

### Domain Layer (`packages/domain`)

**Responsibility:** Entities, Value Objects, repository interfaces.

**Dependencies:** Only `shared`.

**Contents:**
- `entities/Agent.ts` - Agent entity
- `entities/Task.ts` - Task entity
- `entities/Project.ts` - Project entity
- `entities/Workflow.ts` - Execution DAG
- `value-objects/TaskId.ts` - Generated ID
- `value-objects/AgentStatus.ts` - Agent state
- `value-objects/TaskStatus.ts` - Task state
- `repositories/IAgentRepository.ts` - Interface
- `repositories/ITaskRepository.ts` - Interface
- `repositories/IProjectRepository.ts` - Interface
- `events/TaskCompleted.ts` - Domain event

### Application Layer (`packages/application`)

**Responsibility:** Use cases, orchestration, DTOs.

**Dependencies:** `domain`, `shared`.

**Contents:**
- `use-cases/ImplementUseCase.ts` - Orchestrate implementation
- `use-cases/ReviewUseCase.ts` - Orchestrate review
- `use-cases/PlanUseCase.ts` - Orchestrate planning
- `use-cases/AnalyzeProjectUseCase.ts` - Analyze project
- `dtos/TaskDTO.ts` - Task DTOs
- `dtos/AgentDTO.ts` - Agent DTOs
- `ports/IOrchestratorPort.ts` - Orchestrator interface
- `ports/IAgentExecutorPort.ts` - Execution interface

### Infrastructure Layer (`packages/infrastructure`)

**Responsibility:** Concrete implementations.

**Dependencies:** `domain`, `shared`.

**Contents:**
- `database/PrismaAgentRepository.ts`
- `database/PrismaTaskRepository.ts`
- `providers/OpenAIProvider.ts`
- `providers/AnthropicProvider.ts`
- `providers/OllamaProvider.ts`
- `cache/RedisCache.ts`
- `cache/InMemoryCache.ts`
- `filesystem/StateManager.ts`
- `filesystem/HistoryManager.ts`

### Shared Layer (`packages/shared`)

**Responsibility:** Utilities, types, errors.

**Dependencies:** None.

**Contents:**
- `errors/AppError.ts`
- `errors/ValidationError.ts`
- `types/Result.ts` - Result type (success/error)
- `utils/logger.ts`
- `config/OrionConfig.ts`
- `config/ConfigLoader.ts`

## [S5] Data Flow

```
User → TUI Command → Application Use Case → Domain Logic → Infrastructure
                              ↓
                        Orchestrator
                              ↓
                    ┌─────────┼─────────┐
                    ↓         ↓         ↓
                Agent A   Agent B   Agent C
                    ↓         ↓         ↓
                    └─────────┼─────────┘
                              ↓
                         Reviewer
                              ↓
                         Git Agent
                              ↓
                          PR Created
```

## [S6] Error Handling

- **Domain:** Business errors (TaskAlreadyCompleted, InvalidAgentStatus)
- **Application:** Orchestration errors (AgentTimeout, DependencyCycle)
- **Infrastructure:** Technical errors (ConnectionFailed, ProviderError)
- **Shared:** Result type for operations that can fail

## [S7] Testing Strategy

- **Domain:** Unit tests (100% coverage)
- **Application:** Unit tests with mocks
- **Infrastructure:** Integration tests
- **Apps:** E2E tests

## [S8] Tech Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript 5.4+ |
| Runtime | Node.js 18+ |
| Module System | ESM |
| Monorepo | npm workspaces + Turborepo |
| CLI Framework | Commander.js (backend) |
| TUI | Ink (React for TUI) |
| Testing | Vitest |
| Linting | ESLint + Prettier |
| Build | tsc |
| ORM | Prisma (optional) |
| Cache | Redis + in-memory |
| Providers | OpenAI, Anthropic, Ollama |

## [S9] Plugin System

Plugins are packages that add:
- Specialized prompts
- Specialized tools
- Ready-made templates
- Pattern detectors
- Additional commands

Plugin structure:
```
plugins/
├── fastify/
│   ├── package.json
│   ├── prompts/
│   ├── tools/
│   └── templates/
```

## [S10] Configuration

File `orion.config.ts` in the project root:
```ts
export default {
  provider: "anthropic",
  reviewer: "gpt-5.5",
  parallelAgents: 6,
  defaultBranch: "development",
  architecture: "ddd"
}
```
