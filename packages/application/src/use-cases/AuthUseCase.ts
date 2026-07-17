import type { IUserRepository, IApiKeyRepository, IRefreshTokenRepository } from '@orion/domain';
import { User, UserId, Email, PasswordHash, ApiKey, RefreshToken } from '@orion/domain';
import { AppError, type Result, fail, ok } from '@orion/shared';
import type { IUnitOfWorkPort } from '../ports/IUnitOfWorkPort.js';
import type { IJWTProviderPort } from '../ports/IJWTProviderPort.js';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SafeUserDTO {
  id: string;
  name: string;
  email: string;
}

export class AuthUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly jwtProvider: IJWTProviderPort,
    private readonly hashPassword: (password: string) => Promise<string> | string,
    private readonly comparePassword: (plain: string, hash: string) => Promise<boolean> | boolean,
    private readonly generateId: () => string,
    private readonly uow?: IUnitOfWorkPort,
  ) {}

  async register(input: RegisterInput): Promise<Result<{ user: SafeUserDTO; tokens: AuthTokens }, AppError>> {
    const emailResult = Email.create(input.email);
    if (emailResult.isFail()) return fail(emailResult.error);

    const existing = await this.userRepository.findByEmail(emailResult.value.toString());
    if (existing) {
      return fail(AppError.conflict('Email already registered'));
    }

    const id = UserId.generate();
    const passwordHash = PasswordHash.fromHash(await this.hashPassword(input.password));
    const user = User.create({ id, name: input.name, email: emailResult.value, passwordHash });

    const tokens = this.generateTokens(id.toString());

    if (this.uow) await this.uow.begin();
    try {
      await this.userRepository.save(user);
      const refreshToken = RefreshToken.create({
        id: this.generateId(),
        userId: id.toString(),
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000),
      });
      await this.refreshTokenRepository.save(refreshToken);
      if (this.uow) await this.uow.commit();
    } catch {
      if (this.uow) await this.uow.rollback();
      return fail(AppError.internal('Registration failed'));
    }

    return ok({
      user: { id: id.toString(), name: input.name, email: emailResult.value.toString() },
      tokens,
    });
  }

  async login(input: LoginInput): Promise<Result<{ user: SafeUserDTO; tokens: AuthTokens }, AppError>> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      return fail(AppError.unauthorized('Invalid credentials'));
    }

    const passwordValid = await this.comparePassword(input.password, user.passwordHash.toString());
    if (!passwordValid) {
      return fail(AppError.unauthorized('Invalid credentials'));
    }

    const tokens = this.generateTokens(user.id.toString());

    return ok({
      user: { id: user.id.toString(), name: user.name, email: user.email.toString() },
      tokens,
    });
  }

  async refreshTokens(refreshTokenStr: string): Promise<Result<AuthTokens, AppError>> {
    const existing = await this.refreshTokenRepository.findByToken(refreshTokenStr);
    if (!existing || existing.isExpired()) {
      return fail(AppError.unauthorized('Invalid or expired refresh token'));
    }

    await this.refreshTokenRepository.delete(refreshTokenStr);
    const tokens = this.generateTokens(existing.userId);
    return ok(tokens);
  }

  async logout(refreshTokenStr: string): Promise<Result<void, AppError>> {
    await this.refreshTokenRepository.delete(refreshTokenStr);
    return ok(undefined);
  }

  async createApiKey(
    userId: string,
    name: string,
    expiresAt?: Date,
  ): Promise<Result<{ id: string; key: string; name: string }, AppError>> {
    const key = `orion_${this.generateId().replace(/-/g, '')}${this.generateId().replace(/-/g, '')}`;
    const apiKey = ApiKey.create({
      id: this.generateId(),
      userId,
      name,
      key,
      expiresAt,
    });
    await this.apiKeyRepository.save(apiKey);
    return ok({ id: apiKey.id, key: apiKey.key, name: apiKey.name });
  }

  async listApiKeys(userId: string): Promise<Result<Array<{ id: string; name: string; lastUsedAt: Date | null; createdAt: Date }>, AppError>> {
    const keys = await this.apiKeyRepository.findByUserId(userId);
    return ok(keys.map(k => ({
      id: k.id,
      name: k.name,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    })));
  }

  async deleteApiKey(id: string, userId: string): Promise<Result<boolean, AppError>> {
    const key = await this.apiKeyRepository.findById(id);
    if (!key || key.userId !== userId) return ok(false);
    const deleted = await this.apiKeyRepository.delete(id);
    return ok(deleted);
  }

  async getUserById(id: string): Promise<Result<SafeUserDTO | null, AppError>> {
    const user = await this.userRepository.findById(id);
    if (!user) return ok(null);
    return ok({
      id: user.id.toString(),
      name: user.name,
      email: user.email.toString(),
    });
  }

  verifyJwt(token: string): { sub: string; type: string } | null {
    return this.jwtProvider.verify(token);
  }

  async validateApiKey(apiKey: string): Promise<Result<SafeUserDTO | null, AppError>> {
    const keyData = await this.apiKeyRepository.findByKey(apiKey);
    if (!keyData || keyData.isExpired()) return ok(null);

    const user = await this.userRepository.findById(keyData.userId);
    if (!user) return ok(null);

    return ok({
      id: user.id.toString(),
      name: user.name,
      email: user.email.toString(),
    });
  }

  private generateTokens(userId: string): AuthTokens {
    const accessToken = this.jwtProvider.sign({ sub: userId, type: 'access' }, '1h');
    const refreshToken = this.jwtProvider.sign({ sub: userId, type: 'refresh' }, '100y');
    return { accessToken, refreshToken };
  }
}
