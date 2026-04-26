-- ORACLE Claims Table
-- Run this in your Supabase SQL editor or via supabase migration

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- User identity
  "user" jsonb not null default '{}'::jsonb,

  -- Incident details
  incident jsonb,

  -- Voice / audio analysis
  voice jsonb,

  -- Photos
  photos jsonb,

  -- Multimodal damage analysis (Gemini)
  damage_analysis jsonb,

  -- Environmental data (Tavily)
  environmental jsonb,

  -- Market pricing data (Tavily)
  market_data jsonb,

  -- Fraud assessment (Pioneer)
  fraud_assessment jsonb,

  -- Processing state
  status text not null default 'idle'
    check (status in ('idle','recording','enhancing','transcribing','analyzing','fetching_context','scoring','approved','escalated','rejected')),

  processing_steps jsonb not null default '{
    "audio_received": false,
    "audio_enhanced": false,
    "transcript_ready": false,
    "photos_analyzed": false,
    "weather_fetched": false,
    "pricing_fetched": false,
    "fraud_scored": false,
    "report_delivered": false
  }'::jsonb,

  -- Resolution
  resolution jsonb
);

-- Enable real-time replication
alter table public.claims replica identity full;

-- Index for dashboard queries
create index if not exists claims_created_at_idx on public.claims (created_at desc);
create index if not exists claims_status_idx on public.claims (status);

-- Auto-update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.claims;
create trigger set_updated_at
  before update on public.claims
  for each row execute function update_updated_at_column();

-- Enable RLS (open for now — lock down in production)
alter table public.claims enable row level security;
create policy "allow_all" on public.claims for all using (true) with check (true);

-- Add claims table to Supabase realtime publication
alter publication supabase_realtime add table public.claims;
