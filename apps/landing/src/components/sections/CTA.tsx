'use client';

import { ScrollReveal } from '@/components/effects/ScrollReveal';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, Github } from 'lucide-react';

export function CTA() {
  return (
    <section className="relative overflow-hidden border-t border-border py-24">
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-primary/[0.06] to-background"
        aria-hidden="true"
      />
      <div
        className="absolute left-1/2 top-1/2 -z-10 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      {/* Floating decorative hexagons */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none absolute left-[8%] top-[20%] -z-10 hidden text-primary/20 xl:block animate-float"
      >
        <path
          d="M16 2L28 9V23L16 30L4 23V9L16 2Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <svg
        width="48"
        height="48"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none absolute right-[10%] top-[30%] -z-10 hidden text-primary/10 xl:block animate-float"
        style={{ animationDelay: '2s' }}
      >
        <path
          d="M16 2L28 9V23L16 30L4 23V9L16 2Z"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
      <svg
        width="24"
        height="24"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[25%] left-[18%] -z-10 hidden text-primary/15 lg:block animate-float"
        style={{ animationDelay: '4s' }}
      >
        <path
          d="M16 2L28 9V23L16 30L4 23V9L16 2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>

      <div className="container">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Stop managing tasks. <span className="text-primary">Start shipping them.</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Install Orion in 30 seconds. Point it at your repo. Watch the orchestrator coordinate
              twelve specialists so you can focus on the product.
            </p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Button asChild size="lg" className="group shimmer-btn shadow-glow">
                <a href="#quick-start">
                  Install Orion Code
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </a>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <a href="https://github.com/vinnytherobot/orion-code">
                  <Github />
                  Star on GitHub
                </a>
              </Button>
            </motion.div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
