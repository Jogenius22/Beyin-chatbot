--  RUN 1st
create extension vector;

-- RUN 2nd
create table pg (
  id bigserial primary key,
  content text,
  embedding vector (1536)
);

-- RUN 3rd after running the scripts
create or replace function pg_search (
  query_embedding vector(1536),
  similarity_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    pg.id,
    pg.content,
    1 - (pg.embedding <=> query_embedding) as similarity
  from pg
  where 1 - (pg.embedding <=> query_embedding) > similarity_threshold
  order by pg.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- RUN 4th
create index on pg 
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);