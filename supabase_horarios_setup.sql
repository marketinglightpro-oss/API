-- ====================================================================
-- MÓDULO DE HORARIOS — LIGHT PRO
-- Script de Creación y Configuración para Supabase
-- ====================================================================

-- 1. Tabla de Configuración de Horarios de Referencia Semanal
CREATE TABLE IF NOT EXISTS public.schedules_config (
  id SERIAL PRIMARY KEY,
  day_of_week INTEGER NOT NULL UNIQUE CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Domingo, 1=Lunes, ..., 6=Sábado
  day_name TEXT NOT NULL,
  is_workday BOOLEAN NOT NULL DEFAULT true,
  start_time TIME WITHOUT TIME ZONE,
  end_time TIME WITHOUT TIME ZONE,
  reference_hours NUMERIC(4, 2) NOT NULL DEFAULT 9.0,
  lunch_break_minutes INTEGER NOT NULL DEFAULT 60,
  min_hours_for_lunch NUMERIC(4, 2) NOT NULL DEFAULT 5.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Semilla de Configuración de Horarios de Light Pro
INSERT INTO public.schedules_config (day_of_week, day_name, is_workday, start_time, end_time, reference_hours, lunch_break_minutes, min_hours_for_lunch)
VALUES
  (1, 'Lunes', true, '08:00:00', '18:00:00', 9.0, 60, 5.0),
  (2, 'Martes', true, '08:00:00', '18:00:00', 9.0, 60, 5.0),
  (3, 'Miércoles', true, '09:00:00', '18:00:00', 9.0, 60, 5.0),
  (4, 'Jueves', true, '09:00:00', '18:00:00', 9.0, 60, 5.0),
  (5, 'Viernes', true, '09:00:00', '18:00:00', 9.0, 60, 5.0),
  (6, 'Sábado', false, NULL, NULL, 0.0, 0, 0.0), -- Todo se liquida como hora extra
  (0, 'Domingo', false, NULL, NULL, 0.0, 0, 0.0) -- Todo se liquida como dominical/festivo
ON CONFLICT (day_of_week) DO UPDATE SET
  day_name = EXCLUDED.day_name,
  is_workday = EXCLUDED.is_workday,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  reference_hours = EXCLUDED.reference_hours,
  lunch_break_minutes = EXCLUDED.lunch_break_minutes,
  min_hours_for_lunch = EXCLUDED.min_hours_for_lunch;

-- 2. Tabla de Tarifas de Horas Extras
CREATE TABLE IF NOT EXISTS public.overtime_rates_config (
  id SERIAL PRIMARY KEY,
  rate_code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  hourly_rate NUMERIC(10, 2) NOT NULL,
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  end_time TIME WITHOUT TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Semilla de Tarifas Oficiales de Horas Extras (Light Pro)
INSERT INTO public.overtime_rates_config (rate_code, description, hourly_rate, start_time, end_time, is_active)
VALUES
  ('daytime_ot_weekday', 'Hora Extra Diurna (Lunes a Viernes)', 8088.00, '06:00:00', '19:00:00', true),
  ('nighttime_ot_weekday', 'Hora Extra Nocturna (Lunes a Viernes)', 11323.00, '19:00:00', '06:00:00', true),
  ('daytime_ot_saturday', 'Hora Extra Diurna (Sábado)', 8088.00, '06:00:00', '19:00:00', true),
  ('nighttime_ot_saturday', 'Hora Extra Nocturna (Sábado)', 11323.00, '19:00:00', '06:00:00', true),
  ('daytime_ot_sunday_holiday', 'Hora Extra Diurna (Domingos y Festivos)', 11647.00, '06:00:00', '19:00:00', true),
  ('nighttime_ot_sunday_holiday', 'Hora Extra Nocturna (Domingos y Festivos)', 13911.00, '19:00:00', '06:00:00', true)
ON CONFLICT (rate_code) DO UPDATE SET
  description = EXCLUDED.description,
  hourly_rate = EXCLUDED.hourly_rate,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  is_active = EXCLUDED.is_active;

-- 3. Tabla Principal de Asistencia y Marcaciones
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  check_in_photo_url TEXT,
  check_in_location TEXT DEFAULT 'Sede Light Pro',
  check_in_lat NUMERIC(10, 7),
  check_in_lng NUMERIC(10, 7),
  check_out_time TIMESTAMPTZ,
  check_out_photo_url TEXT,
  check_out_location TEXT,
  check_out_lat NUMERIC(10, 7),
  check_out_lng NUMERIC(10, 7),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled', 'adjusted')),
  gross_minutes INTEGER DEFAULT 0,
  lunch_break_minutes INTEGER DEFAULT 0,
  effective_minutes INTEGER DEFAULT 0,
  reference_minutes INTEGER DEFAULT 540, -- 9 horas = 540 minutos
  balance_minutes INTEGER DEFAULT 0, -- Diferencia (+ o -) frente a reference_minutes
  compensated_minutes INTEGER DEFAULT 0, -- Minutos usados para saldar déficit previo
  extra_daytime_minutes INTEGER DEFAULT 0,
  extra_nighttime_minutes INTEGER DEFAULT 0,
  extra_sunday_holiday_day_minutes INTEGER DEFAULT 0,
  extra_sunday_holiday_night_minutes INTEGER DEFAULT 0,
  extra_money_amount NUMERIC(12, 2) DEFAULT 0.00,
  review_status TEXT NOT NULL DEFAULT 'normal' CHECK (review_status IN ('normal', 'pending_review', 'approved', 'rejected')),
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Asegurar columnas de GPS y Ubicación si la tabla ya existía
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_in_location TEXT DEFAULT 'Sede Light Pro';
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_in_lat NUMERIC(10, 7);
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_in_lng NUMERIC(10, 7);
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_out_location TEXT;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_out_lat NUMERIC(10, 7);
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_out_lng NUMERIC(10, 7);
ALTER TABLE public.attendance_records ALTER COLUMN check_in_photo_url DROP NOT NULL;

-- Constraint atómico: Solo una sesión 'open' permitida por usuario simultáneamente
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_single_open_session
  ON public.attendance_records(user_id)
  WHERE status = 'open';

-- 4. Tabla de Auditoría y Correcciones Manuales
CREATE TABLE IF NOT EXISTS public.attendance_corrections_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES public.attendance_records(id) ON DELETE CASCADE,
  adjusted_by_id UUID REFERENCES auth.users(id),
  adjusted_by_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Tabla de Días Festivos Oficiales (Colombia)
CREATE TABLE IF NOT EXISTS public.colombian_holidays (
  id SERIAL PRIMARY KEY,
  holiday_date DATE NOT NULL UNIQUE,
  holiday_name TEXT NOT NULL,
  year INTEGER NOT NULL
);

-- Festivos de Colombia 2026 / 2027 de muestra
INSERT INTO public.colombian_holidays (holiday_date, holiday_name, year) VALUES
  ('2026-01-01', 'Año Nuevo', 2026),
  ('2026-01-12', 'Día de los Reyes Magos', 2026),
  ('2026-03-23', 'Día de San José', 2026),
  ('2026-04-02', 'Jueves Santo', 2026),
  ('2026-04-03', 'Viernes Santo', 2026),
  ('2026-05-01', 'Día del Trabajo', 2026),
  ('2026-05-18', 'Ascensión del Señor', 2026),
  ('2026-06-08', 'Corpus Christi', 2026),
  ('2026-06-15', 'Sagrado Corazón', 2026),
  ('2026-06-29', 'San Pedro y San Pablo', 2026),
  ('2026-07-20', 'Día de la Independencia', 2026),
  ('2026-08-07', 'Batalla de Boyacá', 2026),
  ('2026-08-17', 'La Asunción de la Virgen', 2026),
  ('2026-10-12', 'Día de la Raza', 2026),
  ('2026-11-02', 'Todos los Santos', 2026),
  ('2026-11-16', 'Independencia de Cartagena', 2026),
  ('2026-12-08', 'Inmaculada Concepción', 2026),
  ('2026-12-25', 'Navidad', 2026)
ON CONFLICT (holiday_date) DO NOTHING;

-- 6. Habilitar RLS en las nuevas tablas
ALTER TABLE public.schedules_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overtime_rates_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_corrections_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colombian_holidays ENABLE ROW LEVEL SECURITY;

-- Políticas para schedules_config y overtime_rates_config (Lectura para todos los autenticados, modificación solo admins)
DROP POLICY IF EXISTS "Lectura publica horarios" ON public.schedules_config;
CREATE POLICY "Lectura publica horarios" ON public.schedules_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lectura publica tarifas" ON public.overtime_rates_config;
CREATE POLICY "Lectura publica tarifas" ON public.overtime_rates_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lectura publica festivos" ON public.colombian_holidays;
CREATE POLICY "Lectura publica festivos" ON public.colombian_holidays FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin modifica horarios" ON public.schedules_config;
CREATE POLICY "Admin modifica horarios" ON public.schedules_config FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "Admin modifica tarifas" ON public.overtime_rates_config;
CREATE POLICY "Admin modifica tarifas" ON public.overtime_rates_config FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Políticas RLS estrictas para attendance_records:
-- Los colaboradores comunes solo pueden ver sus propios registros
DROP POLICY IF EXISTS "Colaborador lee sus propios registros" ON public.attendance_records;
CREATE POLICY "Colaborador lee sus propios registros" ON public.attendance_records
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Los colaboradores pueden registrar su entrada
DROP POLICY IF EXISTS "Colaborador registra su entrada" ON public.attendance_records;
CREATE POLICY "Colaborador registra su entrada" ON public.attendance_records
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Los colaboradores solo pueden actualizar su registro activo (marcar salida)
DROP POLICY IF EXISTS "Colaborador actualiza su registro activo" ON public.attendance_records;
CREATE POLICY "Colaborador actualiza su registro activo" ON public.attendance_records
  FOR UPDATE USING (
    (auth.uid() = user_id AND status = 'open') OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Políticas para attendance_corrections_log
DROP POLICY IF EXISTS "Lectura de logs por admin y colaborador propio" ON public.attendance_corrections_log;
CREATE POLICY "Lectura de logs por admin y colaborador propio" ON public.attendance_corrections_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Admin inserta log de correcion" ON public.attendance_corrections_log;
CREATE POLICY "Admin inserta log de correcion" ON public.attendance_corrections_log
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- 7. Bucket Privado para Fotos de Asistencia en Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance-photos', 'attendance-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Políticas de Storage para 'attendance-photos'
DROP POLICY IF EXISTS "Colaborador y Admin suben fotos de asistencia" ON storage.objects;
CREATE POLICY "Colaborador y Admin suben fotos de asistencia" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'attendance-photos' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    )
  );

DROP POLICY IF EXISTS "Colaborador y Admin leen fotos de asistencia" ON storage.objects;
CREATE POLICY "Colaborador y Admin leen fotos de asistencia" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'attendance-photos' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    )
  );

-- 8. Habilitar Supabase Realtime para sincronización instantánea entre PC y Celular
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'attendance_records'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
  END IF;
END $$;
