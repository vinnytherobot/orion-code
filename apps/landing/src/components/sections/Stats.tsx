'use client';

import { AnimatedCounter } from '@/components/effects/AnimatedCounter';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/effects/ScrollReveal';
import { TiltCard } from '@/components/effects/TiltCard';
import { useGitHubStats } from '@/lib/use-github-stats';
import { Code2, GitFork, GitPullRequest, Star } from 'lucide-react';

const FALLBACK_STATS = [
  { label: 'Stars', value: 0, icon: Star },
  { label: 'Forks', value: 0, icon: GitFork },
  { label: 'Open Issues', value: 0, icon: Code2 },
  { label: 'Open PRs', value: 0, icon: GitPullRequest },
];

export function Stats() {
  const github = useGitHubStats();

  const stats = github.loading
    ? FALLBACK_STATS
    : [
        { label: 'Stars', value: github.stars, icon: Star },
        { label: 'Forks', value: github.forks, icon: GitFork },
        { label: 'Open Issues', value: github.openIssues, icon: Code2 },
        { label: 'Open PRs', value: github.openPRs, icon: GitPullRequest },
      ];

  return (
    <section className="border-t border-border bg-background py-24">
      <div className="container">
        <ScrollReveal>
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
              GitHub Stats
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Live from the repository.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Real-time numbers pulled from GitHub. No vanity metrics.
            </p>
          </div>
        </ScrollReveal>

        <StaggerContainer className="mx-auto grid max-w-4xl grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <StaggerItem key={stat.label}>
              <TiltCard className="rounded-xl border border-border bg-card">
                <div className="relative overflow-hidden rounded-xl p-6 text-center transition-colors hover:border-primary/40">
                  <div
                    className="pointer-events-none absolute inset-0 -z-10 opacity-60"
                    style={{
                      background:
                        'radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.15), transparent 60%)',
                    }}
                    aria-hidden="true"
                  />
                  <stat.icon className="mx-auto mb-3 h-5 w-5 text-primary" />
                  <div className="text-5xl font-semibold tracking-tight text-primary sm:text-6xl">
                    {github.loading ? (
                      <span className="inline-block h-12 w-20 animate-pulse rounded bg-primary/20" />
                    ) : (
                      <AnimatedCounter value={stat.value} />
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </TiltCard>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {github.error && (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Could not load GitHub stats. Visit the{' '}
            <a
              href="https://github.com/vinnytherobot/orion-code"
              className="underline hover:text-foreground"
              target="_blank"
              rel="noreferrer"
            >
              repository
            </a>{' '}
            directly.
          </p>
        )}
      </div>
    </section>
  );
}
