# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Inline Bash Mode: execute shell commands directly from TUI with `!` prefix
- `!` key binding to toggle bash mode on/off
- Shell execution utility for running commands with output capture
- Groq provider support (alternative to Ollama/OpenAI/Anthropic)
- Session expiry handling with graceful re-authentication flow
- Mouse wheel scroll support for TUI message history (`useMouseScroll` hook)
- Command history hint rendered inside StatusBar (replaces inline hint below input)
- Orchestration database tables: projects, agents, tasks, execution_logs with enums and indexes
- Docker CMD now runs migrations before starting the server

### Fixed
- Screen shake when typing with existing messages in TUI (terminalHeight - 1 fix)
- Landing page layout breakage on 375x667 (small mobile) screens
- Removed double padding wrapper in BashMode component
- TUI shake prevention using Ink clearTerminal height adjustment
- Stacked "Processing..." messages in multi-step interactive commands replaced instead of appended
- PromptInput refactored from `ink-text-input` to native cursor-aware input with inline cursor rendering
- History hint moved from PromptInput to StatusBar to keep input box height stable

### Changed
- Renamed project from "Orion TUI" to "Orion Code"
- Updated repository URL to https://github.com/vinnytherobot/orion-code.git
- TUI layout improvements with inline bash mode color changes
- Landing page Features section translated to English
- Removed `apps/frontend/` from git tracking
- Removed `docs/` from git tracking
- TUI scroll system simplified: fixed per-message row estimate with slice-based visibility
- StatusBar accepts `historyHint` prop to render command history hint inline
- PromptInput uses `onHistoryHintChange` callback to report hint state to parent

### Added
- Orchestration MVP: Orchestrator, AgentExecutor, MessageBus, PostgreSQL persistence
- Natural language input: type tasks in natural language for AI execution
- `/implement` command: interactive task type selection with predefined templates
- `/orchestrate` command: view orchestration status (running agents, pending/completed tasks)
- Interactive selection menus with arrow-key navigation for all commands
- Project name auto-detection (accepts human-readable names, not just UUIDs)
- Landing page with React + Vite + Tailwind CSS
- Landing page sections: Hero, Features, Agents, Providers, Architecture, Showcase, QuickStart, Stats, CTA
- Landing page effects: StarryBackground, GrainOverlay, ScrollReveal, ScrollProgress, TiltCard, WaveDivider, ParallaxLayer
- Landing page components: AnimatedCounter, AsciiArt, OrionLogo
- Theme support with dark/light mode toggle
- Backend API with Fastify 5 (auth, projects, tasks, agents, orchestration endpoints)
- JWT + API Key authentication with persistent login
- PostgreSQL 16 database with Drizzle ORM
- Docker and docker-compose configuration
- Biome linter and formatter (replaced ESLint + Prettier)

### Changed
- Renamed project from "Orion CLI" to "Orion TUI" across all documentation
- All in-memory Maps replaced with PostgreSQL repositories
- Default LLM model: `llama3` via Ollama (free, local inference)
- Refresh tokens now have 100-year lifetime (no expiration)

### Packages
- `@orion/shared` - Shared utilities (Result, AppError, Logger, ConfigLoader, OrionConfig)
- `@orion/domain` - Domain entities (Agent, Task, Project, Value Objects, Repositories)
- `@orion/application` - Use cases (AnalyzeProject, Plan, Implement) and Ports
- `@orion/infrastructure` - Database (Drizzle ORM), Providers (Ollama), Cache, Orchestration
- `@orion/backend` - Fastify 5 API server (Auth, Projects, Tasks, Agents, Orchestration routes)
- `@orion/tui` - TUI interface with Ink 5/React 18 (Interactive commands, API client, Token storage)
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
