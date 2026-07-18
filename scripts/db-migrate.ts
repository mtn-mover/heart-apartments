/**
 * Apply db/migrations/*.sql (in filename order) to the Neon database.
 * Migrations are idempotent (create if not exists / drop-then-create triggers),
 * so rerunning the whole set is always safe.
 *
 * Uses psql over DATABASE_URL_UNPOOLED (multi-statement DDL); falls back to
 * the Homebrew postgresql@17 client if psql is not on PATH.
 *
 * Run: npx tsx scripts/db-migrate.ts
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Missing DATABASE_URL_UNPOOLED / DATABASE_URL');
  process.exit(1);
}

const brewPsql = '/opt/homebrew/opt/postgresql@17/bin/psql';
let psql = 'psql';
try {
  execFileSync('psql', ['--version'], { stdio: 'ignore' });
} catch {
  if (existsSync(brewPsql)) {
    psql = brewPsql;
  } else {
    console.error('psql not found (install: brew install postgresql@17)');
    process.exit(1);
  }
}

const dir = path.join(process.cwd(), 'db', 'migrations');
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

for (const file of files) {
  console.log(`== ${file} ==`);
  execFileSync(psql, [url, '-v', 'ON_ERROR_STOP=1', '-q', '-f', path.join(dir, file)], {
    stdio: 'inherit',
    env: { ...process.env, LC_ALL: 'en_US.UTF-8' },
  });
  console.log('OK');
}

console.log('\nAll migrations applied.');
