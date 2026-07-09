/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { ClientBoard } from './types';
import { DEFAULT_CLIENTS } from './mockData';
import { 
  getSupabaseClient, 
  fetchSupabaseBoards, 
  saveSupabaseBoard, 
  deleteSupabaseBoard 
} from './supabaseClient';
import { ClientView } from './components/ClientView';
import { AdminPanel } from './components/AdminPanel';
import { 
  Building2, 
  ArrowRight, 
  Settings, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  UserPlus, 
  Users,
  Sliders, 
  Compass, 
  CheckCircle2, 
  Briefcase,
  Menu,
  X,
  Sparkles,
  Clock,
  ShieldCheck,
  UserCheck,
  Layout,
  Layers,
  Award,
  BookOpen,
  LogOut,
  BarChart3,
  Video,
  DollarSign,
  TrendingUp,
  Percent,
  Bell,
  ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { safeBtoa, safeAtob, compressClientBoard, decompressClientBoard } from './utils';

const LOCAL_STORAGE_KEY = 'tablero_grow_data_v3';
const CONFIG_LOCAL_STORAGE_KEY = 'tablero_grow_config_v3';

export interface AppConfig {
  accessPassword: string;
  theme: 'light' | 'dark';
  consultantName: string;
  consultantAgency: string;
  adminEmail: string;
}

const DEFAULT_CONFIG: AppConfig = {
  accessPassword: 'growth2026',
  theme: 'light',
  consultantName: 'Consorcio Grow Partner',
  consultantAgency: 'Consorcio Grow Partner',
  adminEmail: 'consultor@partner.com'
};

const CYCLIC_STEPS = [
  { num: 1, name: 'Setup y Auditoría', desc: 'Conexión total de activos, píxeles de conversión y setup del centro de control.' },
  { num: 2, name: 'Estructuración de Pauta', desc: 'Lanzamiento de anuncios dirigidos y producción de guías de contenidos.' },
  { num: 3, name: 'Estabilización de Leads', desc: 'Purga de audiencias y optimización del costo por lead calificado en CRM.' },
  { num: 4, name: 'Escalamiento e Inversión', desc: 'Aumento progresivo de presupuesto publicitario con ROAS estable.' },
  { num: 5, name: 'Remarketing Multicanal', desc: 'Fidelización automática, flujos en WhatsApp y campañas de valor agregado.' },
  { num: 6, name: 'Auditoría & Plan de Escala', desc: 'Entrega de informe integral de 6 meses y firma de renovación del ciclo.' },
];

export default function App() {
  // Config state
  const [config, setConfig] = useState<AppConfig>(() => {
    try {
      const stored = localStorage.getItem(CONFIG_LOCAL_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error("Fallo al leer config, usando valores por defecto", e);
    }
    return DEFAULT_CONFIG;
  });

  // Safe load state
  const [clients, setClients] = useState<ClientBoard[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Fallo al leer caché local, reseteando a valores por defecto.", e);
    }
    return DEFAULT_CLIENTS;
  });

  // Navigation states: 'welcome' | 'client' | 'admin'
  const [viewMode, setViewMode] = useState<'welcome' | 'client' | 'admin'>('admin');
  const [activeAdminTab, setActiveAdminTab] = useState<'home' | 'socios' | 'diagnostic' | 'workspace' | 'settings'>('socios');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    try {
      return sessionStorage.getItem('isAdminAuthenticated') === 'true';
    } catch (_) {
      return false;
    }
  });
  const [isClientViewOnly, setIsClientViewOnly] = useState(false);

  // Sync admin authentication to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('isAdminAuthenticated', String(isAdminAuthenticated));
    } catch (_) {}
  }, [isAdminAuthenticated]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [activeClientTab, setActiveClientTab] = useState<'dashboard' | 'strategy' | 'creative'>('dashboard');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  
  // Collapsible sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeStepInfo, setActiveStepInfo] = useState<number | null>(null);

  // Supabase connection and synchronization states
  const [isUsingSupabase, setIsUsingSupabase] = useState(false);
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const lastSyncedJsonRef = useRef<string>('');

  // Load database content from Supabase
  const loadSupabaseData = async () => {
    const client = getSupabaseClient();
    if (!client) {
      setIsUsingSupabase(false);
      return;
    }
    
    setSupabaseLoading(true);
    setIsUsingSupabase(true);
    try {
      const dbBoards = await fetchSupabaseBoards();
      if (dbBoards.length > 0) {
        setClients(dbBoards);
        lastSyncedJsonRef.current = JSON.stringify(dbBoards);
      } else {
        // If Supabase database is brand new and empty, seed it with current clients
        console.log("Supabase database empty, seeding initial clients...");
        for (const c of clients) {
          await saveSupabaseBoard(c);
        }
        const reFetched = await fetchSupabaseBoards();
        if (reFetched.length > 0) {
          setClients(reFetched);
          lastSyncedJsonRef.current = JSON.stringify(reFetched);
        }
      }
    } catch (err) {
      console.error("Fallo al sincronizar con Supabase, usando almacenamiento local.", err);
    } finally {
      setSupabaseLoading(false);
    }
  };

  // Check connection state on mount
  useEffect(() => {
    const client = getSupabaseClient();
    setIsUsingSupabase(!!client);
  }, []);

  // Fetch whenever Supabase mode changes
  useEffect(() => {
    if (isUsingSupabase) {
      loadSupabaseData();
    }
  }, [isUsingSupabase]);

  // Handle configuration change triggers (re-evaluates connection status)
  const handleSupabaseConfigChange = () => {
    const client = getSupabaseClient();
    setIsUsingSupabase(!!client);
  };

  // Sync state to local storage and Supabase with debouncing to avoid race conditions/lockups
  useEffect(() => {
    // 1. Always sync to local storage immediately as a robust, offline-first backup
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clients));
    } catch (e) {
      console.error("Fallo al guardar en caché local", e);
    }

    if (!isUsingSupabase) return;

    // 2. If using Supabase, debounce saving to prevent race conditions during typing
    const currentJson = JSON.stringify(clients);
    if (currentJson === lastSyncedJsonRef.current) {
      return;
    }

    const handler = setTimeout(async () => {
      const client = getSupabaseClient();
      if (!client) return;

      try {
        let parsedLastSynced: ClientBoard[] = [];
        try {
          parsedLastSynced = JSON.parse(lastSyncedJsonRef.current || '[]');
        } catch (_) {}

        // Handle deletions
        if (Array.isArray(parsedLastSynced) && parsedLastSynced.length > 0) {
          const deleted = parsedLastSynced.filter(oldBoard => !clients.some(newBoard => newBoard.id === oldBoard.id));
          for (const b of deleted) {
            await deleteSupabaseBoard(b.id);
            console.log("Socio eliminado de Supabase (debounced):", b.companyName);
          }
        }

        // Handle additions / modifications
        const changed = clients.filter(newBoard => {
          const oldBoard = parsedLastSynced.find(o => o.id === newBoard.id);
          if (!oldBoard) return true; // New board
          return JSON.stringify(oldBoard) !== JSON.stringify(newBoard);
        });

        for (const b of changed) {
          await saveSupabaseBoard(b);
          console.log("Socio guardado en Supabase (debounced):", b.companyName);
        }

        // Update synced state reference
        lastSyncedJsonRef.current = currentJson;
      } catch (err) {
        console.error("Fallo en sincronización debounced con Supabase", err);
      }
    }, 1500); // 1.5 second debounce for keyboard inputs

    return () => clearTimeout(handler);
  }, [clients, isUsingSupabase]);

  // Sync config & Theme to DOM
  useEffect(() => {
    try {
      const forcedLightConfig = { ...config, theme: 'light' as const };
      localStorage.setItem(CONFIG_LOCAL_STORAGE_KEY, JSON.stringify(forcedLightConfig));
    } catch (e) {
      console.error("Fallo al guardar config", e);
    }

    const root = document.documentElement;
    root.classList.remove('dark');
  }, [config]);

  // Read URL Hash matching to clients (e.g. #cliente/inversiones-valenzuela) For direct customer lookups!
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const isLogged = isAdminAuthenticated || isClientViewOnly;

      if (hash && hash.startsWith('#cliente-data/')) {
        const base64Data = hash.substring('#cliente-data/'.length);
        try {
          const decodedJson = safeAtob(base64Data);
          const clientObj = JSON.parse(decodedJson);
          if (clientObj && clientObj.id) {
            setClients(prev => {
              const exists = prev.some(c => c.id === clientObj.id);
              if (exists) {
                return prev.map(c => c.id === clientObj.id ? clientObj : c);
              } else {
                return [...prev, clientObj];
              }
            });
            setSelectedClientId(clientObj.id);
            if (isLogged) {
              setViewMode('client');
            } else {
              setViewMode('admin');
            }
          }
        } catch (e) {
          console.error("Fallo al decodificar cliente desde URL", e);
        }
      } else if (hash && hash.startsWith('#cliente/')) {
        const content = hash.substring('#cliente/'.length);
        const questionMarkIndex = content.indexOf('?d=');
        
        if (questionMarkIndex !== -1) {
          const slug = content.substring(0, questionMarkIndex);
          const base64Data = content.substring(questionMarkIndex + 3);
          try {
            const clientObj = decompressClientBoard(base64Data);
            if (clientObj && clientObj.id) {
              setClients(prev => {
                const exists = prev.some(c => c.id === clientObj.id);
                if (exists) {
                  return prev.map(c => c.id === clientObj.id ? clientObj : c);
                } else {
                  return [...prev, clientObj];
                }
              });
              setSelectedClientId(clientObj.id);
              if (isLogged) {
                setViewMode('client');
              } else {
                setViewMode('admin');
              }
            }
          } catch (e) {
            console.error("Fallo al decodificar cliente comprimido desde URL", e);
          }
        } else {
          const match = clients.find(c => c.id === content);
          if (match) {
            setSelectedClientId(match.id);
            if (isLogged) {
              setViewMode('client');
            } else {
              setViewMode('admin');
            }
          }
        }
      } else if (hash === '#admin') {
        setViewMode('admin');
      } else {
        // Default startup
        setViewMode('admin');
      }
    };

    // Load instantly
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [clients, isAdminAuthenticated, isClientViewOnly]);

  // Update client database callback
  const handleUpdateClientsList = async (updated: ClientBoard[], forceSync: boolean = false) => {
    setClients(updated);

    // Save to local storage
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Fallo al guardar en caché local", e);
    }

    if (forceSync) {
      const client = getSupabaseClient();
      if (!client) return;
      try {
        let parsedLastSynced: ClientBoard[] = [];
        try {
          parsedLastSynced = JSON.parse(lastSyncedJsonRef.current || '[]');
        } catch (_) {}

        const deleted = parsedLastSynced.filter(oldBoard => !updated.some(newBoard => newBoard.id === oldBoard.id));
        for (const b of deleted) {
          await deleteSupabaseBoard(b.id);
          console.log("Socio eliminado de Supabase (forzado):", b.companyName);
        }

        const changed = updated.filter(newBoard => {
          const oldBoard = parsedLastSynced.find(o => o.id === newBoard.id);
          if (!oldBoard) return true;
          return JSON.stringify(oldBoard) !== JSON.stringify(newBoard);
        });

        for (const b of changed) {
          await saveSupabaseBoard(b);
          console.log("Socio guardado en Supabase (forzado):", b.companyName);
        }

        lastSyncedJsonRef.current = JSON.stringify(updated);
        console.log("Sincronización forzada con Supabase exitosa.");
      } catch (err) {
        console.error("Fallo al realizar sincronización forzada con Supabase", err);
      }
    }
  };

  const currentClient = clients.find(c => c.id === selectedClientId) || clients[0];

  const handleUpdateSingleClient = (updatedClient: ClientBoard) => {
    const nextClients = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
    handleUpdateClientsList(nextClients, true);
  };

  // Manual transition helpers
  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setViewMode('client');
    window.location.hash = `#cliente/${clientId}`;
    setIsClientDropdownOpen(false);
  };

  const handleAdminModeLink = () => {
    setViewMode('admin');
    window.location.hash = '#admin';
  };

  const handleToMainPage = () => {
    setViewMode('welcome');
    window.location.hash = '';
  };

  // Unified chronological timeline helpers & calculations for Welcome / Gabinete Global
  const combinedLogs: { log: any; companyName: string; clientId: string }[] = [];
  clients.forEach(c => {
    if (Array.isArray(c.logEntries)) {
      c.logEntries.forEach(log => {
        combinedLogs.push({
          log,
          companyName: c.companyName,
          clientId: c.id
        });
      });
    }
  });

  // Sort logs by date descending and take top 5
  const sortedGlobalLogs = combinedLogs.sort((a, b) => {
    return new Date(b.log.date).getTime() - new Date(a.log.date).getTime();
  }).slice(0, 5);

  const getGlobalCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'pauta': return <TrendingUp className="w-3.5 h-3.5 text-cyan-600" />;
      case 'estrategia': return <Award className="w-3.5 h-3.5 text-violet-600" />;
      case 'contenido': return <Video className="w-3.5 h-3.5 text-amber-600" />;
      case 'optimizacion': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      default: return <Clock className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getGlobalCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'pauta': return 'bg-cyan-50 text-cyan-700 border-cyan-100';
      case 'estrategia': return 'bg-violet-50 text-violet-700 border-violet-100';
      case 'contenido': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'optimizacion': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-150';
    }
  };

  return (
    <div className="h-screen w-screen bg-[#fcfcfd] text-slate-800 flex flex-row font-sans relative overflow-hidden bg-liquid-grid" id="app-root-container">
      
      {/* Dynamic Background Glowing Mesh */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[50%] rounded-full opacity-40 blur-[140px] pointer-events-none ambient-light-violet" />
      <div className="absolute bottom-[10%] right-[-15%] w-[55%] h-[55%] rounded-full opacity-30 blur-[130px] pointer-events-none ambient-light-emerald" />

      {/* LEFT GLOBAL SIDEBAR */}
      {!(viewMode === 'admin' && !isAdminAuthenticated) && sidebarOpen && (
        <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col shrink-0 h-full select-none shadow-xs" id="global-left-sidebar">
          
          {/* Persistent Branding Header */}
          <div 
            onClick={handleToMainPage}
            className="p-5 border-b border-slate-100 flex items-center gap-3 cursor-pointer hover:bg-slate-50/50 transition-colors select-none shrink-0"
            id="sidebar-brand-logo"
          >
            <div className="bg-violet-600 rounded-xl p-2 text-white shadow-sm shrink-0">
              <Briefcase className="w-4 h-4 font-bold" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-sm tracking-tight text-slate-900 leading-none">
                Growth Scaling
              </span>
              <span className="text-[9px] text-violet-600 font-mono font-black tracking-widest mt-1">SYSTEM PARTNER</span>
            </div>
          </div>

          {viewMode === 'client' && selectedClientId ? (
            <>
              {/* Partner-Specific Info Sub-segment */}
              <div className="p-4 bg-violet-50/40 border-b border-slate-100/60 flex items-center gap-3 shrink-0">
                <div className="bg-white border border-violet-150 rounded-xl p-2 text-violet-600 shadow-3xs shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-display font-black text-xs text-slate-800 truncate" title={currentClient?.companyName}>
                    {currentClient?.companyName}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                    Mes {currentClient?.currentMonth} de 6
                  </span>
                </div>
              </div>

              {/* Client Navigation Options */}
              <div className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                <span className="px-3 text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase block mb-2">MENÚ DEL SOCIO</span>

                {[
                  { id: 'dashboard', label: 'Dashboard General', icon: <BarChart3 className="w-4 h-4" /> },
                  { id: 'strategy', label: 'Estrategia', icon: <Briefcase className="w-4 h-4" /> },
                  { id: 'creative', label: 'Estudio Creativo', icon: <Video className="w-4 h-4" /> },
                ].map((tab) => {
                  const isSelected = activeClientTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveClientTab(tab.id as any)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                        isSelected
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-slate-650 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Stats & Admin link */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2.5 shrink-0">
                <div className="bg-slate-100/60 rounded-xl p-3 text-center border border-slate-200/50">
                  <span className="text-[8px] font-mono text-slate-400 font-bold block uppercase tracking-wider">Progreso del Ciclo</span>
                  <span className="text-xs font-black text-violet-700 font-mono block mt-0.5">
                    {currentClient ? Math.round((currentClient.currentMonth / 6) * 100) : 0}%
                  </span>
                  <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                    <div className="h-full bg-violet-600" style={{ width: `${currentClient ? (currentClient.currentMonth / 6) * 100 : 0}%` }} />
                  </div>
                </div>

                {/* Removed consultant console button for client view */}
              </div>
            </>
          ) : (
            <>
              {/* Navigation Options */}
              <div className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                <span className="px-3 text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase block mb-2">MENÚ PRINCIPAL</span>

                <button
                  onClick={() => {
                    setViewMode('welcome');
                    window.location.hash = '';
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    viewMode === 'welcome'
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-slate-650 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Layout className="w-4 h-4" />
                  <span>Gabinete Global</span>
                </button>

                <button
                  onClick={() => {
                    setViewMode('admin');
                    setActiveAdminTab('socios');
                    window.location.hash = '#admin';
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    viewMode === 'admin' && activeAdminTab === 'socios'
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-slate-650 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Directorio de Socios</span>
                </button>

                <button
                  onClick={() => {
                    setViewMode('admin');
                    setActiveAdminTab('diagnostic');
                    window.location.hash = '#admin';
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    viewMode === 'admin' && activeAdminTab === 'diagnostic'
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-slate-650 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Diagnósticos del Socio</span>
                </button>

                <button
                  onClick={() => {
                    setViewMode('admin');
                    setActiveAdminTab('workspace');
                    window.location.hash = '#admin';
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    viewMode === 'admin' && activeAdminTab === 'workspace'
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-slate-650 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  <span>Editor Técnico</span>
                </button>

                <button
                  onClick={() => {
                    setViewMode('admin');
                    setActiveAdminTab('settings');
                    window.location.hash = '#admin';
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    viewMode === 'admin' && activeAdminTab === 'settings'
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-slate-650 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Configuración de la App</span>
                </button>
              </div>

              {/* Consultant Profile Details at the bottom */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <div className="w-8 h-8 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center font-bold text-violet-750 text-xs shrink-0 shadow-3xs">
                    GP
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-900 truncate">Consultor Grow</span>
                    <span className="text-[9px] text-slate-500 truncate">{config.consultantAgency}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </aside>
      )}

      {/* RIGHT MAIN CONTAINER */}
      <div className="flex-grow flex flex-col h-full min-w-0 overflow-hidden" id="right-main-container">
        
        {/* Global Header */}
        {!(viewMode === 'admin' && !isAdminAuthenticated) && (
          <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shrink-0" id="global-header-bar">
            <div className="max-w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              
              <div className="flex items-center gap-3">
                {/* Sidebar Toggle Button for mobile and desktop */}
                <button
                  type="button"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 mr-1 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-650 hover:text-slate-950 hover:bg-slate-100 transition-all cursor-pointer active:scale-95 flex items-center justify-center"
                  title="Contraer/Expandir Panel Lateral"
                >
                  <Menu className="w-5 h-5 text-violet-600" />
                </button>

                {/* Brand logo if sidebar is closed */}
                {!sidebarOpen && (
                  <div 
                    onClick={handleToMainPage}
                    className="flex items-center gap-2 cursor-pointer select-none group mr-2"
                  >
                    <div className="bg-violet-600 rounded-lg p-1.5 text-white shadow-xs">
                      <Briefcase className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-display font-bold text-xs tracking-tight text-slate-900">
                      Growth Scaling
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3" id="header-right-actions">
                
                {/* If client is logged in with unique key, show simple branded info and Logout button */}
                {isClientViewOnly ? (
                  <>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-full select-none">
                      <Building2 className="w-3.5 h-3.5 text-violet-600" />
                      <span className="max-w-28 sm:max-w-44 truncate">{currentClient.companyName}</span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setIsClientViewOnly(false);
                        setViewMode('admin');
                        setIsAdminAuthenticated(false);
                        window.location.hash = '';
                      }}
                      className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Beautiful Client Selector Dropdown on Header */}
                    {viewMode === 'client' && clients.length > 0 && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold px-4 py-2 rounded-full inline-flex items-center gap-2 transition-all cursor-pointer"
                          id="header-client-selector-trigger"
                        >
                          <Building2 className="w-3.5 h-3.5 text-violet-600" />
                          <span className="max-w-28 sm:max-w-44 truncate">{currentClient.companyName}</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isClientDropdownOpen && (
                          <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                            <p className="px-4 py-1.5 font-mono text-[9px] text-violet-600 font-extrabold uppercase tracking-widest">CAMBIAR SOCIO DEMO</p>
                            {clients.map(c => (
                              <button
                                key={c.id}
                                onClick={() => handleSelectClient(c.id)}
                                className={`w-full text-left font-sans text-xs px-4 py-2.5 hover:bg-slate-50 transition-colors block ${
                                  c.id === selectedClientId ? 'text-violet-600 font-black bg-violet-50/80' : 'text-slate-750'
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="truncate pr-2">{c.companyName}</span>
                                  <span className="text-[9px] font-mono font-semibold text-slate-500 shrink-0">Mes {c.currentMonth}/6</span>
                                </div>
                              </button>
                            ))}
                            <hr className="border-slate-100 my-1.5" />
                            <button
                              onClick={handleAdminModeLink}
                              className="w-full text-left font-bold text-violet-600 text-xs px-4 py-2 hover:bg-slate-50 block flex items-center gap-2"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                              <span>Ir al Panel Consultor</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Quick action to toggle mode directly on top */}
                {!isClientViewOnly && (
                  <div className="hidden md:flex bg-slate-100/85 p-1 rounded-xl border border-slate-200 items-center">
                    <button
                      onClick={() => {
                        if (clients.length > 0) {
                          if (!selectedClientId) handleSelectClient(clients[0].id);
                          setViewMode('client');
                        } else {
                          setViewMode('welcome');
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                        viewMode === 'client' ? 'bg-white text-slate-900 border border-slate-200/60 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5 text-violet-600" />
                      <span>Modo Cliente</span>
                    </button>
                    <button
                      onClick={handleAdminModeLink}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                        viewMode === 'admin' ? 'bg-white text-slate-900 border border-slate-200/60 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5 text-violet-600" />
                      <span>Modo Consultor</span>
                    </button>
                  </div>
                )}

                {/* Config Button (Panel admin link) fallback */}
                {viewMode === 'welcome' && (
                  <button
                    onClick={handleAdminModeLink}
                    className="text-slate-500 hover:text-violet-600 p-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100 transition-all cursor-pointer"
                    id="btn-nav-admin"
                    title="Consola de Consultor"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </header>
        )}

        {/* Content Panel Area */}
        <div className="flex-grow overflow-y-auto h-full px-1" id="scrolling-main-panel">
          <AnimatePresence mode="wait">
            
            {/* VIEW: welcome screen */}
            {viewMode === 'welcome' && (
              <motion.div
                key="welcome-screen"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8"
                id="view-welcome"
              >
                {/* 1. BRAND HERO HEADER & FUSED GLOBAL STATS (Gabinete Global Integration) */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
                  <div className="absolute top-[-30%] right-[-20%] w-96 h-96 rounded-full opacity-20 blur-3xl ambient-light-violet pointer-events-none" />
                  
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold tracking-widest text-violet-600 bg-violet-50 border border-violet-150 px-2.5 py-1 rounded-md uppercase">
                          GABINETE GLOBAL DE CRECIMIENTO
                        </span>
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">Sincronizado</span>
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-slate-900 leading-tight">
                        Dashboard General
                      </h1>
                      <p className="text-slate-500 text-xs sm:text-sm leading-relaxed font-sans">
                        ¡Bienvenido Samuel a tu centro de mando! Revisa lo que debes hacer hoy para mantener la pauta activa, monitorear los semáforos de entregables y asegurar el crecimiento exponencial de todos tus socios comerciales en tiempo real.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      {/* Removed Consola Consultor button as requested */}
                    </div>
                  </div>

                  {/* 4-Column Executive Metrics Fused Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 border-t border-slate-100 pt-6">
                    <div className="bg-slate-50/70 border border-slate-150 p-4 rounded-2xl">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-mono block">SOCIOS ACTIVOS</span>
                        <Users className="w-4 h-4 text-violet-500" />
                      </div>
                      <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono block mt-1">
                        {clients.length}
                      </span>
                      <span className="text-[9px] text-slate-500">Cuentas bajo pauta</span>
                    </div>

                    <div className="bg-slate-50/70 border border-slate-150 p-4 rounded-2xl">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-mono block">INVERSIÓN TOTAL</span>
                        <DollarSign className="w-4 h-4 text-violet-500" />
                      </div>
                      <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono block mt-1">
                        ${clients.reduce((acc, c) => acc + (c.kpis?.adSpend || 0), 0).toLocaleString()} USD
                      </span>
                      <span className="text-[9px] text-slate-500">Presupuesto mensual</span>
                    </div>

                    <div className="bg-slate-50/70 border border-slate-150 p-4 rounded-2xl">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-mono block">LEADS CAPTADOS</span>
                        <TrendingUp className="w-4 h-4 text-violet-500" />
                      </div>
                      <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono block mt-1">
                        {clients.reduce((acc, c) => acc + (c.kpis?.leadsGenerated || 0), 0).toLocaleString()}
                      </span>
                      <span className="text-[9px] text-slate-500">Prospectos de valor</span>
                    </div>

                    <div className="bg-slate-50/70 border border-slate-150 p-4 rounded-2xl">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-mono block font-bold">RETORNO (ROAS) MEDIO</span>
                        <Percent className="w-4 h-4 text-emerald-500" />
                      </div>
                      <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono block mt-1">
                        {(clients.reduce((acc, c) => acc + (c.kpis?.actualROAS || 0), 0) / (clients.length || 1)).toFixed(1)}x
                      </span>
                      <span className="text-[9px] text-slate-500">Promedio de campañas</span>
                    </div>
                  </div>
                </div>

                {/* 2. MAIN WORKSPACE: 3-COLUMN UNIFIED CONTROL & MONITORING CENTER */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                  
                  {/* Left Column: Semantic Notifications / SEMÁFORO DE ALERTAS DE OPERACIONES */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-violet-600" />
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 font-mono">Alertas del Semáforo</h4>
                      </div>
                      <span className="text-[8px] font-mono font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-100">
                        HOY
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 font-sans">
                      Agenda operativa unificada. Abre tu portal por la mañana y revisa qué videos o posts requieren atención hoy según el semáforo de tus socios:
                    </p>

                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                      {clients.flatMap((client) => {
                        // Let's gather pending tasks from each client's roadmap checklist
                        const tasks = client.roadmapChecklist || [];
                        const uncompleted = tasks.filter(t => !t.completed).slice(0, 2); // Show top 2 uncompleted tasks per client
                        
                        // Fallback: if no checklist has been configured/initialized yet, generate simple notice
                        if (uncompleted.length === 0) {
                          return [{
                            id: `notice-${client.id}`,
                            clientName: client.companyName,
                            title: `Ejecutar pilar: ${client.marketingStrategy?.pillars?.[0] || 'Alineación de marca'}`,
                            semaforo: client.semaforo || 'green',
                            category: 'estrategia',
                            clientId: client.id
                          }];
                        }

                        return uncompleted.map(t => ({
                          id: `${client.id}-${t.id}`,
                          clientName: client.companyName,
                          title: t.title,
                          semaforo: client.semaforo || 'green',
                          category: t.category,
                          clientId: client.id
                        }));
                      }).map((alert) => (
                        <div 
                          key={alert.id}
                          onClick={() => handleSelectClient(alert.clientId)}
                          className="p-3 bg-slate-50/60 border border-slate-150 hover:border-violet-200 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer flex gap-3 items-start group"
                        >
                          {/* Left dot represents current partner's semáforo */}
                          <div className="mt-1 shrink-0 flex flex-col items-center">
                            <span className={`w-3.5 h-3.5 rounded-full border border-white shadow-2xs ${
                                alert.semaforo === 'green' ? 'bg-emerald-500' :
                                alert.semaforo === 'yellow' ? 'bg-amber-400' :
                                'bg-rose-500'
                            }`} />
                          </div>

                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-[9px] font-black text-violet-600 uppercase tracking-wider block truncate max-w-[120px]">
                                {alert.clientName}
                              </span>
                              <span className="text-[8px] font-mono bg-slate-200 text-slate-600 px-1 rounded truncate">
                                {alert.category}
                              </span>
                            </div>
                            <p className="text-slate-800 text-[11.5px] font-semibold leading-relaxed group-hover:text-violet-600 transition-colors line-clamp-2">
                              {alert.title}
                            </p>
                          </div>
                          
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 self-center group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-slate-100 pt-3 text-[10px] text-slate-400 font-mono text-center flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Al día ·
                      <span className="w-2 h-2 rounded-full bg-amber-400" /> En riesgo ·
                      <span className="w-2 h-2 rounded-full bg-rose-500" /> Retrasado
                    </div>
                  </div>

                  {/* Center Column: Directorio de Socios (Grid) */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-violet-600" />
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 font-mono">Directorio de Socios</h4>
                      </div>
                      <span className="text-xs text-violet-600 bg-violet-50 font-bold px-2.5 py-0.5 rounded-full border border-violet-100 font-mono">
                        {clients.length} SOCIOS
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 leading-normal">
                      Selecciona un socio para ingresar a su gabinete, auditar métricas detalladas, gestionar guiones, o ver su roadmap de seguimiento operativo:
                    </p>

                    {/* Highly responsive accounts list */}
                    <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1" id="welcome-clients-list">
                      {clients.map((client) => {
                        // Compute completed checklist tasks percentage to display on card
                        const checklist = client.roadmapChecklist || [];
                        const completed = checklist.filter(t => t.completed).length;
                        const total = checklist.length;
                        const percent = total > 0 ? Math.round((completed / total) * 100) : 100;
                        const semStatus = client.semaforo || (percent >= 60 ? 'green' : percent >= 30 ? 'yellow' : 'red');

                        // Beautiful Service Type styles
                        const isPartnerPrime = client.serviceType === 'partner_prime';

                        return (
                          <div
                            key={client.id}
                            className="w-full bg-white border border-slate-200 rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-violet-100/40 flex flex-col group relative"
                          >
                            {/* Card Premium Header Image / Gradient Cover */}
                            <div className="h-20 w-full relative overflow-hidden shrink-0">
                              {/* Overlay background gradient specific to semStatus */}
                              <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-300 ${
                                semStatus === 'green' ? 'from-emerald-600/80 to-teal-800/90' :
                                semStatus === 'yellow' ? 'from-amber-500/80 to-amber-700/90' :
                                'from-rose-600/80 to-rose-800/90'
                              } mix-blend-multiply z-10`} />
                              
                              {/* Decorative abstract patterns */}
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(120,119,198,0.2),transparent_50%)] z-10" />
                              <img 
                                src={
                                  client.industry?.toLowerCase().includes('inmobiliaria') || client.industry?.toLowerCase().includes('bienes')
                                    ? "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&auto=format&fit=crop&q=60"
                                    : client.industry?.toLowerCase().includes('salud') || client.industry?.toLowerCase().includes('medicina') || client.industry?.toLowerCase().includes('clinica')
                                      ? "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&auto=format&fit=crop&q=60"
                                      : client.industry?.toLowerCase().includes('software') || client.industry?.toLowerCase().includes('tecnologia')
                                        ? "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&auto=format&fit=crop&q=60"
                                        : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60"
                                }
                                alt={client.companyName}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                referrerPolicy="no-referrer"
                              />

                              {/* Floating status tag on cover */}
                              <div className="absolute top-3 right-3 z-20">
                                <span className={`text-[8px] font-mono font-black px-2.5 py-1 rounded-full border shadow-xs flex items-center gap-1 backdrop-blur-md ${
                                  semStatus === 'green' ? 'bg-emerald-500/90 text-white border-emerald-400' :
                                  semStatus === 'yellow' ? 'bg-amber-500/90 text-white border-amber-400' :
                                  'bg-rose-500/90 text-white border-rose-400'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full bg-white ${
                                    semStatus === 'green' ? '' : 'animate-ping'
                                  }`} />
                                  {semStatus === 'green' ? 'AL DÍA' : semStatus === 'yellow' ? 'EN RIESGO' : 'RETRASADO'}
                                </span>
                              </div>

                              {/* Floating industry badge */}
                              <div className="absolute bottom-3 left-3 z-20">
                                <span className="text-[8px] font-bold text-white bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/20 uppercase tracking-wider">
                                  {client.industry || 'Socio'}
                                </span>
                              </div>
                            </div>

                            {/* Card Content Area */}
                            <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                              <div className="space-y-3">
                                {/* Title and Director Row */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className={`text-[8.5px] font-mono font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                                      isPartnerPrime 
                                        ? 'bg-violet-50 text-violet-700 border border-violet-150'
                                        : 'bg-cyan-50 text-cyan-700 border border-cyan-150'
                                    }`}>
                                      {isPartnerPrime ? '💎 Partner Prime' : '⚡ Systeme Prime'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono font-bold">Mes {client.currentMonth || 1} de 6</span>
                                  </div>

                                  <h3 
                                    onClick={() => {
                                      setSelectedClientId(client.id);
                                      setViewMode('client');
                                      setActiveClientTab('dashboard');
                                      window.location.hash = `#cliente/${client.id}`;
                                    }}
                                    className="font-black text-base text-slate-900 font-display tracking-tight hover:text-violet-600 transition-colors cursor-pointer flex items-center justify-between"
                                  >
                                    <span className="truncate pr-2">{client.companyName}</span>
                                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-violet-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                                  </h3>
                                  
                                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-sans">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />
                                    <span>Director: <strong className="text-slate-800 font-bold">{client.ownerName}</strong></span>
                                  </div>
                                </div>

                                {/* Executive Premium Bento-Grid Cells for KPI strip */}
                                <div className="grid grid-cols-3 gap-2 bg-slate-50/70 border border-slate-150 rounded-2xl p-2.5 transition-all group-hover:bg-violet-50/20 group-hover:border-violet-100">
                                  <div className="text-center p-1">
                                    <span className="text-[7.5px] font-mono text-slate-400 block uppercase font-bold tracking-wider">ROAS REAL</span>
                                    <span className="text-xs font-mono font-black text-emerald-600 block mt-0.5">
                                      {client.kpis?.roas?.value || '0.0x'}
                                    </span>
                                  </div>
                                  <div className="text-center p-1 border-x border-slate-150/60">
                                    <span className="text-[7.5px] font-mono text-slate-400 block uppercase font-bold tracking-wider">LEADS</span>
                                    <span className="text-xs font-mono font-black text-slate-900 block mt-0.5">
                                      {client.kpis?.leads?.value || '0'}
                                    </span>
                                  </div>
                                  <div className="text-center p-1">
                                    <span className="text-[7.5px] font-mono text-slate-400 block uppercase font-bold tracking-wider">VENTAS</span>
                                    <span className="text-xs font-mono font-black text-violet-600 block mt-0.5">
                                      {client.kpis?.ventas?.value || '$0'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Task operational progress bar inside card */}
                              <div className="space-y-3 pt-1">
                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-center text-[9px] text-slate-405 font-mono font-bold">
                                    <span>PROGRESO OPERATIVO</span>
                                    <span className="text-slate-700 font-extrabold">{percent}% ({completed}/{total})</span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-150/20 shadow-inner">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-700 relative overflow-hidden ${
                                        semStatus === 'green' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                                        semStatus === 'yellow' ? 'bg-gradient-to-r from-amber-400 to-orange-400' :
                                        'bg-gradient-to-r from-rose-500 to-red-500'
                                      }`}
                                      style={{ width: `${percent}%` }}
                                    >
                                      <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:8px_8px] animate-pulse" />
                                    </div>
                                  </div>
                                </div>

                                {/* Quick-access Action Buttons with stunning, premium styles */}
                                <div className="flex gap-2.5 border-t border-slate-100 pt-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedClientId(client.id);
                                      setViewMode('client');
                                      setActiveClientTab('dashboard');
                                      window.location.hash = `#cliente/${client.id}`;
                                    }}
                                    className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-extrabold py-2 px-2 rounded-xl text-[9px] font-mono transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs hover:shadow-2xs active:scale-95"
                                  >
                                    <Building2 className="w-3.5 h-3.5 text-violet-500" />
                                    <span>GABINETE</span>
                                  </button>
                                  
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedClientId(client.id);
                                      setViewMode('client');
                                      setActiveClientTab('strategy');
                                      window.location.hash = `#cliente/${client.id}`;
                                    }}
                                    className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-extrabold py-2 px-2 rounded-xl text-[9px] font-mono transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-violet-600/10 hover:shadow-lg hover:shadow-violet-600/20 active:scale-95"
                                  >
                                    <Compass className="w-3.5 h-3.5 text-emerald-300" />
                                    <span>ESTRATEGIA</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Últimos Hitos en Portafolio (Bitácora Global Integration) */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-violet-600" />
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 font-mono">Últimos Hitos de Socios</h4>
                      </div>
                      <span className="text-[8px] font-mono font-bold bg-violet-50 text-violet-700 px-2 py-0.5 rounded border border-violet-100">
                        GLOBAL
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 font-sans">
                      Historial consolidado de las últimas acciones operativas, lanzamientos de pauta y optimizaciones tácticas:
                    </p>

                    <div className="relative pl-5 space-y-4 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-100 max-h-[360px] overflow-y-auto pr-1">
                      {sortedGlobalLogs.length > 0 ? (
                        sortedGlobalLogs.map(({ log, companyName, clientId }) => (
                          <div key={log.id} className="relative group/timeline cursor-pointer" onClick={() => handleSelectClient(clientId)}>
                            <div className="absolute -left-[20px] top-0.5 bg-white border border-slate-200 rounded-full p-0.5 group-hover/timeline:border-violet-500 transition-all shadow-3xs z-10">
                              {getGlobalCategoryIcon(log.category)}
                            </div>

                            <div className="flex flex-col gap-0.5 pl-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[8px] font-mono font-bold text-slate-400">
                                  {log.date}
                                </span>
                                <span className="text-[8px] font-sans font-bold text-violet-600 bg-violet-50 px-1.5 py-0.2 rounded border border-violet-100 truncate max-w-[80px]">
                                  {companyName}
                                </span>
                              </div>
                              <h5 className="text-[11px] font-bold text-slate-800 leading-tight group-hover/timeline:text-violet-600 transition-colors">
                                {log.title}
                              </h5>
                              <p className="text-[10px] text-slate-500 leading-normal line-clamp-2">
                                {log.description}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-slate-400 text-xs py-10 font-mono">No hay hitos ingresados en el portafolio todavía.</div>
                      )}
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* VIEW: client dashboard */}
            {viewMode === 'client' && selectedClientId && (
              <motion.div
                key={`client-view-${selectedClientId}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-grow"
                id="view-client-wrapper"
              >
                <ClientView 
                  board={currentClient} 
                  onGoToAdmin={handleAdminModeLink}
                  consultantName={config.consultantName}
                  consultantAgency={config.consultantAgency}
                  activeTab={activeClientTab}
                  setActiveTab={setActiveClientTab}
                  onUpdateClient={handleUpdateSingleClient}
                />
              </motion.div>
            )}

            {/* VIEW: admin console dashboard */}
            {viewMode === 'admin' && (
              <motion.div
                key="admin-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-grow"
                id="view-admin-wrapper"
              >
                <AdminPanel
                  clients={clients}
                  onUpdateClients={handleUpdateClientsList}
                  onSelectClientForView={(id) => setSelectedClientId(id)}
                  config={config}
                  onUpdateConfig={setConfig}
                  onSupabaseConfigChange={handleSupabaseConfigChange}
                  onAuthChange={setIsAdminAuthenticated}
                  isAdminAuthenticated={isAdminAuthenticated}
                  activeTab={activeAdminTab}
                  onTabChange={setActiveAdminTab}
                  onClientLogin={(clientId) => {
                    setSelectedClientId(clientId);
                    setIsClientViewOnly(true);
                    setIsAdminAuthenticated(false);
                    setViewMode('client');
                    window.location.hash = `#cliente/${clientId}`;
                  }}
                  onBackToClientView={() => {
                    if (clients.length > 0) {
                      if (!selectedClientId) {
                        setSelectedClientId(clients[0].id);
                      }
                      setViewMode('client');
                      window.location.hash = `#cliente/${selectedClientId || clients[0].id}`;
                    } else {
                      setViewMode('welcome');
                    }
                  }}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
