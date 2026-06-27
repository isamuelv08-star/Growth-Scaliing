-- ==========================================================
-- SUPABASE POSTGRESQL SCHEMA FOR GROWTH PARTNER PORTAL
-- ==========================================================
-- Instrucciones:
-- 1. Ve a tu panel de Supabase (https://supabase.com).
-- 2. Abre la sección "SQL Editor" en el menú lateral izquierdo.
-- 3. Crea un "New Query" y pega todo este código.
-- 4. Haz clic en "Run" (Ejecutar) en la esquina inferior derecha.
-- ==========================================================

-- Crear la tabla de tableros de socios
CREATE TABLE IF NOT EXISTS public.client_boards (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  industry TEXT NOT NULL,
  current_month INTEGER NOT NULL DEFAULT 1,
  status_message TEXT NOT NULL,
  kpis JSONB NOT NULL,
  sales_history JSONB NOT NULL DEFAULT '[]'::JSONB,
  leads_history JSONB NOT NULL DEFAULT '[]'::JSONB,
  log_entries JSONB NOT NULL DEFAULT '[]'::JSONB,
  next_steps JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Habilitar seguridad de nivel de fila (Row Level Security - RLS)
ALTER TABLE public.client_boards ENABLE ROW LEVEL SECURITY;

-- Crear políticas de acceso libre para facilitar el desarrollo inicial
CREATE POLICY "Permitir lectura pública a cualquiera" 
  ON public.client_boards FOR SELECT 
  USING (true);

CREATE POLICY "Permitir inserción y actualización pública" 
  ON public.client_boards FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Agregar algunos comentarios útiles para documentar la estructura
COMMENT ON TABLE public.client_boards IS 'Tabla para almacenar los reportes interactivos de los socios de crecimiento.';
COMMENT ON COLUMN public.client_boards.kpis IS 'Valores KPI de Ventas, Leads, CPL y ROAS formateados como objeto JSON.';
COMMENT ON COLUMN public.client_boards.sales_history IS 'Arreglo JSON con los puntos del gráfico histórico de ventas.';
COMMENT ON COLUMN public.client_boards.leads_history IS 'Arreglo JSON con los puntos del gráfico histórico de leads.';
COMMENT ON COLUMN public.client_boards.log_entries IS 'Bitácora de acciones y registros cronológicos de optimización.';
COMMENT ON COLUMN public.client_boards.next_steps IS 'Lista secuencial de siguientes hitos acordados con el socio.';
