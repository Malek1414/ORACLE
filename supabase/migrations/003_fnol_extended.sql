-- Migration 003: Extended FNOL + AI extraction fields
-- Run in Supabase SQL editor after migrations 001 and 002.
-- These are additive-only columns; no existing columns are modified.

ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS fnol_submitted_at      timestamptz,
  ADD COLUMN IF NOT EXISTS fnol_status            text DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS fnol_field_map_version text,
  ADD COLUMN IF NOT EXISTS damage_zones_a         jsonb,
  ADD COLUMN IF NOT EXISTS damage_zones_b         jsonb,
  ADD COLUMN IF NOT EXISTS vehicle_a_heading      text,
  ADD COLUMN IF NOT EXISTS vehicle_b_heading      text,
  ADD COLUMN IF NOT EXISTS incident_road_type     text,
  ADD COLUMN IF NOT EXISTS incident_circumstances jsonb;
