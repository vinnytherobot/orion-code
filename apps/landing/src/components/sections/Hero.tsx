'use client';

import { AsciiArt } from '@/components/AsciiArt';
import { ParallaxLayer } from '@/components/effects/ParallaxLayer';
import { StarryBackground } from '@/components/effects/StarryBackground';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen } from 'lucide-react';
import { useState } from 'react';

export function Hero() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setOpacity(1);
  };

  const headlineWords = 'The TUI that really orchestrates agents.'.split(' ');

  return (
    <section
      id="top"
      className="relative isolate flex min-h-[calc(100dvh-4rem)] items-center overflow-hidden pt-20 sm:pt-24"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
    >
      <div className="absolute inset-0 -z-10 grid-bg opacity-20" />
      <StarryBackground />

      {/* Decorative Floating Hexagons */}
      <ParallaxLayer
        speed={0.12}
        className="absolute left-[8%] top-[20%] -z-10 hidden xl:block animate-float"
      >
        <svg width="40" height="40" viewBox="0 0 32 32" fill="none" className="text-primary/20">
          <path
            d="M16 2L28 9V23L16 30L4 23V9L16 2Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </ParallaxLayer>

      <ParallaxLayer
        speed={0.25}
        className="absolute right-[10%] top-[35%] -z-10 hidden xl:block animate-float"
        style={{ animationDelay: '2s' }}
      >
        <svg width="64" height="64" viewBox="0 0 32 32" fill="none" className="text-primary/10">
          <path
            d="M16 2L28 9V23L16 30L4 23V9L16 2Z"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      </ParallaxLayer>

      <ParallaxLayer
        speed={0.08}
        className="absolute left-[15%] bottom-[15%] -z-10 hidden lg:block animate-float"
        style={{ animationDelay: '4s' }}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-primary/25">
          <path
            d="M16 2L28 9V23L16 30L4 23V9L16 2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      </ParallaxLayer>

      {/* Interactive Backlight Glow */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-500"
        style={{
          opacity,
          background: `radial-gradient(700px circle at ${mousePos.x}px ${mousePos.y}px, hsl(var(--primary) / 0.12), transparent 80%)`,
        }}
      />

      {/* Morphing Mesh Gradient background blob */}
      <div
        className="absolute left-1/2 top-1/3 -z-10 h-[600px] w-[600px] -translate-x-1/2 rounded-full opacity-35 blur-3xl mesh-gradient transition-opacity duration-500"
        style={{ opacity: 1 - opacity }}
        aria-hidden="true"
      />

      <div className="container flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <AsciiArt />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-8 font-mono text-[10px] uppercase tracking-[0.3em] text-primary sm:text-sm"
        >
          Open Source · Runs on your machine
        </motion.p>

        <motion.h1
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1 } },
          }}
          initial="hidden"
          animate="visible"
          className="mt-6 text-balance text-3xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl font-display"
        >
          {headlineWords.map((word, i) => (
            <span key={i} className="inline-block overflow-hidden pb-1">
              <motion.span
                variants={{
                  hidden: { y: '100%', opacity: 0 },
                  visible: {
                    y: '0%',
                    opacity: 1,
                    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                  },
                }}
                className="inline-block mr-[0.22em]"
              >
                {word === 'really' ? <em className="not-italic text-primary">really</em> : word}
              </motion.span>
            </span>
          ))}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          className="mt-6 max-w-2xl text-balance text-sm text-muted-foreground sm:text-base lg:text-lg"
        >
          An interactive Terminal User Interface acting as a virtual Tech Lead. It plans,
          decomposes, and coordinates 12 specialized agents to build, review, test, and ship code in
          parallel — right inside a keyboard-driven terminal dashboard.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.25 }}
          className="mt-8 sm:mt-10 flex flex-col gap-3 sm:flex-row w-full sm:w-auto"
        >
          <Button asChild size="lg" className="group shimmer-btn shadow-glow">
            <a href="#quick-start">
              Get started
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </a>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <a href="#features">
              <BookOpen />
              Read the docs
            </a>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.4 }}
          className="mt-10 sm:mt-16 flex items-center gap-2 sm:gap-6 text-xs text-muted-foreground sm:text-sm flex-wrap justify-center"
        >
          <span className="font-mono">
            $ orion <span className="text-primary/50"># Launch interactive TUI</span>
          </span>
        </motion.div>
      </div>
    </section>
  );
}
