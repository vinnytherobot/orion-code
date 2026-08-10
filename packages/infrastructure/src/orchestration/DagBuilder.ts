import type { PlannedSubtask } from './PlannerService.js';

// Re-export for convenience
export type { PlannedSubtask } from './PlannerService.js';

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

export class DagBuilder {
  build(agents: string[]): PlannedSubtask[] {
    if (agents.length === 0) return [];

    // Filter out unknown roles with warning
    const validAgents = agents.filter((role) => {
      if (!VALID_ROLES.has(role)) {
        console.warn(`DagBuilder: Unknown role "${role}" ignored`);
        return false;
      }
      return true;
    });

    if (validAgents.length === 0) return [];

    // Sort agents by priority
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
