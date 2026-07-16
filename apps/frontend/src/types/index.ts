/**
 * Core type definitions for Orion CLI TUI
 */

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agent?: Agent;
  taskId?: string;
}

export interface Command {
  name: string;
  description: string;
  usage?: string;
  handler: (args: string[]) => Promise<string | void> | string | void;
  aliases?: string[];
  hidden?: boolean;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  role: 'orchestrator' | 'planner' | 'architect' | 'backend' | 'database' | 'frontend' | 'qa' | 'reviewer' | 'devops' | 'security' | 'performance' | 'git' | 'documentation';
  status: 'idle' | 'running' | 'blocked' | 'completed';
  model?: string;
}

export interface Task {
  id: string;
  summary: string;
  status: 'pending' | 'planning' | 'running' | 'waiting' | 'review' | 'testing' | 'completed' | 'failed' | 'cancelled';
  agent?: Agent;
  parentId?: string;
  subtasks?: Task[];
  createdAt: Date;
  updatedAt: Date;
  result?: string;
  error?: string;
}

export interface AppConfig {
  theme: 'dark' | 'light' | 'auto';
  showLineNumbers: boolean;
  autoScroll: boolean;
  fontSize: number;
  soundEnabled: boolean;
  agentModels: Record<string, string>;
  workspacePath: string;
  maxConcurrentAgents: number;
}

export interface Project {
  name: string;
  path: string;
  description?: string;
  agents: Agent[];
  tasks: Task[];
  config: AppConfig;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

export interface Session {
  id: string;
  projectId: string;
  messages: Message[];
  activeTasks: Task[];
  createdAt: Date;
  updatedAt: Date;
}
