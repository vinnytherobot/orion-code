import type { ApiKey } from '../entities/ApiKey.js';

export interface IApiKeyRepository {
  findById(id: string): Promise<ApiKey | null>;
  findByKey(key: string): Promise<ApiKey | null>;
  findByUserId(userId: string): Promise<ApiKey[]>;
  save(apiKey: ApiKey): Promise<void>;
  delete(id: string): Promise<boolean>;
}
