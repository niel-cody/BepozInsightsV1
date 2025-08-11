import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql as dsql } from 'drizzle-orm';
import * as schema from '@shared/schema';

const DATABASE_URL = process.env.DATABASE_URL || '';
const client = postgres(DATABASE_URL, { ssl: 'require' });
export const db = drizzle(client, { schema });

// For simplicity, use the same connection for read-only queries
export const readOnlyDB = db;

export { schema };

// Helper to set Supabase RLS JWT claims for the current session
// This enables policies that reference auth.jwt()->>'org_id'
export async function setRLSClaims(orgId?: string, role: 'authenticated' | 'service_role' = 'authenticated', userIdOrEmail?: string) {
  if (!process.env.DATABASE_URL) return;
  try {
    const claims: Record<string, string | undefined> = { role, user_id: userIdOrEmail } as any;
    if (orgId) claims.org_id = orgId;
    await db.execute(dsql`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`);
  } catch (_) {
    // Best-effort; ignore in environments without DB
  }
}
