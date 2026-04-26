-- ORACLE claims table
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run

create table if not exists public.claims (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Identity
  "user"            jsonb not null,

  -- Incident
  incident          jsonb,

  -- Voice / audio
  voice             jsonb,

  -- Photos
  photos            jsonb,

  -- Multimodal analysis (Gemini)
  damage_analysis   jsonb,

  -- Environmental (Tavily)
  environmental     jsonb,

  -- Market pricing (Tavily)
  market_data       jsonb,

  -- Fraud / confidence (Pioneer)
  fraud_assessment  jsonb,

  -- Processing state
  status            text not null default 'recording',
  processing_steps  jsonb not null default '{}',

  -- Resolution
  resolution        jsonb
);

-- Row Level Security
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'claims' and policyname = 'service role full access'
  ) then
    create policy "service role full access"
      on public.claims for all using (true) with check (true);
  end if;
 end $$;
