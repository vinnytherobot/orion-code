import type { Result } from '@orion/shared';
import { AppError, ok } from '@orion/shared';
import type { ILLMProvider, LLMMessage } from '../providers/BaseProvider.js';

export type Intent =
  | 'add-feature'
  | 'fix-bug'
  | 'refactor'
  | 'add-infrastructure'
  | 'add-testing'
  | 'security-audit'
  | 'performance'
  | 'unknown';

export interface ClassificationResult {
  intent: Intent;
  confidence: number;
  source: 'rule' | 'llm';
}

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

const VALID_INTENTS: Set<Intent> = new Set([
  'add-feature', 'fix-bug', 'refactor', 'add-infrastructure',
  'add-testing', 'security-audit', 'performance', 'unknown',
]);

const LLM_CLASSIFICATION_PROMPT = `You are an intent classifier for a software engineering assistant.
Classify the user's request into one of these intents:
- add-feature: Creating new functionality
- fix-bug: Fixing bugs or errors
- refactor: Restructuring existing code
- add-infrastructure: Docker, CI/CD, deployment
- add-testing: Writing tests
- security-audit: Security analysis
- performance: Performance optimization
- unknown: Cannot determine intent

Respond with STRICT JSON: { "intent": "...", "confidence": 0.0-1.0 }
No prose, no markdown fences.`;

export class IntentClassifier {
  constructor(private readonly llmProvider?: ILLMProvider) {}

  /**
   * Synchronous rule-based classification. Fast path.
   */
  classify(request: string): Intent {
    if (typeof request !== 'string') return 'unknown';

    for (const [intent, patterns] of INTENT_PATTERNS) {
      if (patterns.some(p => p.test(request))) {
        return intent;
      }
    }
    return 'unknown';
  }

  /**
   * Async classification with LLM fallback.
   * Returns detailed result with confidence score and source.
   */
  async classifyAsync(request: string): Promise<Result<ClassificationResult, AppError>> {
    if (typeof request !== 'string') {
      return ok({ intent: 'unknown', confidence: 1, source: 'rule' });
    }

    // Fast path: rule-based
    const ruleIntent = this.classify(request);
    if (ruleIntent !== 'unknown') {
      return ok({ intent: ruleIntent, confidence: 0.9, source: 'rule' });
    }

    // Slow path: LLM fallback
    if (!this.llmProvider) {
      return ok({ intent: 'unknown', confidence: 1, source: 'rule' });
    }

    const isAvailable = await this.llmProvider.isAvailable();
    if (!isAvailable) {
      return ok({ intent: 'unknown', confidence: 1, source: 'rule' });
    }

    const messages: LLMMessage[] = [
      { role: 'system', content: LLM_CLASSIFICATION_PROMPT },
      { role: 'user', content: request },
    ];

    const response = await this.llmProvider.chat(messages, { temperature: 0 });
    if (response.isFail()) {
      return ok({ intent: 'unknown', confidence: 0.5, source: 'rule' });
    }

    const parsed = this.parseLlmResponse(response.value.content);
    if (parsed && VALID_INTENTS.has(parsed.intent)) {
      return ok({
        intent: parsed.intent,
        confidence: Math.min(Math.max(parsed.confidence, 0), 1),
        source: 'llm',
      });
    }

    return ok({ intent: 'unknown', confidence: 0.5, source: 'llm' });
  }

  private parseLlmResponse(content: string): { intent: Intent; confidence: number } | null {
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);
      if (typeof parsed.intent === 'string' && typeof parsed.confidence === 'number') {
        return { intent: parsed.intent as Intent, confidence: parsed.confidence };
      }
      return null;
    } catch {
      return null;
    }
  }
}
