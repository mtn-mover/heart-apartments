-- ===========================================
-- Little Heart Guesthouse - Chatbot Schema
-- ===========================================
-- Run this in Supabase SQL Editor to set up the database

-- Enable pgvector extension for embeddings
create extension if not exists vector;

-- ===========================================
-- Documents table for RAG
-- ===========================================
create table if not exists documents (
  id bigserial primary key,
  content text not null,
  source text not null,
  embedding vector(1536),
  metadata jsonb default '{}',
  created_at timestamp with time zone default now()
);

-- Create index for fast similarity search
create index if not exists documents_embedding_idx
  on documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ===========================================
-- Chat Sessions table
-- ===========================================
create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  locale text default 'en',
  guest_name text,
  guest_email text
);

-- ===========================================
-- Chat Messages table
-- ===========================================
create table if not exists chat_messages (
  id bigserial primary key,
  session_id uuid references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default now()
);

-- Index for faster message retrieval
create index if not exists chat_messages_session_idx
  on chat_messages(session_id);

-- ===========================================
-- Vector Search Function
-- ===========================================
create or replace function search_documents(
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
$$;

-- ===========================================
-- Row Level Security (optional but recommended)
-- ===========================================
-- Enable RLS
alter table documents enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;

-- Allow all operations for authenticated service role
-- (API routes use service key)
create policy "Service role can do everything on documents"
  on documents for all
  using (true)
  with check (true);

create policy "Service role can do everything on chat_sessions"
  on chat_sessions for all
  using (true)
  with check (true);

create policy "Service role can do everything on chat_messages"
  on chat_messages for all
  using (true)
  with check (true);

-- ===========================================
-- Helpful queries
-- ===========================================

-- Count documents
-- select count(*) from documents;

-- View recent chat sessions
-- select * from chat_sessions order by created_at desc limit 10;

-- View messages for a session
-- select * from chat_messages where session_id = 'your-session-id' order by created_at;

-- Test similarity search (replace with actual embedding)
-- select * from search_documents('[0.1, 0.2, ...]'::vector, 0.5, 10);
