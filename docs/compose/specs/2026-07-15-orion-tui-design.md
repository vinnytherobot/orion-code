# Orion TUI - Interactive TUI Design Specification

## [S1] Problem

The current implementation uses Commander.js with traditional command-line arguments. The user wants an interactive **TUI** (Terminal User Interface) similar to Claude Code/MiMoCode - with a welcome screen, REPL prompt, ASCII art, tips, status indicators, and keyboard shortcuts.

## [S2] Solution Overview

Replace the Commander.js backend with an Ink-based (React for TUI) interactive REPL. The main interface is a continuous prompt where users type natural language requests or slash commands. The welcome screen shows ASCII art logo, tips, changelog, model status, and billing info.

## [S3] Interface Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Orion TUI v0.1.0                                                       │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Welcome back!                                                    │  │
│  │                                                                   │  │
│  │     ⬡⬡⬡⬡⬡     Tips for getting started                           │  │
│  │    ⬡      ⬡    Run /init to analyze your project                 │  │
│  │   ⬡  ⬡⬡  ⬡    Run /implement <task> to start coding              │  │
│  │   ⬡  ⬡⬡  ⬡    Run /help for all commands                        │  │
│  │    ⬡      ⬡                                                      │  │
│  │     ⬡⬡⬡⬡⬡     What's new                                         │  │
│  │               - Multi-agent orchestration                         │  │
│  │               - Parallel task execution                           │  │
│  │               - DDD architecture support                          │  │
│  │                                                                   │  │
│  │  Sonnet 4 · API Usage Billing                                    │  │
│  │  ~/web/CLIs/Orion-tui                                             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  > _                                                                    │
│                                                                         │
│  / for shortcuts · + for agents                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## [S4] Components

### WelcomeScreen
- ASCII art logo (Orion hexagon pattern)
- "Welcome back!" greeting
- Tips for getting started (rotating tips)
- What's new section
- Model info (e.g., "Sonnet 4")
- Billing status
- Current directory

### PromptInput
- Interactive text input with cursor
- Autocomplete for slash commands
- Command history (up/down arrows)
- Enter to submit, Escape to cancel

### StatusBar
- Current model name
- API usage/billing
- Current directory
- Agent count indicator

### CommandPalette
- Triggered by `/` key
- Shows available commands with descriptions
- Fuzzy search filtering

### AgentPanel
- Shows active agents
- Status (idle/running/completed)
- Current task per agent

### TaskList
- Shows tasks in progress
- Status icons (pending/running/completed/failed)
- Assigned agent

### MessageHistory
- Scrollable message history
- User messages
- Agent responses
- Tool call summaries

## [S5] Slash Commands

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
| `/exit` | Exit TUI |

## [S6] Interaction Flow

```
User types message → Input processed → Command/Message handled → Response displayed
                                                                    ↓
                                                              Prompt ready
```

For slash commands:
```
/implement "Add auth" → Parse command → Spawn orchestrator → Display progress → Show result
```

For natural language:
```
"Add JWT authentication" → Send to LLM → Display response → Suggest next steps
```

## [S7] Tech Stack

| Component | Technology |
|-----------|------------|
| TUI Framework | Ink 4 (React for TUI) |
| Input | @inkjs/text-input |
| Styling | chalk |
| ASCII Art | Custom |
| State Management | React hooks |
| Commands | Custom parser |

## [S8] File Structure

```
apps/frontend/src/
├── index.tsx                 # Entry point
├── App.tsx                   # Main app component
├── components/
│   ├── WelcomeScreen.tsx     # Welcome screen
│   ├── PromptInput.tsx       # Input prompt
│   ├── StatusBar.tsx         # Status bar
│   ├── CommandPalette.tsx    # Command palette
│   ├── AgentPanel.tsx        # Agent status
│   ├── TaskList.tsx          # Task list
│   └── MessageHistory.tsx    # Message history
├── hooks/
│   ├── useCommands.ts        # Command handling
│   ├── useAgents.ts          # Agent state
│   └── useHistory.ts         # Message history
├── utils/
│   ├── ascii-logo.ts         # ASCII art
│   ├── commands.ts           # Command definitions
│   └── autocomplete.ts       # Autocomplete logic
└── types/
    └── index.ts              # TypeScript types
```
