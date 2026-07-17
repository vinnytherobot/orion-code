import type { RefreshToken } from '../entities/RefreshToken.js';

export interface IRefreshTokenRepository {
  findByToken(token: string): Promise<RefreshToken | null>;
  findByUserId(userId: string): Promise<RefreshToken[]>;
  save(refreshToken: RefreshToken): Promise<void>;
  delete(token: string): Promise<boolean>;
}
