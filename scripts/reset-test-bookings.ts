/**
 * Remove local/test bookings and webhook events before go-live.
 * Deletes ALL rows — only run while the system is not live for guests.
 *
 * Run: npx tsx scripts/reset-test-bookings.ts --yes
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.argv.includes('--yes')) {
  console.log('This deletes ALL bookings and webhook_events rows.');
  console.log('Run again with --yes if the system is not live yet.');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_KEY ?? ''
);

async function main() {
  const { count: b } = await supabase
    .from('bookings')
    .delete({ count: 'exact' })
    .not('id', 'is', null);
  const { count: w } = await supabase
    .from('webhook_events')
    .delete({ count: 'exact' })
    .not('id', 'is', null);
  console.log(`🧹 deleted ${b ?? 0} bookings, ${w ?? 0} webhook events`);
}

main().catch(console.error);
