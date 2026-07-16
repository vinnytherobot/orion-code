import React from "react";
import { Box, Text } from "ink";

interface StatusBarProps {
  model?: string;
  agentCount?: number;
}

export function StatusBar({ model = "not-set", agentCount = 0 }: StatusBarProps): React.ReactElement {
  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      paddingX={1}
      justifyContent="space-between"
    >
      <Box>
        <Text color="gray">
          / for shortcuts ·
        </Text>
      </Box>
      <Box>
        <Text color="yellow">
          {model}
        </Text>
        <Text color="gray">
          {" │ "}
        </Text>
        <Text color="cyan">
          {agentCount} agents
        </Text>
      </Box>
    </Box>
  );
}
