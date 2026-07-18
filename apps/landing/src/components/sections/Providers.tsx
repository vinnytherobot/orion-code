'use client';

import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/effects/ScrollReveal';
import { TiltCard } from '@/components/effects/TiltCard';
import { PROVIDERS } from '@/lib/providers-data';

const ICON_MAP: Record<string, string> = {
  openai: '◉',
  anthropic: '✦',
  ollama: '◆',
  gemini: '✺',
  openrouter: '⇌',
  azure: '▣',
};

export function Providers() {
  return (
    <section id="providers" className="border-t border-border bg-background py-16 sm:py-24">
      <div className="container">
        <ScrollReveal>
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Providers</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Use the right model for each agent.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Orion doesn't lock you in. Mix Claude for the Backend, GPT for the Reviewer, Ollama
              locally for refactors. Configure per agent in{' '}
              <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-foreground">
                orion.config.ts
              </code>
              .
            </p>
          </div>
        </ScrollReveal>

        <StaggerContainer className="mx-auto grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {PROVIDERS.map((provider) => (
            <StaggerItem key={provider.id}>
              <TiltCard className="rounded-xl border border-border bg-card">
                  <div className="group flex h-full flex-col items-center justify-center rounded-xl p-3 sm:p-5 text-center transition-colors hover:border-primary/40">
                  <div className="mb-2 text-2xl text-primary transition-transform group-hover:scale-110">
                    {ICON_MAP[provider.id]}
                  </div>
                  <p className="text-sm font-semibold text-foreground">{provider.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{provider.description}</p>
                </div>
              </TiltCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
