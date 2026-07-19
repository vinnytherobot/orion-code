import { Box, useApp } from 'ink';
import type React from 'react';
import { useCallback, useState } from 'react';
import { BashMode } from './components/BashMode.js';
import { InputPrompt } from './components/InputPrompt.js';
import { MessageHistory } from './components/MessageHistory.js';
import { PromptInput } from './components/PromptInput.js';
import { SelectMenu, type SelectOption } from './components/SelectMenu.js';
import { StatusBar } from './components/StatusBar.js';
import { WelcomeScreen } from './components/WelcomeScreen.js';
import type { Agent, InteractiveCommand, Message, Task } from './types/index.js';
import { executeCommand } from './utils/commands.js';

interface AppProps {
  model?: string;
  agentCount?: number;
}

export function App({ model = 'not-set', agentCount = 0 }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents] = useState<Agent[]>([]);
  const [_tasks] = useState<Task[]>([]);
  const [interactiveMenu, setInteractiveMenu] = useState<InteractiveCommand | null>(null);
  const [isBashMode, setIsBashMode] = useState(false);

  const activeAgentCount = agents.filter((a) => a.status === 'running').length;

  const addMessage = useCallback((role: Message['role'], content: string, agent?: Agent) => {
    const msg: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role,
      content,
      timestamp: new Date(),
      agent,
    };
    setMessages((prev) => [...prev, msg]);
  }, []);

  const handleInteractiveSelect = useCallback(async (option: SelectOption) => {
    if (!interactiveMenu || interactiveMenu.type !== 'select') return;

    const currentMenu = interactiveMenu;
    setInteractiveMenu(null);
    addMessage('system', 'Processing...');

    const result = await currentMenu.callback(option.value);

    if (result && typeof result === 'object' && 'type' in result) {
      setInteractiveMenu(result as InteractiveCommand);
    } else if (result) {
      addMessage('system', result as string);
    }
  }, [interactiveMenu, addMessage]);

  const handleInteractiveInput = useCallback(async (value: string) => {
    if (!interactiveMenu || interactiveMenu.type !== 'input') return;

    const currentMenu = interactiveMenu;
    setInteractiveMenu(null);
    addMessage('system', 'Processing...');

    const result = await currentMenu.callback(value);

    if (result && typeof result === 'object' && 'type' in result) {
      setInteractiveMenu(result as InteractiveCommand);
    } else if (result) {
      addMessage('system', result as string);
    }
  }, [interactiveMenu, addMessage]);

  const handleInteractiveCancel = useCallback(() => {
    setInteractiveMenu(null);
    addMessage('system', 'Cancelled.');
  }, [addMessage]);

  const toggleBashMode = useCallback(() => {
    setIsBashMode(prev => !prev);
  }, []);

  const exitBashMode = useCallback(() => {
    setIsBashMode(false);
  }, []);

  const handleSubmit = useCallback(
    async (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('/')) {
        const result = await executeCommand(trimmed);

        if (result === '__CLEAR__') {
          setMessages([]);
          return;
        }

        if (result === '__EXIT__') {
          exit();
          return;
        }

        if (result && typeof result === 'object' && 'type' in result) {
          setInteractiveMenu(result as InteractiveCommand);
          return;
        }

        if (result) {
          addMessage('system', result);
        }
        return;
      }

      addMessage('user', trimmed);

      setTimeout(() => {
        addMessage(
          'system',
          'Orchestrator received your request. (Agent orchestration is not yet connected.)',
        );
      }, 300);
    },
    [addMessage, exit],
  );

  if (interactiveMenu) {
    if (interactiveMenu.type === 'select') {
      return (
        <Box flexDirection="column">
          <WelcomeScreen model={model} directory={process.cwd()} />
          <SelectMenu
            title={interactiveMenu.title}
            options={interactiveMenu.options}
            onSelect={handleInteractiveSelect}
            onCancel={handleInteractiveCancel}
          />
        </Box>
      );
    }

    if (interactiveMenu.type === 'input') {
      return (
        <Box flexDirection="column">
          <WelcomeScreen model={model} directory={process.cwd()} />
          <InputPrompt
            title={interactiveMenu.title}
            placeholder={interactiveMenu.placeholder}
            masked={interactiveMenu.masked}
            onSubmit={handleInteractiveInput}
            onCancel={handleInteractiveCancel}
          />
        </Box>
      );
    }
  }

  if (isBashMode) {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <BashMode onExit={exitBashMode} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <WelcomeScreen model={model} directory={process.cwd()} />
      {messages.length > 0 && <MessageHistory messages={messages} />}
      <PromptInput onSubmit={handleSubmit} onToggleBash={toggleBashMode} />
      <StatusBar model={model} agentCount={activeAgentCount || agentCount} />
    </Box>
  );
}
