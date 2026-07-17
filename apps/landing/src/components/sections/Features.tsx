'use client';

import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/effects/ScrollReveal';
import { TiltCard } from '@/components/effects/TiltCard';
import { LayoutDashboard, Workflow, GitMerge } from 'lucide-react';

const STEPS = [
  {
    title: 'Plan',
    icon: Workflow,
    headline: 'Describe. The Planner breaks it down.',
    body: 'Type in natural language. The Planner analyzes the scope, detects the stack, and produces a dependency graph of tasks — all inside the TUI.',
    mockup: (
      <div className="rounded-lg border border-border bg-[#0a0a0f] font-mono text-[11px] leading-relaxed text-[#c0c0c0] shadow-2xl [background:linear-gradient(135deg,#0a0a0f,#0d0d1a)]">
        <div className="flex items-center gap-2 border-b border-[#1a1a2e] bg-[#050508] px-3 py-1.5 text-[10px]">
          <span className="font-bold text-[#7c3aed]">◆</span>
          <span className="text-[#7c3aed]">Orchestrator</span>
          <span className="text-[#555]">—</span>
          <span className="text-[#666]">~/projects/api</span>
          <span className="ml-auto text-[#7c3aed]">●</span>
          <span className="text-[#555]">IDLE</span>
        </div>

        <div className="grid grid-cols-[1fr_140px] gap-px bg-[#1a1a2e]">
          <div className="space-y-1.5 bg-[#0a0a0f] p-3">
            <p className="text-[#7c3aed]">
              <span className="text-[#555]">$</span> orion implement &quot;Add password reset&quot;
            </p>
            <p className="text-[#555]">▸ Detecting stack: typescript · fastify · prisma</p>
            <p className="text-[#555]">▸ Planner analyzing scope…</p>

            <div className="mt-2 border-l-2 border-[#7c3aed]/40 pl-2">
              <p className="text-[#7c3aed]">◆ Planner — 6 tasks</p>
              <p className="text-[#888]">  ├─ 1. Create password_resets schema</p>
              <p className="text-[#888]">  ├─ 2. Implement token repository</p>
              <p className="text-[#888]">  ├─ 3. Build send-reset-email use case</p>
              <p className="text-[#888]">  ├─ 4. Build reset-password use case</p>
              <p className="text-[#888]">  ├─ 5. Wire POST /auth/forgot + /reset</p>
              <p className="text-[#888]">  └─ 6. Update OpenAPI + changelog</p>
            </div>

            <div className="mt-2 text-[#555]">
              <p>▸ Dependencies detected: 3 parallel groups</p>
              <p className="text-[#7c3aed]">▸ Plan ready. Spawning agents…</p>
            </div>
          </div>

          <div className="border-l border-[#1a1a2e] bg-[#0a0a0f] p-3 text-[10px]">
            <p className="mb-1.5 text-[#555] uppercase tracking-wider">Agents</p>
            <div className="space-y-1">
              {[
                ['Planner', 'ready'],
                ['Architect', 'ready'],
                ['Backend', 'idle'],
                ['Database', 'idle'],
                ['Frontend', 'idle'],
                ['QA', 'idle'],
                ['Reviewer', 'idle'],
                ['DevOps', 'idle'],
                ['Security', 'idle'],
                ['Performance', 'idle'],
                ['Docs', 'idle'],
                ['Git', 'idle'],
              ].map(([name, status]) => (
                <div key={name} className="flex items-center gap-1.5">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      status === 'ready'
                        ? 'bg-[#7c3aed]'
                        : status === 'idle'
                          ? 'bg-[#333]'
                          : 'bg-emerald-500'
                    }`}
                  />
                  <span className="text-[#888]">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-[#1a1a2e] bg-[#050508] px-3 py-1 text-[10px] text-[#555]">
          <span>─── 12 agents · 6 tasks · 3 parallel groups ───</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Execute',
    icon: LayoutDashboard,
    headline: 'Parallel agents. Live TUI.',
    body: 'The Orchestrator dispatches independent tasks simultaneously. Each agent has restricted permissions. The dashboard shows status, logs, and progress in real time.',
    mockup: (
      <div className="rounded-lg border border-border bg-[#0a0a0f] font-mono text-[11px] leading-relaxed text-[#c0c0c0] shadow-2xl [background:linear-gradient(135deg,#0a0a0f,#0d0d1a)]">
        <div className="flex items-center gap-2 border-b border-[#1a1a2e] bg-[#050508] px-3 py-1.5 text-[10px]">
          <span className="font-bold text-emerald-400">◆</span>
          <span className="text-emerald-400">Orchestrator</span>
          <span className="text-[#555]">— RUNNING</span>
          <span className="ml-auto flex items-center gap-1 text-[#666]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            3 active
          </span>
        </div>

        <div className="grid grid-cols-[1fr_1fr] gap-px bg-[#1a1a2e]">
          <div className="space-y-1 bg-[#0a0a0f] p-3">
            <p className="mb-1.5 text-[10px] uppercase tracking-wider text-[#555]">Dashboard</p>
            {[
              ['Database', 'running', 'emerald', 'creating schema…'],
              ['Backend', 'running', 'emerald', 'implementing use case…'],
              ['Docs', 'running', 'emerald', 'updating openapi…'],
              ['Frontend', 'waiting', '#555', 'depends on backend'],
              ['QA', 'waiting', '#555', 'depends on backend'],
              ['Reviewer', 'waiting', '#555', 'depends on all producers'],
            ].map(([name, status, color, desc]) => (
              <div
                key={name}
                className="flex items-center gap-2 rounded border border-[#1a1a2e] bg-[#050508] px-2 py-1"
              >
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    status === 'running' ? 'bg-emerald-500' : 'bg-[#333]'
                  }`}
                />
                <span className="w-16 text-[#c0c0c0]">{name}</span>
                <span className="text-[#555]">—</span>
                <span className="text-[#777]">{desc}</span>
              </div>
            ))}
          </div>

          <div className="border-l border-[#1a1a2e] bg-[#0a0a0f] p-3">
            <p className="mb-1.5 text-[10px] uppercase tracking-wider text-[#555]">Logs</p>
            <div className="space-y-0.5 overflow-hidden font-mono text-[10px]">
              <p className="text-emerald-400">[database] ✔ created table password_resets</p>
              <p className="text-emerald-400">[database] ✔ added index on email</p>
              <p className="text-emerald-400">[backend] ✔ created token.repository.ts</p>
              <p className="text-emerald-400">[backend] ✔ created reset-password.use-case.ts</p>
              <p className="text-yellow-400">[docs] ~ updating openapi.yaml…</p>
              <p className="text-[#555]">[reviewer] waiting for producers…</p>
              <p className="text-[#555]">[frontend] waiting for backend routes…</p>
              <p className="text-[#555]">
                <span className="inline-block h-3 w-1 animate-pulse bg-[#7c3aed]" />
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-[#1a1a2e] bg-[#050508] px-3 py-1 text-[10px] text-[#555]">
          <span>Tasks:</span>
          <span className="text-emerald-400">■■■■■□□□</span>
          <span>5/8 · 3 running · 3 waiting · 0 failed</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Ship',
    icon: GitMerge,
    headline: 'Reviewed. Committed. Shipped.',
    body: 'The Reviewer checks every diff. Auto-fixes are applied. The Git Agent commits with conventional messages and opens the Pull Request — all without leaving the TUI.',
    mockup: (
      <div className="rounded-lg border border-border bg-[#0a0a0f] font-mono text-[11px] leading-relaxed text-[#c0c0c0] shadow-2xl [background:linear-gradient(135deg,#0a0a0f,#0d0d1a)]">
        <div className="flex items-center gap-2 border-b border-[#1a1a2e] bg-[#050508] px-3 py-1.5 text-[10px]">
          <span className="font-bold text-blue-400">◆</span>
          <span className="text-blue-400">Orchestrator</span>
          <span className="text-[#555]">— COMPLETED</span>
          <span className="ml-auto text-[#555]">
            <span className="text-emerald-400">✔</span> all tasks passed
          </span>
        </div>

        <div className="grid grid-cols-[1fr_1fr] gap-px bg-[#1a1a2e]">
          <div className="space-y-1.5 bg-[#0a0a0f] p-3">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-[#555]">Review</p>
            <div className="rounded border border-[#1a1a2e] bg-[#050508] p-2 text-[10px]">
              {[
                ['backend/reset-password.ts', 'passed'],
                ['backend/token.ts', 'passed'],
                ['database/password_resets', 'passed'],
                ['docs/openapi.yaml', '1 nit fixed'],
              ].map(([file, status]) => (
                <div key={file} className="flex items-center gap-2 py-0.5">
                  <span
                    className={
                      status === 'passed' ? 'text-emerald-400' : 'text-yellow-400'
                    }
                  >
                    {status === 'passed' ? '✔' : '⚠'}
                  </span>
                  <span className="text-[#888]">{file}</span>
                  <span className="ml-auto text-[#555]">{status}</span>
                </div>
              ))}
            </div>

            <div className="mt-1 text-[10px] text-[#555]">
              <p className="text-emerald-400">✔ Reviewer: no blockers · 1 nit auto-fixed</p>
              <p className="text-emerald-400">✔ Security: no vulnerabilities found</p>
            </div>
          </div>

          <div className="border-l border-[#1a1a2e] bg-[#0a0a0f] p-3">
            <p className="mb-1.5 text-[10px] uppercase tracking-wider text-[#555]">Git</p>
            <div className="space-y-1 rounded border border-[#1a1a2e] bg-[#050508] p-2 text-[10px]">
              <p className="text-[#7c3aed]">◆ Git Agent</p>
              <p className="text-[#555]">
                <span className="text-emerald-400">✔</span> Branch: feat/password-reset
              </p>
              <p className="text-[#555]">
                <span className="text-emerald-400">✔</span> 4 commits (conventional)
              </p>
              <p className="text-[#555]">
                <span className="text-emerald-400">✔</span> CHANGELOG updated
              </p>
              <div className="mt-2 border-t border-[#1a1a2e] pt-2">
                <p className="text-blue-400">◆ Pull Request #142 opened</p>
                <p className="text-[#555]">  feat: add password reset flow</p>
                <p className="text-[#888]">  4 files · +215 / -12 · ready for review</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-[#1a1a2e] bg-[#050508] px-3 py-1.5 text-[10px] text-[#555]">
          <span>───</span>
          <span className="flex items-center gap-1">
            <span className="text-emerald-400">●</span> 8/8 completed
          </span>
          <span className="flex items-center gap-1">
            <span className="text-emerald-400">●</span> 1 nit auto-fixed
          </span>
          <span className="flex items-center gap-1">
            <span className="text-blue-400">●</span> PR #142
          </span>
        </div>
      </div>
    ),
  },
];

export function Features() {
  return (
    <section id="features" className="border-t border-border bg-background py-24">
      <div className="container">
        <ScrollReveal>
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              One TUI. 12 agents. Zero context switch.
            </h2>
          </div>
        </ScrollReveal>

        <StaggerContainer className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <StaggerItem key={step.title}>
                <TiltCard className="h-full rounded-xl border border-border bg-card">
                  <div className="group flex h-full flex-col rounded-xl p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_30px_rgba(139,92,246,0.06)]">
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-[0_0_18px_-2px_hsl(var(--primary)/0.4)] [background:radial-gradient(circle_at_top_left,hsl(var(--primary)/0.25),hsl(var(--primary)/0.08)_70%)]">
                      <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                    <p className="mt-1 text-sm font-medium text-primary">{step.headline}</p>
                    <p className="mt-3 text-sm text-muted-foreground">{step.body}</p>
                    <div className="relative mt-5 flex-1">{step.mockup}</div>
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
