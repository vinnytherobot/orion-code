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
  createProvider,
  getProviderInfo,
  getEffectiveProviderConfig,
  AgentExecutor,
  Orchestrator,
  InMemoryEventBus,
  createUnitOfWork,
  ExecutionLogRepository,
  ChatMessageRepository,
  ChatSessionRepository,
  WorktreeManager,
  MergeResolver,
  ToolRegistry,
  LockManager,
  MessageBus,
  PlannerService,
  ProjectAnalyzer,
  readFileTool,
  writeFileTool,
  editFileTool,
  globTool,
  grepTool,
  bashTool,
} from '@orion/infrastructure';
import {
  PlanUseCase,
  AuthUseCase,
  ProjectUseCase,
} from '@orion/application';
import type { IJWTProviderPort } from '@orion/application';
import { ProviderAdapter } from '@orion/infrastructure';
import { ProviderUseCase } from '@orion/application';

export type AppDeps = {
  planUseCase: PlanUseCase;
  projectUseCase: ProjectUseCase;
  authUseCase: AuthUseCase;
  orchestrator: Orchestrator;
  taskRepository: TaskRepository;
  agentRepository: AgentRepository;
  chatMessageRepository: ChatMessageRepository;
  chatSessionRepository: ChatSessionRepository;
  providerUseCase: ProviderUseCase;
  agentExecutor: AgentExecutor;
  userRepository: UserDomainRepository;
  plannerService: PlannerService;
  generateId: () => string;
  now: () => Date;
};

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
        const sigBuf = Buffer.from(signature, 'base64url');
        const expectedBuf = Buffer.from(expectedSignature, 'base64url');
        if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
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
  
  // Load provider config, preferring environment variables so Docker
  // deployments work without plaintext home-file writes.
  const effective = getEffectiveProviderConfig();
  const providerInfo = getProviderInfo(effective.name);

  const llmProvider = createProvider(effective.name, {
    apiKey: effective.apiKey || 'ollama',
    baseUrl: effective.baseUrl || providerInfo?.defaultBaseUrl || 'http://127.0.0.1:11434',
    model: effective.model || providerInfo?.defaultModel || 'llama3',
  });
  
  const agentExecutor = new AgentExecutor(llmProvider);
  const providerAdapter = new ProviderAdapter(agentExecutor);
  const providerUseCase = new ProviderUseCase(providerAdapter);
  const jwtProvider = createJWTProvider(jwtSecret);

  const planUseCase = new PlanUseCase(taskRepository, unitOfWork);
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

  // Orchestration infrastructure
  const worktreeManager = new WorktreeManager();
  const mergeResolver = new MergeResolver(worktreeManager);
  const lockManager = new LockManager();
  const messageBus = new MessageBus();

  const toolRegistry = new ToolRegistry();
  toolRegistry.register(readFileTool);
  toolRegistry.register(writeFileTool);
  toolRegistry.register(editFileTool);
  toolRegistry.register(globTool);
  toolRegistry.register(grepTool);
  toolRegistry.register(bashTool);

  const projectAnalyzer = new ProjectAnalyzer();
  const plannerService = new PlannerService(projectAnalyzer, agentExecutor);

  const orchestrator = new Orchestrator(
    taskRepository,
    agentRepository,
    agentExecutor,
    { maxConcurrentAgents: 4, taskTimeoutMs: 300_000, retryAttempts: 2 },
    eventBus,
    new ExecutionLogRepository(),
    worktreeManager,
    mergeResolver,
    toolRegistry,
    lockManager,
    messageBus,
    { rootPath: process.env.ORION_PROJECT_PATH ?? process.cwd() },
  );

  return {
    planUseCase,
    projectUseCase,
    authUseCase,
    orchestrator,
    taskRepository,
    agentRepository,
    chatMessageRepository: new ChatMessageRepository(),
    chatSessionRepository: new ChatSessionRepository(),
    providerUseCase,
    agentExecutor,
    userRepository,
    plannerService,
    generateId,
    now,
  };
}
