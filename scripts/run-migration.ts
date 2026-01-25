/**
 * Run database migration to add apartment column
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Create admin client with service key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running migration: Add apartment column to chat_sessions...\n');

  // Check if column already exists by trying to select it
  const { data: testData, error: testError } = await supabase
    .from('chat_sessions')
    .select('apartment')
    .limit(1);

  if (!testError) {
    console.log('✅ Column "apartment" already exists in chat_sessions table.');
    console.log('Migration already applied - nothing to do.\n');
    return;
  }

  if (testError && !testError.message.includes('apartment')) {
    console.error('Unexpected error:', testError);
    return;
  }

  // Column doesn't exist - we need to add it via SQL
  // Unfortunately, Supabase JS client doesn't support DDL directly
  // We need to use the SQL Editor in Supabase Dashboard

  console.log('❌ Column "apartment" does not exist yet.\n');
  console.log('Please run the following SQL in Supabase Dashboard → SQL Editor:\n');
  console.log('='.repeat(60));
  console.log(`
-- Add apartment column to chat_sessions
ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS apartment TEXT;

-- Add check constraint for valid values
ALTER TABLE chat_sessions
ADD CONSTRAINT valid_apartment
CHECK (apartment IS NULL OR apartment IN ('HEART1', 'HEART2', 'HEART3', 'HEART4', 'HEART5'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chat_sessions_apartment ON chat_sessions(apartment);
`);
  console.log('='.repeat(60));
  console.log('\nOr go directly to:');
  console.log(`${supabaseUrl.replace('.co', '.co/project/')}/sql/new\n`);
}

runMigration().catch(console.error);
