/**
 * Environment variables validation
 * All required env vars must be set - no fallbacks allowed
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root (3 levels up from this file)
config({ path: resolve(import.meta.dirname, '../../../.env') });

function getEnvVar(name: string, required: boolean = true): string {
  const value = process.env[name];
  if (!value && required) {
    throw new Error(`Configuration error: ${name} is not set`);
  }
  return value || '';
}

export const env = {
  DATABASE_URL: getEnvVar('DATABASE_URL'),
  JWT_SECRET: getEnvVar('JWT_SECRET'),
  PORT: parseInt(getEnvVar('PORT', false) || '3000', 10),
  HOST: getEnvVar('HOST', false) || '0.0.0.0',
  NODE_ENV: getEnvVar('NODE_ENV', false) || 'development',
  LOG_LEVEL: getEnvVar('LOG_LEVEL', false) || 'info',
  CORS_ORIGIN: getEnvVar('CORS_ORIGIN', false) || '*',
} as const;
