# Contributing to Orion CLI

Thank you for your interest in contributing to Orion CLI! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

- Check existing issues first
- Use the bug report template
- Include reproduction steps
- Include environment details

### Suggesting Features

- Check existing feature requests
- Use the feature request template
- Explain the use case clearly

### Submitting Code

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Update documentation
6. Submit a pull request

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 10.0.0
- Git

### Setup Steps

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/orion-cli.git
cd orion-cli

# Install dependencies
npm install

# Build all packages
npm run build

# Run typecheck
npm run typecheck

# Run tests
npm run test
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build all packages |
| `npm run dev` | Watch mode for development |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |
| `npm run typecheck` | Run TypeScript typecheck |
| `npm run format` | Format code with Prettier |
| `npm run clean` | Clean build artifacts |

## Project Structure

```
orion-cli/
├── apps/
│   ├── backend/          # CLI application
│   └── frontend/         # TUI interface
├── packages/
│   ├── shared/           # Shared utilities
│   ├── domain/           # Domain entities
│   ├── application/      # Use cases
│   └── infrastructure/   # Implementations
├── docs/
│   └── compose/          # Specs and plans
└── .github/              # GitHub templates
```

### Architecture

The project follows DDD (Domain-Driven Design) with Clean Architecture:

- **Domain Layer** - Pure business logic, no dependencies
- **Application Layer** - Use cases, orchestrates domain
- **Infrastructure Layer** - Implements interfaces
- **Presentation Layer** - User interface (CLI/TUI)

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

## Coding Standards

### TypeScript

- Strict mode enabled
- ESM modules (`"type": "module"`)
- Use `.js` extensions in imports (NodeNext resolution)
- Prefer `const` over `let`
- Use descriptive variable names

### Code Style

- 2 spaces for indentation
- Single quotes
- Trailing commas
- 100 char line width
- Semicolons required

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Classes**: `PascalCase`
- **Functions/Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces**: `I` prefix (e.g., `IAgentRepository`)
- **Types**: `PascalCase`

### Error Handling

- Use `Result<T, E>` for operations that can fail
- Use `AppError` for application errors
- Use `ValidationError` for input validation

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting |
| `refactor` | Code refactoring |
| `test` | Tests |
| `chore` | Maintenance |
| `perf` | Performance |

### Examples

```
feat(domain): add Agent entity with permission checking
fix(infrastructure): handle API timeout in OpenAI provider
docs(readme): add installation instructions
test(domain): add unit tests for Task entity
```

## Pull Request Process

### Before Submitting

1. Run `npm run typecheck` - must pass
2. Run `npm run lint` - no errors
3. Run `npm run test` - all tests pass
4. Run `npm run build` - builds successfully
5. Update documentation if needed

### PR Template

Use the provided PR template. Include:

- Description of changes
- Related issue numbers
- Type of change
- Testing done
- Checklist

### Review Process

1. At least one approval required
2. All CI checks must pass
3. No merge conflicts
4. Documentation updated

## Issue Reporting

### Bug Reports

Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (OS, Node version)
- Screenshots if applicable

### Feature Requests

Include:
- Problem description
- Proposed solution
- Alternatives considered
- Additional context

## Getting Help

- Open an issue for bugs/features
- Join discussions in issues
- Read existing documentation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
