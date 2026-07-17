# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Landing page with React + Vite + Tailwind CSS
- Landing page sections: Hero, Features, Agents, Providers, Architecture, Showcase, QuickStart, Stats, CTA
- Landing page effects: StarryBackground, GrainOverlay, ScrollReveal, ScrollProgress, TiltCard, WaveDivider, ParallaxLayer
- Landing page components: AnimatedCounter, AsciiArt, OrionLogo
- Theme support with dark/light mode toggle
- GitHub stats integration for landing page
- Implement command (`/implement`) for AI-powered task implementation
- Orchestrate command (`/orchestrate`) for managing orchestration status
- Multiple LLM provider support (OpenAI, Anthropic, Ollama)
- Provider selection based on agent type
- Task type selection for implement command
- Interactive select menus for commands

### Changed
- Renamed project from "Orion TUI" to "Orion CLI"
- Updated README.md with current project state
- Updated CONTRIBUTING.md with current project structure
- Enhanced CHANGELOG.md with comprehensive feature list

### Packages
- `@orion/shared` - Shared utilities (Result, AppError, Logger, ConfigLoader, OrionConfig)
- `@orion/domain` - Domain entities (Agent, Task, Project, Value Objects, Repositories)
- `@orion/application` - Use cases (AnalyzeProject, Plan, Implement) and Ports
- `@orion/infrastructure` - Database (Drizzle ORM), Providers (OpenAI, Anthropic, Ollama), Cache, Orchestration
- `@orion/backend` - Fastify API server (Auth, Projects, Tasks, Agents, Orchestration routes)
- `@orion/frontend` - TUI interface with Ink/React (Interactive commands, API client, Token storage)
- `@orion/landing` - Landing page with React + Vite + Tailwind CSS

### Infrastructure
- Added Vite build tool for landing page
- Added Tailwind CSS for styling
- Added Radix UI for accessible components
- Added Framer Motion for animations
- Added PostCSS and Autoprefixer

## [0.1.0] - 2026-07-15

### Added
- Initial project setup
- Multi-agent TUI architecture
- DDD (Domain-Driven Design) structure
- Interactive TUI with Ink/React
- Welcome screen with ASCII art
- Command palette with autocomplete
- Agent and task status panels
- Message history display
- Status bar with model info
- Slash commands (/help, /status, /agents, /tasks, /projects, etc.)
- Monorepo with npm workspaces + Turborepo
- TypeScript strict mode with ESM

### Backend
- Fastify API server with CORS, Helmet, Rate Limiting
- JWT authentication with refresh tokens
- PostgreSQL database with Drizzle ORM
- Docker and docker-compose configuration
- Biome linter and formatter (replaced ESLint + Prettier)
- Login persistence on device (tokens stored in ~/.orion/auth.json)
- API key management
- Agent initialization and management
- Task assignment and completion tracking

### Database
- User table with authentication
- Agent table with roles and status
- Task table with project association
- Project table with path and description
- Refresh token table for persistent login
- API key table for API access

### Frontend
- TUI interface with interactive commands
- API client for backend communication
- Token storage for persistent login
- Command history and autocomplete
- ASCII art logo and welcome screen
