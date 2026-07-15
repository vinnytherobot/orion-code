# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup
- Multi-agent CLI architecture
- DDD (Domain-Driven Design) structure
- Interactive TUI with Ink/React
- Welcome screen with ASCII art
- Command palette with autocomplete
- Agent and task status panels
- Message history display
- Status bar with model info
- Slash commands (/init, /implement, /review, /test, /docs, /release)
- Monorepo with npm workspaces + Turborepo
- TypeScript strict mode with ESM
- ESLint + Prettier configuration

### Packages
- `@orion/shared` - Shared utilities (Result, AppError, Logger, Config)
- `@orion/domain` - Domain entities (Agent, Task, Project, Value Objects)
- `@orion/application` - Use cases (AnalyzeProject, Plan, Implement)
- `@orion/infrastructure` - Implementations (LLM Providers, State, Cache)
- `@orion/backend` - CLI application with Commander.js
- `@orion/frontend` - TUI interface with Ink/React

## [0.1.0] - 2026-07-15

### Added
- Initial release
- Project scaffolding
- Basic CLI structure
- DDD architecture foundation
