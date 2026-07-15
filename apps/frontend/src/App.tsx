import React from "react";
import { Box, Text } from "ink";
import { StatusBar } from "./components/StatusBar.js";
import { TaskList } from "./components/TaskList.js";
import { AgentPanel } from "./components/AgentPanel.js";

interface AppProps {
  model?: string;
  agentCount?: number;
}

export function App({ model = "gpt-4", agentCount = 0 }: AppProps): React.ReactElement {
  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          ═══ Orion CLI - Multi-Agent Orchestrator ═══
        </Text>
      </Box>

      <StatusBar model={model} agentCount={agentCount} />

      <Box marginTop={1}>
        <AgentPanel />
      </Box>

      <Box marginTop={1}>
        <TaskList />
      </Box>
    </Box>
  );
}
