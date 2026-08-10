import type { Intent } from './IntentClassifier.js';

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

export class AgentSelector {
  select(intent: Intent): string[] {
    return [...(INTENT_TO_AGENTS[intent] ?? [])];
  }
}
