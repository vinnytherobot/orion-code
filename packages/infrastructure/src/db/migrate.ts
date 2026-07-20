import { resolve } from 'node:path';
import { config } from 'dotenv';
import postgres from 'postgres';

// Load .env from project root
config({ path: resolve(import.meta.dirname, '../../../../.env') });

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('Missing required environment variable: DATABASE_URL');
  }
  return url;
}

const migrations = [
  // === Enums ===
  `DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('active', 'completed', 'paused', 'cancelled');
  EXCEPTION WHEN duplicate_object THEN null;
  END $$`,
  `DO $$ BEGIN
    CREATE TYPE agent_status AS ENUM ('idle', 'running', 'waiting', 'failed', 'completed');
  EXCEPTION WHEN duplicate_object THEN null;
  END $$`,
  `DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('pending', 'planning', 'running', 'waiting', 'review', 'testing', 'completed', 'failed', 'cancelled');
  EXCEPTION WHEN duplicate_object THEN null;
  END $$`,

  // === Auth tables ===
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key TEXT NOT NULL UNIQUE,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  // === Orchestration tables ===
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    path TEXT NOT NULL,
    status project_status NOT NULL DEFAULT 'active',
    config JSONB,
    user_id TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    status agent_status NOT NULL DEFAULT 'idle',
    current_task_id TEXT,
    model TEXT NOT NULL DEFAULT 'llama3',
    permissions JSONB NOT NULL DEFAULT '[]',
    config JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_task_id TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status task_status NOT NULL DEFAULT 'pending',
    assigned_agent_id TEXT,
    dependencies JSONB NOT NULL DEFAULT '[]',
    result TEXT,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS execution_logs (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    input TEXT,
    output TEXT,
    error TEXT,
    duration_ms INTEGER,
    tokens_used INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  // === Indexes ===
  'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
  'CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key)',
  'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)',
  'CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_agents_project_id ON agents(project_id)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_assigned_agent_id ON tasks(assigned_agent_id)',
  'CREATE INDEX IF NOT EXISTS idx_execution_logs_task_id ON execution_logs(task_id)',
  'CREATE INDEX IF NOT EXISTS idx_execution_logs_agent_id ON execution_logs(agent_id)',
];

async function migrate() {
  console.log('Running migrations...');

  const databaseUrl = getDatabaseUrl();
  const client = postgres(databaseUrl, { max: 1 });

  try {
    for (const sql of migrations) {
      await client.unsafe(sql);
    }
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
