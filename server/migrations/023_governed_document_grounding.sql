-- Phase 8 completion: governed evidence storage and extracted text grounding.
-- Apply after 022. Additive and safe to rerun.

alter table documents add column if not exists storage_path text not null default '';
alter table documents add column if not exists mime_type text not null default '';
alter table documents add column if not exists byte_size bigint not null default 0;
alter table documents add column if not exists sha256 text not null default '';
alter table documents add column if not exists extraction_status text not null default 'not-requested'
  check (extraction_status in ('not-requested','processing','completed','empty','failed','unsupported'));
alter table documents add column if not exists extraction_error text not null default '';
alter table documents add column if not exists extracted_at timestamptz;

create table if not exists document_text_chunks (
  id text primary key,
  organisation_id text not null references organisations(id) on delete cascade,
  document_id text not null references documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  character_count integer not null,
  token_estimate integer not null,
  created_at timestamptz not null default now(),
  unique(document_id, chunk_index)
);

create index if not exists idx_document_chunks_org_doc on document_text_chunks(organisation_id,document_id,chunk_index);
create index if not exists idx_documents_org_extraction on documents(organisation_id,extraction_status,upload_date desc);
alter table document_text_chunks enable row level security;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('evidence','evidence',false,10485760,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','text/csv','text/markdown','application/json'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

