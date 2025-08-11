import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@shared/schema';

const sql = neon(process.env.DATABASE_URL || '');
export const db = drizzle(sql, { schema });

// Read-only database connection for AI queries
const readOnlySQL = neon(process.env.DATABASE_URL || '');
export const readOnlyDB = drizzle(readOnlySQL, { schema });

export { schema };

// Helper to set Supabase RLS JWT claims for the current session
// This enables policies that reference auth.jwt()->>'org_id'
export async function setRLSClaims(orgId?: string, role: 'authenticated' | 'service_role' = 'authenticated', userIdOrEmail?: string) {
  if (!process.env.DATABASE_URL) return;
  try {
    // Supabase's auth.jwt() reads from request.jwt.claims
    const claims: Record<string, string | undefined> = { role, user_id: userIdOrEmail } as any;
    if (orgId) claims.org_id = orgId;
    // Use db.execute to set the config for this session
    await db.execute(
      // @ts-ignore drizzle sql raw string
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // Set as text; auth.jwt() will parse JSON
      { sql: `select set_config('request.jwt.claims', '${JSON.stringify(claims)}', true)` }
    );
  } catch (_) {
    // Best-effort; ignore in environments without DB
  }
}
