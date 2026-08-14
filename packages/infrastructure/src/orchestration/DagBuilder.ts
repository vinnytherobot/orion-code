import type { PlannedSubtask } from './PlannerService.js';
import type { Intent } from './IntentClassifier.js';

// Re-export for convenience
export type { PlannedSubtask } from './PlannerService.js';

export interface DagContext {
  request: string;
  intent: Intent;
  complexity: number;
}

// Priority order for DAG ordering
const ROLE_PRIORITY: Record<string, number> = {
  architect: 0,
  database: 1,
  backend: 2,
  frontend: 2,
  devops: 3,
  documentation: 4,
  qa: 5,
  security: 5,
  performance: 5,
  reviewer: 6,
  git: 7,
};

// Valid roles for input validation
const VALID_ROLES = new Set([
  'architect',
  'backend',
  'database',
  'frontend',
  'documentation',
  'qa',
  'reviewer',
  'devops',
  'security',
  'performance',
  'git',
]);

// Title templates per role
const ROLE_TEMPLATES: Record<string, { title: string; description: string }> = {
  architect: {
    title: 'Design architecture',
    description: 'Analyze the request and establish architectural patterns, file structure, and conventions',
  },
  backend: {
    title: 'Implement backend logic',
    description: 'Write business logic, services, and use cases',
  },
  database: {
    title: 'Design data model',
    description: 'Create schemas, migrations, or data models',
  },
  frontend: {
    title: 'Build UI',
    description: 'Create UI components, pages, or visual elements',
  },
  documentation: {
    title: 'Write documentation',
    description: 'Write or update documentation, README, or API specs',
  },
  qa: {
    title: 'Write tests',
    description: 'Create unit, integration, or e2e tests to verify the implementation',
  },
  reviewer: {
    title: 'Review implementation',
    description: 'Perform a thorough code review of all changes',
  },
  devops: {
    title: 'Configure infrastructure',
    description: 'Set up Docker, CI/CD, or deployment',
  },
  security: {
    title: 'Security audit',
    description: 'Analyze security implications and vulnerabilities',
  },
  performance: {
    title: 'Performance optimization',
    description: 'Identify and resolve performance bottlenecks',
  },
  git: {
    title: 'Prepare commits',
    description: 'Create standardized commits and manage branches',
  },
};

export class DagBuilder {
  /**
   * Legacy build: generic titles, no context. Kept for backward compatibility.
   */
  build(agents: string[]): PlannedSubtask[] {
    if (agents.length === 0) return [];

    const validAgents = agents.filter((role) => {
      if (!VALID_ROLES.has(role)) {
        console.warn(`DagBuilder: Unknown role "${role}" ignored`);
        return false;
      }
      return true;
    });

    if (validAgents.length === 0) return [];

    const sorted = [...validAgents].sort((a, b) => {
      const priorityA = ROLE_PRIORITY[a] ?? 50;
      const priorityB = ROLE_PRIORITY[b] ?? 50;
      return priorityA - priorityB;
    });

    const subtasks: PlannedSubtask[] = [];

    for (const role of sorted) {
      const localId = `${subtasks.length}-${role}`;
      const dependencies = this.calculateDependencies(role, subtasks);

      subtasks.push({
        localId,
        title: `Implement ${role}`,
        description: `Tasks related to ${role}`,
        role,
        dependencies,
        estimatedComplexity: 3,
      });
    }

    return subtasks;
  }

  /**
   * Context-aware build: generates descriptive titles and appropriate complexity.
   */
  buildWithContext(agents: string[], context: DagContext): PlannedSubtask[] {
    if (agents.length === 0) return [];

    const validAgents = agents.filter((role) => {
      if (!VALID_ROLES.has(role)) {
        console.warn(`DagBuilder: Unknown role "${role}" ignored`);
        return false;
      }
      return true;
    });

    if (validAgents.length === 0) return [];

    const sorted = [...validAgents].sort((a, b) => {
      const priorityA = ROLE_PRIORITY[a] ?? 50;
      const priorityB = ROLE_PRIORITY[b] ?? 50;
      return priorityA - priorityB;
    });

    const keyNoun = this.extractKeyNoun(context.request);
    const subtasks: PlannedSubtask[] = [];

    for (const role of sorted) {
      const localId = `${subtasks.length}-${role}`;
      const dependencies = this.calculateDependencies(role, subtasks);
      const template = ROLE_TEMPLATES[role] ?? { title: `Work on ${role}`, description: `Perform ${role} tasks` };

      subtasks.push({
        localId,
        title: `${template.title} for ${keyNoun}`,
        description: `${template.description}: ${context.request}`,
        role,
        dependencies,
        estimatedComplexity: this.estimateSubtaskComplexity(context.complexity),
      });
    }

    return subtasks;
  }

  /**
   * Single-task build for trivial tasks: no dependencies, complexity 1.
   */
  buildSingleTask(task: { title: string; description: string; role: string }): PlannedSubtask[] {
    return [{
      localId: `0-${task.role}`,
      title: task.title,
      description: task.description,
      role: task.role,
      dependencies: [],
      estimatedComplexity: 1,
    }];
  }

  private extractKeyNoun(request: string): string {
    // Remove action verbs to extract the meaningful noun phrase
    const cleaned = request
      .replace(/\b(create|create a|create an|write|write a|add|add a|add an|build|build a|implement|implement a|fix|fix the|refactor|refactor the)\b/gi, '')
      .trim();
    const words = cleaned.split(/\s+/).filter(w => w.length > 1);
    return words.slice(0, 4).join(' ') || request.slice(0, 40);
  }

  private estimateSubtaskComplexity(parentComplexity: number): number {
    if (parentComplexity <= 2) return 1;
    if (parentComplexity <= 3) return Math.min(3, parentComplexity);
    return Math.min(5, parentComplexity);
  }

  private calculateDependencies(role: string, existing: PlannedSubtask[]): string[] {
    const deps: string[] = [];

    for (const subtask of existing) {
      // Architect is a dependency for most roles
      if (subtask.role === 'architect' && role !== 'architect') {
        deps.push(subtask.localId);
      }

      // Database is a dependency for backend
      if (subtask.role === 'database' && role === 'backend') {
        deps.push(subtask.localId);
      }

      // Implementation roles are dependencies for qa/reviewer
      if (
        ['backend', 'frontend', 'database'].includes(subtask.role) &&
        ['qa', 'reviewer'].includes(role)
      ) {
        deps.push(subtask.localId);
      }
    }

    return deps;
  }
}
