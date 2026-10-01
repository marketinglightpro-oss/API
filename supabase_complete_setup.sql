-- ====================================================================
-- LIGHTPRO BASE DE DATOS COMPLETA + SUPABASE STORAGE (TODO EN 1 CLIC)
-- Proyecto: LightPro API
-- Ejecutar este script en el SQL Editor de tu NUEVO proyecto Supabase
-- ====================================================================

-- 1. Crear Tabla Profiles (Vinculada a Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'super_admin',
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Crear Tabla Equipment (Fichas de Reparaciones y Activos)
CREATE TABLE IF NOT EXISTS public.equipment (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_phone TEXT,
  owner_email TEXT,
  issue TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Media',
  status TEXT NOT NULL DEFAULT 'received',
  technician_assigned TEXT,
  promised_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  photo_url TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  notes JSONB DEFAULT '[]'::jsonb,
  history JSONB DEFAULT '[]'::jsonb,
  brand TEXT DEFAULT 'Genérica',
  asset_status TEXT DEFAULT 'En reparación',
  inspection_checklist JSONB DEFAULT '{}'::jsonb,
  last_inspection_date TEXT,
  created_by TEXT
);

ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS promised_date TEXT;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS brand TEXT DEFAULT 'Genérica';
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS asset_status TEXT DEFAULT 'En reparación';
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS inspection_checklist JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS last_inspection_date TEXT;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS created_by TEXT;

-- 3. Crear Tabla Activity Logs (Auditoría)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_name TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL,
  equipment_id TEXT
);

ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS equipment_id TEXT;

-- 4. Habilitar Row Level Security (RLS) en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 5. Crear Políticas de Acceso RLS Abiertas
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert profiles" ON public.profiles;
CREATE POLICY "Public insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update profiles" ON public.profiles;
CREATE POLICY "Public update profiles" ON public.profiles FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public delete profiles" ON public.profiles;
CREATE POLICY "Public delete profiles" ON public.profiles FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public read equipment" ON public.equipment;
CREATE POLICY "Public read equipment" ON public.equipment FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert equipment" ON public.equipment;
CREATE POLICY "Public insert equipment" ON public.equipment FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update equipment" ON public.equipment;
CREATE POLICY "Public update equipment" ON public.equipment FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public delete equipment" ON public.equipment;
CREATE POLICY "Public delete equipment" ON public.equipment FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public read activity_logs" ON public.activity_logs;
CREATE POLICY "Public read activity_logs" ON public.activity_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert activity_logs" ON public.activity_logs;
CREATE POLICY "Public insert activity_logs" ON public.activity_logs FOR INSERT WITH CHECK (true);

-- 6. Trigger Automático para Creación de Perfiles de Usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'super_admin')
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7. Crear el Bucket Público 'equipment-images' en Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('equipment-images', 'equipment-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 8. Políticas RLS para Supabase Storage (Bucket 'equipment-images')
DROP POLICY IF EXISTS "Acceso Publico de Lectura para Imagenes" ON storage.objects;
CREATE POLICY "Acceso Publico de Lectura para Imagenes"
ON storage.objects FOR SELECT
USING (bucket_id = 'equipment-images');

DROP POLICY IF EXISTS "Insercion Autenticada de Imagenes" ON storage.objects;
CREATE POLICY "Insercion Autenticada de Imagenes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'equipment-images');

DROP POLICY IF EXISTS "Eliminacion de Imagenes" ON storage.objects;
CREATE POLICY "Eliminacion de Imagenes"
ON storage.objects FOR DELETE
USING (bucket_id = 'equipment-images');
