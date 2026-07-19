import { Box, Text } from 'ink';
import type React from 'react';
import { theme } from '../theme.js';
import type { Message } from '../types/index.js';

interface MessageHistoryProps {
  messages?: Message[];
}

const ROLE_CONFIG: Record<Message['role'], { label: string; color: string; icon: string }> = {
  user: { label: 'You', color: theme.secondary, icon: '●' },
  assistant: { label: 'Orion', color: theme.primary, icon: '★' },
  system: { label: 'System', color: theme.purple, icon: '◆' },
};

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function MessageHistory({ messages = [] }: MessageHistoryProps): React.ReactElement {
  if (messages.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1} marginTop={1}>
        <Text color={theme.textDim}>Type a command or message to get started.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1} marginTop={1} gap={1} width="100%">
      {messages.map((msg) => {
        const config = ROLE_CONFIG[msg.role];
        return (
          <Box
            key={msg.id}
            flexDirection="column"
            borderStyle="round"
            borderColor={theme.surfaceBorder}
            paddingX={1}
            paddingY={0}
            flexShrink={0}
            width="100%"
          >
            <Box gap={1} marginBottom={1}>
              <Text color={config.color}>{config.icon}</Text>
              <Text color={config.color} bold>
                {config.label}
              </Text>
              {msg.agent && <Text color={theme.textDim}>({msg.agent.name})</Text>}
              <Text color={theme.textDim}>{formatTime(msg.timestamp)}</Text>
            </Box>
            <Text wrap="wrap" color={theme.text}>
              {msg.content}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
