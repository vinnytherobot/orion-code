<p align="center">
  <img src="logo.svg" alt="Orion Logo" width="120" />
</p>

<h1 align="center">Orion Code</h1>

<p align="center">
  <strong>Multi-Agent Code Orchestration - Intelligent AI Agent Coordination</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#commands">Commands</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

---

## Overview

Orion Code is a multi-agent orchestration system that acts as a virtual Tech Lead, coordinating specialized AI agents to collaborate on software projects. It provides an interactive **TUI** (Terminal User Interface) for seamless interaction, with a REST API backend and a modern landing page.

## Features

- **Interactive TUI** - Beautiful terminal interface with Ink 5/React 18
- **Mouse Wheel Scroll** - Scroll message history with mouse wheel or Page Up/Down
- **Multi-Agent Orchestration** - AI-powered task orchestration via Ollama (free, local)
- **Inline Bash Mode** - Execute shell commands directly from TUI with `!` prefix
- **DDD Architecture** - Clean, maintainable codebase with Domain-Driven Design
- **REST API Backend** - Fastify 5-based backend with JWT + API Key authentication
- **Persistent Login** - Tokens persist on device until explicit logout
- **PostgreSQL Database** - Full persistence with Drizzle ORM
- **Intelligent Orchestration** - AI-powered task planning and implementation via `/implement`
- **Natural Language Input** - Type natural language to create and execute tasks
- **Interactive Selection Menus** - Arrow-key navigation for commands
- **Landing Page** - Modern React landing page with Tailwind CSS
- **Docker Support** - Containerized deployment with docker-compose

## Installation

### Prerequisites

- Node.js >= 18.0.0
- npm >= 10.0.0
- PostgreSQL (for production)

### From Source

```bash
# Clone the repository
git clone https://github.com/vinnytherobot/orion-code.git
cd orion-code

# Install dependencies
npm install

# Build all packages
npm run build

# Start development servers
npm run dev
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `ORION_API_URL` - Backend API URL (default: http://localhost:3000)

## Quick Start

### Start All Services

```bash
# Start all development servers
npm run dev
```

### Start Individual Services

```bash
# Start the TUI
npm run dev:tui

# Start the backend API
npm run dev:backend

# Start the landing page
npm run dev:landing
```

## Architecture

### Monorepo Structure

```
orion-code/
├── apps/
│   ├── backend/          # Fastify API server
│   ├── tui/              # TUI interface (Ink/React)
│   └── landing/          # Landing page (React + Vite + Tailwind)
├── packages/
│   ├── shared/           # Shared utilities (Result, AppError, Logger, Config)
│   ├── domain/           # Domain entities (Agent, Task, Project)
│   ├── application/      # Use cases (AnalyzeProject, Plan, Implement)
│   └── infrastructure/   # Database, providers, cache, orchestration
├── docs/                 # Documentation and specs
└── .github/              # GitHub templates
```

### DDD Layers

```
┌─────────────────────────────────────┐
│           Presentation (TUI/API)    │
├─────────────────────────────────────┤
│         Application Layer           │
│         (Use Cases, DTOs)           │
├─────────────────────────────────────┤
│           Domain Layer              │
│    (Entities, Value Objects)        │
├─────────────────────────────────────┤
│       Infrastructure Layer          │
│   (Database, Providers, Cache)      │
└─────────────────────────────────────┘
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

### Agent Types

| Agent | Responsibility |
|-------|----------------|
| Planner | Task planning and decomposition |
| Architect | Architecture decisions |
| Backend | Business logic implementation |
| Database | Data persistence |
| Frontend | UI implementation |
| Documentation | Docs generation |
| QA | Test creation |
| Reviewer | Code review |
| DevOps | Infrastructure |
| Security | Security analysis |
| Performance | Optimization |
| Git | Version control |

## Commands

### Authentication

| Command | Description |
|---------|-------------|
| `/register <name> <email> <password>` | Register a new user |
| `/login <email> <password>` | Login to the API |
| `/logout` | Logout and remove saved credentials |
| `/me` | Show current user info |

### Project Management

| Command | Description |
|---------|-------------|
| `/projects` | List all projects |
| `/create-project <name> <path> [description]` | Create a new project |
| `/project [id]` | Show project details |
| `/delete-project [id]` | Delete a project |

### Task Management

| Command | Description |
|---------|-------------|
| `/tasks [status]` | List active tasks |
| `/create-task [projectId] <title> [description]` | Create a new task |
| `/delete-task [taskId]` | Delete a task |
| `/task-stats [projectId]` | Show task statistics |

### Agent Management

| Command | Description |
|---------|-------------|
| `/agents [role]` | List all available agents |
| `/init [projectId]` | Initialize agents for a project |
| `/assign [agentId] [taskId]` | Assign a task to an agent |
| `/complete [agentId] [result]` | Mark task as completed |
| `/reset-agent [agentId]` | Reset agent to idle state |

### Orchestration

| Command | Description |
|---------|-------------|
| `/implement [projectId] [taskType]` | Implement a task using AI agents |
| `/orchestrate [projectId]` | Execute orchestration for pending tasks |

### System

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/status` | Show API status and active agents |
| `/api-keys [list\|create\|delete]` | Manage API keys |
| `/config [key] [value]` | Show or update configuration |
| `/version` | Show Orion Code version |
| `/clear` | Clear screen |
| `/exit` | Exit TUI |

### Bash Mode

| Command | Description |
|---------|-------------|
| `!<command>` | Execute shell command directly from TUI |
| `!` (toggle) | Toggle bash mode on/off |

## Development

### Setup

```bash
# Clone and install
git clone https://github.com/vinnytherobot/orion-code.git
cd orion-code
npm install

# Build
npm run build

# Development mode
npm run dev
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build all packages |
| `npm run dev` | Watch mode for all packages |
| `npm run dev:tui` | Watch TUI only |
| `npm run dev:backend` | Watch backend only |
| `npm run dev:landing` | Watch landing page only |
| `npm run lint` | Run Biome linter |
| `npm run lint:fix` | Fix lint issues |
| `npm run format` | Format code with Biome |
| `npm run check` | Run Biome check (lint + format) |
| `npm run check:fix` | Fix all Biome issues |
| `npm run typecheck` | Type checking |
| `npm run test` | Run tests |
| `npm run clean` | Clean build artifacts |
| `npm run db:migrate` | Run database migrations |
| `npm run db:generate` | Generate database migrations |
| `npm run docker:up` | Start Docker containers |
| `npm run docker:down` | Stop Docker containers |

### Database

The project uses PostgreSQL with Drizzle ORM:

```bash
# Run migrations
npm run db:migrate

# Generate new migration
npm run db:generate
```

## Docker

```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# Rebuild and start
npm run docker:build
```

## Tech Stack

### Backend
- **Runtime**: Node.js + TypeScript
- **Framework**: Fastify 5
- **Database**: PostgreSQL 16 + Drizzle ORM
- **Auth**: JWT + API Key with persistent tokens

### Frontend (TUI)
- **UI Framework**: Ink 5 + React 18
- **Language**: TypeScript

### Landing Page
- **Framework**: React + Vite
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Animations**: Framer Motion

### Infrastructure
- **Monorepo**: npm workspaces + Turborepo
- **Linter/Formatter**: Biome
- **Containerization**: Docker + docker-compose

### LLM Providers
- Ollama (local inference, free)
- OpenAI (GPT-4, GPT-4o, etc.)
- Anthropic (Claude)
- Groq (fast inference)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Ways to Contribute

- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation
- Share feedback

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Ink](https://github.com/vadimdemedes/ink) - React for TUI
- [Fastify](https://www.fastify.io/) - Backend framework
- [Drizzle ORM](https://orm.drizzle.team/) - Database ORM
- [Turborepo](https://turbo.build/) - Monorepo tooling
- [Biome](https://biomejs.dev/) - Linter and formatter
- [Vite](https://vitejs.dev/) - Build tool for landing page
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [Radix UI](https://www.radix-ui.com/) - UI components
- [Framer Motion](https://www.framer.com/motion/) - Animations

---

<p align="center">
  Made with ❤️ by vinnytherobot and the Orion Code Community
</p>
