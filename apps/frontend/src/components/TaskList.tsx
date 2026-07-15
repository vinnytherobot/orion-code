import React from "react";
import { Box, Text } from "ink";

type TaskStatusValue =
  | "pending"
  | "planning"
  | "running"
  | "waiting"
  | "review"
  | "testing"
  | "completed"
  | "failed"
  | "cancelled";

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
  { id: "T1", title: "Create entity User", status: "completed", assignedAgentId: "backend" },
  { id: "T2", title: "Create Repository", status: "running", assignedAgentId: "database" },
  { id: "T3", title: "Create JWT Auth", status: "pending", assignedAgentId: null },
  { id: "T4", title: "Create Tests", status: "pending", assignedAgentId: null },
];

export function TaskList({ tasks = DEMO_TASKS }: TaskListProps): React.ReactElement {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="blue" paddingX={1}>
      <Text bold color="blue">
        Tasks
      </Text>
      {tasks.map((task) => (
        <Box key={task.id}>
          <Text>{getStatusIcon(task.status)} </Text>
          <Text bold>{task.title}</Text>
          {task.assignedAgentId && <Text color="gray"> [{task.assignedAgentId}]</Text>}
        </Box>
      ))}
    </Box>
  );
}

function getStatusIcon(status: TaskStatusValue): string {
  switch (status) {
    case "completed":
      return "✓";
    case "running":
      return "⟳";
    case "failed":
      return "✗";
    case "pending":
      return "○";
    case "planning":
      return "◎";
    case "waiting":
      return "⏳";
    case "review":
      return "👁";
    case "testing":
      return "⚡";
    case "cancelled":
      return "⊘";
    default:
      return "?";
  }
}
