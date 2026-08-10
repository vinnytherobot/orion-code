export interface PlannedSubtask {
  localId: string;
  title: string;
  description: string;
  role: string;
  dependencies: string[];
  estimatedComplexity: number;
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

export class DagBuilder {
  build(agents: string[]): PlannedSubtask[] {
    if (agents.length === 0) return [];

    // Sort agents by priority
    const sorted = [...agents].sort((a, b) => {
      const priorityA = ROLE_PRIORITY[a] ?? 50;
      const priorityB = ROLE_PRIORITY[b] ?? 50;
      return priorityA - priorityB;
    });

    const subtasks: PlannedSubtask[] = [];
    const roleCount = new Map<string, number>();

    for (const role of sorted) {
      const count = roleCount.get(role) ?? 0;
      roleCount.set(role, count + 1);

      const localId = count > 0 ? `${count}-${role}` : `${subtasks.length}-${role}`;
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
      if (['backend', 'frontend', 'database'].includes(subtask.role) && 
          ['qa', 'reviewer'].includes(role)) {
        deps.push(subtask.localId);
      }
    }

    return deps;
  }
}
