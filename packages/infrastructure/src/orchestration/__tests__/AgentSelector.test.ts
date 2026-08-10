import { describe, it, expect } from 'vitest';
import { AgentSelector } from '../AgentSelector.js';

describe('AgentSelector', () => {
  const selector = new AgentSelector();

  it('should select agents for add-feature intent', () => {
    const agents = selector.select('add-feature');
    expect(agents).toContain('architect');
    expect(agents).toContain('backend');
    expect(agents).toContain('database');
    expect(agents).toContain('frontend');
    expect(agents).toContain('qa');
    expect(agents).toContain('reviewer');
  });

  it('should select agents for fix-bug intent', () => {
    const agents = selector.select('fix-bug');
    expect(agents).toContain('backend');
    expect(agents).toContain('qa');
    expect(agents).not.toContain('architect');
  });

  it('should select agents for refactor intent', () => {
    const agents = selector.select('refactor');
    expect(agents).toContain('architect');
    expect(agents).toContain('backend');
    expect(agents).toContain('reviewer');
  });

  it('should select agents for add-infrastructure intent', () => {
    const agents = selector.select('add-infrastructure');
    expect(agents).toContain('devops');
    expect(agents).not.toContain('backend');
  });

  it('should select agents for add-testing intent', () => {
    const agents = selector.select('add-testing');
    expect(agents).toContain('qa');
  });

  it('should select agents for security-audit intent', () => {
    const agents = selector.select('security-audit');
    expect(agents).toContain('security');
  });

  it('should select agents for performance intent', () => {
    const agents = selector.select('performance');
    expect(agents).toContain('performance');
  });

  it('should return empty array for unknown intent', () => {
    const agents = selector.select('unknown');
    expect(agents).toHaveLength(0);
  });

  it('should return a defensive copy that does not affect subsequent calls', () => {
    const first = selector.select('add-feature');
    first.push('hacker');
    const second = selector.select('add-feature');
    expect(second).not.toContain('hacker');
    expect(second).toContain('architect');
    expect(second).toContain('backend');
  });
});
