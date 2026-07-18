/**
 * Seed property_config with one row per apartment (idempotent upsert).
 *
 * Values are placeholders until clarified with Diana:
 * - cleaning_fee_rappen, direct_discount_pct, city_tax (default 3.20 CHF/adult/night)
 * - smoobu_property_id stays null until her Smoobu onboarding is done
 * All apartments start with active=false (soft-launch switch).
 *
 * Run: npx tsx scripts/seed-property-config.ts
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

const rows = ['heart1', 'heart2', 'heart3', 'heart4', 'heart5'].map((id) => ({
  id,
  active: false,
  cleaning_fee_rappen: 0,
  direct_discount_pct: 10.0,
  city_tax_per_adult_night_rappen: 320,
  min_nights_fallback: 2,
}));

async function seed() {
  const { error } = await supabase
    .from('property_config')
    .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });

  if (error) {
    console.error('❌ Seed failed:', error.message);
    if (error.message.includes('property_config')) {
      console.error('\nDid you apply supabase/migrations/20260718000000_booking.sql in the SQL Editor?');
    }
    process.exit(1);
  }

  const { data } = await supabase.from('property_config').select('id, active, smoobu_property_id');
  console.log('✅ property_config seeded (existing rows untouched):');
  console.table(data);
}

seed().catch(console.error);
