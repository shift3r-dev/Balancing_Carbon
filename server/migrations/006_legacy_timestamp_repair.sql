-- Repair migration for databases that had Balancing Carbon tables before 000_base_schema.sql.
-- Run once, then rerun 003_demo_seed.sql.

alter table organisations add column if not exists created_at timestamptz not null default now();
alter table organisations add column if not exists updated_at timestamptz not null default now();
alter table profiles add column if not exists created_at timestamptz not null default now();
alter table profiles add column if not exists updated_at timestamptz not null default now();
alter table facilities add column if not exists created_at timestamptz not null default now();
alter table facilities add column if not exists updated_at timestamptz not null default now();
alter table energy_records add column if not exists created_at timestamptz not null default now();
alter table energy_records add column if not exists updated_at timestamptz not null default now();
alter table esg_questions add column if not exists created_at timestamptz not null default now();
alter table esg_questions add column if not exists updated_at timestamptz not null default now();
alter table oem_questionnaires add column if not exists created_at timestamptz not null default now();
alter table oem_questionnaires add column if not exists updated_at timestamptz not null default now();
alter table documents add column if not exists created_at timestamptz not null default now();
alter table documents add column if not exists updated_at timestamptz not null default now();
alter table reports add column if not exists created_at timestamptz not null default now();
alter table reports add column if not exists updated_at timestamptz not null default now();
alter table ai_conversations add column if not exists created_at timestamptz not null default now();
alter table ai_conversations add column if not exists updated_at timestamptz not null default now();
