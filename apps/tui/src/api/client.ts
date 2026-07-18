/**
 * API Client for communicating with Orion Backend
 */

import { resolve } from 'node:path';
import { config } from 'dotenv';
import { clearTokens, loadTokens, saveTokens } from '../utils/tokenStorage.js';

// Load .env from project root
config({ path: resolve(import.meta.dirname, '../../../../.env') });

function getApiUrl(): string {
  const url = process.env.ORION_API_URL;
  if (!url) {
    throw new Error('API URL not configured');
  }
  return url;
}

const API_BASE = getApiUrl();

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

interface UserResponse {
  user: { id: string; name: string; email: string };
}

interface AuthResponse extends UserResponse {
  tokens: TokenResponse;
}

interface ApiKeyResponse {
  id: string;
  key: string;
  name: string;
  message: string;
}

interface ApiKeyListResponse {
  apiKeys: Array<{ id: string; name: string; lastUsedAt: string | null; createdAt: string }>;
}

interface ProjectResponse {
  project: { id: string; name: string; path: string; description?: string; architecture: string };
}

interface ProjectListResponse {
  projects: Array<{
    id: string;
    name: string;
    path: string;
    description?: string;
    architecture: string;
    createdAt: string;
  }>;
}

interface TaskResponse {
  task: { id: string; title: string; status: string };
}

interface TaskListResponse {
  tasks: Array<{
    id: string;
    projectId: string;
    title: string;
    description: string;
    status: string;
    assignedAgentId?: string;
    parentTaskId?: string;
    dependencies: string[];
    result?: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

interface TaskStatsResponse {
  stats: { total: number; pending: number; running: number; completed: number; failed: number };
}

interface AgentResponse {
  agent: { id: string; name: string; role: string; status: string };
}

interface AgentListResponse {
  agents: Array<{ id: string; name: string; role: string; status: string; currentTaskId?: string }>;
}

interface AgentStatsResponse {
  stats: { total: number; idle: number; running: number; blocked: number; completed: number };
}

interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
}


interface ProviderInfo {
  name: string;
  displayName: string;
  description: string;
  requiresApiKey: boolean;
  defaultModel: string;
  defaultBaseUrl: string;
}

interface ProviderListResponse {
  providers: ProviderInfo[];
}

interface ProviderResponse {
  provider: { name: string; model: string };
}

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private userId: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.restoreTokens();
  }

  private restoreTokens() {
    const stored = loadTokens();
    if (stored) {
      this.accessToken = stored.accessToken;
      this.refreshToken = stored.refreshToken;
      this.userId = stored.userId ?? null;
    }
  }

  setTokens(access: string, refresh: string, userId?: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    this.userId = userId || 'unknown';
    saveTokens({
      accessToken: access,
      refreshToken: refresh,
      userId: this.userId,
      savedAt: new Date().toISOString(),
    });
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.userId = null;
    clearTokens();
  }

  private formatError(raw: unknown): string {
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) {
      return raw
        .map((issue: { path?: string[]; message?: string }) => {
          const field = issue.path?.join('.') || '';
          return field ? `${field}: ${issue.message}` : issue.message || 'Validation error';
        })
        .join('; ');
    }
    if (raw && typeof raw === 'object' && 'message' in raw) {
      return String((raw as { message: unknown }).message);
    }
    return 'Request failed';
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers,
      });

      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshTokens();
        if (refreshed) {
          headers.Authorization = `Bearer ${this.accessToken}`;
          const retryResponse = await fetch(`${this.baseUrl}${path}`, {
            ...options,
            headers,
          });
          const retryData = (await retryResponse.json()) as Record<string, unknown>;
          if (!retryResponse.ok) {
            return { error: this.formatError(retryData.error) };
          }
          return { data: retryData as T };
        }
        // Refresh failed - clear tokens
        this.clearTokens();
        return { error: 'Session expired. Please login again with /login.' };
      }

      const data = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        return { error: this.formatError(data.error) };
      }
      return { data: data as T };
    } catch (error) {
      return {
        error: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async refreshTokens(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) return false;

      const data = (await response.json()) as TokenResponse;
      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;
      saveTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        userId: this.userId || 'unknown',
        savedAt: new Date().toISOString(),
      });
      return true;
    } catch {
      return false;
    }
  }

  // Auth endpoints
  async register(name: string, email: string, password: string) {
    const result = await this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    if (result.data?.tokens) {
      this.setTokens(
        result.data.tokens.accessToken,
        result.data.tokens.refreshToken,
        result.data.user.id,
      );
    }

    return result;
  }

  async login(email: string, password: string) {
    const result = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (result.data?.tokens) {
      this.setTokens(
        result.data.tokens.accessToken,
        result.data.tokens.refreshToken,
        result.data.user.id,
      );
    }

    return result;
  }

  async logout() {
    if (this.refreshToken) {
      await this.request('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
    }
    this.clearTokens();
  }

  async getMe() {
    return this.request<UserResponse>('/api/auth/me');
  }

  // API Key endpoints
  async createApiKey(name: string) {
    return this.request<ApiKeyResponse>('/api/auth/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async listApiKeys() {
    return this.request<ApiKeyListResponse>('/api/auth/api-keys');
  }

  async deleteApiKey(id: string) {
    return this.request(`/api/auth/api-keys/${id}`, { method: 'DELETE' });
  }

  // Project endpoints
  async listProjects() {
    return this.request<ProjectListResponse>('/api/projects');
  }

  async createProject(name: string, path: string, description?: string, architecture?: string) {
    return this.request<ProjectResponse>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name, path, description, architecture: architecture || 'ddd' }),
    });
  }

  async getProject(id: string) {
    return this.request<ProjectResponse>(`/api/projects/${id}`);
  }

  async deleteProject(id: string) {
    return this.request(`/api/projects/${id}`, { method: 'DELETE' });
  }

  // Task endpoints
  async listTasks(projectId?: string) {
    const query = projectId ? `?projectId=${projectId}` : '';
    return this.request<TaskListResponse>(`/api/tasks${query}`);
  }

  async createTask(projectId: string, title: string, description: string) {
    return this.request<TaskResponse>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ projectId, title, description }),
    });
  }

  async updateTask(id: string, data: { status?: string; assignedAgent?: string }) {
    return this.request<TaskResponse>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: string) {
    return this.request(`/api/tasks/${id}`, { method: 'DELETE' });
  }

  async getTaskStats(projectId: string) {
    return this.request<TaskStatsResponse>(`/api/tasks/stats/${projectId}`);
  }

  // Agent endpoints
  async listAgents() {
    return this.request<AgentListResponse>('/api/agents');
  }

  async getAgentStats() {
    return this.request<AgentStatsResponse>('/api/agents/stats');
  }

  async assignTask(agentId: string, taskId: string) {
    return this.request<AgentResponse>(`/api/agents/${agentId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ taskId }),
    });
  }

  async completeTask(agentId: string, result: string) {
    return this.request<AgentResponse>(`/api/agents/${agentId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ result }),
    });
  }

  async resetAgent(agentId: string) {
    return this.request<AgentResponse>(`/api/agents/${agentId}/reset`, {
      method: 'POST',
    });
  }

  async initializeAgents(projectId: string) {
    return this.request<AgentListResponse>(`/api/agents/initialize/${projectId}`, {
      method: 'POST',
    });
  }

  
  
  // Orchestration endpoints
  async executeOrchestration(projectId: string, tasks: Array<{ title: string; description: string; dependencies?: string[] }>) {
    return this.request<{ success: boolean }>(`/api/projects/${projectId}/orchestration/execute`, {
      method: 'POST',
      body: JSON.stringify({ tasks }),
    });
  }

  async getOrchestrationStatus(projectId: string) {
    return this.request<{ runningAgents: number; pendingTasks: number; completedTasks: number }>(`/api/projects/${projectId}/orchestration/status`);
  }

// Provider endpoints
  async getProviders() {
    return this.request<ProviderListResponse>('/api/providers');
  }

  async getCurrentProvider() {
    return this.request<ProviderResponse>('/api/provider');
  }

  async setProvider(name: string, apiKey?: string) {
    return this.request<ProviderResponse>('/api/provider', {
      method: 'POST',
      body: JSON.stringify({ provider: name, apiKey }),
    });
  }

// Health check
  async health() {
    return this.request<HealthResponse>('/api/health');
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }
}

export const apiClient = new ApiClient(API_BASE);
