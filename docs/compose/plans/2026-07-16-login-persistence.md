# Login Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement persistent login on the device so tokens survive between TUI sessions until explicitly removed by the user.

**Architecture:** Store JWT tokens in `~/.orion/auth.json` (global user directory). Backend refresh tokens have no expiration. Frontend loads tokens on initialization and saves them after login/register.

**Tech Stack:** TypeScript, Node.js fs module, Fastify backend, Ink frontend

## Global Constraints

- Tokens stored in `~/.orion/auth.json` (global, not per-project)
- Refresh token has no expiration (100-year effective lifetime)
- Access token remains 1h (auto-refreshed via refresh token)
- Login only removed via `/logout` command
- File permissions: user-readable only (600 on Unix, default on Windows)

---

### Task 1: Create TokenStorage Module

**Covers:** [S3]

**Files:**
- Create: `apps/frontend/src/utils/tokenStorage.ts`

**Interfaces:**
- Produces: `loadTokens()`, `saveTokens()`, `clearTokens()` functions used by ApiClient

- [ ] **Step 1: Create tokenStorage.ts**

```typescript
import { join } from 'path';
import { homedir } from 'os';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

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
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd apps/frontend && npx tsc --noEmit src/utils/tokenStorage.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/utils/tokenStorage.ts
git commit -m "feat(frontend): add token storage module for persistent login"
```

---

### Task 2: Modify Backend for Non-Expiring Refresh Tokens

**Covers:** [S2]

**Files:**
- Modify: `apps/backend/src/services/auth.service.ts:63-79`

**Interfaces:**
- Produces: `generateTokens()` with 100-year refresh token

- [ ] **Step 1: Update generateTokens() in auth.service.ts**

Change lines 63-79 from:
```typescript
async function generateTokens(userId: string): Promise<TokenPair> {
  const accessToken = signJwt({ sub: userId, type: 'access' }, '1h');
  const refreshToken = signJwt({ sub: userId, type: 'refresh' }, '7d');

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await refreshTokenRepository.create({
    id: crypto.randomUUID(),
    userId,
    token: refreshToken,
    expiresAt,
    createdAt: now,
  });

  return { accessToken, refreshToken };
}
```

To:
```typescript
async function generateTokens(userId: string): Promise<TokenPair> {
  const accessToken = signJwt({ sub: userId, type: 'access' }, '1h');
  const refreshToken = signJwt({ sub: userId, type: 'refresh' }, '100y');

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);

  await refreshTokenRepository.create({
    id: crypto.randomUUID(),
    userId,
    token: refreshToken,
    expiresAt,
    createdAt: now,
  });

  return { accessToken, refreshToken };
}
```

- [ ] **Step 2: Update refreshTokens() to remove expiration check**

Change lines 120-133 from:
```typescript
async refreshTokens(refreshToken: string): Promise<TokenPair> {
  const tokenData = await refreshTokenRepository.findByToken(refreshToken);
  if (!tokenData) {
    throw new Error('Invalid refresh token');
  }

  if (tokenData.expiresAt < new Date()) {
    await refreshTokenRepository.delete(refreshToken);
    throw new Error('Refresh token expired');
  }

  await refreshTokenRepository.delete(refreshToken);
  return generateTokens(tokenData.userId);
}
```

To:
```typescript
async refreshTokens(refreshToken: string): Promise<TokenPair> {
  const tokenData = await refreshTokenRepository.findByToken(refreshToken);
  if (!tokenData) {
    throw new Error('Invalid refresh token');
  }

  await refreshTokenRepository.delete(refreshToken);
  return generateTokens(tokenData.userId);
}
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/services/auth.service.ts
git commit -m "feat(backend): make refresh tokens non-expiring for persistent login"
```

---

### Task 3: Integrate TokenStorage into ApiClient

**Covers:** [S4]

**Files:**
- Modify: `apps/frontend/src/api/client.ts:1-10, 88-105`

**Interfaces:**
- Consumes: `loadTokens()`, `saveTokens()`, `clearTokens()` from Task 1
- Produces: ApiClient with persistent token storage

- [ ] **Step 1: Add import for tokenStorage**

Add at top of `client.ts` after line 6:
```typescript
import { loadTokens, saveTokens, clearTokens } from '../utils/tokenStorage.js';
```

- [ ] **Step 2: Update constructor to restore tokens**

Change constructor (lines 93-95) from:
```typescript
constructor(baseUrl: string) {
  this.baseUrl = baseUrl;
}
```

To:
```typescript
constructor(baseUrl: string) {
  this.baseUrl = baseUrl;
  this.restoreTokens();
}

private restoreTokens() {
  const stored = loadTokens();
  if (stored) {
    this.accessToken = stored.accessToken;
    this.refreshToken = stored.refreshToken;
  }
}
```

- [ ] **Step 3: Update setTokens() to persist**

Change `setTokens()` (lines 97-100) from:
```typescript
setTokens(access: string, refresh: string) {
  this.accessToken = access;
  this.refreshToken = refresh;
}
```

To:
```typescript
setTokens(access: string, refresh: string, userId?: string) {
  this.accessToken = access;
  this.refreshToken = refresh;
  saveTokens({
    accessToken: access,
    refreshToken: refresh,
    userId: userId || 'unknown',
    savedAt: new Date().toISOString(),
  });
}
```

- [ ] **Step 4: Update clearTokens() to clear storage**

Change `clearTokens()` (lines 102-105) from:
```typescript
clearTokens() {
  this.accessToken = null;
  this.refreshToken = null;
}
```

To:
```typescript
clearTokens() {
  this.accessToken = null;
  this.refreshToken = null;
  clearTokens();
}
```

- [ ] **Step 5: Update login() to pass userId**

Change `login()` (lines 184-195) from:
```typescript
async login(email: string, password: string) {
  const result = await this.request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (result.data?.tokens) {
    this.setTokens(result.data.tokens.accessToken, result.data.tokens.refreshToken);
  }

  return result;
}
```

To:
```typescript
async login(email: string, password: string) {
  const result = await this.request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (result.data?.tokens) {
    this.setTokens(
      result.data.tokens.accessToken,
      result.data.tokens.refreshToken,
      result.data.user.id
    );
  }

  return result;
}
```

- [ ] **Step 6: Update register() to pass userId**

Change `register()` (lines 171-182) from:
```typescript
async register(name: string, email: string, password: string) {
  const result = await this.request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });

  if (result.data?.tokens) {
    this.setTokens(result.data.tokens.accessToken, result.data.tokens.refreshToken);
  }

  return result;
}
```

To:
```typescript
async register(name: string, email: string, password: string) {
  const result = await this.request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });

  if (result.data?.tokens) {
    this.setTokens(
      result.data.tokens.accessToken,
      result.data.tokens.refreshToken,
      result.data.user.id
    );
  }

  return result;
}
```

- [ ] **Step 7: Verify TypeScript compilation**

Run: `cd apps/frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/src/api/client.ts
git commit -m "feat(frontend): integrate token persistence into ApiClient"
```

---

### Task 4: Update Logout Command

**Covers:** [S5]

**Files:**
- Modify: `apps/frontend/src/utils/commands.ts:391-398`

**Interfaces:**
- Consumes: `apiClient.logout()` which now clears persisted tokens

- [ ] **Step 1: Verify logout handler already exists**

The logout command at lines 391-398 already calls `apiClient.logout()` which will now clear tokens from storage via the updated `clearTokens()`. No changes needed to the command itself.

- [ ] **Step 2: Update logout message for clarity**

Change lines 391-398 from:
```typescript
{
  name: 'logout',
  description: 'Logout from the API',
  handler: async (): Promise<string> => {
    await apiClient.logout();
    return '\nLogged out successfully.';
  },
},
```

To:
```typescript
{
  name: 'logout',
  description: 'Logout and remove saved credentials',
  handler: async (): Promise<string> => {
    await apiClient.logout();
    return '\nLogged out successfully. Saved credentials removed.';
  },
},
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd apps/frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/utils/commands.ts
git commit -m "feat(frontend): update logout message to indicate credential removal"
```

---

### Task 5: Add Auto-Login Status to Welcome Screen

**Covers:** [S1]

**Files:**
- Modify: `apps/frontend/src/components/WelcomeScreen.tsx`

**Interfaces:**
- Consumes: `apiClient.isAuthenticated()` to show login status

- [ ] **Step 1: Read WelcomeScreen.tsx to understand current structure**

Read the file to see current implementation.

- [ ] **Step 2: Add login status display**

Add after the model/directory display:
```typescript
{apiClient.isAuthenticated() && (
  <Box marginTop={1}>
    <Text color="green">✓ Logged in (persistent session)</Text>
  </Box>
)}
```

- [ ] **Step 3: Add import for apiClient**

```typescript
import { apiClient } from '../api/client.js';
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `cd apps/frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/components/WelcomeScreen.tsx
git commit -m "feat(frontend): show persistent login status on welcome screen"
```

---

### Task 6: End-to-End Verification

**Covers:** [S1, S2, S3, S4, S5]

**Files:**
- None (verification only)

- [ ] **Step 1: Build the project**

Run: `npm run build` from project root
Expected: Success

- [ ] **Step 2: Start the backend**

Run: `cd apps/backend && npm run dev`
Expected: Server starts on port 3000

- [ ] **Step 3: Test login persistence**

1. Start frontend: `cd apps/frontend && npm run dev`
2. Register/login with `/register test test@test.com password123`
3. Verify `~/.orion/auth.json` exists with tokens
4. Exit TUI with `/exit`
5. Restart TUI
6. Verify automatic login (should show "Logged in" status)
7. Test `/me` command to verify authentication works

- [ ] **Step 4: Test logout**

1. Run `/logout`
2. Verify `~/.orion/auth.json` is cleared
3. Exit and restart TUI
4. Verify not authenticated

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address any issues found during verification"
```
