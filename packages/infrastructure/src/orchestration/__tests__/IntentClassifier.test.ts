import { describe, it, expect } from 'vitest';
import { IntentClassifier } from '../IntentClassifier.js';

describe('IntentClassifier', () => {
  const classifier = new IntentClassifier();

  it('should classify "add feature" intent', () => {
    expect(classifier.classify('Add JWT authentication')).toBe('add-feature');
    expect(classifier.classify('Implement user registration')).toBe('add-feature');
    expect(classifier.classify('Create a new API endpoint')).toBe('add-feature');
    expect(classifier.classify('Build a dashboard')).toBe('add-feature');
  });

  it('should classify "fix bug" intent', () => {
    expect(classifier.classify('Fix login error')).toBe('fix-bug');
    expect(classifier.classify('The app is broken')).toBe('fix-bug');
    expect(classifier.classify('There is a bug in auth')).toBe('fix-bug');
  });

  it('should classify "refactor" intent', () => {
    expect(classifier.classify('Refactor the auth module')).toBe('refactor');
    expect(classifier.classify('Restructure the database layer')).toBe('refactor');
  });

  it('should classify "add infrastructure" intent', () => {
    expect(classifier.classify('Add Docker support')).toBe('add-infrastructure');
    expect(classifier.classify('Set up CI/CD pipeline')).toBe('add-infrastructure');
    expect(classifier.classify('Configure GitHub Actions')).toBe('add-infrastructure');
  });

  it('should classify "add testing" intent', () => {
    expect(classifier.classify('Add unit tests')).toBe('add-testing');
    expect(classifier.classify('Write e2e tests')).toBe('add-testing');
    expect(classifier.classify('Increase test coverage')).toBe('add-testing');
  });

  it('should classify "security audit" intent', () => {
    expect(classifier.classify('Security audit')).toBe('security-audit');
    expect(classifier.classify('Check for vulnerabilities')).toBe('security-audit');
  });

  it('should classify "performance" intent', () => {
    expect(classifier.classify('Optimize slow queries')).toBe('performance');
    expect(classifier.classify('Improve cache performance')).toBe('performance');
  });

  it('should return unknown for unclassified requests', () => {
    expect(classifier.classify('hello world')).toBe('unknown');
    expect(classifier.classify('do something')).toBe('unknown');
  });
});
