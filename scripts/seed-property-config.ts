/**
 * Seed property_config with one row per apartment (idempotent — existing rows untouched).
 *
 * Values are placeholders until clarified with Diana:
 * - cleaning_fee_rappen, direct_discount_pct, city_tax (default 3.20 CHF/adult/night)
 * - smoobu_property_id stays null until her Smoobu onboarding is done
 * All apartments start with active=false (soft-launch switch).
 *
 * Run: npx tsx scripts/seed-property-config.ts
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

async function seed() {
  for (const id of ['heart1', 'heart2', 'heart3', 'heart4', 'heart5']) {
    await sql`
      insert into property_config (id, active, cleaning_fee_rappen, direct_discount_pct,
                                   city_tax_per_adult_night_rappen, min_nights_fallback)
      values (${id}, false, 0, 10.0, 320, 2)
      on conflict (id) do nothing
    `;
  }

  const rows = await sql`select id, active, smoobu_property_id from property_config order by id`;
  console.log('✅ property_config seeded (existing rows untouched):');
  console.table(rows);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  console.error('\nDid you run: npx tsx scripts/db-migrate.ts ?');
  process.exit(1);
});
