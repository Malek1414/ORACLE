-- Migration 004: User profiles table + two demo accounts
-- Run in Supabase SQL editor after migrations 001-003.

CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username      text UNIQUE NOT NULL,
  password      text NOT NULL,
  name          text NOT NULL,
  email         text,
  phone         text,
  dob           text,
  address       text,
  policy_number text,
  insurer       text,
  licence_plate text,
  vehicle_make  text,
  vehicle_model text,
  vehicle_year  text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- Demo account 1
INSERT INTO public.profiles
  (username, password, name, email, phone, dob, address, policy_number, insurer, licence_plate, vehicle_make, vehicle_model, vehicle_year)
VALUES
  ('malek', 'oracle123',
   'Malek Hassan',
   'malek.korashi@gmail.com',
   '+1 212 555 0101',
   '15/04/1995',
   '123 Fifth Avenue, New York, NY 10001',
   'AZ-2024-8841',
   'Allianz',
   'MK22 BMW',
   'BMW',
   '330i',
   '2022')
ON CONFLICT (username) DO NOTHING;

-- Demo account 2
INSERT INTO public.profiles
  (username, password, name, email, phone, dob, address, policy_number, insurer, licence_plate, vehicle_make, vehicle_model, vehicle_year)
VALUES
  ('sarah', 'oracle123',
   'Sarah Mitchell',
   'sarah.mitchell@demo.oracle',
   '+1 212 555 0202',
   '22/08/1990',
   '456 Park Avenue, New York, NY 10022',
   'AX-2024-4492',
   'AXA Insurance',
   'SM21 TYT',
   'Toyota',
   'Corolla',
   '2021')
ON CONFLICT (username) DO NOTHING;
