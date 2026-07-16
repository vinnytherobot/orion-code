import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schemas/schema.js';

type AppDatabaseType = ReturnType<typeof drizzle<typeof schema>>;

let db: AppDatabaseType | null = null;
let client: ReturnType<typeof postgres> | null = null;

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('Missing required environment variable: DATABASE_URL');
  }
  return url;
}

function createDatabase(databaseUrl: string): AppDatabaseType {
  client = postgres(databaseUrl);
  const database = drizzle(client, { schema });
  return database;
}

export function getDatabase(databaseUrl?: string): AppDatabaseType {
  if (!db) {
    db = createDatabase(databaseUrl || getDatabaseUrl());
  }
  return db;
}

export function resetDatabase(): void {
  if (client) {
    client.end();
    client = null;
  }
  db = null;
}

export async function runMigrations(databaseUrl?: string): Promise<void> {
  const url = databaseUrl || getDatabaseUrl();
  const migrationClient = postgres(url, { max: 1 });
  await migrationClient.end();
}

export { schema };
export type AppDatabase = AppDatabaseType;
