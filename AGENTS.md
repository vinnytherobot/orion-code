# Orion TUI - Agents

> Complete guide to the specialized agents in the multi-agent system.

## Philosophy

The TUI is not an agent. It is an **orchestrator**. Each agent is a specialist in only one responsibility. This brings the workflow closer to a real engineering team.

---

## Agent Hierarchy

```
Orchestrator
    │
    ├── Planner Agent (planning)
    │
    ├── Architect Agent (architecture)
    │
    ├── Implementation Agents
    │   ├── Backend Agent
    │   ├── Database Agent
    │   └── Frontend Agent
    │
    ├── Quality Agents
    │   ├── QA Agent
    │   ├── Reviewer Agent
    │   └── Security Agent
    │
    ├── Infrastructure Agents
    │   ├── DevOps Agent
    │   └── Performance Agent
    │
    ├── Documentation Agents
    │   └── Documentation Agent
    │
    └── Git Agent
```

---

## Agents

### Planner Agent

**Responsibility:** Planning and task breakdown.

**Does not:** Write code.

**Functions:**
- Receive user requests
- Analyze scope and complexity
- Break down into smaller, manageable tasks
- Define task dependencies
- Create execution plan

**Example output:**
```
Epic: Authentication

Tasks:
1. Create User entity
2. Create Repository
3. Create JWT
4. Create Refresh Token
5. Create Middleware
6. Create Routes
7. Create Tests
8. Update Documentation
```

---

### Architect Agent

**Responsibility:** Architecture and technical decisions.

**Functions:**
- Define project architecture
- Make technical decisions
- Establish standards
- Organize folder structure
- Ensure architectural consistency

---

### Backend Agent

**Responsibility:** Business logic and backend implementation.

**Functions:**
- Implement business rules
- Create use cases
- Create controllers
- Create services
- Follow DDD principles

**Permissions:**
- ✅ `src/`
- ❌ `docker/`
- ❌ `.github/`

---

### Database Agent

**Responsibility:** Data persistence and modeling.

**Functions:**
- Create schemas (Prisma, TypeORM, Drizzle)
- Create migrations
- Create indexes
- Create seeds
- Optimize queries

---

### Frontend Agent

**Responsibility:** User interface.

**Functions:**
- Create components
- Implement layouts
- Integrate with APIs
- Follow design patterns

---

### Documentation Agent

**Responsibility:** Project documentation.

**Functions:**
- Update README
- Create/update Swagger/OpenAPI
- Configure Scalar
- Create usage examples
- Update changelog
- Generate API documentation

---

### QA Agent

**Responsibility:** Quality assurance.

**Functions:**
- Create unit tests
- Create integration tests
- Create e2e tests
- Validate code coverage
- Identify edge cases

---

### Reviewer Agent

**Responsibility:** Code review.

**Does not:** Implement code.

**Functions:**
- Verify SOLID principles
- Verify Clean Architecture
- Verify DDD patterns
- Verify code style
- Identify bugs
- Identify duplications
- Suggest improvements

---

### DevOps Agent

**Responsibility:** Infrastructure and deployment.

**Functions:**
- Create/update Dockerfile
- Configure CI/CD
- Create GitHub Actions
- Manage containers
- Configure environments

**Permissions:**
- ✅ `docker/`
- ✅ `.github/`
- ❌ `src/domain/`

---

### Security Agent

**Responsibility:** System security.

**Functions:**
- Analyze vulnerabilities
- Detect exposed secrets
- Verify authentication
- Verify authorization
- Suggest security fixes

---

### Performance Agent

**Responsibility:** Performance optimization.

**Functions:**
- Identify slow queries
- Configure cache
- Optimize Redis
- Manage queues
- Identify bottlenecks
- Suggest performance improvements

---

### Git Agent

**Responsibility:** Version control.

**Functions:**
- Create standardized commits
- Generate changelog
- Create Pull Requests
- Generate release notes
- Manage branches

---

## Agent Communication

**Fundamental rule:** Agents never communicate directly.

```
Backend Agent
      │
      ▼
  Orchestrator
      │
      ▼
Database Agent
```

All communication goes through the Orchestrator to avoid inconsistencies.

---

## Parallel Execution

When possible, independent agents run in parallel:

```
Planner
   │
   ▼
Spawn
┌──┴──┐
│     │
Backend Database Documentation
│     │     │
└──┬──┘─────┘
   ▼
Wait
   │
   ▼
Reviewer
```

---

## Permission System

Each agent has specific permissions:

| Agent | Allowed Scope | Blocked Scope |
|-------|---------------|---------------|
| Backend | `src/` | `docker/`, `.github/` |
| Database | `src/infrastructure/database/` | `src/domain/` |
| Frontend | `src/presentation/` | `src/infrastructure/` |
| DevOps | `docker/`, `.github/` | `src/domain/` |
| Documentation | `docs/`, `README.md` | `src/` |

---

## Conflict Resolution

When two agents modify the same file:

1. **Automatic merge** - when possible
2. **Re-execution** - when logic conflict
3. **Reviewer intervention** - when necessary

---

## Task States

Each task goes through states:

```
Pending → Planning → Running → Waiting → Review → Testing → Completed
                      │                                        │
                      └── Failed ──────────────────────────────┘
                      │
                      └── Cancelled
```

---

## Model Selection

Each agent can use a different model:

| Agent | Recommended Model |
|-------|-------------------|
| Planner | GPT-5.5 |
| Backend | Claude |
| Database | Claude |
| Frontend | Claude |
| QA | GPT-5.5 |
| Documentation | Gemini |
| Reviewer | GPT-5.5 |
| DevOps | Claude |
| Security | Claude |
| Performance | Claude |
| Git | Claude |

---

## Plugins

Agents can be extended via plugins:

```
plugins/
├── fastify/
├── nestjs/
├── express/
├── nextjs/
├── react/
├── expo/
├── prisma/
├── typeorm/
├── drizzle/
├── docker/
└── terraform/
```

Each plugin adds:
- Specialized prompts
- Specialized tools
- Ready-made templates
- Pattern detectors
- Additional commands
