import { Box, Text } from 'ink';
import type React from 'react';
import { STATUS_COLORS, STATUS_ICONS, theme } from '../theme.js';

type TaskStatusValue =
  | 'pending'
  | 'planning'
  | 'running'
  | 'waiting'
  | 'review'
  | 'testing'
  | 'completed'
  | 'failed'
  | 'cancelled';

interface Task {
  id: string;
  title: string;
  status: TaskStatusValue;
  assignedAgentId: string | null;
}

interface TaskListProps {
  tasks?: Task[];
}

const DEMO_TASKS: Task[] = [
  { id: 'T1', title: 'Create entity User', status: 'completed', assignedAgentId: 'backend' },
  { id: 'T2', title: 'Create Repository', status: 'running', assignedAgentId: 'database' },
  { id: 'T3', title: 'Create JWT Auth', status: 'pending', assignedAgentId: null },
  { id: 'T4', title: 'Create Tests', status: 'pending', assignedAgentId: null },
];

export function TaskList({ tasks = DEMO_TASKS }: TaskListProps): React.ReactElement {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.surfaceBorderLight} paddingX={1} marginTop={1}>
      <Text bold color={theme.secondary}>
        Tasks
      </Text>
      <Box flexDirection="column" marginTop={1} gap={0}>
        {tasks.map((task) => (
          <Box key={task.id} gap={1}>
            <Text color={STATUS_COLORS[task.status] || theme.textDim}>
              {STATUS_ICONS[task.status] || '?'}{' '}
            </Text>
            <Text bold color={theme.text}>
              {task.title}
            </Text>
            {task.assignedAgentId && (
              <Text color={theme.textDim}>→ {task.assignedAgentId}</Text>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
