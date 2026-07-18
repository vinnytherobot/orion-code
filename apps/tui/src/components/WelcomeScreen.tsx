import { Box, Text } from 'ink';
import type React from 'react';
import { apiClient } from '../api/client.js';
import { theme } from '../theme.js';
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
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      <Box flexDirection="column" alignItems="center">
        <Text color="#6C5CE7">{ORION_BANNER}</Text>
        <Box gap={1} marginTop={-1} marginBottom={1}>
          <Text color={theme.textDim}>{ORION_TAGLINE}</Text>
          <Text color={theme.textDim}>v{ORION_VERSION}</Text>
        </Box>
      </Box>

      <Box borderStyle="round" borderColor={theme.surfaceBorderLight} paddingX={1} paddingY={0} flexDirection="column">
        <Box gap={1} marginBottom={1}>
          <Text bold color={theme.secondary}>❯ Quick Start</Text>
        </Box>
        {displayTips.map((tip, index) => (
          <Box key={index} gap={1}>
            <Text color={theme.primaryDim}>┃</Text>
            <Text color={theme.text}>{tip}</Text>
          </Box>
        ))}
        <Box marginTop={1} borderTop borderColor={theme.surfaceBorder} paddingTop={1}>
          <Box gap={1}>
            <Text color={theme.textDim}>Model:</Text>
            <Text color={theme.secondary}>{model}</Text>
            <Text color={theme.textDim}>|</Text>
            <Text color={theme.textDim}>Dir:</Text>
            <Text color={theme.secondaryLight}>{directory}</Text>
          </Box>
        </Box>
        {apiClient.isAuthenticated() && (
          <Box marginTop={1}>
            <Text color={theme.success}>◆ Authenticated (persistent session)</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
