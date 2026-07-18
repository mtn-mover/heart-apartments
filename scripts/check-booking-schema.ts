/**
 * Verify that the Neon schema is in place (db/migrations applied).
 * Run: npx tsx scripts/check-booking-schema.ts
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

async function check() {
  let ok = true;

  for (const table of ['documents', 'chat_sessions', 'chat_messages', 'property_config', 'bookings', 'webhook_events']) {
    try {
      const rows = await sql`select count(*)::int as n from ${sql.unsafe(table)}`;
      console.log(`✅ ${table} exists (${rows[0].n} rows)`);
    } catch (err) {
      console.log(`❌ ${table}: ${err instanceof Error ? err.message : err}`);
      ok = false;
    }
  }

  if (!ok) {
    console.log('\nApply the schema first: npx tsx scripts/db-migrate.ts');
    process.exit(1);
  }

  console.log('\nSchema OK.');
}

check().catch(console.error);
