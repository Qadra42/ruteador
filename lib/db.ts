/**
 * Database Client
 * Raw SQL with postgres.js
 */

import postgres from 'postgres';

if (!process.env.POSTGRES_URL) {
  throw new Error(
    'POSTGRES_URL not configured. Add POSTGRES_URL to .env.local'
  );
}

// Create postgres client
export const sql = postgres(process.env.POSTGRES_URL, {
  max: 10, // Connection pool size
  idle_timeout: 20,
  connect_timeout: 10,
});
