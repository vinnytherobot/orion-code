'use client';

import { ScrollReveal } from '@/components/effects/ScrollReveal';
import { CopyButton } from '@/components/ui/copy-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const COMMANDS = {
  npm: 'npm install -g @orion/cli',
  pnpm: 'pnpm add -g @orion/cli',
  brew: 'brew install orion-code/tap/orion',
  docker: 'docker run -it --rm orion/cli implement "Add auth"',
};

const COMMENTS: Record<keyof typeof COMMANDS, string> = {
  npm: "# works everywhere. installs everything. you're welcome.",
  pnpm: '# fast and disk-efficient. recommended.',
  brew: "# macOS & linux. one tap and you're set.",
  docker: '# no install required. try it once.',
};

export function QuickStart() {
  return (
    <section id="quick-start" className="border-t border-border bg-background py-24">
      <div className="container">
        <ScrollReveal>
          <div className="mb-12">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Quick start</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Up and running in 30 seconds.
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Pick your poison. Every install pulls the orchestrator, the agents, and a sensible
              default config.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <Tabs defaultValue="npm" className="rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-4">
              <TabsList>
                {Object.keys(COMMANDS).map((key) => (
                  <TabsTrigger key={key} value={key}>
                    {key === 'npm' && 'npm'}
                    {key === 'pnpm' && 'pnpm'}
                    {key === 'brew' && 'Homebrew'}
                    {key === 'docker' && 'Docker'}
                  </TabsTrigger>
                ))}
              </TabsList>
              <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Stable
              </span>
            </div>

            {Object.entries(COMMANDS).map(([key, command]) => (
              <TabsContent key={key} value={key} className="m-0 p-6">
                <div className="relative rounded-lg border border-border bg-background">
                  <pre className="overflow-x-auto p-4 font-mono text-sm text-foreground scrollbar-hide">
                    <span className="text-muted-foreground">
                      {COMMENTS[key as keyof typeof COMMANDS]}
                    </span>
                    {'\n'}
                    <span className="text-primary">$</span> {command}
                  </pre>
                  <div className="absolute right-2 top-2">
                    <CopyButton value={command} />
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <p className="mt-6 text-sm text-muted-foreground">
            Then run{' '}
            <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-foreground">
              orion init
            </code>{' '}
            in any project. Orion reads your stack, registers the right agents, and you're ready to
            ship.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
