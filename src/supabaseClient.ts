import { createClient } from '@supabase/supabase-js';
import { ClientBoard } from './types';

// Storage keys for Supabase dynamic credentials in sandbox
const SUPABASE_CREDENTIALS_KEY = 'growth_partner_supabase_creds';

export interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

// Get credentials from either Environment variables or LocalStorage
export const getSupabaseCredentials = (): SupabaseCredentials | null => {
  // Check env vars first
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  if (envUrl && envKey) {
    return { url: envUrl, anonKey: envKey };
  }

  // Check LocalStorage for sandbox testing
  try {
    const saved = localStorage.getItem(SUPABASE_CREDENTIALS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading Supabase credentials from storage", e);
  }

  return null;
};

// Save credentials dynamically for testing in sandbox
export const saveSupabaseCredentials = (url: string, anonKey: string) => {
  localStorage.setItem(SUPABASE_CREDENTIALS_KEY, JSON.stringify({ url, anonKey }));
};

// Clear saved credentials
export const clearSupabaseCredentials = () => {
  localStorage.removeItem(SUPABASE_CREDENTIALS_KEY);
};

// Lazy initialization of Supabase client
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const getSupabaseClient = () => {
  const creds = getSupabaseCredentials();
  if (!creds) return null;

  try {
    if (!supabaseInstance) {
      supabaseInstance = createClient(creds.url, creds.anonKey);
    }
    return supabaseInstance;
  } catch (err) {
    console.error("Failed to initialize Supabase client", err);
    return null;
  }
};

// Resets cached client instance if keys change
export const resetSupabaseClient = () => {
  supabaseInstance = null;
};

// SQL Schema code to display in the UI for easy copy-pasting
export const SUPABASE_SQL_SCHEMA = `-- Copia y pega este script en el SQL Editor de Supabase para crear tus tablas de clientes:

-- 1. Crear la tabla de tableros de socios
create table if not exists public.client_boards (
  id text primary key,
  company_name text not null,
  owner_name text not null,
  start_date text not null,
  industry text not null,
  current_month integer not null default 1,
  status_message text not null,
  access_key text,
  service_type text default 'partner_prime',
  marketing_strategy jsonb default null,
  kpis jsonb not null,
  sales_history jsonb not null default '[]'::jsonb,
  leads_history jsonb not null default '[]'::jsonb,
  log_entries jsonb not null default '[]'::jsonb,
  next_steps jsonb not null default '[]'::jsonb,
  roadmap_checklist jsonb default '[]'::jsonb,
  semaforo text default 'green',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Si ya creaste tu tabla anteriormente, ejecuta estas líneas para agregar las nuevas columnas:
-- alter table public.client_boards add column if not exists access_key text;
-- alter table public.client_boards add column if not exists service_type text default 'partner_prime';
-- alter table public.client_boards add column if not exists marketing_strategy jsonb default null;
-- alter table public.client_boards add column if not exists roadmap_checklist jsonb default '[]'::jsonb;
-- alter table public.client_boards add column if not exists semaforo text default 'green';

-- 2. Habilitar la seguridad de nivel de fila (RLS) - Opcional
alter table public.client_boards enable row level security;

-- 3. Crear políticas públicas para simplificar el acceso en esta fase (Lectura/Escritura libre o con API Key)
create policy "Permitir lectura pública a cualquiera" 
  on public.client_boards for select 
  using (true);

create policy "Permitir inserción y actualización pública" 
  on public.client_boards for all 
  using (true)
  with check (true);
`;

// Map database row to ClientBoard object
const mapRowToBoard = (row: any): ClientBoard => {
  const mStrat = row.marketing_strategy;
  
  // Elegant fallback: if columns are missing from the table, fetch embedded properties from marketing_strategy JSONB
  const accessKey = row.access_key !== undefined && row.access_key !== null
    ? row.access_key
    : (mStrat && mStrat._accessKey ? mStrat._accessKey : '');

  const serviceType = row.service_type !== undefined && row.service_type !== null
    ? row.service_type
    : (mStrat && mStrat._serviceType ? mStrat._serviceType : 'partner_prime');

  const roadmapChecklist = row.roadmap_checklist !== undefined && row.roadmap_checklist !== null
    ? row.roadmap_checklist 
    : (mStrat && mStrat._roadmapChecklist ? mStrat._roadmapChecklist : []);

  const semaforo = row.semaforo !== undefined && row.semaforo !== null
    ? row.semaforo
    : (mStrat && mStrat._semaforo ? mStrat._semaforo : 'green');

  return {
    id: row.id,
    companyName: row.company_name,
    ownerName: row.owner_name,
    startDate: row.start_date,
    industry: row.industry,
    currentMonth: row.current_month,
    statusMessage: row.status_message,
    accessKey: accessKey,
    kpis: row.kpis,
    salesHistory: row.sales_history || [],
    leadsHistory: row.leads_history || [],
    logEntries: row.log_entries || [],
    nextSteps: row.next_steps || [],
    serviceType: serviceType,
    marketingStrategy: mStrat,
    semaforo: semaforo,
    roadmapChecklist: roadmapChecklist,
  };
};

// Fetch all boards
export const fetchSupabaseBoards = async (): Promise<ClientBoard[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await (supabase
    .from('client_boards') as any)
    .select('*')
    .order('company_name', { ascending: true });

  if (error) {
    console.error("Error fetching boards from Supabase", error);
    throw error;
  }

  return (data || []).map(mapRowToBoard);
};

// In-memory cache for columns detected as unsupported by the database
const unsupportedColumns = new Set<string>();

// Save/Upsert board with self-healing fallback
export const saveSupabaseBoard = async (board: ClientBoard): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  // Clone marketing strategy or create a shell to embed potential missing columns safely
  let embeddedStrat: any = board.marketingStrategy;
  if (embeddedStrat) {
    embeddedStrat = {
      ...embeddedStrat,
      _accessKey: board.accessKey || '',
      _serviceType: board.serviceType || 'partner_prime',
      _roadmapChecklist: board.roadmapChecklist || [],
      _semaforo: board.semaforo || 'green'
    };
  } else {
    embeddedStrat = {
      id: `strat-fallback-${board.id}`,
      createdAt: new Date().toISOString(),
      targetAudience: '',
      coreOffer: '',
      pillars: [],
      angles: [],
      calendar: [],
      creativeImages: [],
      reports: [],
      _accessKey: board.accessKey || '',
      _serviceType: board.serviceType || 'partner_prime',
      _roadmapChecklist: board.roadmapChecklist || [],
      _semaforo: board.semaforo || 'green'
    };
  }

  const payload: Record<string, any> = {
    id: board.id,
    company_name: board.companyName,
    owner_name: board.ownerName,
    start_date: board.startDate,
    industry: board.industry,
    current_month: board.currentMonth,
    status_message: board.statusMessage,
    access_key: board.accessKey || '',
    kpis: board.kpis,
    sales_history: board.salesHistory,
    leads_history: board.leadsHistory,
    log_entries: board.logEntries,
    next_steps: board.nextSteps,
    service_type: board.serviceType || 'partner_prime',
    marketing_strategy: embeddedStrat,
    roadmap_checklist: board.roadmapChecklist || [],
    semaforo: board.semaforo || 'green',
    updated_at: new Date().toISOString()
  };

  // Pre-prune columns we already know are unsupported
  for (const col of unsupportedColumns) {
    delete payload[col];
  }

  let success = false;
  let attempts = 0;
  const maxAttempts = 10;
  let lastError: any = null;

  while (!success && attempts < maxAttempts) {
    attempts++;
    const { error } = await (supabase
      .from('client_boards') as any)
      .upsert(payload, { onConflict: 'id' });

    if (!error) {
      success = true;
      break;
    }

    lastError = error;
    const errorMsg = error.message || '';
    const isMissingColumnError = error.code === '42703' || errorMsg.includes('does not exist') || errorMsg.includes('column');

    if (isMissingColumnError) {
      let prunedSomething = false;

      // Newer columns that might be missing in some old schemas
      const optionalCols = [
        'roadmap_checklist',
        'semaforo',
        'marketing_strategy',
        'service_type',
        'access_key'
      ];

      for (const col of optionalCols) {
        if (payload[col] !== undefined && (errorMsg.includes(col) || errorMsg.includes(col.replace('_', '')))) {
          console.warn(`Column '${col}' is not supported by your Supabase table schema. Pruning and relying on embedded fallback.`);
          unsupportedColumns.add(col);
          delete payload[col];
          prunedSomething = true;
          break; // Prune one and retry
        }
      }

      // If we got a column error but couldn't parse the column name, prune one by one as fallback
      if (!prunedSomething) {
        let pruned = false;
        for (const col of optionalCols) {
          if (payload[col] !== undefined) {
            console.warn(`Presuming column '${col}' is missing. Pruning and retrying...`);
            unsupportedColumns.add(col);
            delete payload[col];
            pruned = true;
            break;
          }
        }
        if (!pruned) {
          break; // Nothing left to prune
        }
      }
    } else {
      // Not a column mismatch error; cannot recover by pruning
      break;
    }
  }

  if (!success) {
    console.error("Error upserting board in Supabase after self-healing attempts:", lastError);
    throw lastError || new Error("Failed to save board in Supabase");
  }
};

// Delete board
export const deleteSupabaseBoard = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await (supabase
    .from('client_boards') as any)
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting board in Supabase", error);
    throw error;
  }
};

// Supabase Authentication helpers
export const supabaseSignIn = async (email: string, pass: string): Promise<any> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase no está configurado");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (error) throw error;
  return data;
};

export const supabaseSignUp = async (email: string, pass: string): Promise<any> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase no está configurado");
  const { data, error } = await supabase.auth.signUp({ email, password: pass });
  if (error) throw error;
  return data;
};

export const supabaseSignOut = async (): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.auth.signOut();
};

export const supabaseGetSession = async (): Promise<any> => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
};

