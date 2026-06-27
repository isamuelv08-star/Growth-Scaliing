/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ClientBoard, KPIValue, LogEntry } from '../types';
import { compressClientBoard, getCompanySlug, generatePDFReport } from '../utils';
import { 
  getSupabaseCredentials, 
  saveSupabaseCredentials, 
  clearSupabaseCredentials, 
  getSupabaseClient,
  resetSupabaseClient,
  SUPABASE_SQL_SCHEMA,
  supabaseSignIn,
  supabaseSignUp,
  supabaseSignOut,
  supabaseGetSession
} from '../supabaseClient';
import { 
  Lock, 
  Plus, 
  Trash2, 
  Eye, 
  PlusCircle, 
  Check, 
  X, 
  TrendingUp, 
  Database,
  Calendar,
  Layers,
  Sparkles,
  Copy,
  FolderOpen,
  Home,
  Users,
  Settings2,
  BarChart3,
  Clock,
  CheckCircle2,
  Award,
  TrendingDown,
  MessageSquare,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Briefcase,
  Key,
  Download,
  Upload,
  RefreshCw,
  Sliders,
  Sparkle,
  Mail,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Safe UTF-8 Base64 helpers matching App.tsx
const safeBtoa = (str: string) => {
  return btoa(unescape(encodeURIComponent(str)));
};

const safeAtob = (str: string) => {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch (e) {
    return atob(str);
  }
};

interface AppConfig {
  accessPassword: string;
  theme: 'light' | 'dark';
  consultantName: string;
  consultantAgency: string;
  adminEmail: string;
}

interface AdminPanelProps {
  clients: ClientBoard[];
  onUpdateClients: (updatedClients: ClientBoard[]) => void;
  onSelectClientForView: (clientId: string) => void;
  onBackToClientView: () => void;
  config: AppConfig;
  onUpdateConfig: (updatedConfig: AppConfig) => void;
  onSupabaseConfigChange?: () => void;
  onAuthChange?: (authenticated: boolean) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  clients,
  onUpdateClients,
  onSelectClientForView,
  onBackToClientView,
  config,
  onUpdateConfig,
  onSupabaseConfigChange,
  onAuthChange
}) => {
  // Supabase states first so other hooks can reference isSupaConnected
  const [supabaseUrl, setSupabaseUrl] = useState(() => getSupabaseCredentials()?.url || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(() => getSupabaseCredentials()?.anonKey || '');
  const [isSupaConnected, setIsSupaConnected] = useState(() => !!getSupabaseClient());
  const [isTestingSupa, setIsTestingSupa] = useState(false);
  const [supaTestMsg, setSupaTestMsg] = useState('');
  const [copiedSQL, setCopiedSQL] = useState(false);

  const [emailInput, setEmailInput] = useState(config.adminEmail || 'consultor@partner.com');
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Notify parent on authentication state change
  React.useEffect(() => {
    if (onAuthChange) {
      onAuthChange(isAuthenticated);
    }
  }, [isAuthenticated, onAuthChange]);

  // Check Supabase session on mount
  React.useEffect(() => {
    const checkSession = async () => {
      const client = getSupabaseClient();
      if (client) {
        setAuthLoading(true);
        try {
          const session = await supabaseGetSession();
          if (session?.user) {
            setIsAuthenticated(true);
          }
        } catch (e) {
          console.error("No active session or error reading session", e);
        } finally {
          setAuthLoading(false);
        }
      }
    };
    checkSession();
  }, [isSupaConnected]);
  
  // Navigation Tabs inside Admin Mode: 'home' | 'socios' | 'diagnostic' | 'workspace' | 'settings'
  const [activeTab, setActiveTab] = useState<'home' | 'socios' | 'diagnostic' | 'workspace' | 'settings'>('home');

  // Currently selected client for editing inside the workspace
  const [selectedClientId, setSelectedClientId] = useState<string>(
    clients.length > 0 ? clients[0].id : ''
  );

  // Form states for creating new client
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [newStart, setNewStart] = useState(new Date().toISOString().split('T')[0]);
  const [newIndustry, setNewIndustry] = useState('Salud y Bienestar');

  // Form states for adding log entry to selected client
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logTitle, setLogTitle] = useState('');
  const [logDesc, setLogDesc] = useState('');
  const [logCategory, setLogCategory] = useState<'estrategia' | 'contenido' | 'pauta' | 'optimizacion'>('pauta');

  // Next step state
  const [newStepText, setNewStepText] = useState('');

  // Settings states
  const [newPassword, setNewPassword] = useState(config.accessPassword);
  const [newAdminEmail, setNewAdminEmail] = useState(config.adminEmail || 'consultor@partner.com');
  const [tempConsultantName, setTempConsultantName] = useState(config.consultantName);
  const [tempConsultantAgency, setTempConsultantAgency] = useState(config.consultantAgency);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  // Interactive Simulator States
  const [simBudget, setSimBudget] = useState<number>(1200);
  const [simCPL, setSimCPL] = useState<number>(3.50);
  const [simROAS, setSimROAS] = useState<number>(4.5);

  // Save feedback state
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Connection tester
  const handleTestSupabase = async (url: string, key: string) => {
    if (!url.trim() || !key.trim()) {
      setSupaTestMsg('Por favor ingresa URL y Anon Key válidos.');
      setIsSupaConnected(false);
      return;
    }
    
    setIsTestingSupa(true);
    setSupaTestMsg('Probando conexión con Supabase...');
    
    try {
      // Temporarily save to test
      saveSupabaseCredentials(url.trim(), key.trim());
      resetSupabaseClient();
      const client = getSupabaseClient();
      if (!client) {
        throw new Error("No se pudo iniciar el cliente Supabase");
      }
      
      // Query to check table existence
      const { data, error } = await client.from('client_boards').select('id').limit(1);
      
      if (error) {
        if (error.code === '42P01') {
          throw new Error("¡Conectado! Pero la tabla 'client_boards' no existe todavía. Por favor ejecuta el script SQL provisto abajo en tu editor.");
        }
        throw new Error(error.message);
      }
      
      setIsSupaConnected(true);
      setSupaTestMsg('¡Conexión exitosa! El portal ahora está sincronizado en tiempo real con tu base de datos Supabase PostgreSQL.');
      if (onSupabaseConfigChange) {
        onSupabaseConfigChange();
      }
    } catch (err: any) {
      setIsSupaConnected(false);
      setSupaTestMsg(`Error de conexión: ${err.message || err}`);
    } finally {
      setIsTestingSupa(false);
    }
  };

  const handleDisconnectSupabase = () => {
    clearSupabaseCredentials();
    resetSupabaseClient();
    setSupabaseUrl('');
    setSupabaseAnonKey('');
    setIsSupaConnected(false);
    setSupaTestMsg('Desconectado de Supabase. Retornando a almacenamiento local.');
    if (onSupabaseConfigChange) {
      onSupabaseConfigChange();
    }
  };

  const handleLogout = async () => {
    try {
      if (isSupaConnected) {
        await supabaseSignOut();
      }
    } catch (e) {
      console.error("Error signing out from Supabase", e);
    }
    setIsAuthenticated(false);
    setPasswordInput('');
  };

  const selectedClient = clients.find(c => c.id === selectedClientId) || clients[0];

  // Email and Password Login / Signup handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const email = emailInput.trim();
    const password = passwordInput;

    if (!email || !password) {
      setAuthError('Por favor ingresa tanto el correo como la contraseña.');
      setAuthLoading(false);
      return;
    }

    try {
      if (isSupaConnected) {
        if (isSignUpMode) {
          // Register a new user in Supabase Auth
          const data = await supabaseSignUp(email, password);
          if (data?.user) {
            setAuthError('¡Usuario registrado con éxito! Verifica tu correo (si tienes habilitada la confirmación) o inicia sesión.');
            setIsSignUpMode(false);
          } else {
            throw new Error("No se pudo registrar el usuario. Revisa las directivas de Supabase.");
          }
        } else {
          // Sign In with Supabase Auth
          const data = await supabaseSignIn(email, password);
          if (data?.user || data?.session) {
            setIsAuthenticated(true);
            setAuthError('');
          } else {
            throw new Error("Credenciales inválidas en Supabase.");
          }
        }
      } else {
        // Local Credentials Authentication
        const isDefaultCreds = (email === 'admin@partner.com' && password === 'admin');
        const isConfigCreds = (email === config.adminEmail && password === config.accessPassword);
        const isLegacyCreds = (email === 'consultor@partner.com' && password === config.accessPassword);
        
        if (isConfigCreds || isDefaultCreds || isLegacyCreds) {
          setIsAuthenticated(true);
          setAuthError('');
        } else {
          setAuthError('Credenciales incorrectas. Para modo local, usa el correo del consultor y tu clave de acceso.');
        }
      }
    } catch (err: any) {
      console.error("Authentication error", err);
      let errMsg = err.message || 'Error de autenticación desconocido.';
      if (errMsg.includes('Invalid login credentials')) {
        errMsg = 'Credenciales de acceso inválidas. Revisa tu correo y contraseña, o regístrate si es una base de datos nueva.';
      } else if (errMsg.includes('User already registered')) {
        errMsg = 'El usuario ya se encuentra registrado en este proyecto de Supabase.';
      } else if (errMsg.includes('Email not confirmed')) {
        errMsg = 'Por favor confirma tu correo electrónico en Supabase o deshabilita "Confirm Email" en Supabase Auth Providers.';
      }
      setAuthError(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  // Client updates helper
  const updateSelectedClient = (updated: ClientBoard) => {
    const nextList = clients.map(c => c.id === updated.id ? updated : c);
    onUpdateClients(nextList);
  };

  // Create client
  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.trim() || !newOwner.trim()) return;

    const newSlug = newCompany.toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, '-');

    const newBoard: ClientBoard = {
      id: newSlug || `cliente-${Date.now()}`,
      companyName: newCompany,
      ownerName: newOwner,
      startDate: newStart,
      industry: newIndustry,
      currentMonth: 1,
      statusMessage: "¡Bienvenido a tu ciclo de crecimiento de 6 meses! Ya iniciamos la instalación de tu sistema de ventas/marketing. Aquí verás cada avance de nuestras pautas y flujos.",
      kpis: {
        ventas: {
          label: "Ventas Atribuibles",
          value: "$0 USD",
          change: "Lanzamiento inminente",
          isPositive: true,
          rating: "warning"
        },
        leads: {
          label: "Contactos Calificados",
          value: "0 leads",
          change: "Pre-campañas activas",
          isPositive: true,
          rating: "warning"
        },
        cpl: {
          label: "Costo por Lead",
          value: "$0.00 USD",
          change: "Estabilizándose",
          isPositive: true,
          rating: "warning"
        },
        roas: {
          label: "Retorno de Pauta",
          value: "0.0x ROAS",
          change: "Fase de pruebas activa",
          isPositive: true,
          rating: "warning"
        }
      },
      salesHistory: [
        { label: "Mes 1", value: 0 }
      ],
      leadsHistory: [
        { label: "Mes 1", value: 0 }
      ],
      logEntries: [
        {
          id: `log-${Date.now()}`,
          date: newStart,
          title: "Inicio Formal del Ciclo Estratégico",
          description: "Instalación del sistema de crecimiento, setup del centro de control y primer briefing técnico con el dueño del negocio.",
          category: "estrategia"
        }
      ],
      nextSteps: [
        "Definición técnica de las cuentas comerciales.",
        "Auditoría básica de los canales de atención de WhatsApp."
      ]
    };

    const nextList = [...clients, newBoard];
    onUpdateClients(nextList);
    setSelectedClientId(newBoard.id);
    
    // Reset form
    setNewCompany('');
    setNewOwner('');
    setShowAddForm(false);
    setActiveTab('workspace'); // Direct to edit workspace
  };

  // Delete client
  const handleDeleteClient = (id: string) => {
    if (clients.length <= 1) {
      alert("Debes mantener al menos un socio para demostración.");
      return;
    }
    if (confirm("¿Estás seguro de que deseas eliminar este socio de forma permanente?")) {
      const remaining = clients.filter(c => c.id !== id);
      onUpdateClients(remaining);
      if (selectedClientId === id) {
        setSelectedClientId(remaining[0].id);
      }
    }
  };

  // KPI individual update helper
  const handleUpdateKPI = (kpiKey: 'ventas' | 'leads' | 'cpl' | 'roas', field: keyof KPIValue, value: any) => {
    if (!selectedClient) return;
    const updated = {
      ...selectedClient,
      kpis: {
        ...selectedClient.kpis,
        [kpiKey]: {
          ...selectedClient.kpis[kpiKey],
          [field]: value
        }
      }
    };
    updateSelectedClient(updated);
  };

  // Status message update
  const handleStatusMessageChange = (msg: string) => {
    if (!selectedClient) return;
    updateSelectedClient({
      ...selectedClient,
      statusMessage: msg
    });
  };

  // Base field change
  const handleBaseFieldChange = (field: keyof ClientBoard, value: any) => {
    if (!selectedClient) return;
    updateSelectedClient({
      ...selectedClient,
      [field]: value
    });
  };

  // Timeline entry addition
  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTitle.trim() || !selectedClient) return;

    const newLogItem: LogEntry = {
      id: `log-${Date.now()}`,
      date: logDate,
      title: logTitle,
      description: logDesc,
      category: logCategory
    };

    const updated = {
      ...selectedClient,
      logEntries: [...selectedClient.logEntries, newLogItem]
    };

    updateSelectedClient(updated);
    setLogTitle('');
    setLogDesc('');
  };

  // Remove log entry
  const handleRemoveLog = (logId: string) => {
    if (!selectedClient) return;
    const filteredLogs = selectedClient.logEntries.filter(log => log.id !== logId);
    updateSelectedClient({
      ...selectedClient,
      logEntries: filteredLogs
    });
  };

  // Next step bullet addition
  const handleAddStep = () => {
    if (!newStepText.trim() || !selectedClient) return;
    const updated = {
      ...selectedClient,
      nextSteps: [...selectedClient.nextSteps, newStepText.trim()]
    };
    updateSelectedClient(updated);
    setNewStepText('');
  };

  // Remove next step
  const handleRemoveStep = (idx: number) => {
    if (!selectedClient) return;
    const nextStepsFiltered = selectedClient.nextSteps.filter((_, i) => i !== idx);
    updateSelectedClient({
      ...selectedClient,
      nextSteps: nextStepsFiltered
    });
  };

  // Edit sparkline values helper for sales or leads
  const handleChartPointChange = (type: 'sales' | 'leads', index: number, value: number) => {
    if (!selectedClient) return;
    const historyArray = type === 'sales' ? [...selectedClient.salesHistory] : [...selectedClient.leadsHistory];
    historyArray[index].value = Number(value) || 0;

    const updated = {
      ...selectedClient,
      [type === 'sales' ? 'salesHistory' : 'leadsHistory']: historyArray
    };
    updateSelectedClient(updated);
  };

  // Setup additional chart points if needed (adds a new month to the chart data up to 6 months)
  const handleAddMonthToChart = () => {
    if (!selectedClient) return;
    const nextSalesIndex = selectedClient.salesHistory.length + 1;
    if (nextSalesIndex > 6) {
      alert("Los ciclos de trabajo duran un máximo de 6 meses.");
      return;
    }

    const lastSalesVal = selectedClient.salesHistory[selectedClient.salesHistory.length - 1]?.value || 0;
    const lastLeadsVal = selectedClient.leadsHistory[selectedClient.leadsHistory.length - 1]?.value || 0;

    const updated = {
      ...selectedClient,
      salesHistory: [...selectedClient.salesHistory, { label: `Mes ${nextSalesIndex}`, value: lastSalesVal }],
      leadsHistory: [...selectedClient.leadsHistory, { label: `Mes ${nextSalesIndex}`, value: lastLeadsVal }]
    };
    updateSelectedClient(updated);
  };

  const handleRemoveMonthFromChart = () => {
    if (!selectedClient || selectedClient.salesHistory.length <= 1) return;
    const updated = {
      ...selectedClient,
      salesHistory: selectedClient.salesHistory.slice(0, -1),
      leadsHistory: selectedClient.leadsHistory.slice(0, -1)
    };
    updateSelectedClient(updated);
  };

  // Public secure shareable link (Short, direct hash path)
  const getShareableLink = (client: ClientBoard) => {
    return `${window.location.origin}${window.location.pathname}#cliente/${client.id}`;
  };

  // Math stats helpers for global dashboard
  const parseNumericValue = (str: string): number => {
    if (!str) return 0;
    const clean = str.replace(/[^0-9.]/g, '');
    return parseFloat(clean) || 0;
  };

  // Calculate global aggregate statistics across all partners
  const totalLeadsCount = clients.reduce((acc, c) => {
    return acc + parseNumericValue(c.kpis.leads.value);
  }, 0);

  const averageROAS = clients.reduce((acc, c) => {
    return acc + parseNumericValue(c.kpis.roas.value);
  }, 0) / (clients.length || 1);

  const totalVentasSum = clients.reduce((acc, c) => {
    return acc + parseNumericValue(c.kpis.ventas.value);
  }, 0);

  // Combine logs from ALL clients to show a global chronological timeline
  const combinedLogs: { log: LogEntry; companyName: string; clientId: string }[] = [];
  clients.forEach(c => {
    c.logEntries.forEach(log => {
      combinedLogs.push({
        log,
        companyName: c.companyName,
        clientId: c.id
      });
    });
  });

  // Sort logs by date descending
  const sortedGlobalLogs = combinedLogs.sort((a, b) => {
    return new Date(b.log.date).getTime() - new Date(a.log.date).getTime();
  }).slice(0, 5); // Take top 5 recent changes

  // UI helpers for Category Colors inside Timeline Logs
  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'pauta': return <TrendingUp className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />;
      case 'estrategia': return <Award className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />;
      case 'contenido': return <MessageSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      case 'optimizacion': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      default: return <Clock className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'pauta': return 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-100 dark:border-cyan-900';
      case 'estrategia': return 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-100 dark:border-violet-900';
      case 'contenido': return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900';
      case 'optimizacion': return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900';
      default: return 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-150 dark:border-slate-800';
    }
  };

  // Auto Diagnosis suggestions generator
  const getDiagnosticSuggestions = (client: ClientBoard) => {
    const suggestions: string[] = [];
    const currentROASNum = parseNumericValue(client.kpis.roas.value);
    const currentCPLNum = parseNumericValue(client.kpis.cpl.value);
    
    if (currentROASNum >= 4.0) {
      suggestions.push("💡 El retorno de inversión (ROAS) es de nivel élite. Recomendación: Sugerir al socio escalar el presupuesto un 20% - 30% en los conjuntos de anuncios ganadores para dominar la cuota de mercado.");
    } else if (currentROASNum > 0 && currentROASNum < 3.0) {
      suggestions.push("⚠️ El ROAS está por debajo del estándar óptimo (3.0x). Recomendación: Detener audiencias frías de bajo rendimiento y re-enfocar la inversión publicitaria en campañas de Retargeting de alta intención.");
    }

    if (currentCPLNum > 4.5) {
      suggestions.push("⚠️ El Costo por Lead (CPL) está elevado. Recomendación: Renovar inmediatamente el set de creativos creativos. Sustituir imágenes estáticas por videos tipo UGC (User Generated Content) y testimonios reales.");
    } else if (currentCPLNum > 0 && currentCPLNum <= 2.0) {
      suggestions.push("✨ Costo de captación (CPL) sumamente saludable. El embudo está captando eficientemente. Asegurar que el equipo comercial esté contactando a los leads en menos de 10 minutos.");
    }

    if (client.statusMessage.length < 50) {
      suggestions.push("📝 El mensaje de estado del socio es muy corto. Intente redactar un diagnóstico mensual más descriptivo para dar mayor sentido de acompañamiento profesional.");
    }

    if (client.nextSteps.length < 2) {
      suggestions.push("📋 Tienes pocos 'Siguientes Pasos' asignados. Añade hitos claros para el mes activo para reducir la ansiedad del socio y mantener el proyecto alineado.");
    }

    if (suggestions.length === 0) {
      suggestions.push("✅ El socio se encuentra en perfecto estado estratégico. Monitorear de forma regular para mantener la consistencia de resultados.");
    }

    return suggestions;
  };

  // Handle Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ...config,
      accessPassword: newPassword,
      consultantName: tempConsultantName,
      consultantAgency: tempConsultantAgency,
      adminEmail: newAdminEmail
    });
    alert("¡Configuración de la aplicación guardada exitosamente!");
  };

  // Handle Database Backup Export
  const handleExportDatabase = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(clients, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `database_growth_scaling_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      alert("Error al exportar la base de datos.");
    }
  };

  // Handle Database Import
  const handleImportDatabase = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError('');
    setImportSuccess(false);
    try {
      const parsed = JSON.parse(importJsonText);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].companyName) {
        onUpdateClients(parsed);
        setImportSuccess(true);
        setImportJsonText('');
        if (parsed.length > 0) {
          setSelectedClientId(parsed[0].id);
        }
      } else {
        setImportError('El archivo JSON no tiene un formato válido de portafolio de socios.');
      }
    } catch (e) {
      setImportError('Error de análisis JSON: Asegúrate de pegar un arreglo JSON válido.');
    }
  };

  // Simulator computations
  const simulatedLeads = Math.round(simBudget / (simCPL || 1));
  const simulatedRevenue = Math.round(simBudget * simROAS);
  const simulatedROI = Math.round(((simulatedRevenue - simBudget) / (simBudget || 1)) * 100);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-zinc-950 flex flex-col md:flex-row" id="admin-login-view">
        {/* Left Side: Growth Presentation Banner */}
        <div className="hidden md:flex md:w-1/2 bg-slate-900 dark:bg-black text-white p-12 flex-col justify-between relative overflow-hidden select-none border-r border-slate-200 dark:border-zinc-900">
          {/* Ambient light effects */}
          <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="relative z-10">
            <span className="text-[10px] font-mono font-bold tracking-widest text-violet-400 uppercase bg-violet-950/40 px-3 py-1.5 rounded-full border border-violet-900/50">
              GROWTH SCALING CLIENT PORTAL
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-white mt-6 font-display leading-tight">
              Escala tu negocio con precisión matemática y decisiones tácticas.
            </h2>
            <p className="text-slate-400 text-xs mt-3 max-w-md font-sans leading-relaxed">
              La consola definitiva para directores de crecimiento y consultores de negocios. Sincronización en la nube, métricas de retención, automatización de presupuestos y diagnósticos estratégicos en tiempo real.
            </p>
          </div>

          <div className="relative z-10 flex items-center justify-center py-6">
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl max-w-xs aspect-[3/4] bg-zinc-900">
              <img 
                src="/src/assets/images/growth_login_cover_1782519757993.jpg" 
                alt="Growth Scaling Panel" 
                className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-end p-5">
                <span className="text-[9px] font-mono text-emerald-400 font-bold tracking-widest uppercase">Métricas Avanzadas</span>
                <p className="text-white text-xs font-bold mt-1">Monitoreo de ROAS, LTV y Diagnóstico Growth</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-mono font-bold text-xs">
              G
            </div>
            <div>
              <p className="text-xs font-bold text-white font-sans">Growth Partner</p>
              <p className="text-[10px] text-slate-500 font-mono">Consorcio Grow Partner © 2026</p>
            </div>
          </div>
        </div>

        {/* Right Side: Clean Login Form Card */}
        <div className="flex-1 flex items-center justify-center px-4 py-12 bg-slate-50 dark:bg-zinc-950">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl p-8 md:p-10 shadow-xl dark:shadow-black/40 flex flex-col gap-6"
          >
            <div className="text-center space-y-2">
              <div className="inline-flex bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 p-3 rounded-2xl border border-violet-100 dark:border-violet-900/40">
                {isSignUpMode ? <UserPlus className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight font-display">
                {isSignUpMode ? 'Registrar Administrador' : 'Bienvenido Samuel'}
              </h1>
              
              <div className="flex items-center justify-center gap-1.5 pt-0.5">
                <span className={`h-2 w-2 rounded-full ${isSupaConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {isSupaConnected ? 'Modo Cloud: Supabase Activo' : 'Modo Sandbox: Almacenamiento Local'}
                </span>
              </div>
              
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed max-w-sm mx-auto font-sans pt-1">
                {isSignUpMode 
                  ? 'Crea una cuenta administrativa en tu base de datos en tiempo real de Supabase para iniciar tu sesión de manera segura.' 
                  : 'Consola del Director de Crecimiento. Autentícate con tu correo y contraseña asignada para realizar ajustes tácticos.'}
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4 font-sans text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1.5 font-mono">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="ejemplo@partner.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-violet-500/80 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 font-sans outline-none transition-all text-sm"
                    required
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1.5 font-mono">
                  Contraseña Técnica
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-violet-500/80 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 font-sans outline-none transition-all text-sm"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              {authError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 text-center bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/40 font-medium font-sans leading-relaxed">
                  {authError}
                </p>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-bold py-3 px-4 rounded-xl shadow-xs transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer text-sm font-display tracking-wide uppercase"
              >
                {authLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>{isSignUpMode ? 'Registrar Cuenta' : 'Iniciar Sesión'}</span>
                )}
              </button>
            </form>

            {/* Toggle register mode for Supabase Auth */}
            {isSupaConnected && (
              <div className="text-center font-sans">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUpMode(!isSignUpMode);
                    setAuthError('');
                  }}
                  className="text-xs font-bold text-violet-600 hover:text-violet-700 transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  {isSignUpMode ? '¿Ya tienes cuenta? Iniciar Sesión' : '¿Nueva base de datos? Regístrate aquí'}
                </button>
              </div>
            )}

            {/* Hints for Sandbox Mode */}
            {!isSupaConnected && (
              <div className="bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-850 p-3.5 rounded-xl space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">🔑 Credenciales Locales Activas:</span>
                <div className="text-[10.5px] text-slate-600 dark:text-slate-350 leading-relaxed font-mono space-y-1">
                  <div>
                    <span className="text-slate-400 font-sans">Correo:</span> <code className="bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-slate-100 dark:border-zinc-800 font-bold">{config.adminEmail}</code>
                  </div>
                  <div>
                    <span className="text-slate-400 font-sans">Contraseña:</span> <code className="bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-slate-100 dark:border-zinc-800 font-bold">{config.accessPassword}</code>
                  </div>
                  <div className="text-[9px] text-slate-400 font-sans pt-1">
                    * También puedes ingresar con correo <code className="font-bold">admin@partner.com</code> y contraseña <code className="font-bold">admin</code>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800 pt-4">
              <button
                onClick={onBackToClientView}
                className="text-xs font-bold text-slate-500 hover:text-violet-600 transition-colors cursor-pointer font-mono"
              >
                ← Volver a Vista de Cliente
              </button>
              
              <span className="text-[9px] font-mono text-slate-400">
                GROWTH SCALING v3.2
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 font-sans" id="admin-panel-container">
      
      {/* Header section - Extremely clean and dashboard style */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8 pb-5 border-b border-slate-200 dark:border-zinc-850" id="admin-header">
        <div>
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-mono text-[10px] tracking-wider uppercase font-extrabold mb-1">
            <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
            <span>Consola del Consultor de Growth Scaling V3</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-display flex items-center gap-2">
            Gabinete de Crecimiento
            <span className="text-xs font-normal font-mono text-slate-400 px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded border border-slate-200 dark:border-zinc-700">MODO CONSULTOR</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Gestión unificada de socios, simuladores de retorno e integraciones de datos de alta escala.</p>
        </div>
        
        <div className="flex gap-2.5 shrink-0">
          <button
            onClick={onBackToClientView}
            className="bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-850 text-slate-700 dark:text-slate-200 font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            id="admin-btn-back-view"
          >
            <Eye className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span>Volver a Vista Cliente</span>
          </button>

          <button
            onClick={handleLogout}
            className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200/80 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-750 text-xs py-2.5 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            id="admin-btn-logout"
          >
            <X className="w-4 h-4 text-slate-500" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Main Layout - Double Column Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Navigation menu and profile details */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs space-y-1">
            <p className="px-3 py-1 font-mono text-[9px] font-extrabold text-violet-600 dark:text-violet-400 tracking-wider uppercase mb-2">MENÚ CONSULTORÍA</p>
            
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'home' 
                  ? 'bg-violet-600 text-white shadow-sm' 
                  : 'text-slate-605 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Home className="w-4 h-4" />
                <span>Inicio Comercial</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${activeTab === 'home' ? 'text-white' : 'text-slate-400'}`} />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('socios')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'socios' 
                  ? 'bg-violet-600 text-white shadow-sm' 
                  : 'text-slate-605 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>Directorio de Socios</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === 'socios' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300'}`}>{clients.length}</span>
                <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${activeTab === 'socios' ? 'text-white' : 'text-slate-400'}`} />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('diagnostic')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'diagnostic' 
                  ? 'bg-violet-600 text-white shadow-sm' 
                  : 'text-slate-605 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-4 h-4" />
                <span>Diagnóstico del Socio</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${activeTab === 'diagnostic' ? 'text-white' : 'text-slate-400'}`} />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('workspace')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'workspace' 
                  ? 'bg-violet-600 text-white shadow-sm' 
                  : 'text-slate-605 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4" />
                <span>Editor Táctico (Gabinete)</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${activeTab === 'workspace' ? 'text-white' : 'text-slate-400'}`} />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'settings' 
                  ? 'bg-violet-600 text-white shadow-sm' 
                  : 'text-slate-605 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings2 className="w-4 h-4" />
                <span>Configuración de la App</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${activeTab === 'settings' ? 'text-white' : 'text-slate-400'}`} />
            </button>
          </div>

          {/* Active Partner Info Component */}
          {selectedClient && (
            <div className="bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-[0.03] pointer-events-none text-slate-800 dark:text-white">
                <Award className="w-16 h-16" />
              </div>
              <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest text-violet-600 dark:text-violet-400 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                <span>Socio en Foco</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{selectedClient.companyName}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-405 mt-0.5">Propietario: {selectedClient.ownerName}</p>
              </div>
              <div className="border-t border-slate-200 dark:border-zinc-800/80 pt-2.5 flex justify-between items-center text-[10px]">
                <span className="text-slate-550 dark:text-slate-400 font-mono uppercase">ESTADO DE CICLO</span>
                <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-extrabold px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900 font-mono">MES {selectedClient.currentMonth} / 6</span>
              </div>
            </div>
          )}

          {/* Agency Signature */}
          <div className="p-4 bg-violet-50/50 dark:bg-violet-950/15 border border-violet-100 dark:border-violet-950 rounded-2xl text-center">
            <span className="text-[10px] font-mono text-violet-600 dark:text-violet-400 font-extrabold block">CONSULTORÍA FIRMADA</span>
            <span className="text-xs font-bold text-slate-800 dark:text-white mt-1 block">{config.consultantName}</span>
            <span className="text-[10px] text-slate-405 dark:text-slate-500 block mt-0.5">{config.consultantAgency}</span>
          </div>
        </div>

        {/* Right Column: Dynamic Viewport Content */}
        <div className="lg:col-span-9">
          
          <AnimatePresence mode="wait">
            
            {/* TAB 1: INICIO COMERCIAL (HOME) */}
            {activeTab === 'home' && (
              <motion.div
                key="tab-home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Aggregate metric cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between h-32">
                    <div>
                      <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Total Socios en Portafolio</span>
                      <h3 className="text-3xl font-bold font-display text-slate-900 dark:text-white mt-2">{clients.length}</h3>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-2">Cuentas activas en ciclo táctico</p>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between h-32">
                    <div>
                      <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Prospectos Generados</span>
                      <h3 className="text-3xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-2">+{totalLeadsCount.toLocaleString()}</h3>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-2">Contactos de alto valor captados</p>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between h-32">
                    <div>
                      <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Promedio Retorno Pauta (ROAS)</span>
                      <h3 className="text-3xl font-bold font-display text-violet-600 dark:text-violet-400 mt-2">{averageROAS.toFixed(1)}x</h3>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-2">Retorno financiero promedio global</p>
                  </div>
                </div>

                {/* Dashboard Intro Banner */}
                <div className="bg-violet-50/75 dark:bg-violet-950/20 border border-violet-200/80 dark:border-violet-900/60 rounded-3xl p-6 relative overflow-hidden shadow-xs">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.05] text-violet-850 dark:text-white pointer-events-none">
                    <BarChart3 className="w-32 h-32" />
                  </div>
                  <div className="max-w-2xl">
                    <span className="text-[9px] font-mono font-bold tracking-widest text-violet-700 dark:text-violet-300 uppercase bg-violet-100 dark:bg-violet-900 border border-violet-200 dark:border-violet-850 px-2 py-0.5 rounded">CONSOLA OPERATIVA</span>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display mt-2">Administración Growth Scaling Activa</h2>
                    <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed mt-1.5">
                      Bienvenido al centro táctico del consultor. Desde aquí controlas todos los tableros que ven tus socios. Puedes cambiar cifras en tiempo real, añadir eventos clave a la bitácora de pauta y generar enlaces auto-contenidos indestructibles que los socios podrán ver en cualquier dispositivo sin necesidad de registrarse.
                    </p>
                  </div>
                </div>

                {/* Unified Recent Work Feed (Bitácora Global) */}
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-zinc-800 pb-3">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 font-mono">Últimos Hitos en Portafolio</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-405 mt-0.5 font-sans">Bitácora consolidada de acciones tácticas en las cuentas de tus socios</p>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-violet-600 dark:text-violet-400">Canal Seguro</span>
                  </div>

                  <div className="relative pl-6 space-y-5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-zinc-800">
                    {sortedGlobalLogs.length > 0 ? (
                      sortedGlobalLogs.map(({ log, companyName, clientId }) => (
                        <div key={log.id} className="relative group" id={`global-timeline-${log.id}`}>
                          <div className="absolute -left-[21px] top-1 bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-full p-1 group-hover:border-violet-500/50 group-hover:scale-110 transition-all shadow-sm shrink-0 flex items-center justify-center z-10">
                            {getCategoryIcon(log.category)}
                          </div>

                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-50 dark:bg-zinc-950 py-0.5 px-2 rounded border border-slate-200/85 dark:border-zinc-800">
                                {log.date}
                              </span>
                              <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${getCategoryBadgeClass(log.category)}`}>
                                {log.category}
                              </span>
                              <span className="text-[10px] font-sans font-bold text-violet-600 dark:text-violet-400 ml-auto bg-violet-50 dark:bg-violet-950/50 px-2 py-0.5 rounded border border-violet-100 dark:border-violet-900">
                                {companyName}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white font-sans leading-tight mt-0.5">
                              {log.title}
                            </h4>
                            <p className="text-[11px] text-slate-550 dark:text-slate-400 leading-relaxed font-sans">
                              {log.description}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-slate-400 text-xs py-6 font-mono">No hay bitácoras de trabajo ingresadas aún.</div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: DIRECTORIO DE SOCIOS */}
            {activeTab === 'socios' && (
              <motion.div
                key="tab-socios"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Section Header & Form Trigger */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 font-mono">Directorio de Socios Estratégicos</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-405 mt-0.5 font-sans">Listado completo de tableros de crecimiento configurados.</p>
                  </div>
                  
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="text-xs border border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900 text-violet-700 dark:text-violet-300 font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    id="btn-toggle-new-client"
                  >
                    <Plus className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <span>{showAddForm ? 'Cancelar Registro' : 'Registrar Nuevo Socio'}</span>
                  </button>
                </div>

                {/* Add Partner Form */}
                <AnimatePresence>
                  {showAddForm && (
                    <motion.form 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={handleCreateClient} 
                      className="p-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-4 shadow-sm overflow-hidden"
                      id="form-add-client"
                    >
                      <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-zinc-800">
                        <Users className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        <h3 className="text-xs font-bold text-slate-800 dark:text-white font-mono uppercase tracking-wider">Registrar Nuevo Tablero de 6 Meses</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 font-sans">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 font-mono">Nombre de la Empresa o Marca</label>
                          <input
                            type="text"
                            placeholder="Ej: Inversiones Valenzuela S.A."
                            value={newCompany}
                            onChange={(e) => setNewCompany(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-violet-500/50 transition-colors"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 font-mono">Nombre del Propietario</label>
                          <input
                            type="text"
                            placeholder="Ej: Dra. Sofia Rivas"
                            value={newOwner}
                            onChange={(e) => setNewOwner(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-violet-500/50 transition-colors"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 font-mono">Fecha Inicio de Trabajos</label>
                          <input
                            type="date"
                            value={newStart}
                            onChange={(e) => setNewStart(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-violet-500/50 transition-colors"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 font-mono">Rubro de Negocio</label>
                          <select
                            value={newIndustry}
                            onChange={(e) => setNewIndustry(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-violet-500/50 transition-colors font-bold text-violet-700 dark:text-violet-400"
                          >
                            <option value="Bienes Raíces / Real Estate">Bienes Raíces / Real Estate</option>
                            <option value="Salud y Bienestar / Odontología">Salud y Bienestar / Odontología</option>
                            <option value="E-commerce / Retail">E-commerce / Retail</option>
                            <option value="Servicios Premium B2B">Servicios Premium B2B</option>
                            <option value="Estética / Medicina Estética">Estética / Medicina Estética</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddForm(false)}
                          className="bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 font-bold text-xs py-2 px-4 rounded-xl border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer"
                        >
                          Registrar Socio y Generar Tablero
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Partners Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="welcome-clients-list">
                  {clients.map((client) => {
                    const initials = client.companyName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                    
                    return (
                      <div
                        key={client.id}
                        className="border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 rounded-2xl flex flex-col justify-between h-56 relative overflow-hidden group shadow-xs transition-all hover:border-violet-300 dark:hover:border-violet-900"
                      >
                        <div>
                          {/* Card top */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950 border border-violet-150 dark:border-violet-900 flex items-center justify-center font-mono text-sm font-extrabold text-violet-700 dark:text-violet-300">
                                {initials}
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-violet-700 dark:text-violet-400 uppercase tracking-widest block font-mono">
                                  {client.industry}
                                </span>
                                <h3 className="font-bold text-sm text-slate-950 dark:text-white font-display mt-0.5 line-clamp-1">
                                  {client.companyName}
                                </h3>
                              </div>
                            </div>
                            
                            <span className="text-[10px] font-mono font-bold bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-zinc-850 px-2 py-0.5 rounded-md shrink-0">
                              MES {client.currentMonth} / 6
                            </span>
                          </div>

                          {/* Quick Stats Grid */}
                          <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-sans">
                            <div className="bg-slate-50/50 dark:bg-zinc-950 p-2 rounded-lg border border-slate-200/50 dark:border-zinc-800/60">
                              <span className="text-[9px] font-mono font-bold text-slate-400 block uppercase">VENTAS</span>
                              <strong className="text-slate-800 dark:text-slate-200 text-[11px] font-bold mt-0.5 block">{client.kpis.ventas.value}</strong>
                            </div>
                            <div className="bg-slate-50/50 dark:bg-zinc-950 p-2 rounded-lg border border-slate-200/50 dark:border-zinc-800/60">
                              <span className="text-[9px] font-mono font-bold text-slate-400 block uppercase">CONTACTOS</span>
                              <strong className="text-slate-800 dark:text-slate-200 text-[11px] font-bold mt-0.5 block">{client.kpis.leads.value}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Interactive actions */}
                        <div className="w-full flex items-center justify-between mt-4 border-t border-slate-100 dark:border-zinc-800/80 pt-3">
                          <span className="text-[11px] text-slate-500 dark:text-slate-405 font-sans">
                            Socio: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{client.ownerName}</strong>
                          </span>
                          
                          <div className="flex items-center gap-1.5">
                            {/* Diagnostic Deep Dive */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClientId(client.id);
                                setActiveTab('diagnostic');
                              }}
                              className="bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-150 dark:border-emerald-900 p-2 rounded-xl transition-all text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 cursor-pointer"
                              title="Diagnosticar y Simular"
                            >
                              <BarChart3 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Diagnóstico</span>
                            </button>

                            {/* Manage workspace */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClientId(client.id);
                                setActiveTab('workspace');
                              }}
                              className="bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900 text-violet-700 dark:text-violet-300 border border-violet-150 dark:border-violet-900 p-2 rounded-xl transition-all text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              title="Editar Métricas en Gabinete"
                            >
                              <Settings2 className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>

                            {/* View direct client screen */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClientId(client.id);
                                onSelectClientForView(client.id);
                                onBackToClientView();
                              }}
                              className="bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-750 text-slate-600 dark:text-slate-300 p-2 rounded-xl transition-all cursor-pointer"
                              title="Previsualizar Portal Cliente"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Trash button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteClient(client.id)}
                              className="p-2 border border-slate-200 dark:border-zinc-800 hover:border-rose-200 text-slate-450 hover:text-rose-600 bg-white dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                              title="Eliminar Cuenta Permanente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* TAB 3: DIAGNÓSTICO DEL SOCIO & SIMULADOR DE DECISIONES */}
            {activeTab === 'diagnostic' && selectedClient && (
              <motion.div
                key="tab-diagnostic"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Switcher Header */}
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    <div>
                      <h2 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">Diagnóstico & Toma de Decisiones</h2>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">Socio Activo: {selectedClient.companyName}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Cambiar Socio:</span>
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-bold text-violet-750 dark:text-violet-400 outline-none"
                    >
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.companyName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Grid for diagnostic metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {(Object.entries(selectedClient.kpis) as [string, KPIValue][]).map(([key, kpi]) => (
                    <div key={key} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-slate-405 dark:text-slate-500 uppercase block tracking-wider">{kpi.label}</span>
                        <h4 className="text-xl font-bold font-sans text-slate-900 dark:text-white mt-1">{kpi.value}</h4>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-405">Estado:</span>
                        <span className={`font-mono font-black uppercase text-[10px] px-1.5 py-0.5 rounded ${
                          kpi.rating === 'success' 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' 
                            : kpi.rating === 'warning'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                        }`}>
                          {kpi.rating}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Diagnostic and Simulator Splitted */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left block: Automated Strategy suggestions (AI audit copy) */}
                  <div className="lg:col-span-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
                      <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-850 dark:text-white">Auditoría & Sugerencias Estratégicas</h3>
                    </div>

                    <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-sans">
                      El motor analiza constantemente la correlación entre el ROAS, el costo de captación y los hitos completados de este socio para ofrecerte pautas consultivas inmediatas:
                    </p>

                    <div className="space-y-3 font-sans">
                      {getDiagnosticSuggestions(selectedClient).map((s, i) => (
                        <div key={i} className="p-3 bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800/80 rounded-xl text-xs text-slate-705 dark:text-slate-300 leading-relaxed flex items-start gap-2">
                          <span className="shrink-0 text-violet-500 font-bold">•</span>
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 bg-violet-50/55 dark:bg-violet-950/10 border border-violet-100 dark:border-violet-900 rounded-xl space-y-2 font-sans">
                      <span className="text-[10px] font-mono font-bold text-violet-750 dark:text-violet-400 uppercase tracking-wider">PREVISIÓN DE TRASPASO (MES {selectedClient.currentMonth})</span>
                      <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                        {selectedClient.currentMonth < 3 
                          ? "Fase de Lanzamiento: Enfocar el 100% de la energía en la madurez y volumen del píxel." 
                          : selectedClient.currentMonth < 5 
                            ? "Fase de Estabilización: Auditoría periódica de flujos de WhatsApp y tasas de cierre del socio." 
                            : "Fase de Cierre o Renovación: Preparar el reporte de retorno acumulado e iniciar la presentación para el ciclo II de 6 meses."}
                      </p>
                    </div>
                  </div>

                  {/* Right block: Interactive Decision-making simulator */}
                  <div className="lg:col-span-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-5">
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
                      <Sliders className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-850 dark:text-white">Simulador de Toma de Decisiones Financieras</h3>
                    </div>

                    <p className="text-xs text-slate-550 dark:text-slate-405 leading-relaxed font-sans">
                      Simula cambios de presupuesto o eficiencias publicitarias con este socio para justificar cambios de estrategia en tu próxima llamada mensual:
                    </p>

                    {/* Inputs sliders */}
                    <div className="space-y-4 font-sans">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-600 dark:text-slate-400">Presupuesto Mensual Simulado:</span>
                          <span className="text-violet-600 dark:text-violet-400 font-mono">${simBudget.toLocaleString()} USD</span>
                        </div>
                        <input
                          type="range"
                          min="100"
                          max="10000"
                          step="100"
                          value={simBudget}
                          onChange={(e) => setSimBudget(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-600"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-600 dark:text-slate-400">Costo por Lead (CPL) Objetivo:</span>
                          <span className="text-cyan-600 dark:text-cyan-400 font-mono">${simCPL.toFixed(2)} USD</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="15.0"
                          step="0.1"
                          value={simCPL}
                          onChange={(e) => setSimCPL(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-600 dark:text-slate-400">ROAS de Campaña Proyectado:</span>
                          <span className="text-violet-600 dark:text-violet-400 font-mono">{simROAS.toFixed(1)}x ROAS</span>
                        </div>
                        <input
                          type="range"
                          min="1.0"
                          max="10.0"
                          step="0.1"
                          value={simROAS}
                          onChange={(e) => setSimROAS(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-600"
                        />
                      </div>
                    </div>

                    {/* Calculated Output metrics */}
                    <div className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-xl grid grid-cols-3 gap-3 border border-slate-250/50 dark:border-zinc-850">
                      <div className="text-center">
                        <span className="text-[9px] font-mono font-bold text-slate-450 uppercase block">LEADS SIMULADOS</span>
                        <strong className="text-sm font-black text-cyan-600 dark:text-cyan-400 mt-1 block">+{simulatedLeads} leads</strong>
                      </div>
                      <div className="text-center">
                        <span className="text-[9px] font-mono font-bold text-slate-455 uppercase block">FACTURACIÓN BRUTA</span>
                        <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1 block">${simulatedRevenue.toLocaleString()} USD</strong>
                      </div>
                      <div className="text-center">
                        <span className="text-[9px] font-mono font-bold text-slate-455 uppercase block">NET ROI COMERCIAL</span>
                        <strong className="text-sm font-black text-violet-600 dark:text-violet-400 mt-1 block">+{simulatedROI}%</strong>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-405 dark:text-slate-500 font-mono leading-relaxed text-center">
                      *Los cálculos son estimaciones matemáticas basadas en un modelo simplificado de conversión constante de embudo.
                    </p>
                  </div>

                </div>
              </motion.div>
            )}

            {/* TAB 4: GABINETE DE TRABAJO (WORKSPACE DETALLADO) */}
            {activeTab === 'workspace' && selectedClient && (
              <motion.div
                key="tab-workspace"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Workspace Top Bar with Account Switcher */}
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    <div>
                      <h2 className="text-xs font-mono font-bold text-slate-405 dark:text-slate-400 uppercase tracking-widest">Gabinete de Gestión Estratégica</h2>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">Editor Activo: {selectedClient.companyName}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Alternar Cuenta:</span>
                    <select
                      value={selectedClientId}
                      onChange={(e) => {
                        setSelectedClientId(e.target.value);
                        onSelectClientForView(e.target.value);
                      }}
                      className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-bold text-violet-750 dark:text-violet-400 outline-none focus:border-violet-500/50"
                    >
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.companyName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Save Confirmation Feedback Banner & Action Button */}
                <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-violet-850 dark:text-violet-350 uppercase tracking-widest font-mono">Gabinete de Edición Activo</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                      Los datos de KPIs, notas e historial se aplican en tiempo real. Utiliza este botón para guardar y confirmar.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onUpdateClients([...clients]);
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 3500);
                    }}
                    className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs py-2.5 px-5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow-md active:scale-98 shrink-0 animate-pulse-once"
                    id="btn-save-client-data"
                  >
                    <Check className="w-4 h-4" />
                    <span>Guardar y Actualizar Datos</span>
                  </button>
                </div>

                {saveSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 text-sm">✓</span>
                      <span>¡Los datos de <strong>{selectedClient.companyName}</strong> se han actualizado e integrado de forma segura en la base de datos!</span>
                    </div>
                    <button onClick={() => setSaveSuccess(false)} className="text-emerald-550 hover:text-emerald-700 font-mono text-xs">✕</button>
                  </motion.div>
                )}

                {/* Secure URL Compartible */}
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-widest font-mono">
                      🔗 Enlace Seguro de Socio Integrado
                    </h3>
                    <p className="text-slate-650 dark:text-slate-300 text-xs leading-relaxed max-w-2xl">
                      Este socio comercial puede acceder directamente a su panel de lectura utilizando este link privado auto-contenido, sin contraseñas ni registros, y ver sus datos reales en cualquier teléfono u ordenador.
                    </p>
                    <code className="text-[10px] break-all bg-white dark:bg-zinc-950 px-2 py-1.5 rounded inline-block border border-slate-200 dark:border-zinc-800 text-emerald-700 dark:text-emerald-350 font-mono mt-2 select-all">
                      {getShareableLink(selectedClient)}
                    </code>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(getShareableLink(selectedClient));
                        alert("¡Enlace privado auto-contenido copiado exitosamente! Puedes enviarlo por WhatsApp o correo.");
                      }}
                      className="bg-white dark:bg-zinc-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-850 text-emerald-800 dark:text-emerald-300 font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-xs"
                    >
                      <Copy className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Copiar Enlace Seguro</span>
                    </button>

                    <button
                      onClick={() => generatePDFReport(selectedClient, config.consultantName, config.consultantAgency)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar Reporte PDF</span>
                    </button>
                  </div>
                </div>

                {/* Split workspace into Left and Right Subsections */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Workspace Side: Base Info & Basic settings */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-zinc-800">
                        <Database className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white font-mono">Información Corporativa</h4>
                      </div>

                      <div className="space-y-3 font-sans text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 font-mono">Nombre de la Empresa</label>
                          <input
                            type="text"
                            value={selectedClient.companyName}
                            onChange={(e) => handleBaseFieldChange('companyName', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 font-mono">Propietario de la Empresa</label>
                          <input
                            type="text"
                            value={selectedClient.ownerName}
                            onChange={(e) => handleBaseFieldChange('ownerName', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 font-mono">Industria u Especialidad</label>
                          <input
                            type="text"
                            value={selectedClient.industry}
                            onChange={(e) => handleBaseFieldChange('industry', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 font-mono">Mes de Ciclo Actual</label>
                          <select
                            value={selectedClient.currentMonth}
                            onChange={(e) => handleBaseFieldChange('currentMonth', Number(e.target.value))}
                            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-violet-750 dark:text-violet-400 font-bold"
                          >
                            <option value={1}>Mes 1 de 6 (Instalación & Estrategia)</option>
                            <option value={2}>Mes 2 de 6 (Lanzamiento inicial en pauta)</option>
                            <option value={3}>Mes 3 de 6 (Optimización de flujos)</option>
                            <option value={4}>Mes 4 de 6 (Consolidación comercial)</option>
                            <option value={5}>Mes 5 de 6 (Escalamiento de campaña)</option>
                            <option value={6}>Mes 6 de 6 (Cierre & Traspaso o Renovación)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 font-mono">Mensaje de Diagnóstico Mensual</label>
                          <textarea
                            value={selectedClient.statusMessage}
                            onChange={(e) => handleStatusMessageChange(e.target.value)}
                            rows={4}
                            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white leading-relaxed resize-none"
                            placeholder="Ej: Las pautas están madurando rápido..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Siguientes Pasos assigned section */}
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white font-mono">Pasos a Seguir Asignados</h4>
                        </div>
                        <span className="text-[10px] text-slate-405 font-mono">{selectedClient.nextSteps.length} Hitos</span>
                      </div>

                      <div className="space-y-2 font-sans text-xs">
                        {selectedClient.nextSteps.map((step, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-800/80 rounded-xl group">
                            <span className="text-xs text-slate-700 dark:text-slate-300 pr-2 leading-snug">{step}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveStep(idx)}
                              className="text-slate-400 hover:text-rose-600 opacity-50 group-hover:opacity-100 transition-all p-1 cursor-pointer"
                              title="Eliminar Paso"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        <div className="flex gap-2 pt-2">
                          <input
                            type="text"
                            placeholder="Agregar nuevo paso clave..."
                            value={newStepText}
                            onChange={(e) => setNewStepText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddStep(); } }}
                            className="flex-grow bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-violet-500/50 text-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={handleAddStep}
                            className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Añadir</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Workspace Side: Edit KPIs & Add Timeline logs & adjust charts */}
                  <div className="lg:col-span-7 space-y-6">
                    
                    {/* EDIT INTUIVELY FOUR KPI NUMBERS */}
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-zinc-800">
                        <TrendingUp className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white font-mono">Modificar Cifras de KPIs</h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans text-xs">
                        
                        {/* Ventas block */}
                        <div className="bg-slate-50/50 dark:bg-zinc-950/40 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800 space-y-2">
                          <span className="text-[10px] font-mono font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wide">1. Ventas Atribuibles</span>
                          <div>
                            <label className="text-[9px] text-slate-450 uppercase block font-mono">Valor Principal</label>
                            <input
                              type="text"
                              value={selectedClient.kpis.ventas.value}
                              onChange={(e) => handleUpdateKPI('ventas', 'value', e.target.value)}
                              className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-450 uppercase block font-mono">Cambio / Leyenda secundaria</label>
                            <input
                              type="text"
                              value={selectedClient.kpis.ventas.change}
                              onChange={(e) => handleUpdateKPI('ventas', 'change', e.target.value)}
                              className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-650 dark:text-slate-350"
                            />
                          </div>
                          <div className="flex justify-between items-center text-[10px] pt-1">
                            <span>Calificación Visual:</span>
                            <select
                              value={selectedClient.kpis.ventas.rating}
                              onChange={(e) => handleUpdateKPI('ventas', 'rating', e.target.value)}
                              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-750 rounded text-[10px] font-bold text-violet-700 dark:text-violet-400 px-1.5 py-0.5"
                            >
                              <option value="success">Success (Verde)</option>
                              <option value="warning">Warning (Ámbar)</option>
                              <option value="alert">Alert (Rojo)</option>
                            </select>
                          </div>
                        </div>

                        {/* Leads block */}
                        <div className="bg-slate-50/50 dark:bg-zinc-950/40 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800 space-y-2">
                          <span className="text-[10px] font-mono font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wide">2. Contactos Calificados</span>
                          <div>
                            <label className="text-[9px] text-slate-450 uppercase block font-mono">Valor Principal</label>
                            <input
                              type="text"
                              value={selectedClient.kpis.leads.value}
                              onChange={(e) => handleUpdateKPI('leads', 'value', e.target.value)}
                              className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-450 uppercase block font-mono">Cambio / Leyenda secundaria</label>
                            <input
                              type="text"
                              value={selectedClient.kpis.leads.change}
                              onChange={(e) => handleUpdateKPI('leads', 'change', e.target.value)}
                              className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-650 dark:text-slate-350"
                            />
                          </div>
                          <div className="flex justify-between items-center text-[10px] pt-1">
                            <span>Calificación Visual:</span>
                            <select
                              value={selectedClient.kpis.leads.rating}
                              onChange={(e) => handleUpdateKPI('leads', 'rating', e.target.value)}
                              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-750 rounded text-[10px] font-bold text-violet-700 dark:text-violet-400 px-1.5 py-0.5"
                            >
                              <option value="success">Success (Verde)</option>
                              <option value="warning">Warning (Ámbar)</option>
                              <option value="alert">Alert (Rojo)</option>
                            </select>
                          </div>
                        </div>

                        {/* Costo por lead (CPL) */}
                        <div className="bg-slate-50/50 dark:bg-zinc-950/40 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800 space-y-2">
                          <span className="text-[10px] font-mono font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wide">3. Costo por Lead (CPL)</span>
                          <div>
                            <label className="text-[9px] text-slate-450 uppercase block font-mono">Valor Principal</label>
                            <input
                              type="text"
                              value={selectedClient.kpis.cpl.value}
                              onChange={(e) => handleUpdateKPI('cpl', 'value', e.target.value)}
                              className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-450 uppercase block font-mono">Cambio / Leyenda secundaria</label>
                            <input
                              type="text"
                              value={selectedClient.kpis.cpl.change}
                              onChange={(e) => handleUpdateKPI('cpl', 'change', e.target.value)}
                              className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-650 dark:text-slate-350"
                            />
                          </div>
                          <div className="flex justify-between items-center text-[10px] pt-1">
                            <span>Calificación Visual:</span>
                            <select
                              value={selectedClient.kpis.cpl.rating}
                              onChange={(e) => handleUpdateKPI('cpl', 'rating', e.target.value)}
                              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-750 rounded text-[10px] font-bold text-violet-700 dark:text-violet-400 px-1.5 py-0.5"
                            >
                              <option value="success">Success (Verde)</option>
                              <option value="warning">Warning (Ámbar)</option>
                              <option value="alert">Alert (Rojo)</option>
                            </select>
                          </div>
                        </div>

                        {/* ROAS block */}
                        <div className="bg-slate-50/50 dark:bg-zinc-950/40 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800 space-y-2">
                          <span className="text-[10px] font-mono font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wide">4. Retorno de Pauta (ROAS)</span>
                          <div>
                            <label className="text-[9px] text-slate-450 uppercase block font-mono">Valor Principal</label>
                            <input
                              type="text"
                              value={selectedClient.kpis.roas.value}
                              onChange={(e) => handleUpdateKPI('roas', 'value', e.target.value)}
                              className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-450 uppercase block font-mono">Cambio / Leyenda secundaria</label>
                            <input
                              type="text"
                              value={selectedClient.kpis.roas.change}
                              onChange={(e) => handleUpdateKPI('roas', 'change', e.target.value)}
                              className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-650 dark:text-slate-350"
                            />
                          </div>
                          <div className="flex justify-between items-center text-[10px] pt-1">
                            <span>Calificación Visual:</span>
                            <select
                              value={selectedClient.kpis.roas.rating}
                              onChange={(e) => handleUpdateKPI('roas', 'rating', e.target.value)}
                              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-750 rounded text-[10px] font-bold text-violet-700 dark:text-violet-400 px-1.5 py-0.5"
                            >
                              <option value="success">Success (Verde)</option>
                              <option value="warning">Warning (Ámbar)</option>
                              <option value="alert">Alert (Rojo)</option>
                            </select>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* MONTHS PROGRESS GRAPH EDIT VALUES */}
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center gap-1.5">
                          <BarChart3 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white font-mono">Modificar Gráficos Mensuales</h4>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleRemoveMonthFromChart}
                            className="bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 text-[10px] px-2 py-1 rounded-md border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                            title="Quitar mes final"
                          >
                            - Mes
                          </button>
                          <button
                            type="button"
                            onClick={handleAddMonthToChart}
                            className="bg-violet-50 dark:bg-violet-950 hover:bg-violet-100 text-[10px] font-bold px-2.5 py-1 rounded-md border border-violet-150 text-violet-700 dark:text-violet-300 transition-colors cursor-pointer"
                            title="Añadir mes de ciclo"
                          >
                            + Añadir Mes
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans mt-1">
                        Modifica los valores numéricos de cada mes para actualizar instantáneamente las barras y líneas del cliente:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 text-xs font-sans">
                        <div className="bg-slate-50/45 dark:bg-zinc-950/30 p-3.5 border border-slate-200/80 dark:border-zinc-800 rounded-xl space-y-3">
                          <span className="font-mono text-[10px] font-bold text-violet-750 dark:text-violet-400 uppercase tracking-wider block border-b border-slate-100 dark:border-zinc-800 pb-1.5">Valores de Ventas</span>
                          <div className="space-y-2">
                            {selectedClient.salesHistory.map((pt, i) => (
                              <div key={i} className="flex justify-between items-center">
                                <span className="font-mono text-[11px] text-slate-500">{pt.label}:</span>
                                <input
                                  type="number"
                                  value={pt.value}
                                  onChange={(e) => handleChartPointChange('sales', i, Number(e.target.value))}
                                  className="w-24 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded text-right px-2 py-1 text-xs text-slate-850 dark:text-white"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-slate-50/45 dark:bg-zinc-950/30 p-3.5 border border-slate-200/80 dark:border-zinc-800 rounded-xl space-y-3">
                          <span className="font-mono text-[10px] font-bold text-cyan-705 dark:text-cyan-400 uppercase tracking-wider block border-b border-slate-100 dark:border-zinc-800 pb-1.5">Valores de Prospectos (Leads)</span>
                          <div className="space-y-2">
                            {selectedClient.leadsHistory.map((pt, i) => (
                              <div key={i} className="flex justify-between items-center">
                                <span className="font-mono text-[11px] text-slate-500">{pt.label}:</span>
                                <input
                                  type="number"
                                  value={pt.value}
                                  onChange={(e) => handleChartPointChange('leads', i, Number(e.target.value))}
                                  className="w-24 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded text-right px-2 py-1 text-xs text-slate-850 dark:text-white"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ADD TIMELINE/BITÁCORA LOGS */}
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-zinc-800">
                        <Clock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white font-mono">Bitácora Técnica / Historial del Socio</h4>
                      </div>

                      {/* Add Log Form */}
                      <form onSubmit={handleAddLog} className="bg-slate-50 dark:bg-zinc-950 p-4 border border-slate-200 dark:border-zinc-850 rounded-xl space-y-3 font-sans text-xs">
                        <span className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">Añadir Nuevo Hito Táctico</span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] text-slate-450 uppercase mb-1 font-mono">Fecha</label>
                            <input
                              type="date"
                              value={logDate}
                              onChange={(e) => setLogDate(e.target.value)}
                              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                              required
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] text-slate-450 uppercase mb-1 font-mono">Título del Hito</label>
                            <input
                              type="text"
                              placeholder="Ej: Lanzamiento campaña Black Friday"
                              value={logTitle}
                              onChange={(e) => logTitle.length <= 60 ? setLogTitle(e.target.value) : null}
                              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] text-slate-450 uppercase mb-1 font-mono">Descripción estratégica del hito</label>
                            <input
                              type="text"
                              placeholder="Ej: Cambiamos creativos de video y redujimos costo por lead un 30%..."
                              value={logDesc}
                              onChange={(e) => setLogDesc(e.target.value)}
                              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-450 uppercase mb-1 font-mono">Categoría Técnica</label>
                            <select
                              value={logCategory}
                              onChange={(e: any) => setLogCategory(e.target.value)}
                              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-bold text-violet-700 dark:text-violet-400 outline-none"
                            >
                              <option value="estrategia">Estrategia Comercial</option>
                              <option value="pauta">Pauta Publicitaria</option>
                              <option value="contenido">Producción Contenido</option>
                              <option value="optimizacion">Optimización Conversión</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="submit"
                            className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-xs cursor-pointer flex items-center gap-1 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Registrar en Bitácora</span>
                          </button>
                        </div>
                      </form>

                      {/* Log List layout */}
                      <div className="space-y-2 font-sans text-xs">
                        <span className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase block">Bitácoras Publicadas ({selectedClient.logEntries.length})</span>
                        <div className="max-h-64 overflow-y-auto pr-1 space-y-2.5">
                          {selectedClient.logEntries.map((log) => (
                            <div key={log.id} className="p-3 bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800/80 rounded-xl flex items-start gap-2.5 justify-between">
                              <div className="space-y-1 pr-3">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[10px] font-mono font-bold text-slate-500">{log.date}</span>
                                  <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.2 rounded border ${getCategoryBadgeClass(log.category)}`}>
                                    {log.category}
                                  </span>
                                </div>
                                <h5 className="font-bold text-slate-900 dark:text-white leading-tight mt-1">{log.title}</h5>
                                <p className="text-[11px] text-slate-550 dark:text-slate-400 leading-normal">{log.description}</p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveLog(log.id)}
                                className="p-1.5 border border-slate-200 dark:border-zinc-850 hover:border-rose-200 text-slate-400 hover:text-rose-600 bg-white dark:bg-zinc-900 hover:bg-rose-50 rounded-lg transition-all shrink-0 cursor-pointer"
                                title="Eliminar registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>

                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 5: CONFIGURACIÓN DE LA APLICACIÓN */}
            {activeTab === 'settings' && (
              <motion.div
                key="tab-settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Side settings: Security, password, themes */}
                  <form onSubmit={handleSaveSettings} className="lg:col-span-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
                      <Settings2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-850 dark:text-white">Ajustes del Sistema</h3>
                    </div>

                    <div className="space-y-3 font-sans text-xs">
                      {/* Password Config */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 font-mono">Clave de Acceso del Consultor</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
                            required
                          />
                          <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        </div>
                        <p className="text-[10px] text-slate-405 dark:text-slate-500 mt-1">Sustituye la contraseña por defecto (growth2026) para asegurar tus tableros.</p>
                      </div>

                      {/* Admin Email Config */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 font-mono">Correo de Acceso del Consultor</label>
                        <div className="relative">
                          <input
                            type="email"
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white"
                            required
                          />
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        </div>
                        <p className="text-[10px] text-slate-405 dark:text-slate-500 mt-1">Sustituye el correo del administrador (modo sandbox/local).</p>
                      </div>

                      {/* Consultant Signature parameters */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 font-mono">Firma del Socio Growth Partner</label>
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Nombre del Consultor..."
                            value={tempConsultantName}
                            onChange={(e) => setTempConsultantName(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            placeholder="Nombre de la Agencia..."
                            value={tempConsultantAgency}
                            onChange={(e) => setTempConsultantAgency(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Guardar Configuración General
                    </button>
                  </form>

                  {/* Right Side Settings: Database back up and full JSON Import/export */}
                  <div className="lg:col-span-6 space-y-6">
                    
                    {/* Database Backup Export */}
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
                        <Download className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-850 dark:text-white">Resguardo de Información (Backups)</h3>
                      </div>

                      <p className="text-xs text-slate-550 dark:text-slate-405 leading-relaxed font-sans">
                        La base de datos se guarda automáticamente en el caché (Local Storage) de tu navegador. Si deseas cambiar de dispositivo o limpiar el caché sin perder tus datos, descarga este archivo de respaldo:
                      </p>

                      <button
                        onClick={handleExportDatabase}
                        className="w-full bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-violet-600" />
                        <span>Exportar Base de Datos (.json)</span>
                      </button>
                    </div>

                    {/* Database Import JSON */}
                    <form onSubmit={handleImportDatabase} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
                        <Upload className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-850 dark:text-white">Restaurar Base de Datos</h3>
                      </div>

                      <p className="text-xs text-slate-550 dark:text-slate-405 leading-relaxed font-sans">
                        Pega el código JSON de un respaldo previo aquí para restaurar todo tu portafolio de socios inmediatamente:
                      </p>

                      <div className="space-y-3 font-sans text-xs">
                        <textarea
                          rows={3}
                          value={importJsonText}
                          onChange={(e) => setImportJsonText(e.target.value)}
                          placeholder="Pegar JSON de respaldo..."
                          className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs leading-normal resize-none font-mono"
                          required
                        />

                        {importError && (
                          <p className="text-xs text-rose-650 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 p-2 rounded-lg font-mono">{importError}</p>
                        )}

                        {importSuccess && (
                          <p className="text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 p-2 rounded-lg font-mono font-bold">¡Datos de portafolio importados y cargados exitosamente!</p>
                        )}

                        <button
                          type="submit"
                          className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Importar y Sobrescribir Base de Datos</span>
                        </button>
                      </div>
                    </form>

                    {/* SUPABASE INTEGRATION BLOCK */}
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-850 dark:text-white">Conexión con Supabase (Live Backend)</h3>
                        </div>
                        <span className={`text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-full ${isSupaConnected ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'}`}>
                          {isSupaConnected ? '● CONECTADO' : '● MODO LOCAL'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-sans">
                        Sincroniza tus clientes, métricas y bitácoras en tiempo real con una base de datos PostgreSQL en la nube. Perfecto para asegurar persistencia y desplegar en <strong>Vercel</strong>.
                      </p>

                      <div className="space-y-3 font-sans text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 font-mono">SUPABASE_URL</label>
                          <input
                            type="text"
                            placeholder="https://xxxxxxxxx.supabase.co"
                            value={supabaseUrl}
                            onChange={(e) => setSupabaseUrl(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 font-mono">SUPABASE_ANON_KEY (Public Key)</label>
                          <input
                            type="password"
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                            value={supabaseAnonKey}
                            onChange={(e) => setSupabaseAnonKey(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono"
                          />
                        </div>

                        {supaTestMsg && (
                          <div className={`p-3 rounded-xl border text-[11px] leading-relaxed font-sans ${isSupaConnected ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-800 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 text-rose-800 dark:text-rose-300'}`}>
                            {supaTestMsg}
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-2 pt-1">
                          <button
                            type="button"
                            disabled={isTestingSupa}
                            onClick={() => handleTestSupabase(supabaseUrl, supabaseAnonKey)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isTestingSupa ? 'animate-spin' : ''}`} />
                            <span>{isTestingSupa ? 'Verificando...' : 'Guardar y Vincular Supabase'}</span>
                          </button>

                          {isSupaConnected && (
                            <button
                              type="button"
                              onClick={handleDisconnectSupabase}
                              className="bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 text-rose-600 border border-rose-200 dark:border-rose-900/60 font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                            >
                              <span>Desconectar</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* SQL Schema helper copy block */}
                      <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 space-y-2 font-sans text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">1. Script para tu Editor de SQL</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
                              setCopiedSQL(true);
                              setTimeout(() => setCopiedSQL(false), 2000);
                            }}
                            className="text-[10px] text-violet-600 hover:text-violet-700 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedSQL ? '¡Copiado!' : 'Copiar Script SQL'}</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Antes de probar la conexión, copia este script y ejecútalo en el <strong>SQL Editor</strong> de tu panel de Supabase para estructurar las tablas:
                        </p>
                        <pre className="p-3 bg-slate-950 border border-zinc-850 text-[10px] leading-relaxed text-zinc-300 rounded-xl max-h-40 overflow-y-auto font-mono text-left scrollbar-thin">
                          {SUPABASE_SQL_SCHEMA}
                        </pre>
                      </div>
                    </div>

                  </div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

    </div>
  );
};
