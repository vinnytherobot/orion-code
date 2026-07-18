import { Box, Text } from 'ink';
import type React from 'react';
import { STATUS_COLORS, STATUS_ICONS, theme } from '../theme.js';

type AgentStatusValue = 'idle' | 'running' | 'waiting' | 'failed' | 'completed';

interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatusValue;
  currentTaskId: string | null;
}

interface AgentPanelProps {
  agents?: Agent[];
}

const DEMO_AGENTS: Agent[] = [
  { id: 'planner', name: 'Planner', role: 'planning', status: 'idle', currentTaskId: null },
  { id: 'backend', name: 'Backend', role: 'backend', status: 'completed', currentTaskId: null },
  { id: 'database', name: 'Database', role: 'database', status: 'running', currentTaskId: 'T2' },
  { id: 'qa', name: 'QA', role: 'quality', status: 'idle', currentTaskId: null },
];

export function AgentPanel({ agents = DEMO_AGENTS }: AgentPanelProps): React.ReactElement {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.surfaceBorderLight} paddingX={1} marginTop={1}>
      <Text bold color={theme.purple}>
        Agents
      </Text>
      <Box flexDirection="column" marginTop={1} gap={0}>
        {agents.map((agent) => (
          <Box key={agent.id} gap={1}>
            <Text color={STATUS_COLORS[agent.status] || theme.textDim}>
              {STATUS_ICONS[agent.status] || '○'}
            </Text>
            <Text bold color={theme.text}>
              {agent.name}
            </Text>
            <Text color={theme.textDim}>{agent.role}</Text>
            {agent.currentTaskId && (
              <Text color={theme.secondary}>→ {agent.currentTaskId}</Text>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
