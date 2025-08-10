import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@shared/schema';

const sql = neon(process.env.DATABASE_URL || '');
export const db = drizzle(sql, { schema });

// Read-only database connection for AI queries
const readOnlySQL = neon(process.env.DATABASE_URL || '');
export const readOnlyDB = drizzle(readOnlySQL, { schema });

export { schema };
