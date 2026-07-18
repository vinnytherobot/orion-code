'use client';

import { ScrollReveal } from '@/components/effects/ScrollReveal';
import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const MESSAGES = [
  { role: 'user', text: '/implement Add password reset with email link' },
  { role: 'assistant', text: 'Planning task graph…' },
  { role: 'log', text: '[planner]    ✔ broken into 6 tasks' },
  { role: 'log', text: '[backend]    ✔ created use-cases/reset-password' },
  { role: 'log', text: '[backend]    ✔ added token repository' },
  { role: 'log', text: '[database]   ✔ added password_resets table' },
  { role: 'log', text: '[docs]       ✔ updated openapi spec' },
  { role: 'log', text: '[reviewer]   ⚠ 1 nit · auto-fixed' },
  { role: 'log', text: '[git]        ✔ opened PR #142' },
  { role: 'assistant', text: 'Done. Branch: feat/password-reset · PR #142 ready.' },
];

function useVisible<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { once: false, margin: '-100px 0px' });
  return { ref, isInView: inView };
}

export function Showcase() {
  const [visibleCount, setVisibleCount] = useState(0);
  const ref = useVisible<HTMLDivElement>();

  useEffect(() => {
    if (!ref.isInView) {
      setVisibleCount(0);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setVisibleCount(i);
      if (i >= MESSAGES.length) clearInterval(id);
    }, 350);
    return () => clearInterval(id);
  }, [ref.isInView]);

  return (
    <section id="showcase" className="relative overflow-hidden border-t border-border py-16 sm:py-24">
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-primary/[0.03] to-background"
        aria-hidden="true"
      />

      <div className="container">
        <ScrollReveal>
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Showcase</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Watch it work.
            </h2>
            <p className="mt-4 text-muted-foreground">
              A live TTY, parallel agents, no extra window. Scroll back, replay any execution, audit
              the whole thing.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div
            ref={ref.ref}
            className="mx-auto max-w-3xl overflow-x-auto rounded-xl border border-border bg-card shadow-2xl crt-scanlines scrollbar-hide"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary/50 px-3 sm:px-4 py-2.5">
              <div className="flex gap-1.5 shrink-0">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
              </div>
              <span className="font-mono text-[10px] sm:text-xs text-muted-foreground truncate min-w-0">
                orion ~ ~/projects/api
              </span>
              <span className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground shrink-0">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                live
              </span>
            </div>

            <div className="space-y-1.5 p-4 sm:p-6 font-mono text-xs sm:text-sm leading-relaxed">
              {MESSAGES.slice(0, visibleCount).map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={
                    m.role === 'user'
                      ? 'text-foreground'
                      : m.role === 'assistant'
                        ? 'text-primary'
                        : 'text-muted-foreground'
                  }
                >
                  {m.role === 'user' ? (
                    <span>
                      <span className="text-primary">›</span> {m.text}
                    </span>
                  ) : (
                    <span>{m.text}</span>
                  )}
                </motion.div>
              ))}

              {visibleCount < MESSAGES.length && (
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                  className="inline-block h-4 w-2 bg-primary align-middle"
                />
              )}

              {visibleCount >= MESSAGES.length && (
                <div className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
                  <span className="text-primary">›</span> _
                </div>
              )}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
