import { Box, Text, measureElement, useApp, useStdout } from 'ink';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import stringWidth from 'string-width';
import { ChatView } from './components/ChatView.js';
import { InputPrompt } from './components/InputPrompt.js';
import { MessageHistory } from './components/MessageHistory.js';
import { PromptInput } from './components/PromptInput.js';
import { SelectMenu, type SelectOption } from './components/SelectMenu.js';
import { StatusBar } from './components/StatusBar.js';
import { WelcomeScreen } from './components/WelcomeScreen.js';
import { useMouseScroll } from './hooks/useMouseScroll.js';
import type { Agent, InteractiveCommand, Message } from './types/index.js';
import { execCommand } from './utils/bash.js';
import { executeCommand } from './utils/commands.js';
import { apiClient } from './api/client.js';

interface AppProps {
  model?: string;
  agentCount?: number;
}

// Fixed vertical overhead of a single message box: border-top(1) + header(1) +
// header-margin(1) + border-bottom(1). Content rows are measured per message.
const MESSAGE_BOX_OVERHEAD = 4;
// Vertical gap between consecutive message boxes (MessageHistory `gap`).
const MESSAGE_GAP = 1;
// Root `marginTop` of the MessageHistory list (used when computing scroll bounds).
const MESSAGE_LIST_MARGIN_TOP = 1;
// Wheel / step scroll amount in rows.
const SCROLL_STEP_ROWS = 4;
// Reserved empty rows between the last message and the prompt, giving the
// transcript the same breathing room as other chat TUIs (Claude Code, Codex).
const MESSAGE_BOTTOM_GAP = 3;

// Estimate how many terminal rows a message's content occupies after wrapping
// within the message box. Mirrors MessageHistory's inner text width:
// terminalWidth - list padding(2) - border(2) - box padding(2).
// Uses `string-width` (the same measurement Ink uses) so wide characters
// (emoji, CJK) occupy 2 columns instead of being miscounted via `.length`.
function estimateContentRows(text: string, terminalWidth: number): number {
  const contentWidth = Math.max(1, terminalWidth - 6);
  if (!text) return 1;
  let rows = 0;
  for (const line of text.split('\n')) {
    rows += Math.max(1, Math.ceil(stringWidth(line || ' ') / contentWidth));
  }
  return rows;
}

function messageRows(msg: Message, terminalWidth: number): number {
  return MESSAGE_BOX_OVERHEAD + estimateContentRows(msg.content, terminalWidth);
}

export function App({ model: initialModel = 'not-set', agentCount = 0 }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents] = useState<Agent[]>([]);
  // Resolve the active model from the backend on mount and whenever the
  // user switches providers — fixes the "not-set" header bug.
  const [model, setModel] = useState<string>(initialModel);
  const [interactiveMenu, setInteractiveMenu] = useState<InteractiveCommand | null>(null);
  const [chatMode, setChatMode] = useState(false);
  const [historyHint, setHistoryHint] = useState<{ showHint: boolean; count: number }>({
    showHint: false,
    count: 0,
  });
  const [scrollOffset, setScrollOffset] = useState(0); // 0 = showing latest, positive = scrolled up
  // Real measured height of the message display area (flexGrow box between the
  // welcome screen and the prompt). Measured with Ink's `measureElement`; null
  // until the first layout pass, when we fall back to a rough estimate.
  const [measuredAreaHeight, setMeasuredAreaHeight] = useState<number | null>(null);

  const terminalHeight = (stdout.rows ?? 24) - 1;
  const terminalWidth = stdout.columns ?? 80;

  const activeAgentCount = agents.filter((a) => a.status === 'running').length;

  // Measure the real height available to the message area on every layout.
  // The box is `flexGrow` inside a fixed-height container, so its height is
  // stable regardless of its own content — no feedback loop.
  const setMessageAreaRef = useCallback((node: unknown) => {
    if (node) {
      setMeasuredAreaHeight(measureElement(node as Parameters<typeof measureElement>[0]).height);
    }
  }, []);

  // Available rows for messages. Fall back to a rough estimate until the first
  // measurement is available (the welcome screen + prompt + status bars).
  const messageAreaHeight = measuredAreaHeight ?? Math.max(3, terminalHeight - 24);

  // Measure every message so the slice respects real (wrapped) heights instead
  // of assuming a fixed height per message.
  const rowHeights = messages.map((msg) => messageRows(msg, terminalWidth));
  const totalMessages = messages.length;
  // Total rows the whole list would occupy, including gaps between messages.
  const totalListRows =
    rowHeights.reduce((sum, rows) => sum + rows, 0) +
    MESSAGE_GAP * Math.max(0, totalMessages - 1) +
    MESSAGE_LIST_MARGIN_TOP;

  // scrollOffset is in rows (0 = showing the newest message at the bottom).
  const maxScrollRows = Math.max(0, totalListRows - messageAreaHeight);
  const effectiveOffset = Math.min(scrollOffset, maxScrollRows);

  // Walk messages from the bottom, including as many as fit in the viewport.
  // scrollOffset > 0 shifts the window upward; the newest message is always
  // considered first so it can never be pushed out of view.
  let startIndex = totalMessages;
  let remaining = messageAreaHeight + effectiveOffset;
  for (let i = totalMessages - 1; i >= 0; i--) {
    if (remaining <= 0) break;
    if (remaining < rowHeights[i]! + MESSAGE_GAP) {
      // A full message no longer fits at the top. Do NOT include a partial one:
      // including it would make the slice taller than the viewport and, because
      // the list is top-anchored, overflow would clip the NEWEST message at the
      // bottom. Leaving it out keeps the last message fully visible and leaves
      // a natural gap above the prompt, like other chat TUIs.
      break;
    }
    remaining -= rowHeights[i]! + MESSAGE_GAP;
    startIndex = i;
  }
  // Clamp so we never slice past the array bounds.
  startIndex = Math.max(0, startIndex);
  // Edge case: if even the newest message doesn't fit in the viewport, the loop
  // above includes nothing. Always show at least the newest message so the chat
  // never appears empty.
  if (startIndex === totalMessages && totalMessages > 0) {
    startIndex = totalMessages - 1;
  }
  const visibleMessages = messages.slice(startIndex);

  const hasMoreAbove = effectiveOffset < maxScrollRows;
  const hasMoreBelow = effectiveOffset > 0;

  // Auto-scroll to bottom when new messages arrive (only if already at bottom).
  useEffect(() => {
    if (scrollOffset === 0) {
      setScrollOffset(0);
    }
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScrollUpPage = useCallback(() => {
    setScrollOffset((prev) => Math.min(maxScrollRows, prev + messageAreaHeight));
  }, [maxScrollRows, messageAreaHeight]);

  const handleScrollDownPage = useCallback(() => {
    setScrollOffset((prev) => Math.max(0, prev - messageAreaHeight));
  }, [messageAreaHeight]);

  const handleScrollUp = useCallback(() => {
    setScrollOffset((prev) => Math.min(maxScrollRows, prev + SCROLL_STEP_ROWS));
  }, [maxScrollRows]);

  const handleScrollDown = useCallback(() => {
    setScrollOffset((prev) => Math.max(0, prev - SCROLL_STEP_ROWS));
  }, []);

  // Mouse wheel support: finer step than PageUp/PageDown.
  useMouseScroll({ onScrollUp: handleScrollUp, onScrollDown: handleScrollDown });

  // Expose a header-refresh hook so command handlers can re-render the
  // model label after `/provider` switches providers.
  useEffect(() => {
    const refresh = async () => {
      const result = await apiClient.getCurrentProvider();
      const m = result.data?.provider?.model;
      if (m) setModel(m);
    };
    refresh().catch(() => undefined);
    (globalThis as { __orionRefreshModel?: () => Promise<void> }).__orionRefreshModel = refresh;
    return () => {
      delete (globalThis as { __orionRefreshModel?: () => Promise<void> }).__orionRefreshModel;
    };
  }, []);

  // Resolve the current provider/model on mount so the header reflects
  // the backend state, not the placeholder default. Also syncs the
  // backend executor with the user's saved provider preference.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Sync provider from user's DB config (no-op if not authenticated)
      await apiClient.syncProvider().catch(() => undefined);
      const result = await apiClient.getCurrentProvider();
      if (cancelled) return;
      const m = result.data?.provider?.model;
      if (m) setModel(m);
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

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

  const appendToLastMessage = useCallback((chunk: string) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const lastIdx = updated.length - 1;
      const last = updated[lastIdx]!;
      updated[lastIdx] = {
        ...last,
        content: last.content === 'Processing...' ? chunk : last.content + chunk,
      };
      return updated;
    });
  }, []);

  const handleOrchestrateSentinel = useCallback((result: string) => {
    const orchProjectId = result.slice('__ORCHESTRATE__:'.length);
    addMessage('system', 'Orchestration started! Monitoring progress...');
    const sub = apiClient.subscribeOrchestration(orchProjectId, {
      onTaskStarted: (payload) => {
        const p = payload as { taskId?: string; agentId?: string };
        addMessage('system', `Task ${p.taskId?.slice(0, 8)} started by agent ${p.agentId?.slice(0, 8)}`);
      },
      onTaskCompleted: (payload) => {
        const p = payload as { taskId?: string; result?: string };
        addMessage('system', `Task ${p.taskId?.slice(0, 8)} completed: ${(p.result ?? '').slice(0, 120)}`);
      },
      onTaskFailed: (payload) => {
        const p = payload as { taskId?: string; reason?: string };
        addMessage('system', `Task ${p.taskId?.slice(0, 8)} failed: ${p.reason ?? 'unknown error'}`);
      },
      onWaveCompleted: (payload) => {
        const p = payload as { waveIndex?: number; taskIds?: string[] };
        addMessage('system', `Wave ${p.waveIndex ?? '?'} completed (${p.taskIds?.length ?? 0} tasks)`);
      },
      onPlanCompleted: () => {
        addMessage('system', 'All tasks completed! Use /tasks to see results.');
        sub?.close();
      },
      onPlanFailed: (payload) => {
        const p = payload as { reason?: string };
        addMessage('system', `Orchestration failed: ${p.reason ?? 'unknown error'}`);
        sub?.close();
      },
      onError: () => {
        addMessage('system', 'Lost connection to orchestration events.');
        sub?.close();
      },
    });
  }, [addMessage]);

  const handleTasksStreamSentinel = useCallback((result: string) => {
    const streamProjectId = result.slice('__TASKS_STREAM__:'.length);
    addMessage('system', 'Streaming agent output...');
    let streamBuffer = '';
    const sub = apiClient.subscribeAgentOutput(streamProjectId, {
      onReady: () => {
        addMessage('system', 'Connected to agent stream');
      },
      onAgentOutput: (ev) => {
        const icon = ev.type === 'tool_call' ? '⚡' : ev.type === 'tool_result' ? '✓' : ev.type === 'error' ? '✗' : ev.type === 'done' ? '●' : '○';
        const line = `${icon} [${ev.role}] ${ev.content}`;
        streamBuffer += line + '\n';
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx]?.role === 'system') {
            updated[lastIdx] = { ...updated[lastIdx]!, content: streamBuffer.trim() };
          }
          return updated;
        });
      },
      onTaskStarted: (p) => {
        const ev = p as { taskId?: string };
        streamBuffer += `\n▸ Task ${ev.taskId?.slice(0, 8)} started\n`;
      },
      onTaskCompleted: (p) => {
        const ev = p as { taskId?: string };
        streamBuffer += `\n✓ Task ${ev.taskId?.slice(0, 8)} completed\n`;
      },
      onTaskFailed: (p) => {
        const ev = p as { taskId?: string; reason?: string };
        streamBuffer += `\n✗ Task ${ev.taskId?.slice(0, 8)} failed: ${ev.reason}\n`;
      },
      onPlanCompleted: () => {
        streamBuffer += '\n● All tasks completed!';
        addMessage('system', streamBuffer.trim());
        sub?.close();
      },
      onPlanFailed: (p) => {
        const ev = p as { reason?: string };
        streamBuffer += `\n✗ Plan failed: ${ev.reason}`;
        addMessage('system', streamBuffer.trim());
        sub?.close();
      },
      onError: () => {
        addMessage('system', 'Lost connection to agent stream');
        sub?.close();
      },
    });
  }, [addMessage]);

  const handleInteractiveSelect = useCallback(
    async (option: SelectOption) => {
      if (!interactiveMenu || interactiveMenu.type !== 'select') return;

      const currentMenu = interactiveMenu;
      setInteractiveMenu(null);
      addMessage('system', 'Processing...');

      const result = await currentMenu.callback(option.value);

      if (result && typeof result === 'object' && 'type' in result) {
        setInteractiveMenu(result as InteractiveCommand);
      } else if (typeof result === 'string' && result.startsWith('__ORCHESTRATE__:')) {
        handleOrchestrateSentinel(result);
      } else if (typeof result === 'string' && result.startsWith('__TASKS_STREAM__:')) {
        handleTasksStreamSentinel(result);
      } else if (result) {
        addMessage('system', result as string);
      }
    },
    [interactiveMenu, addMessage, handleOrchestrateSentinel, handleTasksStreamSentinel],
  );

  const handleInteractiveInput = useCallback(
    async (value: string) => {
      if (!interactiveMenu || interactiveMenu.type !== 'input') return;

      const currentMenu = interactiveMenu;
      setInteractiveMenu(null);
      addMessage('system', 'Processing...');

      const result = await currentMenu.callback(value);

      if (result && typeof result === 'object' && 'type' in result) {
        setInteractiveMenu(result as InteractiveCommand);
      } else if (typeof result === 'string' && result.startsWith('__ORCHESTRATE__:')) {
        handleOrchestrateSentinel(result);
      } else if (typeof result === 'string' && result.startsWith('__TASKS_STREAM__:')) {
        handleTasksStreamSentinel(result);
      } else if (result) {
        addMessage('system', result as string);
      }
    },
    [interactiveMenu, addMessage, handleOrchestrateSentinel, handleTasksStreamSentinel],
  );

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
        if (result.exitCode !== 0 && !result.stderr)
          output += (output ? '\n' : '') + `Exit code: ${result.exitCode}`;

        addMessage('system', output || '(no output)');
        return;
      }

      if (trimmed.startsWith('/')) {
        // Echo the user's command in the transcript alongside the system
        // result, so the chat reads as a full conversation rather than just
        // a stream of agent responses. Skip `/clear` to avoid leaving a
        // dangling user message above the cleared transcript.
        if (trimmed !== '/clear') {
          addMessage('user', trimmed);
        }
        const result = await executeCommand(trimmed);

        if (result === '__CLEAR__') {
          setMessages([]);
          return;
        }

        if (result === '__EXIT__') {
          exit();
          return;
        }

        if (result === '__CHAT__') {
          setChatMode(true);
          return;
        }

        if (typeof result === 'string' && result.startsWith('__ORCHESTRATE__:')) {
          handleOrchestrateSentinel(result);
          return;
        }

        if (typeof result === 'string' && result.startsWith('__TASKS_STREAM__:')) {
          const streamProjectId = result.slice('__TASKS_STREAM__:'.length);
          addMessage('system', 'Streaming agent output... (press any key to stop)');
          let streamBuffer = '';
          const sub = apiClient.subscribeAgentOutput(streamProjectId, {
            onReady: () => {
              addMessage('system', 'Connected to agent stream');
            },
            onAgentOutput: (ev) => {
              const icon = ev.type === 'tool_call' ? '⚡' : ev.type === 'tool_result' ? '✓' : ev.type === 'error' ? '✗' : ev.type === 'done' ? '●' : '○';
              const line = `${icon} [${ev.role}] ${ev.content}`;
              streamBuffer += line + '\n';
              // Update the last system message with accumulated output.
              setMessages((prev) => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx]?.role === 'system') {
                  updated[lastIdx] = { ...updated[lastIdx]!, content: streamBuffer.trim() };
                }
                return updated;
              });
            },
            onTaskStarted: (p) => {
              const ev = p as { taskId?: string; agentId?: string };
              streamBuffer += `\n▸ Task ${ev.taskId?.slice(0, 8)} started\n`;
            },
            onTaskCompleted: (p) => {
              const ev = p as { taskId?: string; result?: string };
              streamBuffer += `\n✓ Task ${ev.taskId?.slice(0, 8)} completed\n`;
            },
            onTaskFailed: (p) => {
              const ev = p as { taskId?: string; reason?: string };
              streamBuffer += `\n✗ Task ${ev.taskId?.slice(0, 8)} failed: ${ev.reason}\n`;
            },
            onPlanCompleted: () => {
              streamBuffer += '\n● All tasks completed!';
              addMessage('system', streamBuffer.trim());
              sub?.close();
            },
            onPlanFailed: (p) => {
              const ev = p as { reason?: string };
              streamBuffer += `\n✗ Plan failed: ${ev.reason}`;
              addMessage('system', streamBuffer.trim());
              sub?.close();
            },
            onError: () => {
              addMessage('system', 'Lost connection to agent stream');
              sub?.close();
            },
          });
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
      addMessage('system', 'Processing...');

      try {
        let gotChunk = false;
        for await (const chunk of apiClient.sendChatStream(trimmed)) {
          appendToLastMessage(chunk);
          gotChunk = true;
        }
        if (!gotChunk) {
          addMessage('system', '(empty response)');
        }
      } catch (err) {
        addMessage(
          'system',
          `Chat error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
    [addMessage, exit, appendToLastMessage, handleOrchestrateSentinel],
  );

  if (chatMode) {
    return <ChatView onExit={() => setChatMode(false)} />;
  }

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
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight} overflow="hidden">
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
        <Box
          ref={setMessageAreaRef}
          // Top-anchored transcript (like other chat TUIs): messages flow from
          // the top, and the fixed gap below keeps the newest message well above
          // the input. The walk above guarantees the slice never overflows the
          // viewport, so the newest message is never clipped at the bottom.
          flexGrow={1}
          flexShrink={1}
          overflow="hidden"
          flexDirection="column"
          width="100%"
        >
          {visibleMessages.length > 0 ? (
            <MessageHistory messages={visibleMessages} />
          ) : (
            <Box flexDirection="column" paddingX={1} marginTop={1}>
              <Text color={'#888'}>Type a command or message to get started.</Text>
            </Box>
          )}
        </Box>
        {hasMoreBelow && (
          <Box flexShrink={0} paddingLeft={1}>
            <Text color={'#888'}>▼ scroll down (Page Down / wheel)</Text>
          </Box>
        )}
        <Box flexShrink={0} height={MESSAGE_BOTTOM_GAP} width="100%" />
      </Box>
      <Box flexShrink={0} width="100%">
        <PromptInput
          onSubmit={handleSubmit}
          onScrollUp={handleScrollUpPage}
          onScrollDown={handleScrollDownPage}
          onHistoryHintChange={setHistoryHint}
        />
      </Box>
      <Box flexShrink={0} width="100%">
        <StatusBar
          model={model}
          agentCount={activeAgentCount || agentCount}
          historyHint={historyHint}
        />
      </Box>
    </Box>
  );
}
