import { pgTable, text, timestamp, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';

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

// Type exports
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type ExecutionLog = typeof executionLogs.$inferSelect;
export type NewExecutionLog = typeof executionLogs.$inferInsert;
