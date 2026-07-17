import { Box, Text } from 'ink';
import type React from 'react';

interface StatusBarProps {
  model?: string;
  agentCount?: number;
}

export function StatusBar({
  model = 'not-set',
  agentCount = 0,
}: StatusBarProps): React.ReactElement {
  return (
    <Box borderStyle="round" borderColor="magenta" paddingX={1} justifyContent="space-between">
      <Box>
        <Text color="gray">/ for shortcuts ·</Text>
      </Box>
      <Box>
        <Text color="magenta">{model}</Text>
        <Text color="gray">{' │ '}</Text>
        <Text color="magenta">{agentCount} agents</Text>
      </Box>
    </Box>
  );
}
