/**
 * Verifies the DB-backed fixed-window rate limiter against Neon:
 * allows up to the limit, blocks beyond it, resets after the window.
 *
 * Run: npx tsx scripts/test-rate-limit.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getSql } from '../lib/db';
import { rateLimit } from '../lib/rate-limit';

const sql = getSql();

function fakeReq(ip: string): Request {
  return new Request('http://localhost/test', { headers: { 'x-forwarded-for': ip } });
}

let failures = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? '✅' : '❌'} ${name}`);
  if (!cond) failures++;
}

async function main() {
  const bucket = `test-${Date.now() % 100000}`;
  await sql`delete from rate_limits where key like ${'test-%'}`;

  // 3 allowed, 4th blocked (limit 3, window 2s)
  const results: boolean[] = [];
  for (let i = 0; i < 4; i++) {
    results.push(await rateLimit(bucket, fakeReq('1.2.3.4'), 3, 2));
  }
  check('requests within limit allowed', results[0] && results[1] && results[2]);
  check('request over limit blocked', results[3] === false);

  // Different IP unaffected
  check('other IP unaffected', await rateLimit(bucket, fakeReq('5.6.7.8'), 3, 2));

  // Window reset
  await new Promise((r) => setTimeout(r, 2200));
  check('window reset allows again', await rateLimit(bucket, fakeReq('1.2.3.4'), 3, 2));

  await sql`delete from rate_limits where key like ${'test-%'}`;
  console.log(failures === 0 ? '\nRate limiter OK.' : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
