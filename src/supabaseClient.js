import { createClient } from '@supabase/supabase-js';

// Reads Environment Variables from Vite (.env or Vercel Environment Variables)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nqiiwijmqbucgttluhil.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xaWl3aWptcWJ1Y2d0dGx1aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NTg4OTgsImV4cCI6MjEwNjQzNDg5OH0.Y7U3finEhRHJb_3qH3HlvXfWB1J5zjKa7XcSN6f_EN4';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Uploads an image (File or Base64 string) to Supabase Storage bucket 'equipment-images'
 * and returns the public CDN URL string.
 */
export const uploadImageToSupabaseStorage = async (fileOrBase64, prefix = 'img') => {
  if (!supabase) return null;
  try {
    let blob;
    if (typeof fileOrBase64 === 'string') {
      if (fileOrBase64.startsWith('http://') || fileOrBase64.startsWith('https://')) {
        // Already a public URL
        return fileOrBase64;
      }
      if (fileOrBase64.startsWith('data:')) {
        const response = await fetch(fileOrBase64);
        blob = await response.blob();
      } else {
        return null;
      }
    } else if (fileOrBase64 instanceof File || fileOrBase64 instanceof Blob) {
      blob = fileOrBase64;
    } else {
      return null;
    }

    const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.jpg`;
    const filePath = `equipment/${fileName}`;

    const { data, error } = await supabase.storage
      .from('equipment-images')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('Error subiendo imagen a Supabase Storage:', error);
      // If storage error occurs, return original base64 as fallback so photo isn't lost
      return typeof fileOrBase64 === 'string' ? fileOrBase64 : null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('equipment-images')
      .getPublicUrl(filePath);

    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.error('Error general al subir a Storage:', err);
    return typeof fileOrBase64 === 'string' ? fileOrBase64 : null;
  }
};

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
