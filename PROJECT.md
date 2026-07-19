# Orion Code
## Architecture for an AI Agent Orchestration TUI

> **Objective:** Develop a TUI capable of acting as an intelligent orchestrator of multiple specialized agents, allowing them to collaborate on the same software project in a parallel, organized, and scalable way. The interface must be friendly and easy to use, with clear and objective commands. The system must be able to adapt to different technologies and frameworks, allowing the addition of new agents and tools in a simple and modular way. Additionally, the TUI must have an interface similar to MiMo Code, Claude Code, OpenClaude, opencode, agy, etc.

---

# Overview

The proposal is to create a TUI that functions as a **virtual Tech Lead**, responsible for:

- understanding the user's request;
- analyzing the existing project;
- planning the implementation;
- breaking the work into smaller tasks;
- distributing these tasks to specialized agents;
- coordinating parallel execution;
- reviewing changes;
- integrating all changes;
- generating documentation;
- running tests;
- creating commits and Pull Requests.

The user interacts only with the TUI.

Example:

```bash
orion implement "Add JWT authentication"
```

All complexity happens internally.

---

# Objectives

The TUI must be able to:

- analyze any existing project;
- automatically understand its architecture;
- create an implementation plan;
- execute multiple agents simultaneously;
- share context between agents;
- prevent write conflicts;
- review produced code;
- run tests;
- automatically generate documentation;
- create standardized commits;
- open complete Pull Requests.

---

# Philosophy

The TUI will not be an agent.

It will be an **orchestrator**.

Each agent will be a specialist in only one responsibility.

This brings the workflow closer to a real engineering team.

---

# General Architecture

```
                User
                    │
                    ▼
            Multi-Agent TUI
                    │
                    ▼
              Orchestrator
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
   Planner     Project Analyzer  Memory
       │
       ▼
 Scheduler (DAG)
       │
 ┌─────┼───────────────────────────────┐
 ▼     ▼       ▼        ▼       ▼
Backend Database Frontend DevOps Documentation
 │
 ▼
Reviewer
 │
 ▼
Integration
 │
 ▼
Git Agent
 │
 ▼
Pull Request
```

---

# Components

## TUI

Responsible only for receiving commands.

Example:

```bash
orion init

orion implement

orion review

orion release

orion docs

orion test
```

---

## Orchestrator

It is the brain of the system.

Responsibilities:

- control flow
- start agents
- wait for results
- resolve conflicts
- update memory
- finalize execution

---

## Project Analyzer

Before starting any implementation, the project will be analyzed.

It must automatically identify:

- language
- framework
- architecture
- database
- ORM
- queues
- cache
- tests
- CI/CD
- docker
- folder structure

Example:

```json
{
  "language":"typescript",
  "framework":"fastify",
  "architecture":"DDD",
  "orm":"prisma",
  "database":"postgres",
  "queue":"bullmq",
  "cache":"redis"
}
```

---

## Planner

Receives a request.

Example:

> Implement JWT authentication.

It transforms this into tasks.

Example:

```
Epic

Authentication

Tasks

Create User entity

Create Repository

Create JWT

Create Refresh Token

Create Middleware

Create Routes

Create Tests

Update Documentation
```

---

## Scheduler

Does not execute tasks.

It only builds the dependency flow.

Example:

```
Create User

↓

Repository

↓

Use Cases

↓

Controller

↓

Tests
```

Or in parallel:

```
            Planner

        ┌────┴─────┐

Backend         Database

        └────┬─────┘

          Reviewer
```

---

# DAG

All execution will be based on a directed acyclic graph.

Example:

```
Task A

↓

Task B

↓

Task C
```

or

```
       A

   ┌───┴────┐

   B        C

   │        │

   └───┬────┘

       D
```

Thus only independent tasks will be executed in parallel.

---

# Agents

Each agent will have only one responsibility.

---

## Planner Agent

Specialist in planning.

Does not write code.

Only breaks down tasks.

---

## Architect Agent

Responsible for:

- architecture
- technical decisions
- standards
- organization

---

## Backend Agent

Responsible for:

- business rules
- use cases
- controllers
- services
- DDD

---

## Database Agent

Responsible for:

- Drizzle ORM
- migrations
- schemas
- indexes
- seeds
- query optimization

---

## Frontend Agent

Responsible only for the interface.

---

## Documentation Agent

Updates:

- README
- Swagger/OpenAPI
- Scalar
- examples
- changelog

---

## QA Agent

Creates:

- unit tests
- integration tests
- e2e tests

---

## DevOps Agent

Responsible for:

- Docker
- CI
- CD
- GitHub Actions

---

## Security Agent

Analyzes:

- vulnerabilities
- secrets
- authentication
- authorization

---

## Performance Agent

Analyzes:

- slow queries
- cache
- Redis
- queues
- bottlenecks

---

## Reviewer Agent

Does not implement.

Only reviews.

Verifies:

- SOLID
- Clean Architecture
- DDD
- Code Style
- Bugs
- Duplications

---

## Git Agent

Responsible for:

- commits
- changelog
- PR
- release notes

---

# Shared Memory

All agents will use a common memory.

Example:

```
.state/

project.json

tasks.json

agents.json

decisions.md

architecture.md
```

Each agent can:

- read
- update
- register decisions

Never alter another agent's decisions without Orchestrator authorization.

---

# Communication

Agents will never communicate directly.

All communication will go through the Orchestrator.

```
Backend

↓

Orchestrator

↓

Database
```

This avoids inconsistencies.

---

# Parallel Execution

Whenever possible.

Example:

```
Planner

↓

Spawn

Backend

Database

Documentation

↓

Wait

↓

Reviewer
```

---

# Providers

The TUI will not depend on a single model.

It must support multiple providers.

Example:

- OpenAI
- Anthropic
- Ollama
- Google Gemini
- OpenRouter
- Azure OpenAI

Each agent can use a different provider.

---

# Intelligent Model Selection

Example:

| Agent | Model |
|---------|---------|
| Planner | GPT-5.5 |
| Backend | Claude |
| QA | GPT-5.5 |
| Documentation | Gemini |
| Local Refactoring | Ollama |

---

# Plugin System

The TUI will be extensible.

```
plugins/

fastify

nestjs

express

nextjs

react

expo

prisma

typeorm

drizzle

docker

terraform
```

Each plugin will add:

- prompts
- tools
- templates
- detectors
- commands

---

# Tool System

Each agent can use tools.

Example:

```
Read File

Write File

Search

Git

Terminal

Docker

Prisma

NPM

PNPM

Bun

SQLite

Postgres

Redis
```

Access will be controlled by the Orchestrator.

---

# Permission System

Not all agents will have full access.

Example:

Backend

✅ src/

❌ docker/

❌ .github/

---

DevOps

✅ docker/

✅ github/

❌ src/domain/

---

This reduces conflicts.

---

# Conflicts

If two agents modify the same file:

```
Backend

↓

Orchestrator

↑

Frontend
```

The Orchestrator will decide:

- automatic merge
- re-execution
- Reviewer intervention

---

# States

Each task will have a state.

```
Pending

Planning

Running

Waiting

Review

Testing

Completed

Failed

Cancelled
```

---

# Observability

The TUI must have logs.

Example:

```
Planner

✔ Finished

Backend

Running...

Documentation

Waiting...

Reviewer

Pending
```

---

# History

All execution will be stored.

```
.history/

execution-001

execution-002

execution-003
```

Allowing:

- replay
- audit
- comparison

---

# Git

Expected flow:

```
Create branch

↓

Execute agents

↓

Run tests

↓

Reviewer

↓

Commit

↓

Push

↓

Create PR
```

---

# Pull Request

The TUI must automatically generate:

- summary
- changelog
- checklist
- impact
- tests performed

---

# Configuration

File:

```
orion.config.ts
```

Example:

```ts
export default {

provider: "anthropic",

reviewer: "gpt-5.5",

parallelAgents: 6,

defaultBranch: "development",

architecture: "ddd"

}
```

---

# Project Structure

```
src/

tui/

orchestrator/

scheduler/

planner/

memory/

providers/

agents/

plugins/

git/

tasks/

utils/

config/
```

---

# Roadmap

## Phase 1

- TUI
- basic commands
- project reading
- planner

---

## Phase 2

- Backend Agent
- Database Agent
- Documentation Agent

---

## Phase 3

- parallel execution
- scheduler
- DAG

---

## Phase 4

- Reviewer
- QA
- automatic tests

---

## Phase 5

- Git Agent
- automatic PR
- changelog

---

## Phase 6

- plugins
- new providers
- vector memory
- pattern learning

---

# Long-Term Vision

The TUI must evolve from a simple prompt executor to a complete AI-assisted development platform.

In the future, it may:

- coordinate dozens of agents simultaneously;
- automatically adapt strategy according to the project type;
- reuse knowledge acquired in previous projects (when configured to do so);
- integrate with services like GitHub, GitLab, and Jira;
- suggest architectural improvements;
- track quality metrics, test coverage, and performance;
- act as a virtual "Engineering Manager," assisting in planning, execution, and review of the development cycle.

The ultimate goal is for the developer to stop managing repetitive tasks and focus on product and architecture decisions, while the TUI coordinates technical execution in a predictable, auditable, and scalable way.
