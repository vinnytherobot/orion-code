import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ORION_DIR = join(homedir(), '.orion');
const AUTH_FILE = join(ORION_DIR, 'auth.json');

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  userId: string;
  savedAt: string;
}

export function loadTokens(): StoredTokens | null {
  if (!existsSync(AUTH_FILE)) return null;
  try {
    const content = readFileSync(AUTH_FILE, 'utf-8');
    const data = JSON.parse(content);
    if (!data.accessToken || !data.refreshToken) return null;
    return data as StoredTokens;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: StoredTokens): void {
  if (!existsSync(ORION_DIR)) {
    mkdirSync(ORION_DIR, { recursive: true });
  }
  writeFileSync(AUTH_FILE, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

export function clearTokens(): void {
  if (existsSync(AUTH_FILE)) {
    writeFileSync(AUTH_FILE, '{}');
  }
}
