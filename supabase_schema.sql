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
  access_key TEXT,
  service_type TEXT DEFAULT 'partner_prime',
  marketing_strategy JSONB DEFAULT NULL,
  kpis JSONB NOT NULL,
  sales_history JSONB NOT NULL DEFAULT '[]'::JSONB,
  leads_history JSONB NOT NULL DEFAULT '[]'::JSONB,
  log_entries JSONB NOT NULL DEFAULT '[]'::JSONB,
  next_steps JSONB NOT NULL DEFAULT '[]'::JSONB,
  roadmap_checklist JSONB DEFAULT '[]'::JSONB,
  semaforo TEXT DEFAULT 'green',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Si ya creaste tu tabla anteriormente, ejecuta estas líneas en tu editor SQL de Supabase para agregar las nuevas columnas:
-- ALTER TABLE public.client_boards ADD COLUMN IF NOT EXISTS access_key TEXT;
-- ALTER TABLE public.client_boards ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'partner_prime';
-- ALTER TABLE public.client_boards ADD COLUMN IF NOT EXISTS marketing_strategy JSONB DEFAULT NULL;
-- ALTER TABLE public.client_boards ADD COLUMN IF NOT EXISTS roadmap_checklist JSONB DEFAULT '[]'::JSONB;
-- ALTER TABLE public.client_boards ADD COLUMN IF NOT EXISTS semaforo TEXT DEFAULT 'green';

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

-- ==========================================================
2. TABLA OPCIONAL DE CONFIGURACIÓN SEGURA DE LA APP (APP_SETTINGS)
-- ==========================================================
-- Crea esta tabla para guardar de manera segura claves de API (como la OpenAI API Key para ChatGPT DALL-E)
-- para que el backend de tu portal pueda consultarla de forma dinámica y no exponerla en el navegador del cliente.

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Habilitar seguridad de nivel de fila (Row Level Security - RLS)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Crear políticas para permitir lectura/escritura pública en el entorno Sandbox/Desarrollo
-- (En producción, puedes afinar esta política de acuerdo con tus requerimientos de seguridad)
CREATE POLICY "Permitir acceso total a app_settings"
  ON public.app_settings FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.app_settings IS 'Configuraciones seguras de la aplicación como llaves de APIs.';
COMMENT ON COLUMN public.app_settings.key IS 'Identificador único de la configuración (Ej: openai_api_key).';
COMMENT ON COLUMN public.app_settings.value IS 'Valor seguro de la configuración (Ej: sk-proj-... ).';
