/**
 * Verify that the booking migration (20260718000000_booking.sql) has been applied.
 * DDL can't run through the JS client, so the migration itself must be pasted
 * into the Supabase Dashboard → SQL Editor; this script only checks the result.
 *
 * Run: npx tsx scripts/check-booking-schema.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY ?? '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  let ok = true;

  for (const table of ['property_config', 'bookings', 'webhook_events']) {
    const { error } = await supabase.from(table).select('*', { head: true, count: 'exact' });
    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
      ok = false;
    } else {
      console.log(`✅ ${table} exists`);
    }
  }

  if (!ok) {
    console.log('\nApply supabase/migrations/20260718000000_booking.sql in the Supabase SQL Editor:');
    console.log(`${supabaseUrl.replace('.supabase.co', '')} → Dashboard → SQL Editor`);
    process.exit(1);
  }

  console.log('\nSchema OK. Next: npx tsx scripts/seed-property-config.ts');
}

check().catch(console.error);
