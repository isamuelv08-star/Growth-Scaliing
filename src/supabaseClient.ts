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
  kpis jsonb not null,
  sales_history jsonb not null default '[]'::jsonb,
  leads_history jsonb not null default '[]'::jsonb,
  log_entries jsonb not null default '[]'::jsonb,
  next_steps jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Si ya creaste tu tabla anteriormente, ejecuta esta línea para agregar la columna de claves:
-- alter table public.client_boards add column if not exists access_key text;

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
  return {
    id: row.id,
    companyName: row.company_name,
    ownerName: row.owner_name,
    startDate: row.start_date,
    industry: row.industry,
    currentMonth: row.current_month,
    statusMessage: row.status_message,
    accessKey: row.access_key || '',
    kpis: row.kpis,
    salesHistory: row.sales_history || [],
    leadsHistory: row.leads_history || [],
    logEntries: row.log_entries || [],
    nextSteps: row.next_steps || [],
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

// Save/Upsert board
export const saveSupabaseBoard = async (board: ClientBoard): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const payload = {
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
    updated_at: new Date().toISOString()
  };

  const { error } = await (supabase
    .from('client_boards') as any)
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error("Error upserting board in Supabase", error);
    throw error;
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

