/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ClientBoard } from './types';
import { DEFAULT_CLIENTS } from './mockData';
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
  BookOpen
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
}

const DEFAULT_CONFIG: AppConfig = {
  accessPassword: 'growth2026',
  theme: 'light',
  consultantName: 'Consorcio Grow Partner',
  consultantAgency: 'Consorcio Grow Partner'
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
        return JSON.parse(stored);
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
  const [viewMode, setViewMode] = useState<'welcome' | 'client' | 'admin'>('welcome');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  
  // Collapsible sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeStepInfo, setActiveStepInfo] = useState<number | null>(null);

  // Sync state to local storage when changed
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clients));
    } catch (e) {
      console.error("Fallo al guardar en caché local", e);
    }
  }, [clients]);

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
            setViewMode('client');
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
              setViewMode('client');
            }
          } catch (e) {
            console.error("Fallo al decodificar cliente comprimido desde URL", e);
          }
        } else {
          const match = clients.find(c => c.id === content);
          if (match) {
            setSelectedClientId(match.id);
            setViewMode('client');
          }
        }
      } else if (hash === '#admin') {
        setViewMode('admin');
      }
    };

    // Load instantly
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [clients]);

  // Update client database callback
  const handleUpdateClientsList = (updated: ClientBoard[]) => {
    setClients(updated);
  };

  const currentClient = clients.find(c => c.id === selectedClientId) || clients[0];

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

  return (
    <div className="min-h-screen bg-[#fcfcfd] text-slate-800 flex flex-col font-sans relative overflow-hidden bg-liquid-grid" id="app-root-container">
      
      {/* Dynamic Background Glowing Mesh */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[50%] rounded-full opacity-40 blur-[140px] pointer-events-none ambient-light-violet" />
      <div className="absolute bottom-[10%] right-[-15%] w-[55%] h-[55%] rounded-full opacity-30 blur-[130px] pointer-events-none ambient-light-emerald" />

      {/* Global Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80" id="global-header-bar">
        <div className="max-w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            {/* Sidebar Toggle Button for mobile and desktop */}
            {viewMode !== 'welcome' && (
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 mr-1 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer active:scale-95 flex items-center justify-center"
                title="Contraer/Expandir Panel Lateral"
              >
                <Menu className="w-5 h-5 text-violet-600" />
              </button>
            )}

            {/* Logo Brand heading */}
            <div 
              onClick={handleToMainPage}
              className="flex items-center gap-2.5 cursor-pointer select-none group"
              id="brand-logo-container"
            >
              <div className="bg-violet-600 rounded-xl p-2 text-white group-hover:scale-105 transition-all duration-300 shadow-sm">
                <Briefcase className="w-4 h-4 font-bold" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                  Growth Scaling
                </span>
                <span className="text-[9px] text-violet-600 dark:text-violet-400 font-mono font-black tracking-widest -mt-0.5">SYSTEME PARTNER PORTAL</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3" id="header-right-actions">
            
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

            {/* Quick action to toggle mode directly on top */}
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

      {/* Main Container Workspace */}
      <div className="flex-grow flex flex-row overflow-hidden relative" id="main-content-flow">
        
        {/* COLLAPSIBLE PREMIUM SIDEBAR PANEL */}
        {viewMode !== 'welcome' && (
          <AnimatePresence initial={false}>
            {sidebarOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 330, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="hidden lg:flex flex-col bg-white border-r border-slate-200 shrink-0 h-full overflow-y-auto overflow-x-hidden z-10 shadow-xs"
                id="collapsible-premium-sidebar"
              >
                <div className="p-6 space-y-6 w-[330px]">
                  
                  {/* Sliding Toggle switch ("un boton mas bonito") */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-violet-600 font-mono leading-none flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-violet-500" />
                      <span>Panel De Control</span>
                    </label>
                    <div className="relative bg-slate-150 border border-slate-200/80 rounded-2xl p-1 flex w-full">
                      <button 
                        onClick={() => {
                          if (clients.length > 0) {
                            if (!selectedClientId) setSelectedClientId(clients[0].id);
                            setViewMode('client');
                            window.location.hash = `#cliente/${selectedClientId || clients[0].id}`;
                          } else {
                            setViewMode('welcome');
                          }
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all relative ${
                          viewMode === 'client' 
                            ? 'text-white' 
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {viewMode === 'client' && (
                          <motion.div 
                            layoutId="sidebar-view-pill" 
                            className="absolute inset-0 bg-violet-600 rounded-xl z-0" 
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5" />
                          Vista Cliente
                        </span>
                      </button>
                      <button 
                        onClick={handleAdminModeLink}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all relative ${
                          viewMode === 'admin' 
                            ? 'text-white' 
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {viewMode === 'admin' && (
                          <motion.div 
                            layoutId="sidebar-view-pill" 
                            className="absolute inset-0 bg-violet-600 rounded-xl z-0" 
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5" />
                          Consultor
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Account detail ("Nombre de la empresa configuración etc.") */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-[0.03] pointer-events-none text-slate-800">
                      <Building2 className="w-12 h-12" />
                    </div>
                    
                    <div>
                      <span className="text-[9px] font-mono font-extrabold text-violet-700 bg-violet-100/60 px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-violet-200">
                        {currentClient.industry}
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-950 mt-1.5 tracking-tight font-display line-clamp-1">
                        {currentClient.companyName}
                      </h4>
                    </div>

                    <div className="border-t border-slate-200/80 pt-2.5 space-y-1.5 text-xs text-slate-550">
                      <div className="flex justify-between">
                        <span>Dueño:</span>
                        <strong className="text-slate-850 font-bold">{currentClient.ownerName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Socio Growth:</span>
                        <span className="text-violet-600 font-bold">Consorcio Grow Partner</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fecha de Inicio:</span>
                        <span className="text-slate-700 font-mono text-[11px]">{currentClient.startDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Hash Token ID:</span>
                        <span className="text-violet-700 font-mono text-[10px] bg-violet-50 border border-violet-100 px-1 py-0.5 rounded">#cl-{currentClient.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* "Paso a paso todo el proceso" checklist dropdown/accordion list */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#8b5cf6] font-mono">Plan Paso a Paso (Ciclo)</span>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Mes {currentClient.currentMonth} activo</span>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed font-sans mt-1">
                      Visualiza cronológicamente la madurez técnica táctica. Haz clic para expandir y aprender más:
                    </p>

                    <div className="space-y-1.5" id="sidebar-step-by-step">
                      {CYCLIC_STEPS.map((step) => {
                        const isCompleted = step.num < currentClient.currentMonth;
                        const isActive = step.num === currentClient.currentMonth;
                        const isExpanded = activeStepInfo === step.num;

                        return (
                          <div 
                            key={step.num}
                            className={`border rounded-xl transition-all overflow-hidden ${
                              isActive 
                                ? 'bg-violet-50/40 border-violet-300 shadow-xs' 
                                : isCompleted 
                                  ? 'bg-emerald-50/15 border-emerald-200'
                                  : 'bg-transparent border-slate-200 opacity-55'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setActiveStepInfo(isExpanded ? null : step.num)}
                              className="w-full flex items-center justify-between p-3 text-left transition-colors hover:bg-slate-50"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                  isCompleted 
                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                                    : isActive 
                                      ? 'bg-violet-600 text-white' 
                                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}>
                                  {isCompleted ? '✓' : step.num}
                                </div>
                                <span className={`text-[11.5px] font-bold tracking-tight leading-tight ${
                                  isActive ? 'text-slate-900 font-bold' : 'text-slate-700'
                                }`}>
                                  {step.name}
                                </span>
                              </div>
                              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Collapsible Content */}
                            <AnimatePresence initial={false}>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0 }}
                                  animate={{ height: 'auto' }}
                                  exit={{ height: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-3 pb-3 pt-0.5 border-t border-slate-200 text-[11.5px] text-slate-500 leading-relaxed bg-slate-50/50">
                                    <p className="font-sans text-slate-650">{step.desc}</p>
                                    <div className="mt-2 flex items-center gap-1.5 text-[9px] font-mono uppercase bg-slate-100 border border-slate-200/50 p-1.5 rounded text-slate-600">
                                      <Clock className="w-3 h-3 text-violet-500" />
                                      <span>Semanas {(step.num-1)*4 + 1} a {step.num*4}</span>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Switch direct clicker Accounts List */}
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#8b5cf6] font-mono">Directorio de Cuentas</span>
                    <div className="space-y-1">
                      {clients.map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectClient(c.id)}
                          className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-between ${
                            c.id === selectedClientId 
                              ? 'bg-violet-50 text-violet-750 font-bold border border-violet-200' 
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate max-w-[180px]">{c.companyName}</span>
                          <span className="text-[9px] font-mono opacity-80 font-semibold bg-slate-100 border border-slate-200 px-1 py-0.5 rounded text-slate-705">M{c.currentMonth}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </motion.aside>
            )}
          </AnimatePresence>
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
                className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10"
                id="view-welcome"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Side: Brand presentation and quick links */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
                      <div className="absolute top-[-30%] right-[-20%] w-72 h-72 rounded-full opacity-30 blur-2xl ambient-light-violet pointer-events-none" />
                      
                      <div className="inline-flex bg-violet-50 text-violet-600 p-3 rounded-2xl mb-6 border border-violet-100">
                        <Compass className="w-8 h-8 text-violet-600" />
                      </div>
                      
                      <h1 className="text-3xl font-bold font-display tracking-tight text-slate-900 dark:text-white leading-tight">
                        Growth Scaling
                      </h1>
                      <p className="text-slate-600 dark:text-slate-300 text-sm mt-3 leading-relaxed font-sans">
                        Systeme Partner Portal: La interfaz y motor definitivo de growth marketing certificado. Exclusivo para directores y tomadores de decisiones de alto impacto. Visualiza el retorno de la pauta publicitaria (ROAS), leads de valor y el progreso de tus tácticas comerciales en tiempo real.
                      </p>

                      <div className="mt-8 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="bg-emerald-50 text-emerald-700 p-1.5 rounded-full shrink-0 border border-emerald-100">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                          <p className="text-xs text-slate-600">
                            <strong className="text-slate-900">Métricas de impacto de negocio:</strong> Nos enfocamos exclusivamente en retorno de inversión (ROAS), costo por adquisición (CAC) y prospectos calificados.
                          </p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="bg-emerald-50 text-emerald-700 p-1.5 rounded-full shrink-0 border border-emerald-100">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <p className="text-xs text-slate-600">
                            <strong className="text-slate-900">Ciclo estratégico de 6 meses:</strong> Monitoreamos y reportamos la bitácora técnica de pauta todos los meses de manera transparente.
                          </p>
                        </div>
                      </div>

                      <hr className="border-slate-100 my-6" />

                      <div className="flex flex-col gap-3" id="welcome-options">
                        {/* Premium Switch Switcher Mode Switch */}
                        <button
                          onClick={handleAdminModeLink}
                          className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3.5 px-4 rounded-2xl text-center text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                          id="welcome-btn-admin"
                        >
                          <Sliders className="w-4 h-4 text-emerald-300" />
                          <span>Abrir Consola de Consultor</span>
                        </button>
                        <p className="text-[10px] text-center text-slate-400 font-mono">
                          ACCESO CERTIFICADO: CONTRATANTE & CONSULTOR DE CRECIMIENTO
                        </p>
                      </div>
                    </div>
                    
                    {/* Client confidence alert */}
                    <div className="bg-slate-50 text-slate-705 p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-[0.02] pointer-events-none">
                        <Building2 className="w-24 h-24 text-slate-800" />
                      </div>
                      <span className="text-[9px] font-mono font-bold tracking-widest text-[#8b5cf6] uppercase">PORTAL CIFRADO</span>
                      <h3 className="font-extrabold text-slate-900 text-sm font-display mt-1">Acceso Directo Unificado</h3>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                        Cada cliente recibe un enlace directo seguro que encripta la URL con un identificador único, evitando el uso de contraseñas complejas. Selecciona un demo de la derecha para simular la experiencia.
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Grid of Client Boards */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-mono font-bold tracking-wider text-slate-500 uppercase">
                          Socio Estratégico · Directorio de Cuentas Demo
                        </span>
                        <span className="text-xs bg-violet-50 text-violet-600 border border-violet-100 px-2.5 py-1 rounded-full font-bold">
                          {clients.length} Activos
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mb-6 font-sans">
                        Haz clic en cualquiera de las siguientes empresas configuradas por el consultor para ingresar al panel estratégico a pantalla completa:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="welcome-clients-list">
                        {clients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => handleSelectClient(client.id)}
                            className="w-full text-left border border-slate-200 bg-slate-50/50 hover:border-violet-300 hover:bg-slate-50 p-5 rounded-2xl transition-all cursor-pointer flex flex-col justify-between h-44 group relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 p-4 opacity-[0.01] group-hover:scale-110 group-hover:opacity-[0.02] transition-transform duration-300">
                              <Building2 className="w-20 h-20 text-slate-900" />
                            </div>
                            
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-bold text-violet-700 bg-violet-50 px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-violet-100">
                                  {client.industry}
                                </span>
                                <span className="text-[10px] text-slate-500 font-semibold font-mono">Ciclo {client.currentMonth}/6</span>
                              </div>
                              <h3 className="font-bold text-base text-slate-900 font-display line-clamp-1 group-hover:text-violet-600 transition-colors">
                                {client.companyName}
                              </h3>
                            </div>

                            <div className="w-full flex items-center justify-between mt-4 border-t border-slate-200 pt-3">
                              <span className="text-xs text-slate-500">
                                Socio: <strong className="text-slate-800 font-semibold">{client.ownerName}</strong>
                              </span>
                              <div className="bg-slate-50 text-slate-500 group-hover:bg-violet-600 group-hover:text-white rounded-full p-2 transition-all border border-slate-200/60 shadow-xs">
                                <ArrowRight className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
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
