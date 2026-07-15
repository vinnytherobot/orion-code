/**
 * Command definitions for Orion CLI
 */

import type { Command } from '../types/index.js';

export const COMMANDS: Command[] = [
  {
    name: 'help',
    description: 'Show available commands',
    usage: '/help [command]',
    handler: async (args: string[]) => {
      const firstArg = args[0];
      if (firstArg) {
        const cmd = COMMANDS.find(c => c.name === firstArg || c.aliases?.includes(firstArg));
        if (cmd) {
          console.log(`\n${cmd.name.toUpperCase()}`);
          console.log(`${cmd.description}`);
          if (cmd.usage) console.log(`Usage: ${cmd.usage}`);
          if (cmd.aliases?.length) console.log(`Aliases: ${cmd.aliases.join(', ')}`);
        } else {
          console.log(`Command not found: ${firstArg}`);
        }
      } else {
        console.log('\nAvailable commands:');
        COMMANDS.filter(c => !c.hidden).forEach(cmd => {
          console.log(`  ${cmd.name.padEnd(20)} ${cmd.description}`);
        });
      }
    },
  },
  {
    name: 'clear',
    description: 'Clear the terminal screen',
    handler: () => {
      process.stdout.write('\x1Bc');
    },
  },
  {
    name: 'status',
    description: 'Show current project status and active agents',
    handler: async () => {
      console.log('\nProject Status: Active');
      console.log('Agents: 12 configured, 0 running');
      console.log('Tasks: 0 active');
    },
  },
  {
    name: 'agents',
    description: 'List all available agents',
    usage: '/agents [role]',
    handler: async (args: string[]) => {
      const agents = [
        { role: 'orchestrator', name: 'Orchestrator', status: 'ready' },
        { role: 'planner', name: 'Planner', status: 'ready' },
        { role: 'architect', name: 'Architect', status: 'ready' },
        { role: 'backend', name: 'Backend', status: 'ready' },
        { role: 'database', name: 'Database', status: 'ready' },
        { role: 'frontend', name: 'Frontend', status: 'ready' },
        { role: 'qa', name: 'QA', status: 'ready' },
        { role: 'reviewer', name: 'Reviewer', status: 'ready' },
        { role: 'devops', name: 'DevOps', status: 'ready' },
        { role: 'security', name: 'Security', status: 'ready' },
        { role: 'performance', name: 'Performance', status: 'ready' },
        { role: 'git', name: 'Git', status: 'ready' },
      ];

      const filterArg = args[0];
      const filtered = filterArg
        ? agents.filter(a => a.role.includes(filterArg.toLowerCase()))
        : agents;

      console.log('\nAvailable Agents:');
      filtered.forEach(a => {
        console.log(`  [${a.status.toUpperCase().padEnd(8)}] ${a.name} (${a.role})`);
      });
    },
  },
  {
    name: 'tasks',
    description: 'List active tasks',
    usage: '/tasks [status]',
    handler: async (args: string[]) => {
      console.log('\nActive Tasks:');
      console.log('  No tasks currently active.');
      if (args.length > 0) {
        console.log(`  Filter: ${args[0]}`);
      }
    },
  },
  {
    name: 'config',
    description: 'Show or update configuration',
    usage: '/config [key] [value]',
    handler: async (args: string[]) => {
      if (args.length === 0) {
        console.log('\nCurrent Configuration:');
        console.log('  theme: dark');
        console.log('  showLineNumbers: true');
        console.log('  autoScroll: true');
        console.log('  fontSize: 14');
      } else {
        console.log(`\nConfig: ${args[0]} = ${args[1] || '(current value)'}`);
      }
    },
  },
  {
    name: 'new',
    description: 'Create a new task or project',
    usage: '/new task|project <name>',
    handler: async (args: string[]) => {
      const type = args[0] || 'task';
      const name = args.slice(1).join(' ');
      if (!name) {
        console.log(`\nUsage: /new ${type} <name>`);
        return;
      }
      console.log(`\nCreating new ${type}: ${name}`);
      console.log('  Status: Pending');
    },
  },
  {
    name: 'run',
    description: 'Run a task with specified agent',
    usage: '/run <task-id> [agent]',
    handler: async (args: string[]) => {
      if (args.length === 0) {
        console.log('\nUsage: /run <task-id> [agent]');
        return;
      }
      console.log(`\nRunning task: ${args[0]}`);
      if (args[1]) {
        console.log(`  Agent: ${args[1]}`);
      }
    },
  },
  {
    name: 'stop',
    description: 'Stop current running agent',
    handler: async () => {
      console.log('\nStopping current agent...');
      console.log('  No agent currently running.');
    },
  },
  {
    name: 'git',
    description: 'Git operations',
    usage: '/git status|commit|push|pull|log',
    aliases: ['g'],
    handler: async (args: string[]) => {
      const action = args[0] || 'status';
      console.log(`\nGit ${action}:`);
      console.log('  On branch main');
      console.log('  Nothing to commit');
    },
  },
  {
    name: 'logs',
    description: 'Show agent logs',
    usage: '/logs [agent] [lines]',
    handler: async (_args: string[]) => {
      console.log('\nAgent Logs:');
      console.log('  No recent logs available.');
    },
  },
  {
    name: 'plugin',
    description: 'Manage plugins',
    usage: '/plugin list|install|remove <name>',
    handler: async (args: string[]) => {
      const action = args[0] || 'list';
      if (action === 'list') {
        console.log('\nInstalled Plugins:');
        console.log('  No plugins installed.');
      } else {
        console.log(`\nPlugin ${action}: ${args[1] || '(no name specified)'}`);
      }
    },
  },
  {
    name: 'theme',
    description: 'Switch between themes',
    usage: '/theme dark|light|auto',
    handler: async (args: string[]) => {
      const theme = args[0] || 'dark';
      console.log(`\nTheme set to: ${theme}`);
    },
  },
  {
    name: 'version',
    description: 'Show Orion version',
    aliases: ['v'],
    handler: async () => {
      console.log('\nORION CLI v0.1.0');
      console.log('Multi-Agent Code Orchestration');
    },
  },
  {
    name: 'exit',
    description: 'Exit Orion CLI',
    aliases: ['quit', 'q'],
    handler: async () => {
      console.log('\nGoodbye!');
      process.exit(0);
    },
  },
  {
    name: 'history',
    description: 'Show command history',
    handler: async () => {
      console.log('\nCommand History:');
      console.log('  No history available.');
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
 * Execute a command
 */
export async function executeCommand(input: string): Promise<boolean> {
  const { command, args } = parseCommand(input);

  if (!command) return false;

  const cmd = findCommand(command);

  if (cmd) {
    await cmd.handler(args);
    return true;
  }

  return false;
}
