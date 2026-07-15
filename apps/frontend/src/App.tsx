import React, { useState, useCallback } from "react";
import { Box, useApp } from "ink";
import { WelcomeScreen } from "./components/WelcomeScreen.js";
import { MessageHistory } from "./components/MessageHistory.js";
import { PromptInput } from "./components/PromptInput.js";
import { StatusBar } from "./components/StatusBar.js";
import { findCommand, parseCommand } from "./utils/commands.js";
import type { Message, Agent, Task } from "./types/index.js";

interface AppProps {
  model?: string;
  agentCount?: number;
}

export function App({ model = "gpt-4", agentCount = 0 }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const [showWelcome, setShowWelcome] = useState(true);
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
    (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return;

      if (showWelcome) {
        setShowWelcome(false);
      }

      // Command handling
      if (trimmed.startsWith("/")) {
        const { command, args } = parseCommand(trimmed);

        // /clear — wipe message history
        if (command === "clear") {
          setMessages([]);
          return;
        }

        // /exit — exit the app
        if (command === "exit" || command === "quit" || command === "q") {
          exit();
          return;
        }

        // Look up and execute other commands
        const cmd = findCommand(command);
        if (cmd) {
          cmd.handler(args);
          return;
        }

        addMessage("system", `Unknown command: /${command}. Type /help for available commands.`);
        return;
      }

      // Natural language — treat as user message, send to orchestrator placeholder
      addMessage("user", trimmed);

      // Placeholder: simulate orchestrator response
      setTimeout(() => {
        addMessage(
          "system",
          "Orchestrator received your request. (Agent orchestration is not yet connected.)",
        );
      }, 300);
    },
    [showWelcome, addMessage, exit],
  );

  // Welcome screen — shown until first input
  if (showWelcome) {
    return (
      <Box flexDirection="column">
        <WelcomeScreen model={model} directory={process.cwd()} />
        <PromptInput onSubmit={handleSubmit} />
      </Box>
    );
  }

  // REPL view — messages + prompt + status bar
  return (
    <Box flexDirection="column" padding={1}>
      <MessageHistory messages={messages} />
      <Box marginTop={1}>
        <PromptInput onSubmit={handleSubmit} />
      </Box>
      <Box marginTop={1}>
        <StatusBar model={model} agentCount={activeAgentCount || agentCount} />
      </Box>
    </Box>
  );
}
