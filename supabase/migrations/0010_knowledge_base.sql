-- ============================================================================
-- RAG knowledge base for in-platform chatbots (vidensbase).
--
-- WHY: in-platform widgets answer only from their static system prompt. This adds
-- a per-widget knowledge base: a customer attaches sources (a website crawl, pasted
-- text, or uploaded files), we chunk + embed the content, and the chat engine
-- retrieves the top-k relevant chunks and injects them into the system prompt at
-- query time (see lib/rag/* and the Branch-C handlers respond-stream/respond-v2).
--
-- MODEL: `documents` = one source per row (org- + widget-scoped) with an ingestion
-- status. `document_chunks` = the embedded slices (pgvector). Ingestion is driven
-- by a resumable worker (lib/rag/worker.js): documents move
-- pending|crawling → processing → ready, and chunks are embedded in batches.
--
-- EMBEDDINGS: openai/text-embedding-3-small via the AI Gateway → 1536 dims. The
-- vector(1536) width below MUST match lib/ai/models.js EMBEDDING_DIMENSIONS.
--
-- RETRIEVAL: match_document_chunks() does the cosine-similarity search server-side
-- (the supabase-js client can't express the <=> operator). Called via
-- admin.rpc('match_document_chunks', { ... }) from lib/rag/retrieve.js.
--
-- RLS: enabled with no policies (deny-by-default), consistent with 0007/0009. The
-- service-role client (lib/supabase/admin.js) has BYPASSRLS and keeps working.
-- ============================================================================

create extension if not exists vector;

-- One knowledge source per row (website crawl, pasted text, or uploaded file).
create table documents (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations (id) on delete cascade,
  widget_id         uuid not null references widgets (id) on delete cascade,
  source_type       text not null,                       -- 'website' | 'text' | 'file'
  title             text,
  source_url        text,                                -- crawl root (website) / null
  status            text not null default 'pending',     -- pending|crawling|processing|ready|failed
  firecrawl_job_id  text,                                -- async crawl job (website)
  crawl_cursor      text,                                -- getCrawlStatus pagination cursor
  raw_content       text,                                -- extracted source text (text/file)
  storage_path      text,                                -- Supabase Storage path (file original)
  error             text,                                -- last failure reason
  chunk_count       integer not null default 0,
  metadata          jsonb not null default '{}'::jsonb,  -- { pageCount, fileName, mime, ... }
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index documents_widget_idx on documents (widget_id);
create index documents_org_idx    on documents (organization_id);
create index documents_status_idx on documents (status);
create trigger documents_set_updated_at
  before update on documents
  for each row execute function set_updated_at();

-- Embedded slices of a document. embedding is null until the worker fills it in.
create table document_chunks (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid not null references documents (id) on delete cascade,
  widget_id       uuid not null references widgets (id) on delete cascade,        -- denormalized for retrieval
  organization_id uuid not null references organizations (id) on delete cascade,  -- denormalized for isolation
  chunk_index     integer not null,
  content         text not null,
  token_count     integer,
  embedding       vector(1536),                         -- openai/text-embedding-3-small
  metadata        jsonb not null default '{}'::jsonb,   -- { sourceUrl, pageTitle, ... }
  created_at      timestamptz not null default now()
);
create index document_chunks_doc_idx    on document_chunks (document_id);
create index document_chunks_widget_idx on document_chunks (widget_id);
-- Worker queue: chunks still awaiting an embedding.
create index document_chunks_pending_idx on document_chunks (document_id) where embedding is null;
-- Approximate nearest-neighbour search (cosine). HNSW indexes only non-null rows.
create index document_chunks_embedding_idx
  on document_chunks using hnsw (embedding vector_cosine_ops);

-- ----------------------------------------------------------------------------
-- match_document_chunks(widget, query_embedding, match_count, min_similarity)
-- Top-k cosine-similarity search over a single widget's ready chunks.
-- Call: admin.rpc('match_document_chunks', { p_widget_id, p_query_embedding, ... })
-- ----------------------------------------------------------------------------
create or replace function match_document_chunks(
  p_widget_id       uuid,
  p_query_embedding vector(1536),
  p_match_count     int default 5,
  p_min_similarity  float default 0.0
)
returns table (
  id          uuid,
  document_id uuid,
  content     text,
  similarity  float,
  metadata    jsonb
)
language sql
stable
as $$
  select
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> p_query_embedding) as similarity,
    dc.metadata
  from document_chunks dc
  where dc.widget_id = p_widget_id
    and dc.embedding is not null
    and 1 - (dc.embedding <=> p_query_embedding) >= p_min_similarity
  order by dc.embedding <=> p_query_embedding
  limit greatest(p_match_count, 1);
$$;

-- Per-widget knowledge-base binding: { enabled: bool, topK: int }.
alter table widgets
  add column if not exists knowledge_base jsonb not null default '{}'::jsonb;

-- Deny-by-default RLS (consistent with 0007/0009; service-role bypasses).
alter table documents       enable row level security;
alter table document_chunks enable row level security;
