import { Box, Text } from 'ink';
import type React from 'react';
import { apiClient } from '../api/client.js';
import { ORION_BANNER, ORION_TAGLINE, ORION_VERSION } from '../utils/ascii-logo.js';

interface WelcomeScreenProps {
  model?: string;
  directory?: string;
  tips?: string[];
}

export function WelcomeScreen({
  model,
  directory = '.',
  tips,
}: WelcomeScreenProps): React.ReactElement {
  const defaultTips = [
    '/help - Show available commands',
    '/init - Create a new Orion project',
    '/implement - Start coding',
    '/exit - Quit Orion Code',
  ];

  const displayTips = tips || defaultTips;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box flexDirection="column" alignItems="center" marginBottom={1}>
        <Text color="magenta" bold>
          {ORION_BANNER}
        </Text>
        <Text color="gray">
          {ORION_TAGLINE} v{ORION_VERSION}
        </Text>
      </Box>

      <Box borderStyle="single" borderColor="gray" paddingX={1} flexDirection="column">
        <Text bold color="magenta">
          Quick Start
        </Text>
        {displayTips.map((tip, index) => (
          <Text key={index} color="white">
            {tip}
          </Text>
        ))}
        <Text color="gray">
          Model: {model} | Dir: {directory}
        </Text>
        {apiClient.isAuthenticated() && (
          <Box marginTop={1}>
            <Text color="green">[OK] Logged in (persistent session)</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
