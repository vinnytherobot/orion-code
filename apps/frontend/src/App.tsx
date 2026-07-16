import React, { useState, useCallback } from "react";
import { Box, useApp } from "ink";
import { WelcomeScreen } from "./components/WelcomeScreen.js";
import { MessageHistory } from "./components/MessageHistory.js";
import { PromptInput } from "./components/PromptInput.js";
import { StatusBar } from "./components/StatusBar.js";
import { executeCommand } from "./utils/commands.js";
import type { Message, Agent, Task } from "./types/index.js";

interface AppProps {
  model?: string;
  agentCount?: number;
}

export function App({ model = "not-set", agentCount = 0 }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents] = useState<Agent[]>([]);
  const [_tasks] = useState<Task[]>([]);

  const activeAgentCount = agents.filter((a) => a.status === "running").length;

  const addMessage = useCallback(
    (role: Message["role"], content: string, agent?: Agent) => {
      const msg: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role,
        content,
        timestamp: new Date(),
        agent,
      };
      setMessages((prev) => [...prev, msg]);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return;

      // Handle commands starting with /
      if (trimmed.startsWith("/")) {
        const result = await executeCommand(trimmed);

        if (result === "__CLEAR__") {
          setMessages([]);
          return;
        }

        if (result === "__EXIT__") {
          exit();
          return;
        }

        if (result) {
          addMessage("system", result);
        }
        return;
      }

      // Natural language — treat as user message
      addMessage("user", trimmed);

      // Placeholder: simulate orchestrator response
      setTimeout(() => {
        addMessage(
          "system",
          "Orchestrator received your request. (Agent orchestration is not yet connected.)",
        );
      }, 300);
    },
    [addMessage, exit],
  );

  // Main view — welcome always visible, messages below
  return (
    <Box flexDirection="column">
      <WelcomeScreen model={model} directory={process.cwd()} />
      {messages.length > 0 && <MessageHistory messages={messages} />}
      <PromptInput onSubmit={handleSubmit} />
      <StatusBar model={model} agentCount={activeAgentCount || agentCount} />
    </Box>
  );
}
