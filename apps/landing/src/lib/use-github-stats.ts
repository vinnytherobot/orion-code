import { useEffect, useState } from 'react';

const GITHUB_REPO = 'vinnytherobot/orion-code';

interface GitHubStats {
  stars: number;
  forks: number;
  openIssues: number;
  openPRs: number;
  watchers: number;
  loading: boolean;
  error: string | null;
}

export function useGitHubStats(): GitHubStats {
  const [stats, setStats] = useState<GitHubStats>({
    stars: 0,
    forks: 0,
    openIssues: 0,
    openPRs: 0,
    watchers: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        const [repoRes, prsRes] = await Promise.all([
          fetch(`https://api.github.com/repos/${GITHUB_REPO}`),
          fetch(`https://api.github.com/repos/${GITHUB_REPO}/pulls?state=open&per_page=1`),
        ]);

        if (!repoRes.ok) throw new Error('Failed to fetch repo data');

        const repo = await repoRes.json();
        const prTotalHeader = prsRes.headers.get('link');
        let openPRs = 0;

        if (prTotalHeader) {
          const lastPageMatch = prTotalHeader.match(/page=(\d+)>; rel="last"/);
          openPRs = lastPageMatch ? Number.parseInt(lastPageMatch[1], 10) : 1;
        } else {
          const prs = await prsRes.json();
          openPRs = Array.isArray(prs) ? prs.length : 0;
        }

        if (!cancelled) {
          setStats({
            stars: repo.stargazers_count ?? 0,
            forks: repo.forks_count ?? 0,
            openIssues: repo.open_issues_count ?? 0,
            openPRs,
            watchers: repo.watchers_count ?? 0,
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setStats((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load stats',
          }));
        }
      }
    }

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, []);

  return stats;
}
