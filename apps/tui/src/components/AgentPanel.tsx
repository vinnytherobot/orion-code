import { Box, Text } from 'ink';
import type React from 'react';

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
    <Box flexDirection="column" borderStyle="single" borderColor="magenta" paddingX={1}>
      <Text bold color="magenta">
        Agents
      </Text>
      {agents.map((agent) => (
        <Box key={agent.id}>
          <Text color={getStatusColor(agent.status)}>● </Text>
          <Text bold>{agent.name}</Text>
          <Text color="gray"> ({agent.role})</Text>
          {agent.currentTaskId && <Text color="magenta"> → {agent.currentTaskId}</Text>}
        </Box>
      ))}
    </Box>
  );
}

function getStatusColor(status: AgentStatusValue): string {
  switch (status) {
    case 'running':
      return 'magenta';
    case 'waiting':
      return 'magenta';
    case 'failed':
      return 'red';
    case 'completed':
      return 'green';
    default:
      return 'gray';
  }
}
