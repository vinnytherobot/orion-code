import { pgTable, text, timestamp, integer, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';
import { users } from './schema.js';

// Enums - matching domain types exactly
export const projectStatusEnum = pgEnum('project_status', ['active', 'completed', 'paused', 'cancelled']);
export const agentStatusEnum = pgEnum('agent_status', ['idle', 'running', 'waiting', 'failed', 'completed']);
export const taskStatusEnum = pgEnum('task_status', [
  'pending', 'planning', 'running', 'waiting', 
  'review', 'testing', 'completed', 'failed', 'cancelled'
]);

// Projects table
export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  path: text('path').notNull(),
  status: projectStatusEnum('status').notNull().default('active'),
  config: jsonb('config').$type<Record<string, unknown>>(),
  userId: text('user_id').notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// Agents table
export const agents = pgTable('agents', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  role: text('role').notNull(),
  status: agentStatusEnum('status').notNull().default('idle'),
  currentTaskId: text('current_task_id'),
  model: text('model').notNull().default('llama3'),
  permissions: jsonb('permissions').$type<string[]>().notNull().default([]),
  config: jsonb('config').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// Tasks table
export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  parentTaskId: text('parent_task_id'),
  title: text('title').notNull(),
  description: text('description').notNull(),
  // Which specialist agent should execute this task (planner, backend, qa, ...).
  // The orchestrator uses this to find a matching agent via Agent.role.
  role: text('role').notNull().default('backend'),
  status: taskStatusEnum('status').notNull().default('pending'),
  assignedAgentId: text('assigned_agent_id'),
  dependencies: jsonb('dependencies').$type<string[]>().notNull().default([]),
  result: text('result'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// Execution logs table
export const executionLogs = pgTable('execution_logs', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  agentId: text('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  input: text('input'),
  output: text('output'),
  error: text('error'),
  durationMs: integer('duration_ms'),
  tokensUsed: integer('tokens_used'),
  createdAt: timestamp('created_at').notNull(),
});

// Chat sessions table - each conversation with the tech lead is a session.
export const chatSessions = pgTable('chat_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('New Chat'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// Chat messages table - persists the conversation with the "tech lead" agent.
// projectId is optional so a user can have an unscoped chat (global) and
// per-project chats for orchestration context.
export const chatMessages = pgTable('chat_messages', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: text('project_id').references(() => projects.id, {
    onDelete: 'cascade',
  }),
  sessionId: text('session_id').references(() => chatSessions.id, {
    onDelete: 'cascade',
  }),
  role: text('role').notNull(), // 'user' | 'assistant' | 'system'
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull(),
});

// Indexes for performance
export const agentsProjectIdIdx = index('agents_project_id_idx').on(agents.projectId);
export const agentsStatusIdx = index('agents_status_idx').on(agents.status);
export const agentsRoleIdx = index('agents_role_idx').on(agents.role);
export const tasksProjectIdIdx = index('tasks_project_id_idx').on(tasks.projectId);
export const tasksStatusIdx = index('tasks_status_idx').on(tasks.status);
export const tasksAssignedAgentIdIdx = index('tasks_assigned_agent_id_idx').on(tasks.assignedAgentId);
export const chatMessagesUserIdIdx = index('chat_messages_user_id_idx').on(chatMessages.userId);
export const chatMessagesSessionIdIdx = index('chat_messages_session_id_idx').on(chatMessages.sessionId);
export const chatMessagesProjectIdIdx = index('chat_messages_project_id_idx').on(chatMessages.projectId);

// Type exports
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type ExecutionLog = typeof executionLogs.$inferSelect;
export type NewExecutionLog = typeof executionLogs.$inferInsert;
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
