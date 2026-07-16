import crypto from 'crypto';

type AgentRole = 'planner' | 'architect' | 'backend' | 'database' | 'frontend' | 'qa' | 'reviewer' | 'devops' | 'security' | 'performance' | 'git' | 'documentation';

type AgentStatus = 'idle' | 'running' | 'blocked' | 'completed';

interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  currentTaskId?: string;
  model: string;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

interface AgentTemplate {
  role: AgentRole;
  name: string;
  description: string;
  defaultModel: string;
  permissions: string[];
}

const AGENT_TEMPLATES: AgentTemplate[] = [
  { role: 'planner', name: 'Planner', description: 'Task planning and decomposition', defaultModel: 'gpt-4', permissions: ['read'] },
  { role: 'architect', name: 'Architect', description: 'Architecture decisions', defaultModel: 'gpt-4', permissions: ['read', 'write'] },
  { role: 'backend', name: 'Backend', description: 'Backend implementation', defaultModel: 'claude-3', permissions: ['read', 'write', 'execute'] },
  { role: 'database', name: 'Database', description: 'Database operations', defaultModel: 'claude-3', permissions: ['read', 'write', 'execute'] },
  { role: 'frontend', name: 'Frontend', description: 'Frontend implementation', defaultModel: 'claude-3', permissions: ['read', 'write'] },
  { role: 'qa', name: 'QA', description: 'Testing and quality assurance', defaultModel: 'gpt-4', permissions: ['read', 'write', 'execute'] },
  { role: 'reviewer', name: 'Reviewer', description: 'Code review', defaultModel: 'gpt-4', permissions: ['read'] },
  { role: 'devops', name: 'DevOps', description: 'Infrastructure and deployment', defaultModel: 'claude-3', permissions: ['read', 'write', 'execute'] },
  { role: 'security', name: 'Security', description: 'Security analysis', defaultModel: 'gpt-4', permissions: ['read'] },
  { role: 'performance', name: 'Performance', description: 'Performance optimization', defaultModel: 'gpt-4', permissions: ['read'] },
  { role: 'git', name: 'Git', description: 'Version control operations', defaultModel: 'claude-3', permissions: ['read', 'write', 'execute'] },
  { role: 'documentation', name: 'Documentation', description: 'Documentation generation', defaultModel: 'gpt-4', permissions: ['read', 'write'] },
];

// In-memory store
const agents = new Map<string, Agent>();

export class AgentService {
  async initializeProjectAgents(_projectId: string): Promise<Agent[]> {
    const projectAgents: Agent[] = AGENT_TEMPLATES.map(template => ({
      id: crypto.randomUUID(),
      name: template.name,
      role: template.role,
      status: 'idle',
      model: template.defaultModel,
      config: { permissions: template.permissions },
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    projectAgents.forEach(agent => agents.set(agent.id, agent));
    return projectAgents;
  }

  async findAll(_projectId?: string): Promise<Agent[]> {
    return Array.from(agents.values());
  }

  async findById(id: string): Promise<Agent | null> {
    return agents.get(id) || null;
  }

  async findByRole(role: AgentRole): Promise<Agent[]> {
    return Array.from(agents.values()).filter(a => a.role === role);
  }

  async assignTask(agentId: string, taskId: string): Promise<Agent | null> {
    const agent = agents.get(agentId);
    if (!agent || agent.status !== 'idle') return null;

    const updated: Agent = {
      ...agent,
      status: 'running',
      currentTaskId: taskId,
      updatedAt: new Date(),
    };

    agents.set(agentId, updated);
    return updated;
  }

  async completeTask(agentId: string, _result: string): Promise<Agent | null> {
    const agent = agents.get(agentId);
    if (!agent) return null;

    const updated: Agent = {
      ...agent,
      status: 'completed',
      currentTaskId: undefined,
      updatedAt: new Date(),
    };

    agents.set(agentId, updated);
    return updated;
  }

  async reset(agentId: string): Promise<Agent | null> {
    const agent = agents.get(agentId);
    if (!agent) return null;

    const updated: Agent = {
      ...agent,
      status: 'idle',
      currentTaskId: undefined,
      updatedAt: new Date(),
    };

    agents.set(agentId, updated);
    return updated;
  }

  async getStats(): Promise<{
    total: number;
    idle: number;
    running: number;
    blocked: number;
    completed: number;
  }> {
    const allAgents = Array.from(agents.values());

    return {
      total: allAgents.length,
      idle: allAgents.filter(a => a.status === 'idle').length,
      running: allAgents.filter(a => a.status === 'running').length,
      blocked: allAgents.filter(a => a.status === 'blocked').length,
      completed: allAgents.filter(a => a.status === 'completed').length,
    };
  }
}
