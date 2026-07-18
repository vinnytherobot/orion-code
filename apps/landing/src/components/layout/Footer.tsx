import { OrionLogo } from '@/components/OrionLogo';
import { Github, MessageCircle } from 'lucide-react';

const GITHUB_REPO = 'https://github.com/vinnytherobot/orion-code';
const GITHUB_PROFILE = 'https://github.com/vinnytherobot';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Architecture', href: '#architecture' },
      { label: 'Agents', href: '#agents' },
      { label: 'Roadmap', href: '#' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '#' },
      { label: 'GitHub', href: GITHUB_REPO },
      { label: 'Changelog', href: `${GITHUB_REPO}/blob/main/CHANGELOG.md` },
      { label: 'Contributing', href: `${GITHUB_REPO}/blob/main/CONTRIBUTING.md` },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Discussions', href: `${GITHUB_REPO}/discussions` },
      { label: 'Issues', href: `${GITHUB_REPO}/issues` },
      { label: 'Pull Requests', href: `${GITHUB_REPO}/pulls` },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'License', href: `${GITHUB_REPO}/blob/main/LICENSE` },
      { label: 'Code of Conduct', href: `${GITHUB_REPO}/blob/main/CODE_OF_CONDUCT.md` },
      { label: 'Security', href: '#' },
      { label: 'Privacy', href: '#' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-12 sm:py-16">
        <div className="grid gap-8 sm:gap-12 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <OrionLogo size={32} withWordmark />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Multi-agent code orchestration. A virtual Tech Lead that coordinates specialized AI
              agents to build software in parallel.
            </p>
            <div className="mt-6 flex gap-2">
              <a
                href={GITHUB_PROFILE}
                aria-label="GitHub"
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="Discord"
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-sm font-semibold text-foreground">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© 2026 Orion Code. Open source under the MIT License.</p>
          <p>
            Made with care by{' '}
            <a href={GITHUB_PROFILE} className="underline transition-colors hover:text-foreground">
              vinnytherobot
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
