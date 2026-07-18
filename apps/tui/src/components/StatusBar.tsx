import { Box, Text } from 'ink';
import type React from 'react';
import { theme } from '../theme.js';

interface StatusBarProps {
  model?: string;
  agentCount?: number;
}

export function StatusBar({
  model = 'not-set',
  agentCount = 0,
}: StatusBarProps): React.ReactElement {
  return (
    <Box
      borderStyle="round"
      borderColor={theme.surfaceBorderLight}
      paddingX={1}
      justifyContent="space-between"
      marginTop={1}
    >
      <Box gap={1}>
        <Text color={theme.textDim}>⌘</Text>
        <Text color={theme.textDim}>/ for commands</Text>
      </Box>
      <Box gap={1}>
        <Text color={theme.textDim}>●</Text>
        <Text color={agentCount > 0 ? theme.secondary : theme.textDim}>
          {agentCount} agent{agentCount !== 1 ? 's' : ''}
        </Text>
        <Text color={theme.surfaceBorderLight}>│</Text>
        <Text color={theme.purple}>{model}</Text>
      </Box>
    </Box>
  );
}
