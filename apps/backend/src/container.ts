import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import {
  AgentRepository,
  TaskRepository,
  UserDomainRepository,
  ApiKeyDomainRepository,
  RefreshTokenDomainRepository,
  ProjectDomainRepository,
  OllamaProvider,
  AgentExecutor,
  Orchestrator,
  InMemoryEventBus,
  createUnitOfWork,
} from '@orion/infrastructure';
import {
  PlanUseCase,
  ImplementUseCase,
  AnalyzeProjectUseCase,
  AuthUseCase,
  ProjectUseCase,
} from '@orion/application';
import type { ILLMProvider } from '@orion/infrastructure';
import type { IJWTProviderPort } from '@orion/application';

export type AppDeps = {
  planUseCase: PlanUseCase;
  implementUseCase: ImplementUseCase;
  analyzeProjectUseCase: AnalyzeProjectUseCase;
  projectUseCase: ProjectUseCase;
  authUseCase: AuthUseCase;
  orchestrator: Orchestrator;
  taskRepository: TaskRepository;
  agentRepository: AgentRepository;
  generateId: () => string;
  now: () => Date;
};

function createLLMProvider(): ILLMProvider {
  return new OllamaProvider({
    apiKey: 'ollama',
    baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3',
  });
}

function createJWTProvider(secret: string): IJWTProviderPort {
  return {
    sign(payload: Record<string, unknown>, expiresIn: string): string {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const body = Buffer.from(
        JSON.stringify({
          ...payload,
          iat: Math.floor(Date.now() / 1000),
          exp: (() => {
            const now = Math.floor(Date.now() / 1000);
            const match = expiresIn.match(/^(\d+)([smhdy])$/);
            if (!match) return now + 3600;
            const num = Number.parseInt(match[1]!, 10);
            switch (match[2]) {
              case 's': return now + num;
              case 'm': return now + num * 60;
              case 'h': return now + num * 3600;
              case 'd': return now + num * 86400;
              case 'y': return now + num * 365 * 86400;
              default: return now + 3600;
            }
          })(),
        }),
      ).toString('base64url');
      const signature = crypto
        .createHmac('sha256', secret)
        .update(`${header}.${body}`)
        .digest('base64url');
      return `${header}.${body}.${signature}`;
    },
    verify(token: string): { sub: string; type: string } | null {
      try {
        const [headerB64, bodyB64, signature] = token.split('.');
        if (!headerB64 || !bodyB64 || !signature) return null;
        const expectedSignature = crypto
          .createHmac('sha256', secret)
          .update(`${headerB64}.${bodyB64}`)
          .digest('base64url');
        if (signature !== expectedSignature) return null;
        const payload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString());
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
        return { sub: payload.sub, type: payload.type };
      } catch {
        return null;
      }
    },
  };
}

export function buildDeps(jwtSecret: string): AppDeps {
  const generateId = () => randomUUID();
  const now = () => new Date();

  const taskRepository = new TaskRepository();
  const agentRepository = new AgentRepository();
  const projectRepository = new ProjectDomainRepository();
  const userRepository = new UserDomainRepository();
  const apiKeyRepository = new ApiKeyDomainRepository();
  const refreshTokenRepository = new RefreshTokenDomainRepository();
  const eventBus = new InMemoryEventBus();
  const unitOfWork = createUnitOfWork();
  const llmProvider = createLLMProvider();
  const agentExecutor = new AgentExecutor(llmProvider);
  const jwtProvider = createJWTProvider(jwtSecret);

  const planUseCase = new PlanUseCase(taskRepository, unitOfWork);
  const implementUseCase = new ImplementUseCase(
    taskRepository,
    agentRepository,
    agentExecutor,
    eventBus,
    unitOfWork,
  );
  const analyzeProjectUseCase = new AnalyzeProjectUseCase(taskRepository);
  const projectUseCase = new ProjectUseCase(projectRepository);
  const authUseCase = new AuthUseCase(
    userRepository,
    apiKeyRepository,
    refreshTokenRepository,
    jwtProvider,
    (password: string) => bcrypt.hash(password, 10),
    (plain: string, hash: string) => bcrypt.compare(plain, hash),
    generateId,
    unitOfWork,
  );

  const orchestrator = new Orchestrator(
    taskRepository,
    agentRepository,
    agentExecutor,
    undefined,
    eventBus,
  );

  return {
    planUseCase,
    implementUseCase,
    analyzeProjectUseCase,
    projectUseCase,
    authUseCase,
    orchestrator,
    taskRepository,
    agentRepository,
    generateId,
    now,
  };
}
