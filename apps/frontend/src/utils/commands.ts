/**
 * Command definitions for Orion Code TUI
 */

import { apiClient } from '../api/client.js';
import type { Command, InteractiveCommand, SelectOption } from '../types/index.js';

// Helper to get projects for selection
async function getProjectOptions(): Promise<SelectOption[]> {
  const result = await apiClient.listProjects();
  if (result.error) return [];
  const projects = result.data?.projects || [];
  return projects.map(p => ({ label: p.name, value: p.id, description: p.path }));
}

// Helper to get agents for selection
async function getAgentOptions(): Promise<SelectOption[]> {
  const result = await apiClient.listAgents();
  if (result.error) return [];
  const agents = result.data?.agents || [];
  return agents.map(a => ({ label: `${a.name} (${a.role})`, value: a.id, description: a.status }));
}

// Helper to get tasks for selection
async function getTaskOptions(): Promise<SelectOption[]> {
  const result = await apiClient.listTasks();
  if (result.error) return [];
  const tasks = result.data?.tasks || [];
  return tasks.map(t => ({ label: t.title, value: t.id, description: `${t.status} - ${(t.description || '').slice(0, 50)}` }));
}

// Common task types for implement command
const TASK_TYPES: SelectOption[] = [
  { label: 'Create health check endpoint', value: 'Create a health check endpoint (GET /health) that returns server status' },
  { label: 'Create CRUD for users', value: 'Create a CRUD API for user management with create, read, update, delete endpoints' },
  { label: 'Create authentication', value: 'Implement JWT authentication with login, register, and token refresh' },
  { label: 'Create database schema', value: 'Design and implement a database schema with proper indexes and relationships' },
  { label: 'Write unit tests', value: 'Write comprehensive unit tests for the existing code' },
  { label: 'Create Docker config', value: 'Create Dockerfile and docker-compose.yml for the project' },
  { label: 'Create CI/CD pipeline', value: 'Set up GitHub Actions CI/CD pipeline with build, test, and deploy stages' },
  { label: 'Add API documentation', value: 'Create API documentation with OpenAPI/Swagger specification' },
  { label: 'Performance optimization', value: 'Analyze and optimize performance bottlenecks in the codebase' },
  { label: 'Code review', value: 'Review the codebase for bugs, security issues, and best practices' },
];

export const COMMANDS: Command[] = [
  { name: 'help', description: 'Show available commands', usage: '/help [command]', handler: async (args: string[]): Promise<string> => {
    const firstArg = args[0];
    if (firstArg) { const cmd = COMMANDS.find((c) => c.name === firstArg || c.aliases?.includes(firstArg)); if (cmd) { let output = `\n${cmd.name.toUpperCase()}\n${cmd.description}`; if (cmd.usage) output += `\nUsage: ${cmd.usage}`; if (cmd.aliases?.length) output += `\nAliases: ${cmd.aliases.join(', ')}`; return output; } return `Command not found: ${firstArg}`; }
    let output = '\nAvailable commands:'; COMMANDS.filter((c) => !c.hidden).forEach((cmd) => { output += `\n  ${cmd.name.padEnd(20)} ${cmd.description}`; }); return output;
  }},
  { name: 'clear', description: 'Clear the terminal screen', handler: async (): Promise<string> => '__CLEAR__' },
  { name: 'status', description: 'Show current project status and active agents', handler: async (): Promise<string> => {
    if (!apiClient.isAuthenticated()) return '\nNot authenticated. Use /login or /register first.';
    const [healthResult, agentsResult] = await Promise.all([apiClient.health(), apiClient.getAgentStats()]);
    if (healthResult.error) return `\nError: ${healthResult.error}`;
    let output = `\nAPI Status: ${healthResult.data?.status || 'unknown'}\nVersion: ${healthResult.data?.version || 'unknown'}`;
    if (agentsResult.data?.stats) { const s = agentsResult.data.stats; output += `\n\nAgents: ${s.total} total, ${s.idle} idle, ${s.running} running`; }
    return output;
  }},
  { name: 'agents', description: 'List all available agents', usage: '/agents [role]', handler: async (args: string[]): Promise<string> => {
    if (!apiClient.isAuthenticated()) return '\nNot authenticated. Use /login or /register first.';
    const result = await apiClient.listAgents(); if (result.error) return `\nError: ${result.error}`;
    const agents = result.data?.agents || []; const filterRole = args[0]?.toLowerCase(); const filtered = filterRole ? agents.filter((a) => a.role.includes(filterRole)) : agents;
    if (filtered.length === 0) return '\nNo agents found.';
    let output = '\nAvailable Agents:'; filtered.forEach((a) => { const icon = a.status === 'running' ? '[*]' : '[-]'; output += `\n  ${icon} ${a.name.padEnd(15)} ${a.role.padEnd(12)} ${a.status}`; }); return output;
  }},
  { name: 'tasks', description: 'List active tasks', usage: '/tasks [status]', handler: async (args: string[]): Promise<string> => {
    if (!apiClient.isAuthenticated()) return '\nNot authenticated. Use /login or /register first.';
    const result = await apiClient.listTasks(); if (result.error) return `\nError: ${result.error}`;
    const tasks = result.data?.tasks || []; const filterStatus = args[0]?.toLowerCase(); const filtered = filterStatus ? tasks.filter((t) => t.status === filterStatus) : tasks;
    if (filtered.length === 0) return '\nNo tasks found.';
    let output = '\nTasks:'; filtered.forEach((t) => { const icon = t.status === 'completed' ? '[OK]' : t.status === 'running' ? '[..]' : t.status === 'failed' ? '[!!]' : '[-]'; output += `\n  ${icon} [${t.id.slice(0, 8)}] ${t.title} (${t.status})`; }); return output;
  }},
  { name: 'config', description: 'Show or update configuration', usage: '/config [key] [value]', handler: async (args: string[]): Promise<string> => {
    if (args.length === 0) return `\nCurrent Configuration:\n  authenticated: ${apiClient.isAuthenticated() ? 'yes' : 'no'}`;
    return `\nConfig: ${args[0]} = ${args[1] || '(current value)'}`;
  }},
  { name: 'projects', description: 'List all projects', handler: async (): Promise<string> => {
    if (!apiClient.isAuthenticated()) return '\nNot authenticated. Use /login or /register first.';
    const result = await apiClient.listProjects(); if (result.error) return `\nError: ${result.error}`;
    const projects = result.data?.projects || []; if (projects.length === 0) return '\nNo projects found. Use /create-project to create one.';
    let output = '\nProjects:'; projects.forEach((p) => { output += `\n  [${p.id.slice(0, 8)}] ${p.name} - ${p.path}`; }); return output;
  }},
  { name: 'create-project', description: 'Create a new project', usage: '/create-project <name> <path> [description]', handler: async (args: string[]): Promise<string> => {
    if (!apiClient.isAuthenticated()) return '\nNot authenticated. Use /login or /register first.';
    const name = args[0]; const path = args[1]; const description = args.slice(2).join(' ');
    if (!name || !path) return '\nUsage: /create-project <name> <path> [description]';
    const result = await apiClient.createProject(name, path, description || undefined);
    if (result.error) return `\nError: ${result.error}`;
    return `\nProject created: ${result.data?.project.name} (${result.data?.project.id})`;
  }},
  { name: 'delete-project', description: 'Delete a project', usage: '/delete-project [projectId]', handler: async (args: string[]): Promise<string | InteractiveCommand> => {
    if (!apiClient.isAuthenticated()) return '\nNot authenticated. Use /login or /register first.';
    const projectId = args[0];
    if (!projectId) { const options = await getProjectOptions(); if (options.length === 0) return '\nNo projects found.'; return { type: 'select', title: 'Select project to delete:', options, callback: async (id: string) => { const r = await apiClient.deleteProject(id); if (r.error) return `Error: ${r.error}`; return '\nProject deleted successfully.'; } }; }
    const result = await apiClient.deleteProject(projectId); if (result.error) return `\nError: ${result.error}`; return '\nProject deleted successfully.';
  }},
  { name: 'create-task', description: 'Create a new task', usage: '/create-task [projectId] <title> [description]', handler: async (args: string[]): Promise<string | InteractiveCommand> => {
    if (!apiClient.isAuthenticated()) return '\nNot authenticated. Use /login or /register first.';
    let projectId = args[0]; let title = args[1]; let description = args.slice(2).join(' ');
    if (!projectId) { const options = await getProjectOptions(); if (options.length === 0) return '\nNo projects found.'; return { type: 'select', title: 'Select project:', options, callback: async (id: string) => { return `\nSelected project: ${id}\nUsage: /create-task ${id} <title> [description]`; } }; }
    if (!title) return '\nUsage: /create-task <projectId> <title> [description]';
    const result = await apiClient.createTask(projectId, title, description || title); if (result.error) return `\nError: ${result.error}`;
    return `\nTask created: ${result.data?.task.title} (${result.data?.task.id})`;
  }},
  { name: 'assign', description: 'Assign a task to an agent', usage: '/assign [agentId] [taskId]', handler: async (args: string[]): Promise<string | InteractiveCommand> => {
    if (!apiClient.isAuthenticated()) return '\nNot authenticated. Use /login or /register first.';
    let agentId = args[0]; let taskId = args[1];
    if (!agentId) { const options = await getAgentOptions(); if (options.length === 0) return '\nNo agents found.'; return { type: 'select', title: 'Select agent:', options, callback: async (aid: string) => { const to = await getTaskOptions(); if (to.length === 0) return '\nNo tasks found.'; return { type: 'select', title: 'Select task to assign:', options: to, callback: async (tid: string) => { const r = await apiClient.assignTask(aid, tid); if (r.error) return `Error: ${r.error}`; return `\nTask assigned to ${r.data?.agent.name}`; } }; } }; }
    if (!taskId) { const options = await getTaskOptions(); if (options.length === 0) return '\nNo tasks found.'; return { type: 'select', title: 'Select task to assign:', options, callback: async (tid: string) => { const r = await apiClient.assignTask(agentId, tid); if (r.error) return `Error: ${r.error}`; return `\nTask assigned to ${r.data?.agent.name}`; } }; }
    const result = await apiClient.assignTask(agentId, taskId); if (result.error) return `\nError: ${result.error}`; return `\nTask assigned to ${result.data?.agent.name}`;
  }},
  { name: 'complete', description: 'Mark a task as completed by an agent', usage: '/complete [agentId] [result]', handler: async (args: string[]): Promise<string | InteractiveCommand> => {
    if (!apiClient.isAuthenticated()) return '\nNot authenticated. Use /login or /register first.';
    const agentId = args[0]; const result = args.slice(1).join(' ');
    if (!agentId) { const options = await getAgentOptions(); if (options.length === 0) return '\nNo agents found.'; return { type: 'select', title: 'Select agent:', options, callback: async (id: string) => { const r = await apiClient.completeTask(id, 'Completed'); if (r.error) return `Error: ${r.error}`; return `\nTask completed by ${r.data?.agent.name}`; } }; }
    const apiResult = await apiClient.completeTask(agentId, result || 'Completed'); if (apiResult.error) return `\nError: ${apiResult.error}`; return `\nTask completed by ${apiResult.data?.agent.name}`;
  }},
  { name: 'reset-agent', description: 'Reset an agent to idle state', usage: '/reset-agent [agentId]', handler: async (args: string[]): Promise<string | InteractiveCommand> => {
    if (!apiClient.isAuthenticated()) return '\nNot authenticated. Use /login or /register first.';
    const agentId = args[0];
    if (!agentId) { const options = await getAgentOptions(); if (options.length === 0) return '\nNo agents found.'; return { type: 'select', title: 'Select agent to reset:', options, callback: async (id: string) => { const r = await apiClient.resetAgent(id); if (r.error) return `Error: ${r.error}`; return `\nAgent ${r.data?.agent.name} reset to idle.`; } }; }
    const result = await apiClient.resetAgent(agentId); if (result.error) return `\nError: ${result.error}`; return `\nAgent ${result.data?.agent.name} reset to idle.`;
  }},
  { name: 'delete-task', description: 'Delete a task', usage: '/delete-task [taskId]', handler: async (args: string[]): Promise<string | InteractiveCommand> => {
    if (!apiClient.isAuthenticated()) return '\nNot authenticated. Use /login or /register first.';
    const taskId = args[0];
    if (!taskId) { const options = await getTaskOptions(); if (options.length === 0) return '\nNo tasks found.'; return { type: 'select', title: 'Select task to delete:', options, callback: async (id: string) => { const r = await apiClient.deleteTask(id); if (r.error) return `Error: ${r.error}`; return '\nTask deleted successfully.'; } }; }
    const result = await apiClient.deleteTask(taskId); if (result.error) return `\nError: ${result.error}`; return '\nTask deleted successfully.';
  }},
  { name: 'task-stats', description: 'Show task statistics for a project', usage: '/task-stats [projectId]', handler: async (args: string[]): Promise<string | InteractiveCommand> => {
    if (!apiClient.isAuthenticated()) return '\nNot authenticated. Use /login or /register first.';
    const projectId = args[0];
    if (!projectId) { const options = await getProjectOptions(); if (options.length === 0) return '\nNo projects found.'; return { type: 'select', title: 'Select project:', options, callback: async (id: string) => { const r = await apiClient.getTaskStats(id); if (r.error) return `Error: ${r.error}`; const s = r.data?.stats; if (!s) return '\nNo stats available.'; return `\nTask Statistics:\n  Total: ${s.total}\n  Pending: ${s.pending}\n  Running: ${s.running}\n  Completed: ${s.completed}\n  Failed: ${s.failed}`; } }; }
    const result = await apiClient.getTaskStats(projectId); if (result.error) return `\nError: ${result.error}`;
    const s = result.data?.stats; if (!s) return '\nNo stats available.'; return `\nTask Statistics:\n  Total: ${s.total}\n  Pending: ${s.pending}\n  Running: ${s.running}\n  Completed: ${s.completed}\n  Failed: ${s.failed}`;
  }},
  { name: 'project', description: 'Show project details', usage: '/project [projectId]', handler: async (args: string[]): Promise<string | InteractiveCommand> => {
    if (!apiClient.isAuthenticated()) return '\nNot authenticated. Use /login or /register first.';
    const id = args[0];
    if (!id) { const options = await getProjectOptions(); if (options.length === 0) return '\nNo projects found.'; return { type: 'select', title: 'Select project:', options, callback: async (pid: string) => { const r = await apiClient.getProject(pid); if (r.error) return `Error: ${r.error}`; const p = r.data?.project; if (!p) return '\nProject not found.'; return `\nProject: ${p.name}\nPath: ${p.path}${p.description ? `\nDescription: ${p.description}` : ''}`; } }; }
    const result = await apiClient.getProject(id); if (result.error) return `\nError: ${result.error}`; const p = result.data?.project; if (!p) return '\nProject not found.';
    return `\nProject: ${p.name}\nPath: ${p.path}${p.description ? `\nDescription: ${p.description}` : ''}`;
  }},
  { name: 'register', description: 'Register a new user', usage: '/register <name> <email> <password>', handler: async (args: string[]): Promise<string> => {
    const name = args[0]; const email = args[1]; const password = args[2];
    if (!name || !email || !password) return '\nUsage: /register <name> <email> <password>';
    const result = await apiClient.register(name, email, password); if (result.error) return `\nError: ${result.error}`;
    return `\nRegistered successfully!\nWelcome, ${result.data?.user.name}!\nYou are now logged in.`;
  }},
  { name: 'login', description: 'Login to the API', usage: '/login <email> <password>', handler: async (args: string[]): Promise<string> => {
    const email = args[0]; const password = args[1];
    if (!email || !password) return '\nUsage: /login <email> <password>';
    const result = await apiClient.login(email, password); if (result.error) return `\nError: ${result.error}`;
    return `\nLogged in successfully!\nWelcome back, ${result.data?.user.name}!`;
  }},
  { name: 'logout', description: 'Logout and remove saved credentials', handler: async (): Promise<string> => { await apiClient.logout(); return '\nLogged out successfully. Saved credentials removed.'; }},
  { name: 'me', description: 'Show current user info', handler: async (): Promise<string> => {
    if (!apiClient.isAuthenticated()) return '\nNot authenticated. Use /login or /register first.';
    const result = await apiClient.getMe(); if (result.error) return `\nError: ${result.error}`; const user = result.data?.user;
    return `\nUser: ${user?.name}\nEmail: ${user?.email}\nID: ${user?.id}`;
  }},
  { name: 'api-keys', description: 'Manage API keys', usage: '/api-keys [list|create|delete]', handler: async (args: string[]): Promise<string> => {
    if (!apiClient.isAuthenticated()) return '\nNot authenticated. Use /login or /register first.';
    const action = args[0] || 'list';
    if (action === 'list') { const r = await apiClient.listApiKeys(); if (r.error) return `\nError: ${r.error}`; const keys = r.data?.apiKeys || []; if (keys.length === 0) return '\nNo API keys found. Use /api-keys create <name> to create one.'; let o = '\nAPI Keys:'; keys.forEach((k) => { const last = k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'never'; o += `\n  [${k.id.slice(0, 8)}] ${k.name} (last used: ${last})`; }); return o; }
    if (action === 'create') { const name = args[1]; if (!name) return '\nUsage: /api-keys create <name>'; const r = await apiClient.createApiKey(name); if (r.error) return `\nError: ${r.error}`; return `\nAPI Key created!\nName: ${r.data?.name}\nKey: ${r.data?.key}\n\nSave this key securely - it won't be shown again!`; }
    if (action === 'delete') { const id = args[1]; if (!id) return '\nUsage: /api-keys delete <id>'; const r = await apiClient.deleteApiKey(id); if (r.error) return `\nError: ${r.error}`; return '\nAPI key deleted successfully.'; }
    return '\nUsage: /api-keys [list|create|delete]';
  }},
  { name: 'init', description: 'Initialize agents for a project', usage: '/init [projectId or projectName]', handler: async (args: string[]): Promise<string | InteractiveCommand> => {
    if (!apiClient.isAuthenticated()) return '\nNot authenticated. Use /login or /register first.';
    const projectArg = args[0];
    if (!projectArg) { const options = await getProjectOptions(); if (options.length === 0) return '\nNo projects found. Use /create-project to create one first.'; return { type: 'select', title: 'Select project to initialize agents:', options, callback: async (id: string) => { const r = await apiClient.initializeAgents(id); if (r.error) return `Error: ${r.error}`; const agents = r.data?.agents || []; let o = `\nInitialized ${agents.length} agents:`; agents.forEach((a) => { o += `\n  ${a.name} (${a.role})`; }); return o; } }; }
    let projectId = projectArg; const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectArg);
    if (!isUUID) { const pr = await apiClient.listProjects(); if (pr.error) return `\nError: ${pr.error}`; const projects = pr.data?.projects || []; const p = projects.find(p => p.name.toLowerCase() === projectArg.toLowerCase()); if (!p) return `\nProject not found: ${projectArg}\nUse /projects to see available projects.`; projectId = p.id; }
    const result = await apiClient.initializeAgents(projectId); if (result.error) return `\nError: ${result.error}`;
    const agents = result.data?.agents || []; let output = `\nInitialized ${agents.length} agents:`; agents.forEach((a) => { output += `\n  ${a.name} (${a.role})`; }); return output;
  }},
  { name: 'implement', description: 'Implement a task using AI agents', usage: '/implement [projectId] [taskType]', handler: async (args: string[]): Promise<string | InteractiveCommand> => {
    if (!apiClient.isAuthenticated()) return '\nNot authenticated. Use /login or /register first.';
    let projectId = args[0]; let taskType = args.slice(1).join(' ');
    if (!projectId) { const options = await getProjectOptions(); if (options.length === 0) return '\nNo projects found.'; return { type: 'select', title: 'Select project:', options, callback: async (pid: string) => { return { type: 'select', title: 'Select what to implement:', options: TASK_TYPES, callback: async (task: string) => { const r = await apiClient.executeOrchestration(pid, [{ title: task, description: task }]); if (r.error) return `Error: ${r.error}`; return '\nTask submitted to AI agents! Use /tasks to monitor progress.'; } }; } }; }
    if (!taskType) { return { type: 'select', title: 'Select what to implement:', options: TASK_TYPES, callback: async (task: string) => { const r = await apiClient.executeOrchestration(projectId, [{ title: task, description: task }]); if (r.error) return `Error: ${r.error}`; return '\nTask submitted to AI agents! Use /tasks to monitor progress.'; } }; }
    const executeResult = await apiClient.executeOrchestration(projectId, [{ title: taskType, description: taskType }]); if (executeResult.error) return `\nError: ${executeResult.error}`; return '\nTask submitted to AI agents! Use /tasks to monitor progress.';
  }},
  { name: 'orchestrate', description: 'Execute orchestration for pending tasks', usage: '/orchestrate [projectId]', handler: async (args: string[]): Promise<string | InteractiveCommand> => {
    if (!apiClient.isAuthenticated()) return '\nNot authenticated. Use /login or /register first.';
    const projectId = args[0];
    if (!projectId) { const options = await getProjectOptions(); if (options.length === 0) return '\nNo projects found.'; return { type: 'select', title: 'Select project:', options, callback: async (id: string) => { const r = await apiClient.getOrchestrationStatus(id); if (r.error) return `Error: ${r.error}`; const s = r.data; return `\nOrchestration Status:\n  Running Agents: ${s?.runningAgents || 0}\n  Pending Tasks: ${s?.pendingTasks || 0}\n  Completed Tasks: ${s?.completedTasks || 0}`; } }; }
    const result = await apiClient.getOrchestrationStatus(projectId); if (result.error) return `\nError: ${result.error}`;
    const s = result.data; return `\nOrchestration Status:\n  Running Agents: ${s?.runningAgents || 0}\n  Pending Tasks: ${s?.pendingTasks || 0}\n  Completed Tasks: ${s?.completedTasks || 0}`;
  }},
  { name: 'git', description: 'Git operations', usage: '/git status|commit|push|pull|log', aliases: ['g'], handler: async (args: string[]): Promise<string> => { return `\nGit ${args[0] || 'status'}: (not implemented yet)`; }},
  { name: 'logs', description: 'Show agent logs', handler: async (): Promise<string> => '\nAgent Logs: (not implemented yet)' },
  { name: 'plugin', description: 'Manage plugins', handler: async (args: string[]): Promise<string> => `\nPlugin ${args[0] || 'list'}: (not implemented yet)` },
  { name: 'theme', description: 'Switch between themes', handler: async (args: string[]): Promise<string> => `\nTheme set to: ${args[0] || 'dark'}` },
  { name: 'version', description: 'Show Orion version', aliases: ['v'], handler: async (): Promise<string> => { const h = await apiClient.health(); return `\nORION CLI v${h.data?.version || '0.1.0'}\nMulti-Agent Code Orchestration`; }},
  { name: 'exit', description: 'Exit Orion Code', aliases: ['quit', 'q'], handler: async (): Promise<string> => '__EXIT__' },
  { name: 'history', description: 'Show command history', handler: async (): Promise<string> => '\nCommand History: (not implemented yet)' },
];

export function findCommand(input: string): Command | undefined {
  const cleanInput = input.trim().toLowerCase().replace(/^\//, '');
  return COMMANDS.find((cmd) => cmd.name === cleanInput || cmd.aliases?.includes(cleanInput));
}

export function getCommandSuggestions(partial: string): Command[] {
  const cleanPartial = partial.trim().toLowerCase().replace(/^\//, '');
  if (!cleanPartial) return COMMANDS.filter((cmd) => !cmd.hidden);
  return COMMANDS.filter((cmd) => cmd.name.includes(cleanPartial) || cmd.aliases?.some((a: string) => a.includes(cleanPartial)) || cmd.description.toLowerCase().includes(cleanPartial)).filter((cmd) => !cmd.hidden);
}

export function parseCommand(input: string): { command: string; args: string[] } {
  const trimmed = input.trim().replace(/^\//, ''); const parts = trimmed.split(/\s+/);
  return { command: parts[0] || '', args: parts.slice(1) };
}

export async function executeCommand(input: string): Promise<string | InteractiveCommand | null> {
  const { command, args } = parseCommand(input); if (!command) return null;
  if (command === 'clear') return '__CLEAR__'; if (command === 'exit' || command === 'quit' || command === 'q') return '__EXIT__';
  const cmd = findCommand(command); if (cmd) { const result = await cmd.handler(args); return result || null; }
  return `Unknown command: /${command}. Type /help for available commands.`;
}
