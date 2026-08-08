import { Box, Text, useInput, useStdout } from 'ink';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import stringWidth from 'string-width';
import { apiClient } from '../api/client.js';
import { theme } from '../theme.js';
import type { ChatSession, Message } from '../types/index.js';
import { MessageHistory } from './MessageHistory.js';
import { PromptInput } from './PromptInput.js';

interface ChatViewProps {
  onExit: () => void;
}

const MESSAGE_BOX_OVERHEAD = 4;
const MESSAGE_GAP = 1;
const MESSAGE_LIST_MARGIN_TOP = 1;
const MESSAGE_BOTTOM_GAP = 3;

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

function formatSessionDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `today ${h}:${m}`;
  }
  return d.toLocaleDateString();
}

export function ChatView({ onExit }: ChatViewProps): React.ReactElement {
  const { stdout } = useStdout();
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionTitle, setActiveSessionTitle] = useState('New Chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const terminalHeight = (stdout.rows ?? 24) - 1;
  const terminalWidth = stdout.columns ?? 80;

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoadingSessions(true);
    const result = await apiClient.listChatSessions();
    if (result.data?.sessions) {
      setSessions(result.data.sessions);
    }
    setLoadingSessions(false);
  };

  // ── Session list navigation ──
  useInput(
    (char, key) => {
      if (view !== 'list') return;
      // Drop mouse SGR sequences
      if (/^(\[<\d+;\d+;\d+[Mm]\x1b?)+$/.test(char)) return;

      if (key.upArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : sessions.length));
        return;
      }
      if (key.downArrow) {
        setSelectedIndex((prev) => (prev < sessions.length ? prev + 1 : 0));
        return;
      }
      if (key.return) {
        if (selectedIndex === 0) {
          handleNewChat();
        } else {
          const session = sessions[selectedIndex - 1];
          if (session) handleSelectSession(session);
        }
        return;
      }
      if (key.escape) {
        onExit();
        return;
      }
    },
    { isActive: view === 'list' },
  );

  const handleNewChat = async () => {
    const result = await apiClient.createChatSession();
    if (result.data?.session) {
      setActiveSessionId(result.data.session.id);
      setActiveSessionTitle(result.data.session.title);
      setMessages([]);
      setScrollOffset(0);
      setView('chat');
    }
  };

  const handleSelectSession = async (session: ChatSession) => {
    setActiveSessionId(session.id);
    setActiveSessionTitle(session.title);
    setIsLoading(true);

    const result = await apiClient.getChatSession(session.id);
    if (result.data) {
      const msgs: Message[] = result.data.messages.map((m) => ({
        id: m.id,
        role: m.role as Message['role'],
        content: m.content,
        timestamp: new Date(m.createdAt),
      }));
      setMessages(msgs);
      setScrollOffset(0);
    }

    setIsLoading(false);
    setView('chat');
  };

  // ── Chat view logic ──
  const addMessage = useCallback((role: Message['role'], content: string) => {
    const msg: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => {
      const lastIdx = prev.length - 1;
      const lastMsg = lastIdx >= 0 ? prev[lastIdx] : undefined;
      if (lastMsg?.content === 'Thinking...') {
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
      updated[lastIdx] = { ...last, content: last.content === 'Thinking...' ? chunk : last.content + chunk };
      return updated;
    });
  }, []);

  const handleSubmit = useCallback(
    async (input: string) => {
      const trimmed = input.trim();
      if (!trimmed || !activeSessionId || isLoading) return;

      addMessage('user', trimmed);
      addMessage('system', 'Thinking...');
      setIsLoading(true);

      try {
        let gotChunk = false;
        for await (const chunk of apiClient.sendTechLeadChatStream(activeSessionId, trimmed)) {
          appendToLastMessage(chunk);
          gotChunk = true;
        }
        if (!gotChunk) {
          addMessage('system', '(empty response)');
        }
      } catch (err) {
        // If streaming fails, fall back to non-streaming
        try {
          const result = await apiClient.sendTechLeadChat(activeSessionId, trimmed);
          if (result.error) {
            addMessage('system', `Error: ${result.error}`);
          } else {
            addMessage('system', result.data!.reply);
          }
        } catch {
          addMessage('system', `Error: ${err instanceof Error ? err.message : String(err)}`);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [activeSessionId, isLoading, addMessage, appendToLastMessage],
  );

  const handleBackToList = useCallback(() => {
    setView('list');
    loadSessions();
  }, []);

  // ── Scroll logic for chat view ──
  const rowHeights = messages.map((msg) => messageRows(msg, terminalWidth));
  const totalMessages = messages.length;
  const messageAreaHeight = Math.max(3, terminalHeight - 10);
  const totalListRows =
    rowHeights.reduce((sum, rows) => sum + rows, 0) +
    MESSAGE_GAP * Math.max(0, totalMessages - 1) +
    MESSAGE_LIST_MARGIN_TOP;
  const maxScrollRows = Math.max(0, totalListRows - messageAreaHeight);
  const effectiveOffset = Math.min(scrollOffset, maxScrollRows);

  let startIndex = totalMessages;
  let remaining = messageAreaHeight + effectiveOffset;
  for (let i = totalMessages - 1; i >= 0; i--) {
    if (remaining <= 0) break;
    if (remaining < rowHeights[i]! + MESSAGE_GAP) break;
    remaining -= rowHeights[i]! + MESSAGE_GAP;
    startIndex = i;
  }
  startIndex = Math.max(0, startIndex);
  if (startIndex === totalMessages && totalMessages > 0) {
    startIndex = totalMessages - 1;
  }
  const visibleMessages = messages.slice(startIndex);
  const hasMoreAbove = effectiveOffset < maxScrollRows;
  const hasMoreBelow = effectiveOffset > 0;

  const handleScrollUpPage = useCallback(() => {
    setScrollOffset((prev) => Math.min(maxScrollRows, prev + messageAreaHeight));
  }, [maxScrollRows, messageAreaHeight]);

  const handleScrollDownPage = useCallback(() => {
    setScrollOffset((prev) => Math.max(0, prev - messageAreaHeight));
  }, [messageAreaHeight]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollOffset === 0) {
      setScrollOffset(0);
    }
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render: Session List ──
  if (view === 'list') {
    return (
      <Box flexDirection="column" width={terminalWidth} height={terminalHeight} overflow="hidden">
        {/* Header */}
        <Box
          borderStyle="round"
          borderColor={theme.accent}
          paddingX={1}
          flexShrink={0}
          width="100%"
        >
          <Text color={theme.accent} bold>
            ★ Tech Lead Chat
          </Text>
          <Text color={theme.textDim}> — Select a conversation or start new</Text>
        </Box>

        {/* Session list */}
        <Box flexDirection="column" paddingX={1} marginTop={1} flexGrow={1} overflow="hidden">
          {loadingSessions ? (
            <Text color={theme.textDim}>Loading sessions...</Text>
          ) : (
            <>
              {/* New Chat option */}
              <Box gap={1}>
                <Text color={selectedIndex === 0 ? theme.accent : theme.textDim} bold={selectedIndex === 0}>
                  {selectedIndex === 0 ? '▸' : ' '}
                </Text>
                <Text color={selectedIndex === 0 ? theme.textBright : theme.textDim} bold={selectedIndex === 0}>
                  + New Chat
                </Text>
              </Box>

              {/* Existing sessions */}
              {sessions.map((session, idx) => {
                const optionIndex = idx + 1;
                const isSelected = optionIndex === selectedIndex;
                return (
                  <Box key={session.id} gap={1}>
                    <Text color={isSelected ? theme.accent : theme.textDim} bold={isSelected}>
                      {isSelected ? '▸' : ' '}
                    </Text>
                    <Text color={isSelected ? theme.textBright : theme.text} bold={isSelected}>
                      {session.title}
                    </Text>
                    <Text color={theme.textDim}>
                      ({session.messageCount} msgs, {formatSessionDate(session.updatedAt)})
                    </Text>
                  </Box>
                );
              })}

              {sessions.length === 0 && (
                <Box marginTop={1}>
                  <Text color={theme.textDim}>No previous conversations.</Text>
                </Box>
              )}
            </>
          )}
        </Box>

        {/* Footer hint */}
        <Box flexShrink={0} paddingX={1} marginTop={1}>
          <Text color={theme.textDim}>↑↓ navigate · Enter select · Escape exit</Text>
        </Box>
      </Box>
    );
  }

  // ── Render: Active Chat ──
  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight} overflow="hidden">
      {/* Header */}
      <Box
        borderStyle="round"
        borderColor={theme.accent}
        paddingX={1}
        flexShrink={0}
        width="100%"
        justifyContent="space-between"
      >
        <Box gap={1}>
          <Text color={theme.accent} bold>★ Tech Lead Chat</Text>
          <Text color={theme.textDim}> — {activeSessionTitle}</Text>
        </Box>
        <Text color={theme.textDim}>Escape: back</Text>
      </Box>

      {/* Message area */}
      <Box
        flexGrow={1}
        flexShrink={1}
        overflow="hidden"
        flexDirection="column"
        width="100%"
      >
        {hasMoreAbove && (
          <Box flexShrink={0} paddingLeft={1}>
            <Text color={theme.textDim}>▲ scroll up (Page Up)</Text>
          </Box>
        )}
        <Box
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
              <Text color={theme.textDim}>Start a conversation with the Tech Lead.</Text>
              <Text color={theme.textDim}>Ask about architecture, agent coordination, or task planning.</Text>
            </Box>
          )}
        </Box>
        {hasMoreBelow && (
          <Box flexShrink={0} paddingLeft={1}>
            <Text color={theme.textDim}>▼ scroll down (Page Down)</Text>
          </Box>
        )}
        <Box flexShrink={0} height={MESSAGE_BOTTOM_GAP} width="100%" />
      </Box>

      {/* Input */}
      <Box flexShrink={0} width="100%">
        <PromptInput
          onSubmit={handleSubmit}
          onScrollUp={handleScrollUpPage}
          onScrollDown={handleScrollDownPage}
          onEscape={handleBackToList}
        />
      </Box>
    </Box>
  );
}
