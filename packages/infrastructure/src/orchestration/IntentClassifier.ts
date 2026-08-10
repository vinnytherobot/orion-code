export type Intent = 
  | 'add-feature'
  | 'fix-bug'
  | 'refactor'
  | 'add-infrastructure'
  | 'add-testing'
  | 'security-audit'
  | 'performance'
  | 'unknown';

const INTENT_PATTERNS: Record<Intent, RegExp[]> = {
  'add-infrastructure': [
    /docker/i,
    /ci\/cd/i,
    /deploy/i,
    /github\s+actions/i,
    /infrastructure/i,
  ],
  'add-testing': [
    /test/i,
    /coverage/i,
    /e2e/i,
    /unit\s+test/i,
    /integration\s+test/i,
  ],
  'add-feature': [
    /add\s+(a\s+)?(new\s+)?/i,
    /implement/i,
    /create/i,
    /build/i,
  ],
  'fix-bug': [
    /fix/i,
    /bug/i,
    /error/i,
    /broken/i,
    /crash/i,
  ],
  'refactor': [
    /refactor/i,
    /restructure/i,
    /reorganize/i,
    /clean\s+up/i,
  ],
  'security-audit': [
    /security/i,
    /vulnerability/i,
    /audit/i,
    /vulnerabilities/i,
  ],
  'performance': [
    /performance/i,
    /slow/i,
    /optimize/i,
    /cache/i,
    /bottleneck/i,
  ],
  'unknown': [],
};

export class IntentClassifier {
  classify(request: string): Intent {
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      if (intent === 'unknown') continue;
      if (patterns.some(p => p.test(request))) {
        return intent as Intent;
      }
    }
    return 'unknown';
  }
}
