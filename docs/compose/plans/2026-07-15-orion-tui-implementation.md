# Orion TUI - Interactive TUI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Commander.js backend with an interactive Ink-based **TUI** featuring a welcome screen, REPL prompt, slash commands, and agent status panels.

**Architecture:** Ink 4 (React for TUI) with component-based architecture. Main App component manages state, WelcomeScreen for startup, PromptInput for REPL, CommandPalette for `/` commands, AgentPanel and TaskList for status.

**Tech Stack:** Ink 4, React 18, chalk, @inkjs/text-input

## Global Constraints

- All packages use `"type": "module"` (ESM)
- TypeScript strict mode with JSX support
- Ink 4 requires React 18
- No circular dependencies
- Follow existing package structure

---

### Task 1: Update Frontend Dependencies

**Covers:** S8

**Files:**
- Modify: `apps/frontend/package.json`

**Interfaces:**
- Produces: Updated dependencies for Ink 4

- [ ] **Step 1: Update package.json**

```json
{
  "name": "@orion/frontend",
  "version": "0.1.0",
  "description": "Interface TUI do Orion",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.tsx",
    "lint": "eslint src --ext .tsx",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@orion/shared": "workspace:*",
    "@orion/domain": "workspace:*",
    "ink": "^5.0.0",
    "ink-text-input": "^6.0.0",
    "react": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.0",
    "tsx": "^4.7.0",
    "vitest": "^1.2.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/package.json
git commit -chore: update frontend dependencies for Ink 4"
```

---

### Task 2: Create Types and Constants

**Covers:** S5, S7

**Files:**
- Create: `apps/frontend/src/types/index.ts`
- Create: `apps/frontend/src/utils/ascii-logo.ts`
- Create: `apps/frontend/src/utils/commands.ts`

**Interfaces:**
- Produces: Type definitions, ASCII logo, command definitions

- [ ] **Step 1: Create types/index.ts**

```typescript
// apps/frontend/src/types/index.ts

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface Command {
  name: string;
  description: string;
  aliases?: string[];
  handler: (args: string) => Promise<string>;
}

export interface Agent {
  name: string;
  type: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  currentTask?: string;
}

export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  assignedAgent?: string;
}

export interface AppConfig {
  provider: string;
  model: string;
  version: string;
}
```

- [ ] **Step 2: Create utils/ascii-logo.ts**

```typescript
// apps/frontend/src/utils/ascii-logo.ts

export const ORION_LOGO = `
   ╱╲   ╱╲   ╱╲
  ╱  ╲ ╱  ╲ ╱  ╲
 ╱    ╳    ╳    ╲
 ╲   ╱ ╲  ╱ ╲   ╱
  ╲ ╱   ╲╱   ╲ ╱
   ╳     ╳     ╳
  ╱ ╲   ╱ ╲   ╱ ╲
 ╱   ╲ ╱   ╲ ╱   ╲
╱     ╳     ╳     ╲
╲    ╱ ╲   ╱ ╲    ╱
 ╲  ╱   ╲ ╱   ╲  ╱
  ╲╱     ╳     ╲╱
        ╱ ╲
       ╱   ╲
      ╱     ╲
`;

export const ORION_NAME = 'Orion TUI';
```

- [ ] **Step 3: Create utils/commands.ts**

```typescript
// apps/frontend/src/utils/commands.ts

import type { Command } from '../types/index.js';

export const COMMANDS: Command[] = [
  {
    name: '/init',
    description: 'Analyze current project',
    handler: async () => 'Analyzing project...',
  },
  {
    name: '/implement',
    description: 'Implement a feature',
    aliases: ['/i'],
    handler: async (args) => `Implementing: ${args}`,
  },
  {
    name: '/review',
    description: 'Review code',
    handler: async () => 'Reviewing code...',
  },
  {
    name: '/test',
    description: 'Run tests',
    handler: async () => 'Running tests...',
  },
  {
    name: '/docs',
    description: 'Generate documentation',
    handler: async () => 'Generating docs...',
  },
  {
    name: '/release',
    description: 'Create release',
    handler: async () => 'Creating release...',
  },
  {
    name: '/help',
    description: 'Show help',
    handler: async () => COMMANDS.map(c => `${c.name} - ${c.description}`).join('\n'),
  },
  {
    name: '/clear',
    description: 'Clear screen',
    handler: async () => 'CLEAR',
  },
  {
    name: '/exit',
    description: 'Exit TUI',
    handler: async () => 'EXIT',
  },
];

export function findCommand(input: string): Command | null {
  const cmdName = input.split(' ')[0].toLowerCase();
  return COMMANDS.find(c => c.name === cmdName || c.aliases?.includes(cmdName)) || null;
}

export function getCommandSuggestions(input: string): string[] {
  return COMMANDS
    .filter(c => c.name.startsWith(input.toLowerCase()))
    .map(c => c.name);
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/types/ apps/frontend/src/utils/
git commit -m "feat: add types, ASCII logo, and command definitions"
```

---

### Task 3: Create WelcomeScreen Component

**Covers:** S3, S4

**Files:**
- Create: `apps/frontend/src/components/WelcomeScreen.tsx`

**Interfaces:**
- Consumes: ORION_LOGO, ORION_NAME from utils/ascii-logo
- Produces: WelcomeScreen component

- [ ] **Step 1: Create WelcomeScreen.tsx**

```tsx
// apps/frontend/src/components/WelcomeScreen.tsx

import React from 'react';
import { Box, Text } from 'ink';
import { ORION_LOGO, ORION_NAME } from '../utils/ascii-logo.js';

interface WelcomeScreenProps {
  version: string;
  model: string;
  directory: string;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  version,
  model,
  directory,
}) => {
  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text bold color="cyan">{ORION_NAME}</Text>
        <Text color="gray"> v{version}</Text>
      </Box>

      <Box marginTop={1} flexDirection="row">
        <Box flexDirection="column" marginRight={2}>
          <Text color="cyan">{ORION_LOGO}</Text>
        </Box>

        <Box flexDirection="column">
          <Text bold color="green">Welcome back!</Text>
          <Box marginTop={1}>
            <Text bold color="yellow">Tips for getting started</Text>
          </Box>
          <Text>Run /init to analyze your project</Text>
          <Text>Run /implement {'<task>'} to start coding</Text>
          <Text>Run /help for all commands</Text>

          <Box marginTop={1}>
            <Text bold color="yellow">What's new</Text>
          </Box>
          <Text>  - Multi-agent orchestration</Text>
          <Text>  - Parallel task execution</Text>
          <Text>  - DDD architecture support</Text>

          <Box marginTop={1}>
            <Text color="gray">{model} · API Usage Billing</Text>
          </Box>
          <Text color="gray">{directory}</Text>
        </Box>
      </Box>
    </Box>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/components/WelcomeScreen.tsx
git commit -m "feat: add WelcomeScreen component with ASCII logo"
```

---

### Task 4: Create PromptInput Component

**Covers:** S3, S4

**Files:**
- Create: `apps/frontend/src/components/PromptInput.tsx`

**Interfaces:**
- Produces: PromptInput component with autocomplete

- [ ] **Step 1: Create PromptInput.tsx**

```tsx
// apps/frontend/src/components/PromptInput.tsx

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { getCommandSuggestions } from '../utils/commands.js';

interface PromptInputProps {
  onSubmit: (input: string) => void;
}

export const PromptInput: React.FC<PromptInputProps> = ({ onSubmit }) => {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleChange = (input: string) => {
    setValue(input);
    if (input.startsWith('/')) {
      setSuggestions(getCommandSuggestions(input));
    } else {
      setSuggestions([]);
    }
  };

  const handleSubmit = (input: string) => {
    if (input.trim()) {
      onSubmit(input);
      setValue('');
      setSuggestions([]);
    }
  };

  return (
    <Box flexDirection="column">
      {suggestions.length > 0 && (
        <Box marginBottom={1}>
          <Text color="gray">{suggestions.join('  ')}</Text>
        </Box>
      )}
      <Box>
        <Text color="cyan">{'>'} </Text>
        <TextInput
          value={value}
          onChange={handleChange}
          onSubmit={handleSubmit}
        />
      </Box>
    </Box>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/components/PromptInput.tsx
git commit -m "feat: add PromptInput component with autocomplete"
```

---

### Task 5: Create StatusBar Component

**Covers:** S3

**Files:**
- Create: `apps/frontend/src/components/StatusBar.tsx`

**Interfaces:**
- Produces: StatusBar component

- [ ] **Step 1: Create StatusBar.tsx**

```tsx
// apps/frontend/src/components/StatusBar.tsx

import React from 'react';
import { Box, Text } from 'ink';

interface StatusBarProps {
  model: string;
  directory: string;
  agentCount: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  model,
  directory,
  agentCount,
}) => {
  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Text color="gray">/ for shortcuts · + for agents</Text>
      <Text color="gray">
        {model} · {agentCount} agents
      </Text>
    </Box>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/components/StatusBar.tsx
git commit -m "feat: add StatusBar component"
```

---

### Task 6: Create AgentPanel and TaskList Components

**Covers:** S4

**Files:**
- Create: `apps/frontend/src/components/AgentPanel.tsx`
- Create: `apps/frontend/src/components/TaskList.tsx`

**Interfaces:**
- Produces: AgentPanel, TaskList components

- [ ] **Step 1: Create AgentPanel.tsx**

```tsx
// apps/frontend/src/components/AgentPanel.tsx

import React from 'react';
import { Box, Text } from 'ink';
import type { Agent } from '../types/index.js';

interface AgentPanelProps {
  agents: Agent[];
}

export const AgentPanel: React.FC<AgentPanelProps> = ({ agents }) => {
  const statusColor = (status: Agent['status']) => {
    switch (status) {
      case 'running': return 'yellow';
      case 'completed': return 'green';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Box flexDirection="column" borderStyle="single" padding={1}>
      <Text bold>Agents</Text>
      {agents.length === 0 ? (
        <Text color="gray">No active agents</Text>
      ) : (
        agents.map((agent) => (
          <Text key={agent.name}>
            <Text color={statusColor(agent.status)}>●</Text>{' '}
            {agent.name} ({agent.type})
            {agent.currentTask && <Text color="cyan"> → {agent.currentTask}</Text>}
          </Text>
        ))
      )}
    </Box>
  );
};
```

- [ ] **Step 2: Create TaskList.tsx**

```tsx
// apps/frontend/src/components/TaskList.tsx

import React from 'react';
import { Box, Text } from 'ink';
import type { Task } from '../types/index.js';

interface TaskListProps {
  tasks: Task[];
}

export const TaskList: React.FC<TaskListProps> = ({ tasks }) => {
  const statusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed': return '✓';
      case 'running': return '⟳';
      case 'failed': return '✗';
      default: return '○';
    }
  };

  return (
    <Box flexDirection="column" borderStyle="single" padding={1}>
      <Text bold>Tasks</Text>
      {tasks.length === 0 ? (
        <Text color="gray">No tasks</Text>
      ) : (
        tasks.map((task) => (
          <Text key={task.id}>
            {statusIcon(task.status)} {task.title}
            {task.assignedAgent && <Text color="cyan"> [{task.assignedAgent}]</Text>}
          </Text>
        ))
      )}
    </Box>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/AgentPanel.tsx apps/frontend/src/components/TaskList.tsx
git commit -m "feat: add AgentPanel and TaskList components"
```

---

### Task 7: Create MessageHistory Component

**Covers:** S4

**Files:**
- Create: `apps/frontend/src/components/MessageHistory.tsx`

**Interfaces:**
- Consumes: Message type
- Produces: MessageHistory component

- [ ] **Step 1: Create MessageHistory.tsx**

```tsx
// apps/frontend/src/components/MessageHistory.tsx

import React from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../types/index.js';

interface MessageHistoryProps {
  messages: Message[];
}

export const MessageHistory: React.FC<MessageHistoryProps> = ({ messages }) => {
  const roleColor = (role: Message['role']) => {
    switch (role) {
      case 'user': return 'cyan';
      case 'assistant': return 'green';
      case 'system': return 'yellow';
    }
  };

  const roleLabel = (role: Message['role']) => {
    switch (role) {
      case 'user': return 'You';
      case 'assistant': return 'Orion';
      case 'system': return 'System';
    }
  };

  return (
    <Box flexDirection="column">
      {messages.map((msg) => (
        <Box key={msg.id} flexDirection="column" marginBottom={1}>
          <Text bold color={roleColor(msg.role)}>
            {roleLabel(msg.role)}
          </Text>
          <Text>{msg.content}</Text>
        </Box>
      ))}
    </Box>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/components/MessageHistory.tsx
git commit -m "feat: add MessageHistory component"
```

---

### Task 8: Create Main App Component

**Covers:** S3, S6

**Files:**
- Modify: `apps/frontend/src/App.tsx`

**Interfaces:**
- Consumes: All components
- Produces: Main App with state management

- [ ] **Step 1: Update App.tsx**

```tsx
// apps/frontend/src/App.tsx

import React, { useState, useCallback } from 'react';
import { Box, Text, useApp } from 'ink';
import { WelcomeScreen } from './components/WelcomeScreen.js';
import { PromptInput } from './components/PromptInput.js';
import { StatusBar } from './components/StatusBar.js';
import { MessageHistory } from './components/MessageHistory.js';
import { AgentPanel } from './components/AgentPanel.js';
import { TaskList } from './components/TaskList.js';
import { findCommand } from './utils/commands.js';
import type { Message, Agent, Task } from './types/index.js';

interface AppProps {
  version?: string;
  model?: string;
}

export const App: React.FC<AppProps> = ({
  version = '0.1.0',
  model = 'Sonnet 4',
}) => {
  const { exit } = useApp();
  const [showWelcome, setShowWelcome] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [directory] = useState(process.cwd());

  const handleSubmit = useCallback(async (input: string) => {
    // Hide welcome on first input
    if (showWelcome) {
      setShowWelcome(false);
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Check for slash commands
    const command = findCommand(input);
    if (command) {
      const args = input.slice(command.name.length).trim();
      const result = await command.handler(args);

      if (result === 'CLEAR') {
        setMessages([]);
        return;
      }

      if (result === 'EXIT') {
        exit();
        return;
      }

      const systemMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: result,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, systemMessage]);
    } else {
      // Natural language - send to orchestrator
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Processing: "${input}"...`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    }
  }, [showWelcome, exit]);

  return (
    <Box flexDirection="column" height="100%">
      <Box flexDirection="column" flexGrow={1}>
        {showWelcome ? (
          <WelcomeScreen
            version={version}
            model={model}
            directory={directory}
          />
        ) : (
          <MessageHistory messages={messages} />
        )}
      </Box>

      <PromptInput onSubmit={handleSubmit} />

      <StatusBar
        model={model}
        directory={directory}
        agentCount={agents.length}
      />
    </Box>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/App.tsx
git commit -m "feat: implement main App with REPL and state management"
```

---

### Task 9: Update Entry Point

**Covers:** S3

**Files:**
- Modify: `apps/frontend/src/index.tsx`

**Interfaces:**
- Produces: Working entry point

- [ ] **Step 1: Update index.tsx**

```tsx
// apps/frontend/src/index.tsx

import React from 'react';
import { render } from 'ink';
import { App } from './App.js';

render(<App />);
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/index.tsx
git commit -m "feat: update entry point for Ink 4"
```

---

### Task 10: Verify Build and Test

**Covers:** S8

**Files:**
- None (verification only)

**Interfaces:**
- None

- [ ] **Step 1: Install dependencies**

```bash
npm install
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Test TUI**

```bash
npx tsx apps/frontend/src/index.tsx
```

- [ ] **Step 5: Commit if needed**

```bash
git add -A
git commit -m "chore: verify TUI build"
```
