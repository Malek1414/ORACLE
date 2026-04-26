-- Migration 002: FNOL + Roadside Assistance fields
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS dob             text,
  ADD COLUMN IF NOT EXISTS address         text,
  ADD COLUMN IF NOT EXISTS phone           text,
  ADD COLUMN IF NOT EXISTS licence_plate   text,
  ADD COLUMN IF NOT EXISTS vehicle_make    text,
  ADD COLUMN IF NOT EXISTS vehicle_model   text,
  ADD COLUMN IF NOT EXISTS vehicle_year    text,
  ADD COLUMN IF NOT EXISTS photos_pending  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS fnol_submitted  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS fnol_pdf_url    text,
  ADD COLUMN IF NOT EXISTS other_driver    jsonb,
  ADD COLUMN IF NOT EXISTS witnesses       jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS police_report   jsonb,
  ADD COLUMN IF NOT EXISTS signature_data_url text;
