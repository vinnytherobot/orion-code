import React from "react";
import { Box, Text } from "ink";
import { ORION_BANNER, ORION_VERSION } from "../utils/ascii-logo.js";

interface WelcomeScreenProps {
  model?: string;
  directory?: string;
  tips?: string[];
}

export function WelcomeScreen({
  model = "gpt-4",
  directory = ".",
  tips,
}: WelcomeScreenProps): React.ReactElement {
  const defaultTips = [
    'Type /help to see available commands',
    "Use Tab to autocomplete commands",
    'Press Escape to cancel current operation',
    "Type /config to customize settings",
  ];

  const displayTips = tips || defaultTips;

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          {ORION_BANNER}
        </Text>
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Text bold color="green">
          Welcome to Orion CLI!
        </Text>
        <Text color="gray">
          Your multi-agent code orchestration assistant
        </Text>
      </Box>

      <Box
        borderStyle="round"
        borderColor="yellow"
        paddingX={1}
        flexDirection="column"
        marginBottom={1}
      >
        <Text bold color="yellow">
          Quick Tips
        </Text>
        {displayTips.map((tip, index) => (
          <Text key={index} color="white">
            {"  "}- {tip}
          </Text>
        ))}
      </Box>

      <Box
        borderStyle="round"
        borderColor="blue"
        paddingX={1}
        flexDirection="column"
        marginBottom={1}
      >
        <Text bold color="blue">
          What's New in v{ORION_VERSION}
        </Text>
        <Text color="white">- Multi-agent orchestration system</Text>
        <Text color="white">- Specialized agent roles</Text>
        <Text color="white">- Task tracking and management</Text>
      </Box>

      <Box borderStyle="round" borderColor="gray" paddingX={1}>
        <Text color="gray">
          Model: {model} │ Directory: {directory}
        </Text>
      </Box>
    </Box>
  );
}
