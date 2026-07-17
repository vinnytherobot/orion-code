import { Box, Text } from 'ink';
import type React from 'react';
import type { Message } from '../types/index.js';

interface MessageHistoryProps {
  messages?: Message[];
}

const ROLE_LABELS: Record<Message['role'], string> = {
  user: 'You',
  assistant: 'Orion',
  system: 'System',
};

const ROLE_COLORS: Record<Message['role'], string> = {
  user: 'magenta',
  assistant: 'green',
  system: 'magenta',
};

export function MessageHistory({ messages = [] }: MessageHistoryProps): React.ReactElement {
  if (messages.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text color="gray">Type a command or message to get started.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      {messages.map((msg) => (
        <Box key={msg.id} borderBottom borderColor={ROLE_COLORS[msg.role]} borderStyle="single" flexDirection="column" marginBottom={1}>
          <Box>
            <Text color={ROLE_COLORS[msg.role]} bold>
              {ROLE_LABELS[msg.role]}
            </Text>
            {msg.agent && <Text color="gray"> ({msg.agent.name})</Text>}
          </Box>
          <Text wrap="wrap">{msg.content}</Text>
        </Box>
      ))}
    </Box>
  );
}
