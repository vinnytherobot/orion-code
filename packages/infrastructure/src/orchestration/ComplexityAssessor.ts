import type { Intent } from './IntentClassifier.js';

export type ComplexityTier = 'trivial' | 'moderate' | 'complex';

export interface ComplexityAssessment {
  tier: ComplexityTier;
  score: number;
  suggestedRoles: string[];
  skippedRoles: string[];
  source: 'heuristic';
}

export interface AssessmentInput {
  request: string;
  intent: Intent;
}

// Trivial signals: strong indicators of a single-file/simple task
const TRIVIAL_PATTERNS: RegExp[] = [
  /create\s+(a\s+)?file/i,
  /write\s+(a\s+)?(file|comment|line|note|text)/i,
  /add\s+(a\s+)?(comment|line|note)/i,
  /rename/i,
  /move\s+(a\s+)?file/i,
  /file\s+called/i,
  /file\s+named/i,
  /\.(md|txt|json|yaml|yml|toml|csv)\b/i,
];

// Complexity boosters: signals of multi-domain / architecture-level work
const COMPLEX_PATTERNS: RegExp[] = [
  /\b(feature|system|module|pipeline|workflow)\b/i,
  /\b(auth|authentication|authorization|permission|role.based|rbac)\b/i,
  /\b(refactor\s+(the\s+)?(entire|whole|all))\b/i,
  /\b(implement\s+(a\s+)?(full|complete|entire))\b/i,
  /\b(redesign|restructure|reorganize)\b/i,
  /\b(full\s+(stack|system|feature|module))\b/i,
  /\b(complete\s+(system|feature|module|implementation))\b/i,
  /\b(with\s+rbac)\b/i,
  /\b(data\s+layer)\b/i,
  /\b(access\s+control)\b/i,
  /\b(multi.\w+\s+(module|system|service))\b/i,
];

// Moderate boosters: single-domain but non-trivial
const MODERATE_PATTERNS: RegExp[] = [
  /\b(endpoint|api|route|controller|service|handler)\b/i,
  /\b(test|tests|unit.test|integration.test|e2e)\b/i,
  /\b(fix|bug|error|broken|crash)\b/i,
  /\b(schema|migration|query|database|db)\b/i,
  /\b(component|page|ui|form|button|layout)\b/i,
];

// Role-specific keywords for suggesting which agents to include
const ROLE_KEYWORDS: Record<string, string[]> = {
  database: ['database', 'db', 'schema', 'migration', 'query', 'sql', 'prisma', 'drizzle', 'typeorm', 'entity', 'model', 'table', 'column', 'index'],
  frontend: ['ui', 'component', 'page', 'dashboard', 'style', 'css', 'html', 'form', 'button', 'layout', 'react', 'vue', 'svelte', 'frontend'],
  devops: ['docker', 'deploy', 'ci', 'cd', 'pipeline', 'kubernetes', 'k8s', 'terraform', 'nginx', 'infrastructure'],
  qa: ['test', 'tests', 'unit', 'integration', 'e2e', 'coverage', 'spec', 'describe', 'it('],
  security: ['security', 'vulnerability', 'auth', 'permission', 'encryption', 'audit', 'xss', 'csrf', 'injection'],
  performance: ['performance', 'slow', 'optimize', 'cache', 'bottleneck', 'latency', 'memory', 'cpu'],
  documentation: ['readme', 'docs', 'documentation', 'swagger', 'openapi', 'changelog', 'comment'],
  architect: ['architecture', 'structure', 'folder', 'convention', 'pattern', 'boundary'],
  reviewer: [],  // reviewer is added for complex tasks, not by keyword
};

// Roles that are skipped for trivial tasks
const TRIVIAL_SKIP = ['architect', 'reviewer', 'qa', 'database', 'frontend', 'documentation', 'devops', 'security', 'performance'];

// Intent-to-default-role mapping
const INTENT_DEFAULT_ROLE: Record<Intent, string> = {
  'add-feature': 'backend',
  'fix-bug': 'backend',
  'refactor': 'backend',
  'add-infrastructure': 'devops',
  'add-testing': 'qa',
  'security-audit': 'security',
  'performance': 'performance',
  'unknown': 'backend',
};

export class ComplexityAssessor {
  assess(input: AssessmentInput): ComplexityAssessment {
    const request = input.request.toLowerCase();
    const wordCount = input.request.split(/\s+/).length;

    // Start with base score of 2
    let score = 2;
    const trivialMatches = TRIVIAL_PATTERNS.filter(p => p.test(request));
    const complexMatches = COMPLEX_PATTERNS.filter(p => p.test(request));
    const moderateMatches = MODERATE_PATTERNS.filter(p => p.test(request));

    // Strong trivial signals → clamp to 1
    if (trivialMatches.length > 0) {
      score = 1;
    } else {
      // Complexity boosters (each match adds +1)
      score += complexMatches.length;

      // Moderate boosters (only if not already complex)
      if (score < 4 && moderateMatches.length > 0) {
        score += 1;
      }

      // Word count adjustments (only when no strong signals)
      if (complexMatches.length === 0 && moderateMatches.length === 0) {
        if (wordCount < 10) score -= 1;
        if (wordCount > 30) score += 1;
      }
    }

    // Clamp score
    score = Math.max(1, Math.min(5, score));

    // Determine tier
    let tier: ComplexityTier;
    if (score <= 1) {
      tier = 'trivial';
    } else if (score <= 3) {
      tier = 'moderate';
    } else {
      tier = 'complex';
    }

    // Determine suggested and skipped roles based on tier + keywords
    const suggestedRoles: string[] = [];
    const skippedRoles: string[] = [];

    if (tier === 'trivial') {
      // Only the default role for this intent
      suggestedRoles.push(INTENT_DEFAULT_ROLE[input.intent] ?? 'backend');
      skippedRoles.push(...TRIVIAL_SKIP);
    } else {
      // For moderate/complex: always include the default role
      suggestedRoles.push(INTENT_DEFAULT_ROLE[input.intent] ?? 'backend');

      // Add roles based on keyword matches
      for (const [role, keywords] of Object.entries(ROLE_KEYWORDS)) {
        if (suggestedRoles.includes(role)) continue;
        if (keywords.some(kw => request.includes(kw))) {
          suggestedRoles.push(role);
        }
      }

      // For complex tasks: ensure reviewer is included
      if (tier === 'complex' && !suggestedRoles.includes('reviewer')) {
        suggestedRoles.push('reviewer');
      }

      // For moderate tasks: cap at 3 roles
      if (tier === 'moderate' && suggestedRoles.length > 3) {
        suggestedRoles.length = 3;
      }

      // Determine skipped roles (roles not in suggested)
      const allRoles = ['architect', 'backend', 'database', 'frontend', 'documentation', 'qa', 'reviewer', 'devops', 'security', 'performance', 'git'];
      for (const role of allRoles) {
        if (!suggestedRoles.includes(role)) {
          skippedRoles.push(role);
        }
      }
    }

    return {
      tier,
      score,
      suggestedRoles,
      skippedRoles,
      source: 'heuristic',
    };
  }
}
