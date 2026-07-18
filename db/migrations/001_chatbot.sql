-- Chatbot / RAG schema (ported from the old Supabase project to Neon).
-- Idempotent: safe to run repeatedly via scripts/db-migrate.ts.
-- Differences to the Supabase original: no RLS/policies (Neon has a single
-- server-side role) and no search_documents() function (the vector search is
-- a plain query in lib/rag/retrieval.ts).

create extension if not exists vector;

create table if not exists documents (
  id bigserial primary key,
  content text not null,
  source text not null,
  embedding vector(1536),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists documents_embedding_idx
  on documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  locale text default 'en',
  guest_name text,
  guest_email text,
  apartment text check (apartment is null or apartment in ('HEART1','HEART2','HEART3','HEART4','HEART5'))
);

create index if not exists idx_chat_sessions_apartment on chat_sessions(apartment);

create table if not exists chat_messages (
  id bigserial primary key,
  session_id uuid references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

create index if not exists chat_messages_session_idx on chat_messages(session_id);
