/**
 * End-to-end booking chain against Neon in mock-Smoobu mode — the path the
 * Stripe webhook drives, which is NOT exercised by the HTTP routes without
 * Stripe keys. Guards specifically against the date round-trip regression
 * (Neon returns `date` as a JS Date unless lib/db overrides the parser).
 *
 * Run: SMOOBU_MOCK=1 npx tsx scripts/test-booking-flow.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.SMOOBU_MOCK = '1';

import { getSql } from '../lib/db';
import type { BookingRow } from '../lib/db';
import { getSmoobu } from '../lib/smoobu';
import { loadPropertyConfig, resolveSmoobuPropertyId } from '../lib/booking/service';
import { computeQuote } from '../lib/booking/pricing';
import { guestConfirmationEmail, hostNotificationEmail } from '../lib/email/templates';

const sql = getSql();
const REF = 'LH-FLOWT1';
const CHECK_IN = '2027-05-18';
const CHECK_OUT = '2027-05-21';

let failures = 0;
function check(name: string, cond: boolean, extra = '') {
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) failures++;
}

async function main() {
  await sql`insert into property_config (id, active) values ('heart1', true)
            on conflict (id) do update set active = true`;
  await sql`delete from bookings where reference = ${REF}`;

  const cfg = await loadPropertyConfig('heart1');
  if (!cfg) throw new Error('no property_config for heart1');
  const propertyId = resolveSmoobuPropertyId(cfg)!;

  // 1) Quote + insert pending (mirrors the create route)
  const rates = await getSmoobu().getRates(propertyId, CHECK_IN, CHECK_OUT);
  const quote = computeQuote(cfg, rates, {
    apartmentId: 'heart1',
    checkIn: CHECK_IN,
    checkOut: CHECK_OUT,
    adults: 2,
    children: 1,
  });
  await sql`
    insert into bookings (reference, apartment_id, check_in, check_out, adults, children,
      guest_first_name, guest_last_name, guest_email, locale, price_breakdown, total_rappen, expires_at)
    values (${REF}, 'heart1', ${CHECK_IN}, ${CHECK_OUT}, 2, 1, 'Flow', 'Test',
      'flow@example.com', 'de', ${JSON.stringify(quote)}::jsonb, ${quote.totalRappen}, now() + interval '30 min')`;

  // 2) Read back the way the webhook does
  const rows = await sql`select * from bookings where reference = ${REF}`;
  const booking = rows[0] as BookingRow;
  check('check_in reads back as string', typeof booking.check_in === 'string', String(booking.check_in));
  check('check_in is the correct day (no TZ drift)', booking.check_in === CHECK_IN, booking.check_in);
  check('check_out is the correct day', booking.check_out === CHECK_OUT, booking.check_out);
  check('price_breakdown reads back as object', typeof booking.price_breakdown === 'object');

  // 3) Smoobu reservation from the booking (mock must not crash on the dates)
  let reservationId: number | null = null;
  try {
    const res = await getSmoobu().createReservation({
      propertyId,
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      firstName: booking.guest_first_name,
      lastName: booking.guest_last_name,
      email: booking.guest_email,
      adults: booking.adults,
      children: booking.children,
      priceRappen: booking.total_rappen,
      reference: booking.reference,
      language: booking.locale,
    });
    reservationId = res.id;
    check('Smoobu reservation created without throwing', true, `id ${res.id}`);
  } catch (err) {
    check('Smoobu reservation created without throwing', false, String(err));
  }

  // 4) Reservation blocks its own range in the mock
  if (reservationId) {
    const after = await getSmoobu().getRates(propertyId, CHECK_IN, CHECK_OUT);
    check('mock now marks the booked night unavailable', after[CHECK_IN]?.available === false);
    await getSmoobu().cancelReservation(reservationId);
  }

  // 5) Emails render with a real date (not "Invalid Date")
  const guestMail = guestConfirmationEmail(booking, cfg);
  check('guest email has no "Invalid Date"', !guestMail.html.includes('Invalid Date'));
  check('guest email shows the arrival day', guestMail.html.includes('18'), 'expected day 18 in body');
  const hostMail = hostNotificationEmail(booking, 'diana@example.com');
  check('host email has no "Invalid Date"', !hostMail.text.includes('Invalid Date'));

  // 6) HTML escaping of guest input
  const evil = { ...booking, guest_first_name: '<script>x</script>', guest_last_name: 'T' } as BookingRow;
  const evilMail = guestConfirmationEmail(evil, cfg);
  check('guest name is HTML-escaped in email', !evilMail.html.includes('<script>x</script>') && evilMail.html.includes('&lt;script&gt;'));

  await sql`delete from bookings where reference = ${REF}`;
  console.log(failures === 0 ? '\nBooking flow OK.' : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
