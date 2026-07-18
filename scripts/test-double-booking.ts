/**
 * Proves the structural double-booking protection: two concurrent inserts for
 * an overlapping range → exactly one succeeds, the other fails with the
 * no_overlap exclusion constraint (23P01). Cleans up after itself.
 *
 * Requires the booking migration to be applied (scripts/check-booking-schema.ts).
 * Run: npx tsx scripts/test-double-booking.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_KEY ?? ''
);

const APARTMENT = 'heart1';
const CHECK_IN = '2030-01-10'; // far future — never collides with real data
const CHECK_OUT = '2030-01-13';

function testRow(ref: string, checkIn: string, checkOut: string) {
  return {
    reference: ref,
    apartment_id: APARTMENT,
    check_in: checkIn,
    check_out: checkOut,
    adults: 2,
    children: 0,
    guest_first_name: 'Race',
    guest_last_name: 'Test',
    guest_email: 'race-test@example.com',
    locale: 'en',
    price_breakdown: {},
    total_rappen: 1,
    status: 'pending_payment',
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  };
}

async function main() {
  await supabase.from('bookings').delete().eq('guest_email', 'race-test@example.com');

  // 1) Two concurrent inserts, exact same range
  const [a, b] = await Promise.all([
    supabase.from('bookings').insert(testRow('LH-RACEA1', CHECK_IN, CHECK_OUT)),
    supabase.from('bookings').insert(testRow('LH-RACEB1', CHECK_IN, CHECK_OUT)),
  ]);
  const errors = [a.error, b.error].filter(Boolean);
  const ok = [a.error, b.error].filter((e) => !e);
  console.log(
    ok.length === 1 && errors.length === 1 && errors[0]!.code === '23P01'
      ? '✅ concurrent identical ranges: exactly one insert survived (23P01 on the other)'
      : `❌ expected 1 success + 1 exclusion violation, got ${JSON.stringify([a.error?.code, b.error?.code])}`
  );

  // 2) Overlapping (not identical) range must also be blocked
  const c = await supabase.from('bookings').insert(testRow('LH-RACEC1', '2030-01-12', '2030-01-15'));
  console.log(
    c.error?.code === '23P01'
      ? '✅ partially overlapping range blocked'
      : `❌ overlap not blocked (${c.error?.code ?? 'inserted!'})`
  );

  // 3) Back-to-back (checkout day = next check-in) must be ALLOWED
  const d = await supabase.from('bookings').insert(testRow('LH-RACED1', CHECK_OUT, '2030-01-16'));
  console.log(
    !d.error
      ? '✅ back-to-back booking on the departure day allowed'
      : `❌ back-to-back wrongly blocked (${d.error.code})`
  );

  // 4) Expired bookings free their range
  await supabase
    .from('bookings')
    .update({ status: 'expired' })
    .eq('reference', 'LH-RACEA1');
  const e = await supabase.from('bookings').insert(testRow('LH-RACEE1', CHECK_IN, CHECK_OUT));
  console.log(
    !e.error ? '✅ expired booking frees the range' : `❌ range still blocked after expiry (${e.error.code})`
  );

  const { count } = await supabase
    .from('bookings')
    .delete({ count: 'exact' })
    .eq('guest_email', 'race-test@example.com');
  console.log(`🧹 cleaned up ${count} test rows`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
