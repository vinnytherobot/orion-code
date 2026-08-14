import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthUseCase } from '../AuthUseCase.js';
import type { IUserRepository, IApiKeyRepository, IRefreshTokenRepository } from '@orion/domain';
import type { IJWTProviderPort } from '../../ports/IJWTProviderPort.js';
import type { IUnitOfWorkPort } from '../../ports/IUnitOfWorkPort.js';
import { User, Email, PasswordHash, UserId, ApiKey, RefreshToken } from '@orion/domain';

// ─── Mocks ────────────────────────────────────────────────────────────

function mockUserRepo(): IUserRepository {
  const users = new Map<string, User>();
  return {
    findById: vi.fn(async (id: string) => users.get(id) ?? null),
    findByEmail: vi.fn(async (email: string) => {
      for (const u of users.values()) {
        if (u.email.toString() === email) return u;
      }
      return null;
    }),
    save: vi.fn(async (user: User) => { users.set(user.id.toString(), user); }),
    delete: vi.fn(async (id: string) => { users.delete(id); }),
    __users: users,
  } as unknown as IUserRepository & { __users: Map<string, User> };
}

function mockRefreshTokenRepo(): IRefreshTokenRepository {
  const tokens = new Map<string, RefreshToken>();
  return {
    findByToken: vi.fn(async (token: string) => tokens.get(token) ?? null),
    findByUserId: vi.fn(async (userId: string) =>
      [...tokens.values()].filter(t => t.userId === userId)
    ),
    save: vi.fn(async (rt: RefreshToken) => { tokens.set(rt.token, rt); }),
    delete: vi.fn(async (token: string) => tokens.delete(token)),
    __tokens: tokens,
  } as unknown as IRefreshTokenRepository & { __tokens: Map<string, RefreshToken> };
}

function mockApiKeyRepo(): IApiKeyRepository {
  const keys = new Map<string, ApiKey>();
  return {
    findById: vi.fn(async (id: string) => {
      for (const k of keys.values()) { if (k.id === id) return k; }
      return null;
    }),
    findByKey: vi.fn(async (key: string) => keys.get(key) ?? null),
    findByUserId: vi.fn(async (userId: string) =>
      [...keys.values()].filter(k => k.userId === userId)
    ),
    save: vi.fn(async (apiKey: ApiKey) => { keys.set(apiKey.key, apiKey); }),
    updateLastUsed: vi.fn(async () => {}),
    delete: vi.fn(async (id: string) => {
      for (const [k, v] of keys) { if (v.id === id) { keys.delete(k); return true; } }
      return false;
    }),
    __keys: keys,
  } as unknown as IApiKeyRepository & { __keys: Map<string, ApiKey> };
}

function mockJwtProvider(): IJWTProviderPort {
  return {
    sign: vi.fn((_payload: Record<string, unknown>, _expiresIn: string) => `jwt.${_payload.sub}.${Date.now()}`),
    verify: vi.fn((token: string) => {
      const parts = token.split('.');
      if (parts.length === 3) {
        return { sub: parts[1]!, type: 'access' };
      }
      return null;
    }),
  };
}

function mockUow(): IUnitOfWorkPort {
  return {
    begin: vi.fn(async () => {}),
    commit: vi.fn(async () => {}),
    rollback: vi.fn(async () => {}),
    isActive: vi.fn(() => false),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────

let idCounter = 0;
function uniqueId(): string { return `test-id-${++idCounter}`; }

function buildUseCase(overrides?: { uow?: IUnitOfWorkPort | undefined }) {
  const userRepo = mockUserRepo();
  const apiKeyRepo = mockApiKeyRepo();
  const refreshTokenRepo = mockRefreshTokenRepo();
  const jwtProvider = mockJwtProvider();
  const uow = overrides?.uow === undefined ? mockUow() : overrides.uow;
  const hashPassword = vi.fn(async (pw: string) => `hashed:${pw}`);
  const comparePassword = vi.fn(async (plain: string, hash: string) => hash === `hashed:${plain}`);

  const useCase = new AuthUseCase(
    userRepo,
    apiKeyRepo,
    refreshTokenRepo,
    jwtProvider,
    hashPassword,
    comparePassword,
    uniqueId,
    uow,
  );

  return { useCase, userRepo, apiKeyRepo, refreshTokenRepo, jwtProvider, hashPassword, comparePassword, uow };
}

// ─── Tests ────────────────────────────────────────────────────────────

describe('AuthUseCase', () => {
  beforeEach(() => { idCounter = 0; });

  // ─── register ────────────────────────────────────────────────────

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const { useCase } = buildUseCase();
      const result = await useCase.register({ name: 'Test', email: 'test@example.com', password: 'password123' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.user.name).toBe('Test');
        expect(result.value.user.email).toBe('test@example.com');
        expect(result.value.tokens.accessToken).toBeDefined();
        expect(result.value.tokens.refreshToken).toBeDefined();
      }
    });

    it('should return conflict for duplicate email', async () => {
      const { useCase, userRepo } = buildUseCase();
      const existingUser = User.create({
        id: UserId.from('existing-id'),
        name: 'Existing',
        email: Email.from('test@example.com'),
        passwordHash: PasswordHash.fromHash('hashed:pass'),
      });
      (userRepo as any).__users.set('existing-id', existingUser);

      const result = await useCase.register({ name: 'Test', email: 'test@example.com', password: 'password123' });
      expect(result.isFail()).toBe(true);
      if (result.isFail()) {
        expect(result.error.code).toBe('CONFLICT');
      }
    });

    it('should reject short password', async () => {
      const { useCase } = buildUseCase();
      const result = await useCase.register({ name: 'Test', email: 'test@example.com', password: '123' });

      expect(result.isFail()).toBe(true);
      if (result.isFail()) {
        expect(result.error.code).toBe('VALIDATION');
        expect(result.error.message).toContain('6 characters');
      }
    });

    it('should reject overly long password', async () => {
      const { useCase } = buildUseCase();
      const result = await useCase.register({ name: 'Test', email: 'test@example.com', password: 'a'.repeat(129) });

      expect(result.isFail()).toBe(true);
      if (result.isFail()) {
        expect(result.error.code).toBe('VALIDATION');
        expect(result.error.message).toContain('128 characters');
      }
    });

    it('should save refresh token to DB after registration', async () => {
      const { useCase, refreshTokenRepo } = buildUseCase();
      await useCase.register({ name: 'Test', email: 'test@example.com', password: 'password123' });

      const tokens = (refreshTokenRepo as any).__tokens as Map<string, RefreshToken>;
      expect(tokens.size).toBe(1);
    });

    it('should rollback on DB failure during registration', async () => {
      const { useCase, refreshTokenRepo, uow } = buildUseCase();
      (refreshTokenRepo.save as any).mockRejectedValueOnce(new Error('DB error'));

      const result = await useCase.register({ name: 'Test', email: 'test@example.com', password: 'password123' });
      expect(result.isFail()).toBe(true);
      expect(uow!.rollback).toHaveBeenCalled();
    });
  });

  // ─── login ───────────────────────────────────────────────────────

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const { useCase, userRepo } = buildUseCase();
      const user = User.create({
        id: UserId.from('user-1'),
        name: 'Test',
        email: Email.from('test@example.com'),
        passwordHash: PasswordHash.fromHash('hashed:password123'),
      });
      (userRepo as any).__users.set('user-1', user);

      const result = await useCase.login({ email: 'test@example.com', password: 'password123' });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.user.id).toBe('user-1');
        expect(result.value.tokens.accessToken).toBeDefined();
      }
    });

    it('should return unauthorized for invalid email', async () => {
      const { useCase } = buildUseCase();
      const result = await useCase.login({ email: 'nonexistent@example.com', password: 'password123' });

      expect(result.isFail()).toBe(true);
      if (result.isFail()) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('should return unauthorized for wrong password', async () => {
      const { useCase, userRepo } = buildUseCase();
      const user = User.create({
        id: UserId.from('user-1'),
        name: 'Test',
        email: Email.from('test@example.com'),
        passwordHash: PasswordHash.fromHash('hashed:correct-password'),
      });
      (userRepo as any).__users.set('user-1', user);

      const result = await useCase.login({ email: 'test@example.com', password: 'wrong-password' });
      expect(result.isFail()).toBe(true);
      if (result.isFail()) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('should save refresh token to DB after login (BUG-01 fix)', async () => {
      const { useCase, userRepo, refreshTokenRepo } = buildUseCase();
      const user = User.create({
        id: UserId.from('user-1'),
        name: 'Test',
        email: Email.from('test@example.com'),
        passwordHash: PasswordHash.fromHash('hashed:password123'),
      });
      (userRepo as any).__users.set('user-1', user);

      await useCase.login({ email: 'test@example.com', password: 'password123' });

      const tokens = (refreshTokenRepo as any).__tokens as Map<string, RefreshToken>;
      expect(tokens.size).toBe(1);
      const savedToken = [...tokens.values()][0]!;
      expect(savedToken.userId).toBe('user-1');
    });
  });

  // ─── refreshTokens ───────────────────────────────────────────────

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const { useCase, refreshTokenRepo } = buildUseCase();
      const rt = RefreshToken.create({
        id: 'rt-1',
        userId: 'user-1',
        token: 'old-refresh-token',
        expiresAt: new Date(Date.now() + 86400000),
      });
      (refreshTokenRepo as any).__tokens.set('old-refresh-token', rt);

      const result = await useCase.refreshTokens('old-refresh-token');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.accessToken).toBeDefined();
        expect(result.value.refreshToken).toBeDefined();
      }
    });

    it('should return unauthorized for expired refresh token', async () => {
      const { useCase, refreshTokenRepo } = buildUseCase();
      const rt = RefreshToken.create({
        id: 'rt-1',
        userId: 'user-1',
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 1000),
      });
      (refreshTokenRepo as any).__tokens.set('expired-token', rt);

      const result = await useCase.refreshTokens('expired-token');
      expect(result.isFail()).toBe(true);
      if (result.isFail()) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('should return unauthorized for invalid refresh token', async () => {
      const { useCase } = buildUseCase();
      const result = await useCase.refreshTokens('nonexistent-token');
      expect(result.isFail()).toBe(true);
    });

    it('should delete old refresh token after rotation', async () => {
      const { useCase, refreshTokenRepo } = buildUseCase();
      const rt = RefreshToken.create({
        id: 'rt-1',
        userId: 'user-1',
        token: 'old-refresh-token',
        expiresAt: new Date(Date.now() + 86400000),
      });
      (refreshTokenRepo as any).__tokens.set('old-refresh-token', rt);

      await useCase.refreshTokens('old-refresh-token');

      const tokens = (refreshTokenRepo as any).__tokens as Map<string, RefreshToken>;
      expect(tokens.has('old-refresh-token')).toBe(false);
    });

    it('should save new refresh token after rotation (BUG-02 fix)', async () => {
      const { useCase, refreshTokenRepo } = buildUseCase();
      const rt = RefreshToken.create({
        id: 'rt-1',
        userId: 'user-1',
        token: 'old-refresh-token',
        expiresAt: new Date(Date.now() + 86400000),
      });
      (refreshTokenRepo as any).__tokens.set('old-refresh-token', rt);

      const result = await useCase.refreshTokens('old-refresh-token');
      expect(result.isOk()).toBe(true);

      const tokens = (refreshTokenRepo as any).__tokens as Map<string, RefreshToken>;
      expect(tokens.size).toBe(1);
      const newToken = [...tokens.values()][0]!;
      expect(newToken.token).not.toBe('old-refresh-token');
      expect(newToken.userId).toBe('user-1');
    });
  });

  // ─── logout ──────────────────────────────────────────────────────

  describe('logout', () => {
    it('should delete refresh token from DB', async () => {
      const { useCase, refreshTokenRepo } = buildUseCase();
      const rt = RefreshToken.create({
        id: 'rt-1',
        userId: 'user-1',
        token: 'some-token',
        expiresAt: new Date(Date.now() + 86400000),
      });
      (refreshTokenRepo as any).__tokens.set('some-token', rt);

      const result = await useCase.logout('some-token');
      expect(result.isOk()).toBe(true);

      const tokens = (refreshTokenRepo as any).__tokens as Map<string, RefreshToken>;
      expect(tokens.has('some-token')).toBe(false);
    });

    it('should succeed even if token does not exist', async () => {
      const { useCase } = buildUseCase();
      const result = await useCase.logout('nonexistent-token');
      expect(result.isOk()).toBe(true);
    });
  });

  // ─── validateApiKey ──────────────────────────────────────────────

  describe('validateApiKey', () => {
    it('should return user for valid API key', async () => {
      const { useCase, userRepo, apiKeyRepo } = buildUseCase();
      const user = User.create({
        id: UserId.from('user-1'),
        name: 'Test',
        email: Email.from('test@example.com'),
        passwordHash: PasswordHash.fromHash('hashed:pass'),
      });
      (userRepo as any).__users.set('user-1', user);

      const apiKey = ApiKey.create({
        id: 'key-1',
        userId: 'user-1',
        name: 'Test Key',
        key: 'orion_abc123',
      });
      (apiKeyRepo as any).__keys.set('orion_abc123', apiKey);

      const result = await useCase.validateApiKey('orion_abc123');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value?.id).toBe('user-1');
      }
    });

    it('should return null for invalid API key', async () => {
      const { useCase } = buildUseCase();
      const result = await useCase.validateApiKey('invalid-key');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeNull();
      }
    });

    it('should return null for expired API key', async () => {
      const { useCase, apiKeyRepo } = buildUseCase();
      const apiKey = ApiKey.create({
        id: 'key-1',
        userId: 'user-1',
        name: 'Expired Key',
        key: 'orion_expired',
        expiresAt: new Date(Date.now() - 1000),
      });
      (apiKeyRepo as any).__keys.set('orion_expired', apiKey);

      const result = await useCase.validateApiKey('orion_expired');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeNull();
      }
    });

    it('should update lastUsedAt when API key is valid (BUG-09 fix)', async () => {
      const { useCase, userRepo, apiKeyRepo } = buildUseCase();
      const user = User.create({
        id: UserId.from('user-1'),
        name: 'Test',
        email: Email.from('test@example.com'),
        passwordHash: PasswordHash.fromHash('hashed:pass'),
      });
      (userRepo as any).__users.set('user-1', user);

      const apiKey = ApiKey.create({
        id: 'key-1',
        userId: 'user-1',
        name: 'Test Key',
        key: 'orion_abc123',
      });
      (apiKeyRepo as any).__keys.set('orion_abc123', apiKey);

      await useCase.validateApiKey('orion_abc123');
      expect(apiKeyRepo.updateLastUsed).toHaveBeenCalledWith('key-1');
    });
  });

  // ─── createApiKey ────────────────────────────────────────────────

  describe('createApiKey', () => {
    it('should create API key with orion_ prefix', async () => {
      const { useCase } = buildUseCase();
      const result = await useCase.createApiKey('user-1', 'My Key');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.key).toMatch(/^orion_/);
        expect(result.value.name).toBe('My Key');
      }
    });
  });

  // ─── Email value object ──────────────────────────────────────────

  describe('Email.create', () => {
    it('should accept valid email', () => {
      const result = Email.create('user@example.com');
      expect(result.isOk()).toBe(true);
    });

    it('should normalize email to lowercase', () => {
      const result = Email.create('User@Example.COM');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('user@example.com');
      }
    });

    it('should reject invalid email format', () => {
      const result = Email.create('not-an-email');
      expect(result.isFail()).toBe(true);
      if (result.isFail()) {
        expect(result.error.code).toBe('VALIDATION');
      }
    });

    it('should reject email with spaces', () => {
      const result = Email.create('user @example.com');
      expect(result.isFail()).toBe(true);
    });
  });

  // ─── getUserById ─────────────────────────────────────────────────

  describe('getUserById', () => {
    it('should return user for valid ID', async () => {
      const { useCase, userRepo } = buildUseCase();
      const user = User.create({
        id: UserId.from('user-1'),
        name: 'Test',
        email: Email.from('test@example.com'),
        passwordHash: PasswordHash.fromHash('hashed:pass'),
      });
      (userRepo as any).__users.set('user-1', user);

      const result = await useCase.getUserById('user-1');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value?.name).toBe('Test');
      }
    });

    it('should return null for nonexistent user', async () => {
      const { useCase } = buildUseCase();
      const result = await useCase.getUserById('nonexistent');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeNull();
      }
    });
  });
});
