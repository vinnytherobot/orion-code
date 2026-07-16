/**
 * Command definitions for Orion CLI
 */

import type { Command } from '../types/index.js';
import { apiClient } from '../api/client.js';

export const COMMANDS: Command[] = [
  {
    name: 'help',
    description: 'Show available commands',
    usage: '/help [command]',
    handler: async (args: string[]): Promise<string> => {
      const firstArg = args[0];
      if (firstArg) {
        const cmd = COMMANDS.find(c => c.name === firstArg || c.aliases?.includes(firstArg));
        if (cmd) {
          let output = `\n${cmd.name.toUpperCase()}\n${cmd.description}`;
          if (cmd.usage) output += `\nUsage: ${cmd.usage}`;
          if (cmd.aliases?.length) output += `\nAliases: ${cmd.aliases.join(', ')}`;
          return output;
        }
        return `Command not found: ${firstArg}`;
      }
      let output = '\nAvailable commands:';
      COMMANDS.filter(c => !c.hidden).forEach(cmd => {
        output += `\n  ${cmd.name.padEnd(20)} ${cmd.description}`;
      });
      return output;
    },
  },
  {
    name: 'clear',
    description: 'Clear the terminal screen',
    handler: async (): Promise<string> => '__CLEAR__',
  },
  {
    name: 'status',
    description: 'Show current project status and active agents',
    handler: async (): Promise<string> => {
      if (!apiClient.isAuthenticated()) {
        return '\nNot authenticated. Use /login or /register first.';
      }

      const [healthResult, agentsResult] = await Promise.all([
        apiClient.health(),
        apiClient.getAgentStats(),
      ]);

      if (healthResult.error) return `\nError: ${healthResult.error}`;

      let output = `\nAPI Status: ${healthResult.data?.status || 'unknown'}`;
      output += `\nVersion: ${healthResult.data?.version || 'unknown'}`;

      if (agentsResult.data?.stats) {
        const s = agentsResult.data.stats;
        output += `\n\nAgents: ${s.total} total, ${s.idle} idle, ${s.running} running`;
      }

      return output;
    },
  },
  {
    name: 'agents',
    description: 'List all available agents',
    usage: '/agents [role]',
    handler: async (args: string[]): Promise<string> => {
      if (!apiClient.isAuthenticated()) {
        return '\nNot authenticated. Use /login or /register first.';
      }

      const result = await apiClient.listAgents();
      if (result.error) return `\nError: ${result.error}`;

      const agents = result.data?.agents || [];
      const filterRole = args[0]?.toLowerCase();
      const filtered = filterRole ? agents.filter(a => a.role.includes(filterRole)) : agents;

      if (filtered.length === 0) {
        return '\nNo agents found.';
      }

      let output = '\nAvailable Agents:';
      filtered.forEach(a => {
        const statusIcon = a.status === 'running' ? '●' : a.status === 'idle' ? '○' : '○';
        output += `\n  ${statusIcon} ${a.name.padEnd(15)} ${a.role.padEnd(12)} ${a.status}`;
      });

      return output;
    },
  },
  {
    name: 'tasks',
    description: 'List active tasks',
    usage: '/tasks [status]',
    handler: async (args: string[]): Promise<string> => {
      if (!apiClient.isAuthenticated()) {
        return '\nNot authenticated. Use /login or /register first.';
      }

      const result = await apiClient.listTasks();
      if (result.error) return `\nError: ${result.error}`;

      const tasks = result.data?.tasks || [];
      const filterStatus = args[0]?.toLowerCase();
      const filtered = filterStatus ? tasks.filter(t => t.status === filterStatus) : tasks;

      if (filtered.length === 0) {
        return '\nNo tasks found.';
      }

      let output = '\nTasks:';
      filtered.forEach(t => {
        const statusIcon = t.status === 'completed' ? '✓' : t.status === 'running' ? '⟳' : t.status === 'failed' ? '✗' : '○';
        output += `\n  ${statusIcon} [${t.id.slice(0, 8)}] ${t.title} (${t.status})`;
        if (t.assignedAgent) output += ` → ${t.assignedAgent}`;
      });

      return output;
    },
  },
  {
    name: 'config',
    description: 'Show or update configuration',
    usage: '/config [key] [value]',
    handler: async (args: string[]): Promise<string> => {
      if (args.length === 0) {
        return `\nCurrent Configuration:\n  authenticated: ${apiClient.isAuthenticated() ? 'yes' : 'no'}`;
      }
      return `\nConfig: ${args[0]} = ${args[1] || '(current value)'}`;
    },
  },
  {
    name: 'projects',
    description: 'List all projects',
    handler: async (): Promise<string> => {
      if (!apiClient.isAuthenticated()) {
        return '\nNot authenticated. Use /login or /register first.';
      }

      const result = await apiClient.listProjects();
      if (result.error) return `\nError: ${result.error}`;

      const projects = result.data?.projects || [];

      if (projects.length === 0) {
        return '\nNo projects found. Use /create-project to create one.';
      }

      let output = '\nProjects:';
      projects.forEach(p => {
        output += `\n  [${p.id.slice(0, 8)}] ${p.name} - ${p.path} (${p.architecture})`;
      });

      return output;
    },
  },
  {
    name: 'create-project',
    description: 'Create a new project',
    usage: '/create-project <name> <path> [description]',
    handler: async (args: string[]): Promise<string> => {
      if (!apiClient.isAuthenticated()) {
        return '\nNot authenticated. Use /login or /register first.';
      }

      const name = args[0];
      const path = args[1];
      const description = args.slice(2).join(' ');

      if (!name || !path) {
        return '\nUsage: /create-project <name> <path> [description]';
      }

      const result = await apiClient.createProject(name, path, description || undefined);
      if (result.error) return `\nError: ${result.error}`;

      return `\nProject created: ${result.data?.project.name} (${result.data?.project.id})`;
    },
  },
  {
    name: 'delete-project',
    description: 'Delete a project',
    usage: '/delete-project <id>',
    handler: async (args: string[]): Promise<string> => {
      if (!apiClient.isAuthenticated()) {
        return '\nNot authenticated. Use /login or /register first.';
      }

      const id = args[0];
      if (!id) {
        return '\nUsage: /delete-project <id>';
      }

      const result = await apiClient.deleteProject(id);
      if (result.error) return `\nError: ${result.error}`;

      return '\nProject deleted successfully.';
    },
  },
  {
    name: 'create-task',
    description: 'Create a new task',
    usage: '/create-task <projectId> <title> <description>',
    handler: async (args: string[]): Promise<string> => {
      if (!apiClient.isAuthenticated()) {
        return '\nNot authenticated. Use /login or /register first.';
      }

      const projectId = args[0];
      const title = args[1];
      const description = args.slice(2).join(' ');

      if (!projectId || !title) {
        return '\nUsage: /create-task <projectId> <title> [description]';
      }

      const result = await apiClient.createTask(projectId, title, description || title);
      if (result.error) return `\nError: ${result.error}`;

      return `\nTask created: ${result.data?.task.title} (${result.data?.task.id})`;
    },
  },
  {
    name: 'assign',
    description: 'Assign a task to an agent',
    usage: '/assign <agentId> <taskId>',
    handler: async (args: string[]): Promise<string> => {
      if (!apiClient.isAuthenticated()) {
        return '\nNot authenticated. Use /login or /register first.';
      }

      const agentId = args[0];
      const taskId = args[1];

      if (!agentId || !taskId) {
        return '\nUsage: /assign <agentId> <taskId>';
      }

      const result = await apiClient.assignTask(agentId, taskId);
      if (result.error) return `\nError: ${result.error}`;

      return `\nTask assigned to ${result.data?.agent.name}`;
    },
  },
  {
    name: 'complete',
    description: 'Mark a task as completed by an agent',
    usage: '/complete <agentId> <result>',
    handler: async (args: string[]): Promise<string> => {
      if (!apiClient.isAuthenticated()) {
        return '\nNot authenticated. Use /login or /register first.';
      }

      const agentId = args[0];
      const result = args.slice(1).join(' ');

      if (!agentId) {
        return '\nUsage: /complete <agentId> [result]';
      }

      const apiResult = await apiClient.completeTask(agentId, result || 'Completed');
      if (apiResult.error) return `\nError: ${apiResult.error}`;

      return `\nTask completed by ${apiResult.data?.agent.name}`;
    },
  },
  {
    name: 'reset-agent',
    description: 'Reset an agent to idle state',
    usage: '/reset-agent <agentId>',
    handler: async (args: string[]): Promise<string> => {
      if (!apiClient.isAuthenticated()) {
        return '\nNot authenticated. Use /login or /register first.';
      }

      const agentId = args[0];
      if (!agentId) {
        return '\nUsage: /reset-agent <agentId>';
      }

      const result = await apiClient.resetAgent(agentId);
      if (result.error) return `\nError: ${result.error}`;

      return `\nAgent ${result.data?.agent.name} reset to idle.`;
    },
  },
  {
    name: 'delete-task',
    description: 'Delete a task',
    usage: '/delete-task <taskId>',
    handler: async (args: string[]): Promise<string> => {
      if (!apiClient.isAuthenticated()) {
        return '\nNot authenticated. Use /login or /register first.';
      }

      const taskId = args[0];
      if (!taskId) {
        return '\nUsage: /delete-task <taskId>';
      }

      const result = await apiClient.deleteTask(taskId);
      if (result.error) return `\nError: ${result.error}`;

      return '\nTask deleted successfully.';
    },
  },
  {
    name: 'task-stats',
    description: 'Show task statistics for a project',
    usage: '/task-stats <projectId>',
    handler: async (args: string[]): Promise<string> => {
      if (!apiClient.isAuthenticated()) {
        return '\nNot authenticated. Use /login or /register first.';
      }

      const projectId = args[0];
      if (!projectId) {
        return '\nUsage: /task-stats <projectId>';
      }

      const result = await apiClient.getTaskStats(projectId);
      if (result.error) return `\nError: ${result.error}`;

      const s = result.data?.stats;
      if (!s) return '\nNo stats available.';

      return `\nTask Statistics:\n  Total: ${s.total}\n  Pending: ${s.pending}\n  Running: ${s.running}\n  Completed: ${s.completed}\n  Failed: ${s.failed}`;
    },
  },
  {
    name: 'project',
    description: 'Show project details',
    usage: '/project <id>',
    handler: async (args: string[]): Promise<string> => {
      if (!apiClient.isAuthenticated()) {
        return '\nNot authenticated. Use /login or /register first.';
      }

      const id = args[0];
      if (!id) {
        return '\nUsage: /project <id>';
      }

      const result = await apiClient.getProject(id);
      if (result.error) return `\nError: ${result.error}`;

      const p = result.data?.project;
      if (!p) return '\nProject not found.';

      return `\nProject: ${p.name}\nPath: ${p.path}\nArchitecture: ${p.architecture}${p.description ? `\nDescription: ${p.description}` : ''}`;
    },
  },
  {
    name: 'register',
    description: 'Register a new user',
    usage: '/register <name> <email> <password>',
    handler: async (args: string[]): Promise<string> => {
      const name = args[0];
      const email = args[1];
      const password = args[2];

      if (!name || !email || !password) {
        return '\nUsage: /register <name> <email> <password>';
      }

      const result = await apiClient.register(name, email, password);
      if (result.error) return `\nError: ${result.error}`;

      return `\nRegistered successfully!\nWelcome, ${result.data?.user.name}!\nYou are now logged in.`;
    },
  },
  {
    name: 'login',
    description: 'Login to the API',
    usage: '/login <email> <password>',
    handler: async (args: string[]): Promise<string> => {
      const email = args[0];
      const password = args[1];

      if (!email || !password) {
        return '\nUsage: /login <email> <password>';
      }

      const result = await apiClient.login(email, password);
      if (result.error) return `\nError: ${result.error}`;

      return `\nLogged in successfully!\nWelcome back, ${result.data?.user.name}!`;
    },
  },
  {
    name: 'logout',
    description: 'Logout and remove saved credentials',
    handler: async (): Promise<string> => {
      await apiClient.logout();
      return '\nLogged out successfully. Saved credentials removed.';
    },
  },
  {
    name: 'me',
    description: 'Show current user info',
    handler: async (): Promise<string> => {
      if (!apiClient.isAuthenticated()) {
        return '\nNot authenticated. Use /login or /register first.';
      }

      const result = await apiClient.getMe();
      if (result.error) return `\nError: ${result.error}`;

      const user = result.data?.user;
      return `\nUser: ${user?.name}\nEmail: ${user?.email}\nID: ${user?.id}`;
    },
  },
  {
    name: 'api-keys',
    description: 'Manage API keys',
    usage: '/api-keys [list|create|delete]',
    handler: async (args: string[]): Promise<string> => {
      if (!apiClient.isAuthenticated()) {
        return '\nNot authenticated. Use /login or /register first.';
      }

      const action = args[0] || 'list';

      if (action === 'list') {
        const result = await apiClient.listApiKeys();
        if (result.error) return `\nError: ${result.error}`;

        const keys = result.data?.apiKeys || [];
        if (keys.length === 0) {
          return '\nNo API keys found. Use /api-keys create <name> to create one.';
        }

        let output = '\nAPI Keys:';
        keys.forEach(k => {
          const lastUsed = k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'never';
          output += `\n  [${k.id.slice(0, 8)}] ${k.name} (last used: ${lastUsed})`;
        });

        return output;
      }

      if (action === 'create') {
        const name = args[1];
        if (!name) {
          return '\nUsage: /api-keys create <name>';
        }

        const result = await apiClient.createApiKey(name);
        if (result.error) return `\nError: ${result.error}`;

        return `\nAPI Key created!\nName: ${result.data?.name}\nKey: ${result.data?.key}\n\nSave this key securely - it won't be shown again!`;
      }

      if (action === 'delete') {
        const id = args[1];
        if (!id) {
          return '\nUsage: /api-keys delete <id>';
        }

        const result = await apiClient.deleteApiKey(id);
        if (result.error) return `\nError: ${result.error}`;

        return '\nAPI key deleted successfully.';
      }

      return '\nUsage: /api-keys [list|create|delete]';
    },
  },
  {
    name: 'init',
    description: 'Initialize agents for a project',
    usage: '/init <projectId>',
    handler: async (args: string[]): Promise<string> => {
      if (!apiClient.isAuthenticated()) {
        return '\nNot authenticated. Use /login or /register first.';
      }

      const projectId = args[0];
      if (!projectId) {
        return '\nUsage: /init <projectId>';
      }

      const result = await apiClient.initializeAgents(projectId);
      if (result.error) return `\nError: ${result.error}`;

      const agents = result.data?.agents || [];
      let output = `\nInitialized ${agents.length} agents:`;
      agents.forEach(a => {
        output += `\n  ${a.name} (${a.role})`;
      });

      return output;
    },
  },
  {
    name: 'git',
    description: 'Git operations',
    usage: '/git status|commit|push|pull|log',
    aliases: ['g'],
    handler: async (args: string[]): Promise<string> => {
      const action = args[0] || 'status';
      return `\nGit ${action}: (not implemented yet)`;
    },
  },
  {
    name: 'logs',
    description: 'Show agent logs',
    usage: '/logs [agent]',
    handler: async (): Promise<string> => {
      return '\nAgent Logs: (not implemented yet)';
    },
  },
  {
    name: 'plugin',
    description: 'Manage plugins',
    usage: '/plugin list|install|remove <name>',
    handler: async (args: string[]): Promise<string> => {
      const action = args[0] || 'list';
      return `\nPlugin ${action}: (not implemented yet)`;
    },
  },
  {
    name: 'theme',
    description: 'Switch between themes',
    usage: '/theme dark|light|auto',
    handler: async (args: string[]): Promise<string> => {
      const theme = args[0] || 'dark';
      return `\nTheme set to: ${theme}`;
    },
  },
  {
    name: 'version',
    description: 'Show Orion version',
    aliases: ['v'],
    handler: async (): Promise<string> => {
      const health = await apiClient.health();
      const version = health.data?.version || '0.1.0';
      return `\nORION CLI v${version}\nMulti-Agent Code Orchestration`;
    },
  },
  {
    name: 'exit',
    description: 'Exit Orion CLI',
    aliases: ['quit', 'q'],
    handler: async (): Promise<string> => {
      return '__EXIT__';
    },
  },
  {
    name: 'history',
    description: 'Show command history',
    handler: async (): Promise<string> => {
      return '\nCommand History: (not implemented yet)';
    },
  },
];

/**
 * Find a command by name or alias
 */
export function findCommand(input: string): Command | undefined {
  const cleanInput = input.trim().toLowerCase().replace(/^\//, '');

  return COMMANDS.find(cmd => {
    if (cmd.name === cleanInput) return true;
    if (cmd.aliases?.includes(cleanInput)) return true;
    return false;
  });
}

/**
 * Get command suggestions based on partial input
 */
export function getCommandSuggestions(partial: string): Command[] {
  const cleanPartial = partial.trim().toLowerCase().replace(/^\//, '');

  if (!cleanPartial) {
    return COMMANDS.filter(cmd => !cmd.hidden);
  }

  return COMMANDS.filter(cmd => {
    if (cmd.name.includes(cleanPartial)) return true;
    if (cmd.aliases?.some((alias: string) => alias.includes(cleanPartial))) return true;
    if (cmd.description.toLowerCase().includes(cleanPartial)) return true;
    return false;
  }).filter(cmd => !cmd.hidden);
}

/**
 * Parse command input into command name and arguments
 */
export function parseCommand(input: string): { command: string; args: string[] } {
  const trimmed = input.trim().replace(/^\//, '');
  const parts = trimmed.split(/\s+/);

  return {
    command: parts[0] || '',
    args: parts.slice(1),
  };
}

/**
 * Execute a command and return the output string
 */
export async function executeCommand(input: string): Promise<string | null> {
  const { command, args } = parseCommand(input);

  if (!command) return null;

  // Special commands
  if (command === 'clear') return '__CLEAR__';
  if (command === 'exit' || command === 'quit' || command === 'q') return '__EXIT__';

  const cmd = findCommand(command);

  if (cmd) {
    const result = await cmd.handler(args);
    return result || null;
  }

  return `Unknown command: /${command}. Type /help for available commands.`;
}
