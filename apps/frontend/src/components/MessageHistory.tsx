import React from "react";
import { Box, Text } from "ink";
import type { Message } from "../types/index.js";

interface MessageHistoryProps {
  messages?: Message[];
}

const ROLE_LABELS: Record<Message["role"], string> = {
  user: "You",
  assistant: "Orion",
  system: "System",
};

const ROLE_COLORS: Record<Message["role"], string> = {
  user: "cyan",
  assistant: "green",
  system: "yellow",
};

export function MessageHistory({ messages = [] }: MessageHistoryProps): React.ReactElement {
  if (messages.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text color="gray">
          Type a command or message to get started.
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      {messages.map((msg) => (
        <Box key={msg.id} flexDirection="column" marginBottom={1}>
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
