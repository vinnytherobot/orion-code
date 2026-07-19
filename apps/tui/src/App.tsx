import { Box, Text, useApp, useInput, useStdout } from 'ink';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { InputPrompt } from './components/InputPrompt.js';
import { MessageHistory } from './components/MessageHistory.js';
import { PromptInput } from './components/PromptInput.js';
import { SelectMenu, type SelectOption } from './components/SelectMenu.js';
import { StatusBar } from './components/StatusBar.js';
import { WelcomeScreen } from './components/WelcomeScreen.js';
import type { Agent, InteractiveCommand, Message, Task } from './types/index.js';
import { executeCommand } from './utils/commands.js';
import { execCommand } from './utils/bash.js';
import { theme } from './theme.js';

interface AppProps {
  model?: string;
  agentCount?: number;
}

// Fixed heights for non-message sections (in rows)
const WELCOME_HEIGHT = 14; // banner + tips box
const STATUSBAR_HEIGHT = 3; // border + content + margin
const PROMPT_INPUT_MAX_HEIGHT = 13; // with full suggestions + history hint

function estimateMessageRows(msg: Message, terminalWidth: number): number {
  const contentWidth = Math.max(1, terminalWidth - 6); // account for padding + border
  const contentRows = Math.max(1, Math.ceil(msg.content.length / contentWidth));
  return 1 + 1 + contentRows; // header + margin + content
}

export function App({ model = 'not-set', agentCount = 0 }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents] = useState<Agent[]>([]);
  const [_tasks] = useState<Task[]>([]);
  const [interactiveMenu, setInteractiveMenu] = useState<InteractiveCommand | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0); // 0 = bottom, positive = scrolled up

  const terminalHeight = stdout.rows ?? 24;
  const terminalWidth = stdout.columns ?? 80;

  const activeAgentCount = agents.filter((a) => a.status === 'running').length;

  // Fixed message area height: total - welcome - max_prompt - status
  const messageAreaHeight = Math.max(
    3,
    terminalHeight - WELCOME_HEIGHT - PROMPT_INPUT_MAX_HEIGHT - STATUSBAR_HEIGHT,
  );

  // Calculate which messages are visible
  const visibleMessages = useMemo(() => {
    if (messages.length === 0) return [];

    // Calculate cumulative heights from the bottom
    const heights: number[] = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const rows = estimateMessageRows(messages[i]!, terminalWidth);
      heights.unshift(rows);
    }

    // Find how many messages fit from bottom (accounting for scroll offset)
    let remainingRows = messageAreaHeight - scrollOffset;
    const visible: Message[] = [];

    for (let i = messages.length - 1; i >= 0; i--) {
      const rows = heights[i]!;
      if (remainingRows - rows < 0 && visible.length > 0) break;
      remainingRows -= rows;
      visible.unshift(messages[i]!);
    }

    return visible;
  }, [messages, messageAreaHeight, terminalWidth, scrollOffset]);

  // Total rows of all messages
  const totalMessageRows = useMemo(() => {
    return messages.reduce((sum, msg) => sum + estimateMessageRows(msg, terminalWidth), 0);
  }, [messages, terminalWidth]);

  const maxScrollOffset = Math.max(0, totalMessageRows - messageAreaHeight);
  const isScrolledToBottom = scrollOffset === 0;
  const hasMoreAbove = scrollOffset < maxScrollOffset;
  const hasMoreBelow = scrollOffset > 0;

  // Auto-scroll to bottom when new messages arrive (only if already at bottom)
  useEffect(() => {
    if (isScrolledToBottom) {
      setScrollOffset(0);
    }
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard scrolling
  useInput((_input, key) => {
    if (interactiveMenu) return;

    if (key.pageUp) {
      setScrollOffset((prev) => Math.min(maxScrollOffset, prev + messageAreaHeight));
    } else if (key.pageDown) {
      setScrollOffset((prev) => Math.max(0, prev - messageAreaHeight));
    } else if (key.upArrow && hasMoreAbove) {
      // Only handle up arrow for scroll when not in input
      // PromptInput handles its own up arrow for history
    }
  });

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

  const handleSubmit = useCallback(
    async (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('!')) {
        const cmd = trimmed.slice(1).trim();
        if (!cmd) return;

        addMessage('user', trimmed);

        const result = await execCommand(cmd);
        let output = '';
        if (result.stdout) output += result.stdout;
        if (result.stderr) output += (output ? '\n' : '') + result.stderr;
        if (result.exitCode !== 0 && !result.stderr) output += (output ? '\n' : '') + `Exit code: ${result.exitCode}`;

        addMessage('system', output || '(no output)');
        return;
      }

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
        <Box flexDirection="column" width={terminalWidth} height={terminalHeight} overflow="hidden">
          <Box flexShrink={0} width="100%">
            <WelcomeScreen model={model} directory={process.cwd()} />
          </Box>
          <Box flexGrow={1} flexShrink={1} overflow="hidden" width="100%">
            <SelectMenu
              title={interactiveMenu.title}
              options={interactiveMenu.options}
              onSelect={handleInteractiveSelect}
              onCancel={handleInteractiveCancel}
            />
          </Box>
        </Box>
      );
    }

    if (interactiveMenu.type === 'input') {
      return (
        <Box flexDirection="column" width={terminalWidth} height={terminalHeight} overflow="hidden">
          <Box flexShrink={0} width="100%">
            <WelcomeScreen model={model} directory={process.cwd()} />
          </Box>
          <Box flexGrow={1} flexShrink={1} overflow="hidden" width="100%">
            <InputPrompt
              title={interactiveMenu.title}
              placeholder={interactiveMenu.placeholder}
              masked={interactiveMenu.masked}
              onSubmit={handleInteractiveInput}
              onCancel={handleInteractiveCancel}
            />
          </Box>
        </Box>
      );
    }
  }

  return (
    <Box
      flexDirection="column"
      width={terminalWidth}
      height={terminalHeight}
      overflow="hidden"
    >
      <Box flexShrink={0} width="100%">
        <WelcomeScreen model={model} directory={process.cwd()} />
      </Box>
      <Box
        height={messageAreaHeight}
        overflow="hidden"
        flexDirection="column"
        width="100%"
      >
        {hasMoreAbove && (
          <Box flexShrink={0} paddingLeft={1}>
            <Text color={theme.textDim}>▲ scroll up (Page Up)</Text>
          </Box>
        )}
        {visibleMessages.length > 0 ? (
          <MessageHistory messages={visibleMessages} />
        ) : (
          messages.length === 0 && (
            <Box flexDirection="column" paddingX={1} marginTop={1}>
              <Text color={theme.textDim}>Type a command or message to get started.</Text>
            </Box>
          )
        )}
        {hasMoreBelow && (
          <Box flexShrink={0} paddingLeft={1}>
            <Text color={theme.textDim}>▼ more messages below (Page Down)</Text>
          </Box>
        )}
      </Box>
      <Box flexShrink={0} width="100%">
        <PromptInput onSubmit={handleSubmit} />
      </Box>
      <Box flexShrink={0} width="100%">
        <StatusBar model={model} agentCount={activeAgentCount || agentCount} />
      </Box>
    </Box>
  );
}
