import type { Intent } from './IntentClassifier.js';
import type { Agent } from '@orion/domain';

export interface AgentSelectionCriteria {
  intent: Intent;
  availableAgents?: Agent[];
  taskComplexity?: number; // 1-5
  request?: string;       // original user request for keyword-based filtering
}

export interface RankedAgent {
  role: string;
  score: number;
  reason: string;
}

const INTENT_TO_AGENTS: Record<Intent, string[]> = {
  'add-feature': ['architect', 'backend', 'database', 'frontend', 'qa', 'reviewer'],
  'fix-bug': ['backend', 'qa'],
  'refactor': ['architect', 'backend', 'reviewer'],
  'add-infrastructure': ['devops'],
  'add-testing': ['qa'],
  'security-audit': ['security'],
  'performance': ['performance'],
  'unknown': [],
};

// Base scores for each role (higher = more likely to be selected)
const ROLE_BASE_SCORES: Record<string, number> = {
  architect: 80,
  backend: 90,
  database: 70,
  frontend: 80,
  documentation: 50,
  qa: 70,
  reviewer: 60,
  devops: 60,
  security: 50,
  performance: 50,
  git: 40,
};

// Role-specific keyword groups for request-aware filtering
const ROLE_KEYWORDS: Record<string, string[]> = {
  database: ['database', 'db', 'schema', 'migration', 'query', 'sql', 'prisma', 'drizzle', 'typeorm', 'entity', 'model', 'table', 'column', 'index'],
  frontend: ['ui', 'component', 'page', 'dashboard', 'style', 'css', 'html', 'form', 'button', 'layout', 'react', 'vue', 'svelte', 'frontend'],
  devops: ['docker', 'deploy', 'ci', 'cd', 'pipeline', 'kubernetes', 'k8s', 'terraform', 'nginx', 'infrastructure'],
  qa: ['test', 'tests', 'unit', 'integration', 'e2e', 'coverage', 'spec', 'describe', 'it('],
  security: ['security', 'vulnerability', 'auth', 'permission', 'encryption', 'audit', 'xss', 'csrf', 'injection'],
  performance: ['performance', 'slow', 'optimize', 'cache', 'bottleneck', 'latency', 'memory', 'cpu'],
  documentation: ['readme', 'docs', 'documentation', 'swagger', 'openapi', 'changelog', 'comment'],
  architect: ['architecture', 'structure', 'folder', 'convention', 'pattern', 'boundary'],
};

export class AgentSelector {
  /**
   * Simple rule-based selection (backwards compatible).
   */
  select(intent: Intent): string[] {
    return [...(INTENT_TO_AGENTS[intent] ?? [])];
  }

  /**
   * Dynamic selection with ranking based on availability, complexity, and request context.
   * Returns agents sorted by score (highest first), filtered and capped by tier.
   */
  selectDynamic(criteria: AgentSelectionCriteria): RankedAgent[] {
    const baseRoles = INTENT_TO_AGENTS[criteria.intent] ?? [];
    if (baseRoles.length === 0) return [];

    const availableRoles = new Set(
      criteria.availableAgents?.map(a => a.role) ?? []
    );

    const ranked: RankedAgent[] = [];

    for (const role of baseRoles) {
      let score = ROLE_BASE_SCORES[role] ?? 50;
      let reason = 'base score';

      // Boost if agent is available
      if (availableRoles.has(role)) {
        score += 20;
        reason = 'agent available';
      } else if (criteria.availableAgents && criteria.availableAgents.length > 0) {
        // Penalize if no agent of this role is available
        score -= 30;
        reason = 'no agent available';
      }

      // Adjust based on complexity
      if (criteria.taskComplexity) {
        const complexity = criteria.taskComplexity;

        // High complexity: prefer architect, reviewer
        if (complexity >= 4 && ['architect', 'reviewer'].includes(role)) {
          score += 15;
          reason += ' + high complexity boost';
        }

        // Low complexity: skip architect, prefer direct implementation
        if (complexity <= 2 && role === 'architect') {
          score -= 20;
          reason += ' + low complexity penalty';
        }

        // Medium+ complexity: include documentation
        if (complexity >= 3 && role === 'documentation') {
          score += 10;
          reason += ' + medium complexity boost';
        }
      }

      // Request-aware keyword filtering
      if (criteria.request) {
        const requestLower = criteria.request.toLowerCase();
        const keywords = ROLE_KEYWORDS[role];

        if (keywords) {
          const hasKeyword = keywords.some(kw => requestLower.includes(kw));
          if (!hasKeyword) {
            score -= 40;
            reason += ` + no ${role} context`;
          }
        }

        // Special: penalize architect for trivial file operations
        if (role === 'architect') {
          const trivialOps = ['file', 'comment', 'rename', 'move', 'write', 'add a line'];
          if (trivialOps.some(op => requestLower.includes(op))) {
            score -= 30;
            reason += ' + trivial file operation';
          }
        }
      }

      ranked.push({ role, score, reason });
    }

    // Sort by score descending
    ranked.sort((a, b) => b.score - a.score);

    // Apply tier-based cap
    const complexity = criteria.taskComplexity ?? 3;
    const maxAgents = complexity <= 1 ? 1 : complexity <= 2 ? 2 : complexity <= 3 ? 3 : baseRoles.length;

    // Filter out low-scoring roles (threshold: 20) and apply cap
    return ranked.filter(r => r.score > 20).slice(0, maxAgents);
  }

  /**
   * Returns only the role names from dynamic selection.
   */
  selectRoles(criteria: AgentSelectionCriteria): string[] {
    return this.selectDynamic(criteria).map(r => r.role);
  }
}
