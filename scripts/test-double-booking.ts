/**
 * Proves the structural double-booking protection: two concurrent inserts for
 * an overlapping range → exactly one succeeds, the other fails with the
 * no_overlap exclusion constraint (23P01). Cleans up after itself.
 *
 * Requires the schema (npx tsx scripts/db-migrate.ts) and the seed.
 * Run: npx tsx scripts/test-double-booking.ts
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL ?? '');

const APARTMENT = 'heart1';
const CHECK_IN = '2030-01-10'; // far future — never collides with real data
const CHECK_OUT = '2030-01-13';
const TEST_EMAIL = 'race-test@example.com';

function code(err: unknown): string | undefined {
  return typeof err === 'object' && err !== null && 'code' in err
    ? String((err as { code: unknown }).code)
    : undefined;
}

async function insertRow(ref: string, checkIn: string, checkOut: string): Promise<string | null> {
  try {
    await sql`
      insert into bookings (reference, apartment_id, check_in, check_out, adults,
                            guest_first_name, guest_last_name, guest_email,
                            price_breakdown, total_rappen, expires_at)
      values (${ref}, ${APARTMENT}, ${checkIn}, ${checkOut}, 2, 'Race', 'Test',
              ${TEST_EMAIL}, '{}'::jsonb, 1, now() + interval '1 minute')
    `;
    return null;
  } catch (err) {
    return code(err) ?? 'unknown';
  }
}

async function main() {
  await sql`delete from bookings where guest_email = ${TEST_EMAIL}`;

  // 1) Two concurrent inserts, exact same range
  const [a, b] = await Promise.all([
    insertRow('LH-RACEA1', CHECK_IN, CHECK_OUT),
    insertRow('LH-RACEB1', CHECK_IN, CHECK_OUT),
  ]);
  const failures = [a, b].filter(Boolean);
  console.log(
    failures.length === 1 && failures[0] === '23P01'
      ? '✅ concurrent identical ranges: exactly one insert survived (23P01 on the other)'
      : `❌ expected 1 success + 1 exclusion violation, got ${JSON.stringify([a, b])}`
  );

  // 2) Overlapping (not identical) range must also be blocked
  const c = await insertRow('LH-RACEC1', '2030-01-12', '2030-01-15');
  console.log(c === '23P01' ? '✅ partially overlapping range blocked' : `❌ overlap not blocked (${c ?? 'inserted!'})`);

  // 3) Back-to-back (checkout day = next check-in) must be ALLOWED
  const d = await insertRow('LH-RACED1', CHECK_OUT, '2030-01-16');
  console.log(d === null ? '✅ back-to-back booking on the departure day allowed' : `❌ back-to-back wrongly blocked (${d})`);

  // 4) Expired bookings free their range
  await sql`update bookings set status = 'expired' where reference in ('LH-RACEA1','LH-RACEB1') and guest_email = ${TEST_EMAIL}`;
  const e = await insertRow('LH-RACEE1', CHECK_IN, CHECK_OUT);
  console.log(e === null ? '✅ expired booking frees the range' : `❌ range still blocked after expiry (${e})`);

  const removed = await sql`delete from bookings where guest_email = ${TEST_EMAIL} returning id`;
  console.log(`🧹 cleaned up ${removed.length} test rows`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
