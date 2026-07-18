'use client';

import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/effects/ScrollReveal';
import { TiltCard } from '@/components/effects/TiltCard';
import { AGENTS } from '@/lib/agents-data';

import { useEffect, useState } from 'react';

type AgentState = 'running' | 'idle' | 'ready';

export function Agents() {
  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>({});

  useEffect(() => {
    // Initialize states: mostly ready, a couple running or idle
    const initialStates: Record<string, AgentState> = {};
    AGENTS.forEach((a) => {
      initialStates[a.id] =
        Math.random() > 0.85 ? 'running' : Math.random() > 0.7 ? 'idle' : 'ready';
    });
    setAgentStates(initialStates);

    // Periodically shift active states to simulate agents performing work in the background
    const interval = setInterval(() => {
      setAgentStates((prev) => {
        const next = { ...prev };
        const keys = Object.keys(next);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const randVal = Math.random();
        next[randomKey] = randVal > 0.8 ? 'running' : randVal > 0.55 ? 'idle' : 'ready';
        return next;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section id="agents" className="border-t border-border bg-background py-16 sm:py-24">
      <div className="container">
        <ScrollReveal>
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">The team</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
              12 agents. One job each.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Each agent is a specialist with a narrow scope and a permission boundary. The
              orchestrator decides who runs, when, and on what.
            </p>
          </div>
        </ScrollReveal>

        <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {AGENTS.map((agent) => {
            const Icon = agent.icon;
            const state = agentStates[agent.id] || 'ready';
            return (
              <StaggerItem key={agent.id}>
                <TiltCard className="h-full rounded-xl border border-border bg-card">
                  <div className="group relative h-full rounded-xl p-4 sm:p-5 transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_30px_rgba(139,92,246,0.06)]">
                    <div className="absolute right-4 top-4 flex items-center gap-1.5 text-[10px] font-mono select-none">
                      <span className="relative flex h-1.5 w-1.5">
                        {state === 'running' && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        )}
                        <span
                          className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                            state === 'running'
                              ? 'bg-emerald-500'
                              : state === 'idle'
                                ? 'bg-primary/70 animate-pulse'
                                : 'bg-muted-foreground/30'
                          }`}
                        />
                      </span>
                      <span className="text-[10px] text-muted-foreground capitalize leading-none">
                        {state}
                      </span>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground">{agent.name}</h3>
                        <p className="text-xs text-primary">{agent.responsibility}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{agent.description}</p>
                  </div>
                </TiltCard>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
