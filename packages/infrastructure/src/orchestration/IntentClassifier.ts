export type Intent = 
  | 'add-feature'
  | 'fix-bug'
  | 'refactor'
  | 'add-infrastructure'
  | 'add-testing'
  | 'security-audit'
  | 'performance'
  | 'unknown';

// Intent patterns ordered by specificity — first match wins.
// More specific intents (infrastructure, testing) are checked before
// general feature creation to avoid ambiguity.
const INTENT_PATTERNS: [Intent, RegExp[]][] = [
  ['add-infrastructure', [
    /docker/i,
    /ci\/cd/i,
    /deploy/i,
    /github\s+actions/i,
    /infrastructure/i,
  ]],
  ['add-testing', [
    /test/i,
    /coverage/i,
    /e2e/i,
    /unit\s+test/i,
    /integration\s+test/i,
  ]],
  ['add-feature', [
    /implement/i,
    /create/i,
    /build/i,
  ]],
  ['fix-bug', [
    /fix/i,
    /bug/i,
    /error/i,
    /broken/i,
    /crash/i,
  ]],
  ['refactor', [
    /refactor/i,
    /restructure/i,
    /reorganize/i,
    /clean\s+up/i,
  ]],
  ['security-audit', [
    /security/i,
    /vulnerability/i,
    /audit/i,
    /vulnerabilities/i,
  ]],
  ['performance', [
    /performance/i,
    /slow/i,
    /optimize/i,
    /cache/i,
    /bottleneck/i,
  ]],
];

export class IntentClassifier {
  classify(request: string): Intent {
    if (typeof request !== 'string') return 'unknown';

    for (const [intent, patterns] of INTENT_PATTERNS) {
      if (patterns.some(p => p.test(request))) {
        return intent;
      }
    }
    return 'unknown';
  }
}
