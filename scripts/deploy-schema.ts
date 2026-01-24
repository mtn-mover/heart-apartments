import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function deploySchema() {
  console.log('Deploying schema to Supabase...\n');

  const statements = [
    // Enable pgvector extension
    `create extension if not exists vector`,

    // Documents table
    `create table if not exists documents (
      id bigserial primary key,
      content text not null,
      source text not null,
      embedding vector(1536),
      metadata jsonb default '{}',
      created_at timestamp with time zone default now()
    )`,

    // Chat sessions table
    `create table if not exists chat_sessions (
      id uuid primary key default gen_random_uuid(),
      created_at timestamp with time zone default now(),
      locale text default 'en',
      guest_name text,
      guest_email text
    )`,

    // Chat messages table
    `create table if not exists chat_messages (
      id bigserial primary key,
      session_id uuid references chat_sessions(id) on delete cascade,
      role text not null check (role in ('user', 'assistant')),
      content text not null,
      created_at timestamp with time zone default now()
    )`,

    // Search function
    `create or replace function search_documents(
      query_embedding vector(1536),
      match_threshold float default 0.7,
      match_count int default 5
    )
    returns table (
      id bigint,
      content text,
      source text,
      similarity float
    )
    language plpgsql
    as $$
    begin
      return query
      select
        documents.id,
        documents.content,
        documents.source,
        1 - (documents.embedding <=> query_embedding) as similarity
      from documents
      where 1 - (documents.embedding <=> query_embedding) > match_threshold
      order by documents.embedding <=> query_embedding
      limit match_count;
    end;
    $$`,
  ];

  for (const sql of statements) {
    const shortSql = sql.substring(0, 50).replace(/\s+/g, ' ').trim();
    console.log(`Running: ${shortSql}...`);

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try alternative method - direct query
      console.log(`  Note: ${error.message}`);
    } else {
      console.log(`  ✓ Success`);
    }
  }

  console.log('\nSchema deployment attempted.');
  console.log('If you see errors, please run the SQL manually in Supabase SQL Editor.');
}

deploySchema().catch(console.error);
