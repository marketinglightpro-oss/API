import { createClient } from '@supabase/supabase-js';

// Reads Environment Variables from Vite (.env or Vercel Environment Variables)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * SQL Schema script to create tables in Supabase SQL Editor:
 * 
 * -- 1. Equipment Table
 * create table public.equipment (
 *   id text primary key,
 *   name text not null,
 *   category text not null,
 *   serial_number text not null,
 *   owner_name text not null,
 *   owner_phone text,
 *   owner_email text,
 *   issue text not null,
 *   priority text not null default 'Media',
 *   status text not null default 'received',
 *   technician_assigned text,
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null,
 *   photo_url text,
 *   notes jsonb default '[]'::jsonb,
 *   history jsonb default '[]'::jsonb
 * );
 * 
 * -- 2. Activity Logs Table
 * create table public.activity_logs (
 *   id text primary key,
 *   timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
 *   user_name text not null,
 *   role text not null,
 *   action text not null,
 *   detail text not null
 * );
 * 
 * -- Enable RLS & Policies
 * alter table public.equipment enable row level security;
 * alter table public.activity_logs enable row level security;
 * 
 * create policy "Public read access for equipment" on public.equipment for select using (true);
 * create policy "Public write access for equipment" on public.equipment for insert with check (true);
 * create policy "Public update access for equipment" on public.equipment for update using (true);
 * create policy "Public delete access for equipment" on public.equipment for delete using (true);
 * 
 * create policy "Public read access for activity_logs" on public.activity_logs for select using (true);
 * create policy "Public write access for activity_logs" on public.activity_logs for insert with check (true);
 */
