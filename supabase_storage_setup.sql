-- ====================================================================
-- FASE 1: CONFIGURACIÓN DE SUPABASE STORAGE Y LIMPIEZA DE BASE64
-- Proyecto: LightPro API
-- Ejecutar en el SQL Editor de Supabase (https://supabase.com/dashboard)
-- ====================================================================

-- 1. Crear el bucket público 'equipment-images' en Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('equipment-images', 'equipment-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Configurar Políticas RLS para el Bucket 'equipment-images'

-- 2.1 Permitir LECTURA PÚBLICA (SELECT) de imágenes
DROP POLICY IF EXISTS "Acceso Publico de Lectura para Imagenes" ON storage.objects;
CREATE POLICY "Acceso Publico de Lectura para Imagenes"
ON storage.objects FOR SELECT
USING (bucket_id = 'equipment-images');

-- 2.2 Permitir INSERCIÓN (INSERT) a usuarios autenticados y acceso público si no requiere Auth estricto
DROP POLICY IF EXISTS "Insercion Autenticada de Imagenes" ON storage.objects;
CREATE POLICY "Insercion Autenticada de Imagenes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'equipment-images');

-- 2.3 Permitir ELIMINACIÓN (DELETE) de imágenes
DROP POLICY IF EXISTS "Eliminacion de Imagenes" ON storage.objects;
CREATE POLICY "Eliminacion de Imagenes"
ON storage.objects FOR DELETE
USING (bucket_id = 'equipment-images');

-- ====================================================================
-- 3. SCRIPT DE LIMPIEZA: Vaciar imágenes Base64 pesadas en PostgreSQL
-- Libera espacio en la tabla equipment sustituyendo cadenas data:image por NULL o []
-- ====================================================================

-- 3.1 Limpiar photo_url que contenga Base64
UPDATE public.equipment
SET photo_url = NULL
WHERE photo_url LIKE 'data:image%';

-- 3.2 Limpiar photos JSONB que contenga Base64
UPDATE public.equipment
SET photos = '[]'::jsonb
WHERE photos::text LIKE '%data:image%';
