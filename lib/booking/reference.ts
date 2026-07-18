import { randomInt } from 'node:crypto';

// No O/0/I/1 — references get read aloud on the phone and typed by guests.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Booking reference like 'LH-A7K3XQ'. Collisions are handled by the unique
 *  constraint on bookings.reference (caller retries with a fresh one). */
export function generateReference(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `LH-${code}`;
}
