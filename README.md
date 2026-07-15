# Orion CLI

<p align="center">
  <strong>Multi-Agent CLI - Intelligent Orchestration of AI Agents</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

---

## Overview

Orion CLI is a multi-agent orchestration system that acts as a virtual Tech Lead, coordinating specialized AI agents to collaborate on software projects. It provides an interactive terminal interface (TUI) for seamless interaction.

## Features

- **Interactive TUI** - Beautiful terminal interface with Ink/React
- **Multi-Agent Orchestration** - Parallel execution of specialized agents
- **DDD Architecture** - Clean, maintainable codebase
- **Extensible Plugin System** - Add new agents and capabilities
- **Multiple LLM Providers** - OpenAI, Anthropic, Ollama support
- **Git Integration** - Automated commits, PRs, and changelogs

## Installation

### Prerequisites

- Node.js >= 18.0.0
- npm >= 10.0.0

### From Source

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/orion-cli.git
cd orion-cli

# Install dependencies
npm install

# Build all packages
npm run build

# Link CLI globally
cd apps/backend
npm link
```

### Verify Installation

```bash
orion --help
```

## Quick Start

### Interactive Mode

```bash
# Start the interactive TUI
orion

# Or with a specific request
orion implement "Add JWT authentication"
```

### Available Commands

| Command | Description |
|---------|-------------|
| `/init` | Analyze current project |
| `/implement <task>` | Implement a feature |
| `/review` | Review code |
| `/test` | Run tests |
| `/docs` | Generate documentation |
| `/release` | Create release |
| `/help` | Show help |
| `/clear` | Clear screen |
| `/exit` | Exit CLI |

### Example Usage

```bash
# Analyze your project
/init

# Implement a feature
/implement Add user authentication with JWT

# Review code
/review

# Generate documentation
/docs
```

## Architecture

### Monorepo Structure

```
orion-cli/
├── apps/
│   ├── backend/          # CLI application (Commander.js)
│   └── frontend/         # TUI interface (Ink/React)
├── packages/
│   ├── shared/           # Shared utilities
│   ├── domain/           # Domain entities (DDD)
│   ├── application/      # Use cases
│   └── infrastructure/   # Implementations
└── docs/                 # Documentation
```

### DDD Layers

```
┌─────────────────────────────────────┐
│           Presentation (TUI)        │
├─────────────────────────────────────┤
│         Application Layer           │
│         (Use Cases, DTOs)           │
├─────────────────────────────────────┤
│           Domain Layer              │
│    (Entities, Value Objects)        │
├─────────────────────────────────────┤
│       Infrastructure Layer          │
│   (Providers, Cache, Database)      │
└─────────────────────────────────────┘
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

## Development

### Setup

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/orion-cli.git
cd orion-cli
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
| `npm run dev` | Watch mode |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |
| `npm run typecheck` | Type checking |
| `npm run format` | Format code |
| `npm run clean` | Clean artifacts |

### Testing

```bash
# Run all tests
npm run test

# Run tests for specific package
npm run test --workspace=@orion/domain

# Run with coverage
npm run test:coverage
```

## Configuration

Create `orion.config.ts` in your project root:

```typescript
export default {
  provider: 'anthropic',
  reviewer: 'gpt-5.5',
  parallelAgents: 6,
  defaultBranch: 'development',
  architecture: 'ddd',
};
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Ways to Contribute

- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation
- Share feedback

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Update documentation
6. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## Community

- [GitHub Issues](https://github.com/YOUR_USERNAME/orion-cli/issues) - Bug reports and feature requests
- [GitHub Discussions](https://github.com/YOUR_USERNAME/orion-cli/discussions) - Questions and discussions

## Roadmap

- [ ] Core orchestrator implementation
- [ ] Agent execution engine
- [ ] LLM provider integration
- [ ] Plugin system
- [ ] Git automation
- [ ] PR generation
- [ ] Vector memory
- [ ] Pattern learning

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Ink](https://github.com/vadimdemedes/ink) - React for CLI
- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Turborepo](https://turbo.build/) - Monorepo tooling

---

<p align="center">
  Made with ❤️ by the Orion CLI Community
</p>
