import { randomUUID } from 'crypto';
import { UserRepository, ApiKeyRepository, RefreshTokenRepository } from '@orion/infrastructure';
import bcrypt from 'bcryptjs';

export type AppDeps = {
  userRepository: UserRepository;
  apiKeyRepository: ApiKeyRepository;
  refreshTokenRepository: RefreshTokenRepository;
  generateId: () => string;
  now: () => Date;
  comparePassword: (plain: string, hash: string) => Promise<boolean>;
  hashPassword: (plain: string) => Promise<string>;
};

export function buildDeps(): AppDeps {
  return {
    userRepository: new UserRepository(),
    apiKeyRepository: new ApiKeyRepository(),
    refreshTokenRepository: new RefreshTokenRepository(),
    generateId: () => randomUUID(),
    now: () => new Date(),
    comparePassword: (plain, hash) => bcrypt.compare(plain, hash),
    hashPassword: (plain) => bcrypt.hash(plain, 10),
  };
}
