'use client';

import { ScrollReveal } from '@/components/effects/ScrollReveal';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  layer: number;
}

const NODES: Node[] = [
  { id: 'planner', label: 'Planner', x: 500, y: 60, layer: 0 },
  { id: 'backend', label: 'Backend', x: 220, y: 200, layer: 1 },
  { id: 'database', label: 'Database', x: 500, y: 200, layer: 1 },
  { id: 'docs', label: 'Docs', x: 780, y: 200, layer: 1 },
  { id: 'reviewer', label: 'Reviewer', x: 500, y: 340, layer: 2 },
  { id: 'git', label: 'Git Agent', x: 500, y: 460, layer: 3 },
  { id: 'pr', label: 'Pull Request', x: 500, y: 580, layer: 4 },
];

const EDGES: Array<[string, string]> = [
  ['planner', 'backend'],
  ['planner', 'database'],
  ['planner', 'docs'],
  ['backend', 'reviewer'],
  ['database', 'reviewer'],
  ['docs', 'reviewer'],
  ['reviewer', 'git'],
  ['git', 'pr'],
];

function nodeById(id: string) {
  return NODES.find((n) => n.id === id)!;
}

function edgePath(from: Node, to: Node) {
  const fromY = from.y + 28;
  const toY = to.y - 28;
  const midY = (fromY + toY) / 2;
  return `M ${from.x} ${fromY} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${toY}`;
}

export function Architecture() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px 0px' });

  return (
    <section id="architecture" className="relative overflow-hidden border-t border-border py-16 sm:py-24">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-primary/[0.02] to-background" />

      <div className="container">
        <ScrollReveal>
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
              Architecture
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
              A DAG of specialized agents.
            </h2>
            <p className="mt-4 text-muted-foreground">
              The Planner decomposes a request into a directed acyclic graph. Independent tasks run
              in parallel; dependent tasks wait. No agent talks to another directly — all flow goes
              through the Orchestrator.
            </p>
          </div>
        </ScrollReveal>

        <div ref={ref} className="mx-auto max-w-5xl px-2 sm:px-0">
          <div className="overflow-x-auto scrollbar-hide -mx-2 sm:mx-0">
            <div className="relative aspect-[3/2] w-[400px] sm:w-full sm:aspect-[2/1] min-w-0">
            <svg
              viewBox="0 0 1000 640"
              className="h-full w-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="DAG of agents: Planner branches into Backend, Database, and Docs, which converge at Reviewer, then Git, then Pull Request."
            >
              {EDGES.map(([fromId, toId], i) => {
                const from = nodeById(fromId);
                const to = nodeById(toId);
                return (
                  <g key={`${fromId}-${toId}`}>
                    <motion.path
                      d={edgePath(from, to)}
                      stroke="hsl(var(--primary))"
                      strokeWidth="1.5"
                      strokeOpacity="0.3"
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={
                        inView ? { pathLength: 1, opacity: 0.3 } : { pathLength: 0, opacity: 0 }
                      }
                      transition={{
                        duration: 0.6,
                        delay: 0.4 + i * 0.08,
                        ease: 'easeOut',
                      }}
                    />
                    {inView && (
                      <path
                        d={edgePath(from, to)}
                        stroke="hsl(var(--primary))"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray="8 40"
                        className="animate-dash"
                        style={{
                          opacity: 0.85,
                        }}
                      />
                    )}
                  </g>
                );
              })}

              {NODES.map((node, i) => (
                <motion.g
                  key={node.id}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.2 + i * 0.08,
                    ease: 'easeOut',
                  }}
                >
                  <rect
                    x={node.x - 70}
                    y={node.y - 28}
                    width={140}
                    height={56}
                    rx={10}
                    fill="hsl(var(--card))"
                    stroke="hsl(var(--border))"
                    strokeWidth="1"
                  />
                  <rect
                    x={node.x - 70}
                    y={node.y - 28}
                    width={140}
                    height={56}
                    rx={10}
                    fill="hsl(var(--primary) / 0.08)"
                    stroke="hsl(var(--primary) / 0.4)"
                    strokeWidth="1"
                    className="opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  />
                  <circle cx={node.x - 50} cy={node.y} r="4" fill="hsl(var(--primary))" />
                  <text
                    x={node.x - 38}
                    y={node.y + 5}
                    fill="hsl(var(--foreground))"
                    fontSize="14"
                    fontWeight="500"
                    fontFamily="Geist Sans, sans-serif"
                  >
                    {node.label}
                  </text>
                </motion.g>
              ))}
            </svg>
          </div>
          </div>

          <ScrollReveal delay={0.3}>
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="font-mono text-xs uppercase tracking-wider text-primary">Parallel</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Backend, Database, and Docs run at the same time.
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="font-mono text-xs uppercase tracking-wider text-primary">Reviewed</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Reviewer only fires after every producer finishes.
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="font-mono text-xs uppercase tracking-wider text-primary">Shipped</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Git agent opens the PR with a full changelog.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
