import React from "react";
import { Box, Text } from "ink";
import type { Message } from "../types/index.js";

interface MessageHistoryProps {
  messages?: Message[];
}

const DEMO_MESSAGES: Message[] = [
  { id: "m1", role: "user", content: "Create a REST API for user management", timestamp: new Date() },
  { id: "m2", role: "system", content: "Orchestrator initialized. Spawning Planner Agent...", timestamp: new Date() },
  { id: "m3", role: "assistant", content: "I'll break this into tasks: entity creation, repository, JWT auth, routes, and tests.", timestamp: new Date(), agent: { id: "planner", name: "Planner", description: "", role: "planner", status: "running" } },
  { id: "m4", role: "user", content: "Proceed with the plan.", timestamp: new Date() },
  { id: "m5", role: "assistant", content: "Task T1 (Create entity User) completed. Moving to T2.", timestamp: new Date(), agent: { id: "backend", name: "Backend", description: "", role: "backend", status: "completed" } },
];

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

export function MessageHistory({ messages = DEMO_MESSAGES }: MessageHistoryProps): React.ReactElement {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="magenta" paddingX={1}>
      <Text bold color="magenta">
        Messages
      </Text>
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
