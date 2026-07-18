/**
 * Remove local/test bookings and webhook events before go-live.
 * Deletes ALL rows — only run while the system is not live for guests.
 *
 * Run: npx tsx scripts/reset-test-bookings.ts --yes
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.argv.includes('--yes')) {
  console.log('This deletes ALL bookings and webhook_events rows.');
  console.log('Run again with --yes if the system is not live yet.');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL ?? '');

async function main() {
  const b = await sql`delete from bookings returning id`;
  const w = await sql`delete from webhook_events returning id`;
  console.log(`🧹 deleted ${b.length} bookings, ${w.length} webhook events`);
}

main().catch(console.error);
