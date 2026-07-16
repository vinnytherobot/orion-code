import crypto from 'crypto';
import type { UserRepository, ApiKeyRepository, RefreshTokenRepository } from '@orion/infrastructure';
import type { LoginInput, RegisterInput } from '../schemas/auth.js';

interface SafeUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export type AuthServiceDeps = {
  userRepository: UserRepository;
  apiKeyRepository: ApiKeyRepository;
  refreshTokenRepository: RefreshTokenRepository;
  jwtSecret: string;
};

export function makeAuthService(deps: AuthServiceDeps) {
  const { userRepository, apiKeyRepository, refreshTokenRepository, jwtSecret } = deps;

  function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  function generateApiKey(): string {
    return `orion_${crypto.randomBytes(32).toString('hex')}`;
  }

  function signJwt(payload: Record<string, unknown>, expiresIn: string): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: parseExpiration(expiresIn),
    })).toString('base64url');
    const signature = crypto.createHmac('sha256', jwtSecret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${signature}`;
  }

  function parseExpiration(expiresIn: string): number {
    const now = Math.floor(Date.now() / 1000);
    const match = expiresIn.match(/^(\d+)([smhdy])$/);
    if (!match) return now + 3600;

    const [, amount, unit] = match;
    const num = parseInt(amount!, 10);

    switch (unit) {
      case 's': return now + num;
      case 'm': return now + num * 60;
      case 'h': return now + num * 3600;
      case 'd': return now + num * 86400;
      case 'y': return now + num * 365 * 86400;
      default: return now + 3600;
    }
  }

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

  return {
    async register(input: RegisterInput): Promise<{ user: SafeUser; tokens: TokenPair }> {
      const existing = await userRepository.findByEmail(input.email);
      if (existing) {
        throw new Error('Email already registered');
      }

      const now = new Date();
      const user = await userRepository.create({
        id: crypto.randomUUID(),
        name: input.name,
        email: input.email,
        passwordHash: hashPassword(input.password),
        createdAt: now,
        updatedAt: now,
      });

      const tokens = await generateTokens(user.id);

      return {
        user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
        tokens,
      };
    },

    async login(input: LoginInput): Promise<{ user: SafeUser; tokens: TokenPair }> {
      const user = await userRepository.findByEmail(input.email);
      if (!user || user.passwordHash !== hashPassword(input.password)) {
        throw new Error('Invalid credentials');
      }

      const tokens = await generateTokens(user.id);

      return {
        user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
        tokens,
      };
    },

    async refreshTokens(refreshToken: string): Promise<TokenPair> {
      const tokenData = await refreshTokenRepository.findByToken(refreshToken);
      if (!tokenData) {
        throw new Error('Invalid refresh token');
      }

      await refreshTokenRepository.delete(refreshToken);
      return generateTokens(tokenData.userId);
    },

    async logout(refreshToken: string): Promise<void> {
      await refreshTokenRepository.delete(refreshToken);
    },

    async validateApiKey(apiKey: string): Promise<SafeUser | null> {
      const keyData = await apiKeyRepository.findValidByKey(apiKey);
      if (!keyData) return null;

      await apiKeyRepository.updateLastUsed(keyData.id);

      const user = await userRepository.findById(keyData.userId);
      if (!user) return null;

      return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
    },

    async getUserById(id: string): Promise<SafeUser | null> {
      const user = await userRepository.findById(id);
      if (!user) return null;

      return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
    },

    async createApiKey(userId: string, name: string, expiresAt?: Date): Promise<{ id: string; key: string; name: string }> {
      const key = generateApiKey();
      const now = new Date();

      const apiKey = await apiKeyRepository.create({
        id: crypto.randomUUID(),
        userId,
        name,
        key,
        expiresAt: expiresAt || null,
        createdAt: now,
      });

      return { id: apiKey.id, key: apiKey.key, name: apiKey.name };
    },

    async listApiKeys(userId: string): Promise<Array<{ id: string; name: string; lastUsedAt: Date | null; createdAt: Date }>> {
      const keys = await apiKeyRepository.findByUserId(userId);
      return keys.map(k => ({
        id: k.id,
        name: k.name,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      }));
    },

    async deleteApiKey(id: string, userId: string): Promise<boolean> {
      const key = await apiKeyRepository.findById(id);
      if (!key || key.userId !== userId) return false;

      return apiKeyRepository.delete(id);
    },

    verifyJwt(token: string): { sub: string; type: string } | null {
      try {
        const [header, body, signature] = token.split('.');
        if (!header || !body || !signature) return null;

        const expectedSignature = crypto.createHmac('sha256', jwtSecret).update(`${header}.${body}`).digest('base64url');
        if (signature !== expectedSignature) return null;

        const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

        return { sub: payload.sub, type: payload.type };
      } catch {
        return null;
      }
    },
  };
}

export type AuthService = ReturnType<typeof makeAuthService>;
