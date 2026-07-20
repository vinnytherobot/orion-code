import { Box, Text, useApp, useStdout } from 'ink';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { InputPrompt } from './components/InputPrompt.js';
import { MessageHistory } from './components/MessageHistory.js';
import { PromptInput } from './components/PromptInput.js';
import { SelectMenu, type SelectOption } from './components/SelectMenu.js';
import { StatusBar } from './components/StatusBar.js';
import { WelcomeScreen } from './components/WelcomeScreen.js';
import { useMouseScroll } from './hooks/useMouseScroll.js';
import type { Agent, InteractiveCommand, Message, Task } from './types/index.js';
import { executeCommand } from './utils/commands.js';
import { execCommand } from './utils/bash.js';

interface AppProps {
  model?: string;
  agentCount?: number;
}

// Each message box takes ~7 rows: border-top(1) + header(1) + gap(1) + content(1+) + border-bottom(1) + gap(1)
const ROWS_PER_MESSAGE = 7;
const SCROLL_STEP = 3;

export function App({ model = 'not-set', agentCount = 0 }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents] = useState<Agent[]>([]);
  const [_tasks] = useState<Task[]>([]);
  const [interactiveMenu, setInteractiveMenu] = useState<InteractiveCommand | null>(null);
  const [historyHint, setHistoryHint] = useState<{ showHint: boolean; count: number }>({ showHint: false, count: 0 });
  const [scrollOffset, setScrollOffset] = useState(0); // 0 = showing latest, positive = scrolled up

  const terminalHeight = (stdout.rows ?? 24) - 1;
  const terminalWidth = stdout.columns ?? 80;

  const activeAgentCount = agents.filter((a) => a.status === 'running').length;

  // Estimate message area rows for scroll calculation
  // Use max possible prompt height so scroll count stays stable
  const fixedTopBottom = 14 + 3 + 3; // welcome + prompt(max) + status
  const messageAreaHeight = Math.max(3, terminalHeight - fixedTopBottom);

  // How many messages can fit in the visible area
  const visibleCount = Math.max(1, Math.floor(messageAreaHeight / ROWS_PER_MESSAGE));

  // Slice messages based on scroll offset
  // scrollOffset=0 means show the last `visibleCount` messages
  const totalMessages = messages.length;
  const maxScroll = Math.max(0, totalMessages - visibleCount);
  const effectiveOffset = Math.min(scrollOffset, maxScroll);
  const startIndex = Math.max(0, totalMessages - visibleCount - effectiveOffset);
  const visibleMessages = messages.slice(startIndex, startIndex + visibleCount + 1); // +1 so partial messages can show

  const hasMoreAbove = effectiveOffset < maxScroll;
  const hasMoreBelow = effectiveOffset > 0;

  // Auto-scroll to bottom when new messages arrive (only if already at bottom)
  useEffect(() => {
    if (scrollOffset === 0) {
      setScrollOffset(0);
    }
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScrollUp = useCallback(() => {
    setScrollOffset((prev) => Math.min(maxScroll, prev + SCROLL_STEP));
  }, [maxScroll]);

  const handleScrollDown = useCallback(() => {
    setScrollOffset((prev) => Math.max(0, prev - SCROLL_STEP));
  }, []);

  // Mouse wheel support: route scroll-wheel events to the same handlers
  // used by PageUp/PageDown so the user can scroll with the mouse too.
  useMouseScroll({ onScrollUp: handleScrollUp, onScrollDown: handleScrollDown });

  const addMessage = useCallback((role: Message['role'], content: string, agent?: Agent) => {
    const msg: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role,
      content,
      timestamp: new Date(),
      agent,
    };
    setMessages((prev) => {
      const lastIdx = prev.length - 1;
      // Replace the last "Processing..." placeholder instead of stacking
      const lastMsg = lastIdx >= 0 ? prev[lastIdx] : undefined;
      if (lastMsg?.content === 'Processing...') {
        const updated = [...prev];
        updated[lastIdx!] = msg;
        return updated;
      }
      return [...prev, msg];
    });
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
          <Box flexShrink={0} width="100%">
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
          <Box flexShrink={0} width="100%">
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
        // `flexGrow` distributes whatever vertical space is left between
        // the welcome screen above and the prompt below. `flexShrink={0}`
        // keeps the prompt and status bar from being squeezed off-screen
        // when the welcome screen or a long message is tall.
        flexGrow={1}
        flexShrink={1}
        overflow="hidden"
        flexDirection="column"
        width="100%"
      >
        {hasMoreAbove && (
          <Box flexShrink={0} paddingLeft={1}>
            <Text color={'#888'}>▲ scroll up (Page Up / wheel)</Text>
          </Box>
        )}
        {visibleMessages.length > 0 ? (
          <MessageHistory messages={visibleMessages} />
        ) : (
          <Box flexDirection="column" paddingX={1} marginTop={1}>
            <Text color={'#888'}>Type a command or message to get started.</Text>
          </Box>
        )}
        {hasMoreBelow && (
          <Box flexShrink={0} paddingLeft={1}>
            <Text color={'#888'}>▼ scroll down (Page Down / wheel)</Text>
          </Box>
        )}
      </Box>
      <Box flexShrink={0} width="100%">
        <PromptInput onSubmit={handleSubmit} onScrollUp={handleScrollUp} onScrollDown={handleScrollDown} onHistoryHintChange={setHistoryHint} />
      </Box>
      <Box flexShrink={0} width="100%">
        <StatusBar model={model} agentCount={activeAgentCount || agentCount} historyHint={historyHint} />
      </Box>
    </Box>
  );
}
