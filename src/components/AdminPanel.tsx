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
  UserPlus,
  Compass,
  Video,
  Link2
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

const SCALING_PHRASES = [
  "«El verdadero crecimiento no es solo facturar más, es construir un sistema que pueda multiplicarse sin tu presencia física.»",
  "«Para duplicar el rendimiento, primero simplifica la estructura. El desorden es el peor enemigo del escalamiento.»",
  "«No persigas ventas efímeras; optimiza el Valor de Vida del Cliente (LTV) y el Costo de Adquisición (CAC) para escalar de manera sostenible.»",
  "«La pauta publicitaria atrae tráfico, pero la estrategia de retención y la oferta irresistible construyen imperios comerciales.»",
  "«Escalar requiere delegar con sistemas y monitorear con métricas duras en tiempo real.»"
];

interface AdminPanelProps {
  clients: ClientBoard[];
  onUpdateClients: (updatedClients: ClientBoard[], forceSync?: boolean) => void;
  onSelectClientForView: (clientId: string) => void;
  onBackToClientView: () => void;
  config: AppConfig;
  onUpdateConfig: (updatedConfig: AppConfig) => void;
  onSupabaseConfigChange?: () => void;
  onAuthChange?: (authenticated: boolean) => void;
  onClientLogin?: (clientId: string) => void;
  activeTab: 'home' | 'socios' | 'diagnostic' | 'workspace' | 'settings';
  onTabChange: (tab: 'home' | 'socios' | 'diagnostic' | 'workspace' | 'settings') => void;
  isAdminAuthenticated?: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  clients,
  onUpdateClients,
  onSelectClientForView,
  onBackToClientView,
  config,
  onUpdateConfig,
  onSupabaseConfigChange,
  onAuthChange,
  onClientLogin,
  activeTab,
  onTabChange,
  isAdminAuthenticated
}) => {
  // Supabase states first so other hooks can reference isSupaConnected
  const [supabaseUrl, setSupabaseUrl] = useState(() => getSupabaseCredentials()?.url || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(() => getSupabaseCredentials()?.anonKey || '');
  const [isSupaConnected, setIsSupaConnected] = useState(() => !!getSupabaseClient());
  const [isTestingSupa, setIsTestingSupa] = useState(false);
  const [supaTestMsg, setSupaTestMsg] = useState('');
  const [copiedSQL, setCopiedSQL] = useState(false);

  const [emailInput, setEmailInput] = useState(() => (config?.adminEmail || 'consultor@partner.com'));
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!isAdminAuthenticated);
  const [authError, setAuthError] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Sync with parent authentication prop if provided
  React.useEffect(() => {
    if (isAdminAuthenticated !== undefined) {
      setIsAuthenticated(isAdminAuthenticated);
    }
  }, [isAdminAuthenticated]);

  const [loginTab, setLoginTab] = useState<'client' | 'admin'>('admin');
  const [accessKeyInput, setAccessKeyInput] = useState('');
  const [targetClient, setTargetClient] = useState<ClientBoard | null>(null);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);

  // Automatically rotate business scaling phrases
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhraseIndex((prev) => (prev + 1) % SCALING_PHRASES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Sync target client from URL Hash to display custom greeting on login screen
  React.useEffect(() => {
    const handleHashCheck = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#cliente/')) {
        const id = hash.substring('#cliente/'.length);
        const matched = clients.find(c => c.id === id);
        if (matched) {
          setTargetClient(matched);
          setLoginTab('client');
        } else {
          setTargetClient(null);
        }
      } else {
        setTargetClient(null);
      }
    };
    handleHashCheck();
    window.addEventListener('hashchange', handleHashCheck);
    return () => window.removeEventListener('hashchange', handleHashCheck);
  }, [clients]);

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

  // Hook to check OpenAI API Key status when connected to Supabase
  const checkOpenAiKeyStatus = async () => {
    const client = getSupabaseClient();
    if (!client) {
      setIsOpenAiKeyConfigured(false);
      return;
    }
    setIsOpenAiKeyLoading(true);
    try {
      const { data, error } = await (client as any)
        .from('app_settings')
        .select('value')
        .eq('key', 'openai_api_key')
        .maybeSingle();

      if (error) {
        console.warn("Could not check OpenAI API Key status:", error.message);
        setIsOpenAiKeyConfigured(false);
      } else if (data && data.value) {
        setIsOpenAiKeyConfigured(true);
      } else {
        setIsOpenAiKeyConfigured(false);
      }
    } catch (err) {
      console.warn("Could not check OpenAI API Key:", err);
      setIsOpenAiKeyConfigured(false);
    } finally {
      setIsOpenAiKeyLoading(false);
    }
  };

  React.useEffect(() => {
    if (isSupaConnected) {
      checkOpenAiKeyStatus();
    } else {
      setIsOpenAiKeyConfigured(false);
    }
  }, [isSupaConnected]);
  
  // Navigation Tabs inside Admin Mode: 'home' | 'socios' | 'diagnostic' | 'workspace' | 'settings'
  const setActiveTab = onTabChange;

  // Currently selected client for editing inside the workspace
  const [selectedClientId, setSelectedClientId] = useState<string>(
    clients.length > 0 ? clients[0].id : ''
  );

  // Form states for creating new client
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [newStart, setNewStart] = useState(new Date().toISOString().split('T')[0]);
  const [newIndustry, setNewIndustry] = useState('Salud y Bienestar / Odontología');
  const [newServiceType, setNewServiceType] = useState<'partner_prime' | 'systeme_prime'>('partner_prime');

  // Strategy Generator States
  const [showStrategyPopup, setShowStrategyPopup] = useState(false);
  const [strategyClient, setStrategyClient] = useState<ClientBoard | null>(null);
  const [generatingStrategy, setGeneratingStrategy] = useState(false);
  const [strategyVideoCount, setStrategyVideoCount] = useState<number>(12);
  const [strategySuccessMsg, setStrategySuccessMsg] = useState('');

  // Custom manual script form states inside strategy editor
  const [showAddScriptForm, setShowAddScriptForm] = useState(false);
  const [scriptTitle, setScriptTitle] = useState('');
  const [scriptPhase, setScriptPhase] = useState<'TOFU' | 'MOFU' | 'BOFU'>('TOFU');
  const [scriptHook, setScriptHook] = useState('');
  const [scriptBody, setScriptBody] = useState('');
  const [scriptCTA, setScriptCTA] = useState('');
  const [scriptPublishDay, setScriptPublishDay] = useState(1);

  // Custom manual report form states
  const [showAddReportForm, setShowAddReportForm] = useState(false);
  const [reportPeriod, setReportPeriod] = useState('Día 1-15');
  const [reportSales, setReportSales] = useState('');
  const [reportContent, setReportContent] = useState('');
  const [reportPostsCount, setReportPostsCount] = useState(4);
  const [reportRecommendation1, setReportRecommendation1] = useState('');
  const [reportRecommendation2, setReportRecommendation2] = useState('');

  const [generatingReportIA, setGeneratingReportIA] = useState(false);

  // Form states for adding log entry to selected client
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logTitle, setLogTitle] = useState('');
  const [logDesc, setLogDesc] = useState('');
  const [logCategory, setLogCategory] = useState<'estrategia' | 'contenido' | 'pauta' | 'optimizacion'>('pauta');

  // Next step state
  const [newStepText, setNewStepText] = useState('');

  // Roadmap Checklist Custom Task states
  const [newChecklistText, setNewChecklistText] = useState('');
  const [newChecklistCategory, setNewChecklistCategory] = useState<'grabacion' | 'publicacion' | 'diseno' | 'estrategia'>('estrategia');
  const [newChecklistDay, setNewChecklistDay] = useState<number>(8);
  const [newChecklistMonth, setNewChecklistMonth] = useState<number>(0);

  // Creative Graphic Post states
  const [isAddingCreative, setIsAddingCreative] = useState(false);
  const [newCreativeTitle, setNewCreativeTitle] = useState('');
  const [newCreativeCategory, setNewCreativeCategory] = useState('Instagram Feed (1:1)');
  const [newCreativePublishDay, setNewCreativePublishDay] = useState<number>(15);
  const [newCreativeAngle, setNewCreativeAngle] = useState('');
  const [newCreativeMonth, setNewCreativeMonth] = useState<number>(0);
  const [newCreativePrompt, setNewCreativePrompt] = useState('');
  const [imageEngine, setImageEngine] = useState<'gemini' | 'openai' | 'supabase_edge'>('supabase_edge');
  const [imageGenSuccessMessage, setImageGenSuccessMessage] = useState<string | null>(null);
  const [generatingCreativeId, setGeneratingCreativeId] = useState<string | null>(null);

  // OpenAI API Key Secure Storage states
  const [openAiKeyInput, setOpenAiKeyInput] = useState('');
  const [isOpenAiKeyLoading, setIsOpenAiKeyLoading] = useState(false);
  const [isOpenAiKeyConfigured, setIsOpenAiKeyConfigured] = useState(false);
  const [openAiKeyStatusMessage, setOpenAiKeyStatusMessage] = useState<string | null>(null);

  const monthsList = ["Mes 1 (Inicio)", "Mes 2 (Atracción)", "Mes 3 (Escalamiento)", "Mes 4 (Consolidación)", "Mes 5 (Optimización)", "Mes 6 (Dominio)"];

  const MONTHS_CONFIG_2026 = [
    { name: "Enero", days: 31, startOffset: 3 },
    { name: "Febrero", days: 28, startOffset: 6 },
    { name: "Marzo", days: 31, startOffset: 6 },
    { name: "Abril", days: 30, startOffset: 2 },
    { name: "Mayo", days: 31, startOffset: 4 },
    { name: "Junio", days: 30, startOffset: 0 },
    { name: "Julio", days: 31, startOffset: 2 },
    { name: "Agosto", days: 31, startOffset: 5 },
    { name: "Septiembre", days: 30, startOffset: 1 },
    { name: "Octubre", days: 31, startOffset: 3 },
    { name: "Noviembre", days: 30, startOffset: 6 },
    { name: "Diciembre", days: 31, startOffset: 1 }
  ];
  const calendarMonthsList = MONTHS_CONFIG_2026.map(m => m.name);

  const [selectedDay, setSelectedDay] = useState<number>(8);
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [checklistFilter, setChecklistFilter] = useState<'all' | 'grabacion' | 'publicacion' | 'diseno' | 'estrategia'>('all');

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

  // Active sub-tab in workspace view
  const [activeWorkspaceSubTab, setActiveWorkspaceSubTab] = useState<'info' | 'kpis' | 'graficos' | 'bitacoras' | 'roadmap' | 'estrategia'>('info');

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

  // Email and Password Login for Admin / Access Key Login for Clients
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (loginTab === 'admin') {
        const email = (emailInput || '').trim().toLowerCase();
        const password = passwordInput || '';

        if (!email || !password) {
          setAuthError('Por favor ingresa tanto tu correo como tu contraseña.');
          setAuthLoading(false);
          return;
        }

        // Admin credentials matching:
        // 1. Current config credentials safely checking for undefined
        const adminEmailFromConfig = (config?.adminEmail || 'consultor@partner.com').trim().toLowerCase();
        const adminPasswordFromConfig = config?.accessPassword || 'growth2026';
        
        const isConfigCreds = (email === adminEmailFromConfig && password === adminPasswordFromConfig);
        // 2. Fallbacks
        const isDefaultCreds = (email === 'admin@partner.com' && password === 'admin') || (email === 'samuel@partner.com' && password === 'growth2026');
        const isLegacyCreds = (email === 'consultor@partner.com' && password === 'growth2026') || (email === 'consultor@partner.com' && password === adminPasswordFromConfig);

        if (isConfigCreds || isDefaultCreds || isLegacyCreds) {
          setIsAuthenticated(true);
          setAuthError('');
        } else {
          setAuthError('Credenciales incorrectas para el administrador. Por favor verifique el correo y la contraseña.');
        }
      } else {
        const inputKey = (accessKeyInput || '').trim();

        if (!inputKey) {
          setAuthError('Por favor digite su clave única de acceso.');
          setAuthLoading(false);
          return;
        }

        // Check if the key matches any client's access key safely
        const matchedClient = clients.find(c => {
          const key = c.accessKey;
          if (typeof key !== 'string') return false;
          return key.trim().toLowerCase() === inputKey.toLowerCase();
        });
        
        if (matchedClient) {
          setAuthError('');
          setAuthLoading(false);
          if (onClientLogin) {
            onClientLogin(matchedClient.id);
          }
          return;
        }

        // Support using admin master password in access key field too (as a helper)
        const isAdminMasterPassword = (inputKey === (config?.accessPassword || 'growth2026') || inputKey === 'growth2026' || inputKey === 'admin');
        if (isAdminMasterPassword) {
          setIsAuthenticated(true);
          setAuthError('');
          setAuthLoading(false);
          return;
        }

        setAuthError('La clave única de acceso introducida es incorrecta o no pertenece a ningún socio registrado.');
      }
    } catch (err: any) {
      console.error("Authentication error", err);
      setAuthError(`Error de autenticación: ${err?.message || String(err) || 'desconocido'}`);
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

    const prefix = newCompany.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'GS');
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const newAccessKey = `${prefix}-${randNum}`;

    const newBoard: ClientBoard = {
      id: newSlug || `cliente-${Date.now()}`,
      companyName: newCompany,
      ownerName: newOwner,
      startDate: newStart,
      industry: newIndustry,
      currentMonth: 1,
      statusMessage: newServiceType === 'partner_prime'
        ? "¡Bienvenido a Partner Prime! Hemos iniciado la instalación colaborativa de tu sistema comercial y de marketing de 6 meses. Aquí tienes acceso a tu estrategia completa de 30 días, cronograma de videos TOFU/MOFU/BOFU, estudio creativo integrado y reportes quincenales."
        : "¡Bienvenido a Systeme Prime! Hemos diseñado tu consultoría y estrategia directa de crecimiento de forma personalizada. Puedes descargar tu propuesta estratégica completa en PDF abajo.",
      accessKey: newAccessKey,
      serviceType: newServiceType,
      marketingStrategy: null,
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
          description: newServiceType === 'partner_prime'
            ? "Instalación del sistema de crecimiento premium Partner Prime de 6 meses, setup del centro de control y primer briefing técnico de contenidos."
            : "Entrega e inicio de la Consultoría Estratégica Systeme Prime. Análisis de canales y preparación del plan de acción.",
          category: "estrategia"
        }
      ],
      nextSteps: newServiceType === 'partner_prime' ? [
        "Completar la generación de la estrategia de contenidos de 30 días con IA.",
        "Programar sesión de grabación para los primeros videos virales (TOFU).",
        "Configurar Studio Creativo y lanzar primeras pautas publicitarias."
      ] : [
        "Completar la generación del reporte estratégico personalizado con IA.",
        "Descargar el PDF ejecutivo del plan estratégico.",
        "Entregar diagnóstico final de conversión y canales."
      ]
    };

    const nextList = [...clients, newBoard];
    onUpdateClients(nextList, true);
    setSelectedClientId(newBoard.id);
    
    // Reset form
    setNewCompany('');
    setNewOwner('');
    setShowAddForm(false);
    
    // Automatically trigger Strategy Generator Modal
    setStrategyClient(newBoard);
    setStrategyVideoCount(newServiceType === 'partner_prime' ? 12 : 5);
    setStrategySuccessMsg('');
    setShowStrategyPopup(true);
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
      onUpdateClients(remaining, true);
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

  // Helper to update strategy fields
  const handleUpdateStrategyField = (field: string, value: any) => {
    if (!selectedClient || !selectedClient.marketingStrategy) return;
    const updatedStrategy = {
      ...selectedClient.marketingStrategy,
      [field]: value
    };
    updateSelectedClient({
      ...selectedClient,
      marketingStrategy: updatedStrategy
    });
  };

  // Helper to update a script card in the calendar
  const handleUpdateScriptCard = (scriptId: string, updatedFields: any) => {
    if (!selectedClient || !selectedClient.marketingStrategy) return;
    const updatedCalendar = selectedClient.marketingStrategy.calendar.map(item => 
      item.id === scriptId ? { ...item, ...updatedFields } : item
    );
    updateSelectedClient({
      ...selectedClient,
      marketingStrategy: {
        ...selectedClient.marketingStrategy,
        calendar: updatedCalendar
      }
    });
  };

  // Helper to remove a script card from the calendar
  const handleRemoveScriptCard = (scriptId: string) => {
    if (!selectedClient || !selectedClient.marketingStrategy) return;
    if (confirm("¿Estás seguro de que deseas eliminar esta pieza del calendario?")) {
      const updatedCalendar = selectedClient.marketingStrategy.calendar.filter(item => item.id !== scriptId);
      updateSelectedClient({
        ...selectedClient,
        marketingStrategy: {
          ...selectedClient.marketingStrategy,
          calendar: updatedCalendar
        }
      });
    }
  };

  // Helper to add a script card manually
  const handleAddScriptCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !selectedClient.marketingStrategy) return;
    if (!scriptTitle.trim()) {
      alert("Por favor, introduce un título para el guión.");
      return;
    }

    const newScript = {
      id: `script-${Date.now()}`,
      day: selectedClient.marketingStrategy.calendar.length + 1,
      phase: scriptPhase,
      title: scriptTitle,
      hook: scriptHook || 'Escribe un hook rompedor aquí...',
      bodyStructure: scriptBody || 'Escribe la estructura del cuerpo aquí...',
      cta: scriptCTA || 'Escribe el llamado a la acción aquí...',
      publishDay: Number(scriptPublishDay) || 1,
      shootDay: Math.max(1, (Number(scriptPublishDay) || 1) - 3),
      reviewDay: Math.max(1, (Number(scriptPublishDay) || 1) - 1),
      status: 'pending' as any
    };

    const updatedCalendar = [...selectedClient.marketingStrategy.calendar, newScript].sort((a, b) => a.publishDay - b.publishDay);

    updateSelectedClient({
      ...selectedClient,
      marketingStrategy: {
        ...selectedClient.marketingStrategy,
        calendar: updatedCalendar
      }
    });

    // Reset Form
    setScriptTitle('');
    setScriptHook('');
    setScriptBody('');
    setScriptCTA('');
    setScriptPublishDay(1);
    setShowAddScriptForm(false);
  };

  // Save OpenAI API Key to Supabase securely
  const handleSaveOpenAiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = getSupabaseClient();
    if (!client) {
      setOpenAiKeyStatusMessage('Error: Supabase no está conectado. Primero vincula tu Supabase.');
      return;
    }
    if (!openAiKeyInput.trim()) {
      setOpenAiKeyStatusMessage('Error: Por favor escribe una API Key válida.');
      return;
    }

    setIsOpenAiKeyLoading(true);
    setOpenAiKeyStatusMessage(null);
    try {
      const { error } = await (client as any)
        .from('app_settings')
        .upsert({
          key: 'openai_api_key',
          value: openAiKeyInput.trim(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) {
        throw error;
      }

      setIsOpenAiKeyConfigured(true);
      setOpenAiKeyInput('');
      setOpenAiKeyStatusMessage('✓ API Key guardada de forma segura en la tabla "app_settings" de tu Supabase.');
      setTimeout(() => setOpenAiKeyStatusMessage(null), 5000);
    } catch (err: any) {
      console.error("Error saving OpenAI key:", err);
      setOpenAiKeyStatusMessage(`Error: ${err.message || 'La tabla "app_settings" no existe. Recuerda ejecutar el script SQL actualizado en tu editor de Supabase para crearla.'}`);
    } finally {
      setIsOpenAiKeyLoading(false);
    }
  };

  // Delete OpenAI API Key from Supabase securely
  const handleDeleteOpenAiKey = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar la OpenAI API Key de tu base de datos Supabase?')) return;
    const client = getSupabaseClient();
    if (!client) return;

    setIsOpenAiKeyLoading(true);
    setOpenAiKeyStatusMessage(null);
    try {
      const { error } = await (client as any)
        .from('app_settings')
        .delete()
        .eq('key', 'openai_api_key');

      if (error) throw error;

      setIsOpenAiKeyConfigured(false);
      setOpenAiKeyStatusMessage('✓ API Key eliminada exitosamente de Supabase.');
      setTimeout(() => setOpenAiKeyStatusMessage(null), 5000);
    } catch (err: any) {
      console.error("Error deleting OpenAI key:", err);
      setOpenAiKeyStatusMessage(`Error: ${err.message || 'No se pudo eliminar la API Key.'}`);
    } finally {
      setIsOpenAiKeyLoading(false);
    }
  };

  // Helper to generate a creative image in Studio
  const handleGenerateCreativeImageInStudio = async (creativeId: string, promptText: string, titleText: string, catText: string) => {
    if (!selectedClient || !selectedClient.marketingStrategy) return;
    
    setGeneratingCreativeId(creativeId);
    setImageGenSuccessMessage(null);

    // Get current Supabase credentials to pass to the backend securely
    const creds = getSupabaseCredentials();
    const sUrl = creds?.url || '';
    const sKey = creds?.anonKey || '';

    // Create temporary image url for feedback
    const updatedImagesLoading = selectedClient.marketingStrategy.creativeImages.map(img => 
      img.id === creativeId ? { ...img, imageUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=600&auto=format&fit=crop' } : img
    );
    updateSelectedClient({
      ...selectedClient,
      marketingStrategy: {
        ...selectedClient.marketingStrategy,
        creativeImages: updatedImagesLoading
      }
    });
    
    try {
      let data;
      if (imageEngine === 'supabase_edge') {
        if (!sUrl || !sKey) {
          throw new Error("No has conectado Supabase en tu panel de configuración aún. Por favor, conéctalo en la pestaña 'Ajustes de Supabase' para poder consumir Edge Functions.");
        }
        const cleanUrl = sUrl.replace(/\/$/, "");
        const edgeUrl = `${cleanUrl}/functions/v1/generate-image`;
        console.log(`Llamando directamente a la Edge Function de Supabase: ${edgeUrl}`);
        
        const res = await fetch(edgeUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sKey}`,
            'apikey': sKey
          },
          body: JSON.stringify({ 
            prompt: promptText, 
            title: titleText, 
            category: catText 
          })
        });
        
        data = await res.json();
      } else {
        const res = await fetch('/api/generate-creative-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            prompt: promptText, 
            title: titleText, 
            category: catText, 
            engine: imageEngine,
            supabaseUrl: sUrl,
            supabaseAnonKey: sKey
          })
        });
        data = await res.json();
      }

      if (data && (data.success || data.imageUrl)) {
        const imgUrl = data.imageUrl;
        const updatedImages = selectedClient.marketingStrategy.creativeImages.map(img => 
          img.id === creativeId ? { ...img, imageUrl: imgUrl, generatedAt: new Date().toISOString() } : img
        );
        updateSelectedClient({
          ...selectedClient,
          marketingStrategy: {
            ...selectedClient.marketingStrategy,
            creativeImages: updatedImages
          }
        });
        setImageGenSuccessMessage(data.statusMessage || "Imagen generada con éxito.");
        setTimeout(() => setImageGenSuccessMessage(null), 6000);
      } else {
        alert(data.error || "No se pudo generar la imagen con el motor seleccionado.");
      }
    } catch (err: any) {
      console.error("Error generating image asset:", err);
      alert("No se pudo conectar con el motor de imágenes: " + (err?.message || err));
    } finally {
      setGeneratingCreativeId(null);
    }
  };

  // Helper to remove a report
  const handleRemoveReport = (reportId: string) => {
    if (!selectedClient || !selectedClient.marketingStrategy) return;
    if (confirm("¿Estás seguro de que deseas eliminar este reporte de rendimiento?")) {
      const updatedReports = selectedClient.marketingStrategy.reports.filter(r => r.id !== reportId);
      updateSelectedClient({
        ...selectedClient,
        marketingStrategy: {
          ...selectedClient.marketingStrategy,
          reports: updatedReports
        }
      });
    }
  };

  // Helper to generate a quincenal report via IA
  const handleGenerateReportWithIA = async () => {
    if (!selectedClient || !selectedClient.marketingStrategy) return;
    setGeneratingReportIA(true);
    try {
      const nextReportNum = (selectedClient.marketingStrategy.reports?.length || 0) + 1;
      const periodName = nextReportNum === 1 ? 'Días 1-15' : nextReportNum === 2 ? 'Días 16-30' : `Días ${(nextReportNum - 1) * 15}-${nextReportNum * 15}`;
      
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: selectedClient.companyName,
          industry: selectedClient.industry,
          currentMonth: selectedClient.currentMonth,
          periodName: periodName
        })
      });
      const data = await res.json();
      if (data.report) {
        const currentReports = selectedClient.marketingStrategy.reports || [];
        const updatedReports = [data.report, ...currentReports];
        updateSelectedClient({
          ...selectedClient,
          marketingStrategy: {
            ...selectedClient.marketingStrategy,
            reports: updatedReports
          }
        });
        alert(`¡Reporte quincenal para ${periodName} generado con éxito!`);
      }
    } catch (err) {
      console.error("Error generating report with IA:", err);
      alert("Error al conectar con la Inteligencia Artificial para generar el reporte.");
    } finally {
      setGeneratingReportIA(false);
    }
  };

  // Helper to add report manually
  const handleAddReportManually = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !selectedClient.marketingStrategy) return;
    if (!reportSales.trim()) {
      alert("Por favor, ingresa el resumen comercial.");
      return;
    }

    const newReport = {
      id: `rep-manual-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      period: reportPeriod,
      salesSummary: reportSales,
      contentSummary: reportContent || 'Contenidos publicados y programados de forma constante con buena interacción de marca.',
      postsCount: Number(reportPostsCount) || 4,
      recommendations: [
        reportRecommendation1 || 'Ajustar segmentaciones de anuncios gráficos.',
        reportRecommendation2 || 'Acelerar el ciclo de grabación de videos TOFU/MOFU.'
      ]
    };

    const currentReports = selectedClient.marketingStrategy.reports || [];
    const updatedReports = [newReport, ...currentReports];

    updateSelectedClient({
      ...selectedClient,
      marketingStrategy: {
        ...selectedClient.marketingStrategy,
        reports: updatedReports
      }
    });

    setReportPeriod('Día 1-15');
    setReportSales('');
    setReportContent('');
    setReportPostsCount(4);
    setReportRecommendation1('');
    setReportRecommendation2('');
    setShowAddReportForm(false);
  };

  // Strategy Generator modal execution
  const handleGenerateStrategy = async () => {
    if (!strategyClient) return;
    setGeneratingStrategy(true);
    setStrategySuccessMsg('');
    try {
      const res = await fetch('/api/generate-strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyName: strategyClient.companyName,
          ownerName: strategyClient.ownerName,
          industry: strategyClient.industry,
          serviceType: strategyClient.serviceType,
          videoCount: strategyVideoCount
        })
      });
      const data = await res.json();
      if (data.strategy) {
        const updatedClient = {
          ...strategyClient,
          marketingStrategy: data.strategy
        };
        // Update both strategyClient and parent state
        setStrategyClient(updatedClient);
        updateSelectedClient(updatedClient);
        setStrategySuccessMsg(
          data.mode === 'gemini_ai' 
            ? '¡Estrategia y cronograma de 30 días generados con Inteligencia Artificial con éxito!' 
            : '¡Estrategia y cronograma de 30 días generados exitosamente con nuestro motor de plantillas!'
        );
      } else {
        alert("Ocurrió un error al generar la estrategia.");
      }
    } catch (err) {
      console.error("Error generating strategy:", err);
      alert("No se pudo conectar con el motor de estrategia. Asegúrate de que el servidor esté activo.");
    } finally {
      setGeneratingStrategy(false);
    }
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

  const handleAddRoadmapChecklistItem = () => {
    if (!newChecklistText.trim() || !selectedClient) return;
    const newTask = {
      id: `custom-${Date.now()}`,
      title: newChecklistText.trim(),
      completed: false,
      dueDate: `Día ${newChecklistDay}`,
      dayNum: newChecklistDay,
      monthNum: newChecklistMonth,
      category: newChecklistCategory
    };
    const currentList = selectedClient.roadmapChecklist || [];
    const updated = {
      ...selectedClient,
      roadmapChecklist: [newTask, ...currentList]
    };
    updateSelectedClient(updated);
    setNewChecklistText('');
  };

  const handleToggleRoadmapChecklistItem = (taskId: string) => {
    if (!selectedClient) return;
    const currentList = selectedClient.roadmapChecklist || [];
    const updatedList = currentList.map(item => 
      item.id === taskId ? { ...item, completed: !item.completed } : item
    );
    const updated = {
      ...selectedClient,
      roadmapChecklist: updatedList
    };
    updateSelectedClient(updated);
  };

  const handleRemoveRoadmapChecklistItem = (taskId: string) => {
    if (!selectedClient) return;
    const currentList = selectedClient.roadmapChecklist || [];
    const updatedList = currentList.filter(item => item.id !== taskId);
    const updated = {
      ...selectedClient,
      roadmapChecklist: updatedList
    };
    updateSelectedClient(updated);
  };

  const handleCreateStrategicPost = () => {
    if (!newCreativeTitle.trim() || !selectedClient) return;
    if (!selectedClient.marketingStrategy) {
      alert("Por favor genera una estrategia primero en la pestaña de Estrategia para poder planificar posts vinculados.");
      return;
    }

    const abstractImages = [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1618005198143-e52834641c25?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1604871000636-074fa5117945?w=800&auto=format&fit=crop&q=60"
    ];
    const randomIndex = Math.floor(Math.random() * abstractImages.length);

    const creativeId = `creative-${Date.now()}`;
    const newCreative = {
      id: creativeId,
      title: newCreativeTitle.trim(),
      category: newCreativeCategory,
      prompt: newCreativePrompt.trim() || `Diseño enfocado en el ángulo: ${newCreativeAngle || 'General'}`,
      imageUrl: abstractImages[randomIndex],
      dayNum: newCreativePublishDay,
      monthNum: newCreativeMonth,
      angle: newCreativeAngle
    };

    const updatedCreativeImages = [
      ...(selectedClient.marketingStrategy.creativeImages || []),
      newCreative
    ];

    // Auto-schedule an actionable design task in the roadmap checklist!
    const newChecklistTask = {
      id: `design-${creativeId}`,
      title: `🎨 Diseñar post gráfico (${newCreativeCategory}): "${newCreativeTitle.trim()}"`,
      completed: false,
      dueDate: `Día ${newCreativePublishDay}`,
      dayNum: newCreativePublishDay,
      monthNum: newCreativeMonth,
      category: 'diseno' as const
    };

    const currentList = selectedClient.roadmapChecklist || [];
    const updated = {
      ...selectedClient,
      roadmapChecklist: [newChecklistTask, ...currentList],
      marketingStrategy: {
        ...selectedClient.marketingStrategy,
        creativeImages: updatedCreativeImages
      }
    };

    updateSelectedClient(updated);

    // Reset fields
    setNewCreativeTitle('');
    setNewCreativePrompt('');
    setNewCreativePublishDay(15);
    setNewCreativeAngle('');
    setIsAddingCreative(false);
  };

  const handleRemoveCreativePost = (creativeId: string) => {
    if (!selectedClient || !selectedClient.marketingStrategy) return;
    
    const updatedCreativeImages = (selectedClient.marketingStrategy.creativeImages || []).filter(
      c => c.id !== creativeId
    );

    // Also remove the corresponding auto-scheduled design task from checklist if any
    const currentList = selectedClient.roadmapChecklist || [];
    const updatedChecklist = currentList.filter(item => item.id !== `design-${creativeId}`);

    const updated = {
      ...selectedClient,
      roadmapChecklist: updatedChecklist,
      marketingStrategy: {
        ...selectedClient.marketingStrategy,
        creativeImages: updatedCreativeImages
      }
    };
    updateSelectedClient(updated);
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
      <div className="min-h-screen w-full bg-slate-50 flex flex-col md:flex-row" id="admin-login-view">
        {/* Left Side: Growth Presentation Banner (No Image, clean typography & alternating phrases) */}
        <div className="hidden md:flex md:w-1/2 bg-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden select-none border-r border-slate-200">
          {/* Ambient light effects */}
          <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="relative z-10">
            <span className="text-[10px] font-mono font-bold tracking-widest text-violet-400 uppercase bg-violet-950/40 px-3 py-1.5 rounded-full border border-violet-900/50">
              PORTAL EXCLUSIVO DE SOCIOS
            </span>
            <div className="mt-8 space-y-2">
              <h2 className="text-4xl font-extrabold tracking-tight text-white font-display leading-tight">
                Sistema gowth scaling
              </h2>
              <p className="text-xs font-mono tracking-widest text-violet-300 uppercase">
                by iGenius griwth partners
              </p>
            </div>
            <p className="text-slate-400 text-xs mt-4 max-w-md font-sans leading-relaxed">
              La plataforma premium para el monitoreo estratégico de pautas digitales, optimización de embudos, estructuración de ofertas y aceleración de ingresos en tiempo real.
            </p>
          </div>

          {/* Translucent Container for Alternating Phrases */}
          <div className="relative z-10 py-8 my-auto">
            <div className="bg-slate-950/60 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
              <div className="absolute -top-6 -right-6 text-slate-800/20 text-9xl font-serif pointer-events-none">
                “
              </div>
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPhraseIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-4"
                >
                  <p className="text-base font-medium text-slate-100 italic leading-relaxed font-display">
                    {SCALING_PHRASES[currentPhraseIndex]}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="h-1 w-8 bg-violet-500 rounded-full" />
                    <span className="text-[9px] font-mono text-violet-400 font-bold uppercase tracking-widest">Growth Core Strategy</span>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Bullet indicators for phrases */}
              <div className="flex gap-1.5 mt-6">
                {SCALING_PHRASES.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPhraseIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentPhraseIndex ? 'w-5 bg-violet-500' : 'w-1.5 bg-slate-700 hover:bg-slate-500'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-mono font-bold text-xs shadow-md">
              G
            </div>
            <div>
              <p className="text-xs font-bold text-white font-sans">Growth Partner</p>
              <p className="text-[10px] text-slate-500 font-mono">iGenius griwth partners © 2026</p>
            </div>
          </div>
        </div>

        {/* Right Side: Clean Dual-Mode Login Form Card */}
        <div className="flex-1 flex items-center justify-center px-4 py-12 bg-slate-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-8 md:p-10 shadow-xl flex flex-col gap-6"
          >
            <div className="text-center space-y-2">
              <div className="inline-flex bg-violet-50 text-violet-600 p-3 rounded-2xl border border-violet-100">
                <Lock className="w-5 h-5" />
              </div>
              
              <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">
                {targetClient && loginTab === 'client'
                  ? `Bienvenido ${targetClient.ownerName || targetClient.companyName}`
                  : loginTab === 'admin' 
                    ? 'Bienvenido Samuel'
                    : 'Acceso a Socios'}
              </h1>
              
              <p className="text-slate-500 text-xs leading-relaxed max-w-sm mx-auto font-sans pt-1">
                {loginTab === 'admin'
                  ? 'Ingresa tus credenciales de Consultor / Administrador para realizar ajustes tácticos.'
                  : 'Ingresa la clave única de acceso asignada por tu consultor de crecimiento.'}
              </p>
            </div>

            {/* Elegant Sliding Switcher Tabs */}
            <div className="bg-slate-100/90 border border-slate-200/60 rounded-2xl p-1 flex w-full select-none" id="login-tabs">
              <button
                type="button"
                onClick={() => {
                  setLoginTab('admin');
                  setAuthError('');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  loginTab === 'admin'
                    ? 'text-violet-700 bg-white shadow-xs border border-slate-200/40'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Consultor (Dueño)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginTab('client');
                  setAuthError('');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  loginTab === 'client'
                    ? 'text-violet-700 bg-white shadow-xs border border-slate-200/40'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Socio / Cliente</span>
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4 font-sans text-xs">
              
              {loginTab === 'admin' ? (
                <>
                  {/* Email field */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1.5 font-mono">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        placeholder="samuel@partner.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-violet-500/80 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 placeholder-slate-400 outline-none transition-all text-sm shadow-xs"
                        required
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    </div>
                  </div>

                  {/* Password field */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1.5 font-mono">
                      Contraseña Técnica
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-violet-500/80 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 placeholder-slate-400 outline-none transition-all text-sm shadow-xs"
                        required
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Access Key field */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1.5 font-mono">
                      Digite su clave única de acceso
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        placeholder="Escribe tu clave aquí..."
                        value={accessKeyInput}
                        onChange={(e) => setAccessKeyInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-violet-500/80 rounded-xl pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 outline-none transition-all text-sm shadow-inner"
                        required
                      />
                      <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    </div>
                  </div>

                  {/* Target partner greeting preview card if active */}
                  {targetClient && (
                    <div className="bg-violet-50/80 border border-violet-100 p-3.5 rounded-2xl text-center space-y-1 shadow-xs animate-in fade-in zoom-in-95 duration-200">
                      <span className="text-[9px] font-mono font-bold text-violet-600 uppercase tracking-widest">Socio Identificado</span>
                      <p className="text-xs font-black text-violet-950 font-display">{targetClient.companyName}</p>
                      <p className="text-[10px] text-slate-500 font-sans">Dirigido a {targetClient.ownerName}</p>
                    </div>
                  )}
                </>
              )}

              {authError && (
                <p className="text-xs text-rose-600 text-center bg-rose-50 p-2.5 rounded-xl border border-rose-100 font-medium font-sans leading-relaxed">
                  {authError}
                </p>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer text-sm font-display tracking-wide uppercase"
              >
                {authLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Ingresar al Sistema</span>
                )}
              </button>
            </form>

            <div className="flex items-center justify-center border-t border-slate-100 pt-4">
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                iGenius griwth partners
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

      {/* Main Layout - Single Column Layout */}
      <div className="w-full">
        
        {/* Full-width Viewport Content */}
        <div className="w-full">
          
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

                        <div className="col-span-1 sm:col-span-2 p-3.5 bg-violet-50/50 dark:bg-violet-950/10 border border-violet-100 dark:border-violet-900/50 rounded-2xl space-y-2">
                          <label className="block text-[10px] font-bold text-violet-850 dark:text-violet-350 uppercase tracking-widest font-mono">Modalidad de Servicio Adquirido</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${newServiceType === 'partner_prime' ? 'bg-violet-600/10 border-violet-500/50 text-violet-900 dark:text-white font-bold' : 'bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 hover:bg-slate-50'}`}>
                              <input 
                                type="radio" 
                                name="newServiceType" 
                                value="partner_prime" 
                                checked={newServiceType === 'partner_prime'} 
                                onChange={() => setNewServiceType('partner_prime')} 
                                className="mt-1 text-violet-600 outline-none"
                              />
                              <div>
                                <span className="block text-xs">🚀 Partner Prime (6 Meses)</span>
                                <span className="block text-[10px] opacity-75 font-normal mt-0.5 leading-normal">Acompañamiento completo: Calendario de 30 días, guiones interactivos y Estudio Creativo.</span>
                              </div>
                            </label>

                            <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${newServiceType === 'systeme_prime' ? 'bg-violet-600/10 border-violet-500/50 text-violet-900 dark:text-white font-bold' : 'bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 hover:bg-slate-50'}`}>
                              <input 
                                type="radio" 
                                name="newServiceType" 
                                value="systeme_prime" 
                                checked={newServiceType === 'systeme_prime'} 
                                onChange={() => setNewServiceType('systeme_prime')} 
                                className="mt-1 text-violet-600 outline-none"
                              />
                              <div>
                                <span className="block text-xs">📋 Sisteme Prime (Consultoría)</span>
                                <span className="block text-[10px] opacity-75 font-normal mt-0.5 leading-normal">Plan estratégico directo sin cronogramas diarios. Listo para descargar en PDF.</span>
                              </div>
                            </label>
                          </div>
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
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-slate-500 dark:text-slate-405 font-sans">
                              Socio: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{client.ownerName}</strong>
                            </span>
                            {client.accessKey && (
                              <span className="text-[10px] font-mono text-violet-600 dark:text-violet-400 flex items-center gap-1 font-bold">
                                🔑 Clave: <code className="bg-slate-50 dark:bg-zinc-950 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-800 select-all">{client.accessKey}</code>
                              </span>
                            )}
                          </div>
                          
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
                {/* Workspace Top Bar with Account Switcher and Integrated Save Button */}
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xs">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    <div>
                      <h2 className="text-xs font-mono font-bold text-slate-405 dark:text-slate-400 uppercase tracking-widest">Gabinete de Gestión Estratégica</h2>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">Editor Activo: {selectedClient.companyName}</h3>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
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

                    <button
                      onClick={() => {
                        onUpdateClients([...clients], true);
                        setSaveSuccess(true);
                        setTimeout(() => setSaveSuccess(false), 3500);
                      }}
                      className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs py-2 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow-md active:scale-98 shrink-0"
                      id="btn-save-client-data"
                    >
                      <Check className="w-4 h-4" />
                      <span>Guardar y Actualizar</span>
                    </button>
                  </div>
                </div>

                {saveSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 text-sm">✓</span>
                      <span>¡Los datos de <strong>{selectedClient.companyName}</strong> se han actualizado e integrado de forma segura en la base de datos!</span>
                    </div>
                    <button onClick={() => setSaveSuccess(false)} className="text-emerald-550 hover:text-emerald-700 font-mono text-xs">✕</button>
                  </motion.div>
                )}

                {/* Horizontal Minimalist Workspace Navigation Bar */}
                <div className="w-full bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs mb-6">
                  <div className="flex flex-wrap divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-zinc-800">
                    <button
                      type="button"
                      onClick={() => setActiveWorkspaceSubTab('info')}
                      className={`flex-1 min-w-[150px] py-3.5 px-4 text-xs font-bold font-sans flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        activeWorkspaceSubTab === 'info'
                          ? 'bg-violet-600 text-white'
                          : 'text-slate-600 hover:text-violet-600 dark:text-slate-300 dark:hover:text-violet-400 hover:bg-slate-100/50 dark:hover:bg-zinc-850/50'
                      }`}
                    >
                      <Database className="w-4 h-4 shrink-0" />
                      <span>Información Corporativa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveWorkspaceSubTab('kpis')}
                      className={`flex-1 min-w-[150px] py-3.5 px-4 text-xs font-bold font-sans flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        activeWorkspaceSubTab === 'kpis'
                          ? 'bg-violet-600 text-white'
                          : 'text-slate-600 hover:text-violet-600 dark:text-slate-300 dark:hover:text-violet-400 hover:bg-slate-100/50 dark:hover:bg-zinc-850/50'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4 shrink-0" />
                      <span>Cifras y KPIs</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveWorkspaceSubTab('graficos')}
                      className={`flex-1 min-w-[150px] py-3.5 px-4 text-xs font-bold font-sans flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        activeWorkspaceSubTab === 'graficos'
                          ? 'bg-violet-600 text-white'
                          : 'text-slate-600 hover:text-violet-600 dark:text-slate-300 dark:hover:text-violet-400 hover:bg-slate-100/50 dark:hover:bg-zinc-850/50'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4 shrink-0" />
                      <span>Gráficos Mensuales</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveWorkspaceSubTab('bitacoras')}
                      className={`flex-1 min-w-[150px] py-3.5 px-4 text-xs font-bold font-sans flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        activeWorkspaceSubTab === 'bitacoras'
                          ? 'bg-violet-600 text-white'
                          : 'text-slate-600 hover:text-violet-600 dark:text-slate-300 dark:hover:text-violet-400 hover:bg-slate-100/50 dark:hover:bg-zinc-850/50'
                      }`}
                    >
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>Bitácoras</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveWorkspaceSubTab('roadmap')}
                      className={`flex-1 min-w-[150px] py-3.5 px-4 text-xs font-bold font-sans flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        activeWorkspaceSubTab === 'roadmap'
                          ? 'bg-violet-600 text-white'
                          : 'text-slate-600 hover:text-violet-600 dark:text-slate-300 dark:hover:text-violet-400 hover:bg-slate-100/50 dark:hover:bg-zinc-850/50'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Roadmap de Seguimiento</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveWorkspaceSubTab('estrategia')}
                      className={`flex-1 min-w-[150px] py-3.5 px-4 text-xs font-bold font-sans flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        activeWorkspaceSubTab === 'estrategia'
                          ? 'bg-violet-600 text-white'
                          : 'text-slate-600 hover:text-violet-600 dark:text-slate-300 dark:hover:text-violet-400 hover:bg-slate-100/50 dark:hover:bg-zinc-850/50'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>Estrategia Completa</span>
                    </button>
                  </div>
                </div>

                <div className="w-full space-y-6">
                  {activeWorkspaceSubTab === 'info' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
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
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 font-mono">Clave Única de Acceso Partner</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={selectedClient.accessKey || ''}
                              onChange={(e) => handleBaseFieldChange('accessKey', e.target.value.toUpperCase().replace(/\s+/g, ''))}
                              placeholder="Ej. MED-1234"
                              className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-violet-600 dark:text-violet-400"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const prefix = selectedClient.companyName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'GS');
                                const randNum = Math.floor(1000 + Math.random() * 9000);
                                handleBaseFieldChange('accessKey', `${prefix}-${randNum}`);
                              }}
                              className="bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900 border border-violet-200 dark:border-violet-900 px-3 py-1.5 rounded-xl text-[10px] font-bold text-violet-600 dark:text-violet-400 cursor-pointer"
                            >
                              Regenerar
                            </button>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1">Esta clave sirve para que el cliente ingrese de forma exclusiva a su tablero.</p>
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
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 font-mono">Estado del Semáforo de Desempeño</label>
                          <select
                            value={selectedClient.semaforo || 'green'}
                            onChange={(e) => handleBaseFieldChange('semaforo', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-800 dark:text-white"
                          >
                            <option value="green">🟢 VERDE - AL DÍA (Operaciones estables & entregas listas)</option>
                            <option value="yellow">🟡 AMARILLO - EN RIESGO (Acciones pendientes u optimizaciones críticas)</option>
                            <option value="red">🔴 ROJO - RETRASADO (Retrasos en grabaciones o copies requeridos)</option>
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

                    <div className="lg:col-span-5 space-y-6">
                      {/* Compact Secure URL Compartible Card right under Corporate Info */}
                      <div className="bg-emerald-50/60 dark:bg-emerald-950/15 border border-emerald-200/80 dark:border-emerald-900 rounded-2xl p-4 shadow-xs space-y-3">
                        <div className="flex items-center gap-2">
                          <Link2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-855 dark:text-white font-mono">Enlace Seguro de Socio</h4>
                        </div>
                        
                        <p className="text-slate-600 dark:text-slate-350 text-[11px] leading-relaxed">
                          Este socio comercial puede acceder directamente a su panel de lectura utilizando este link privado auto-contenido, sin contraseñas ni registros.
                        </p>
                        
                        <div className="bg-white dark:bg-zinc-950 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-850">
                          <code className="text-[10px] break-all text-emerald-700 dark:text-emerald-350 font-mono select-all block max-h-12 overflow-y-auto">
                            {getShareableLink(selectedClient)}
                          </code>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(getShareableLink(selectedClient));
                              alert("¡Enlace privado auto-contenido copiado exitosamente! Puedes enviarlo por WhatsApp o correo.");
                            }}
                            className="bg-white dark:bg-zinc-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-850 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] py-2 px-3 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-xs"
                          >
                            <Copy className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Copiar Enlace</span>
                          </button>

                          <button
                            onClick={() => generatePDFReport(selectedClient, config.consultantName, config.consultantAgency)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] py-2 px-3 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Reporte PDF</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Roadmap & Seguimiento Section */}
                {activeWorkspaceSubTab === 'roadmap' && (() => {
                  const currentChecklist = selectedClient.roadmapChecklist || [];
                  const completedCount = currentChecklist.filter(t => t.completed).length;
                  const totalTasksCount = currentChecklist.length;
                  const progressPercent = totalTasksCount > 0 ? Math.round((completedCount / totalTasksCount) * 100) : 100;
                  const computedSemaforo = selectedClient.semaforo 
                    ? selectedClient.semaforo 
                    : (progressPercent >= 60 ? 'green' : progressPercent >= 30 ? 'yellow' : 'red');

                  const getSemaforoText = (status: 'green' | 'yellow' | 'red') => {
                    switch (status) {
                      case 'green': return 'AL DÍA (Verde)';
                      case 'yellow': return 'EN RIESGO (Ámbar)';
                      case 'red': return 'RETRASADO (Rojo)';
                    }
                  };

                  const getSemaforoDescription = (status: 'green' | 'yellow' | 'red') => {
                    switch (status) {
                      case 'green': return 'Excelente progreso. El socio está ejecutando las grabaciones y publicaciones a tiempo.';
                      case 'yellow': return 'Atención requerida. El socio tiene tareas de grabación o edición acumuladas.';
                      case 'red': return '¡Acción urgente! Hay publicaciones programadas vencidas o sin grabar.';
                    }
                  };

                  const monthlyMilestones = [
                    {
                      month: 1,
                      title: "Auditoría de Embudo & Pauta Estructural",
                      description: "Establecimiento técnico de píxeles, públicos calificados iniciales y arranque de campañas de captación de leads de alto valor.",
                      deliverables: ["Píxeles y APIs configurados", "Públicos personalizados", "Lanzamiento de campaña"]
                    },
                    {
                      month: 2,
                      title: "Optimización de Embudo de WhatsApp & Conversión",
                      description: "Estandarización de plantillas de mensajería y optimización de ganchos rápidos para acelerar el agendado de prospectos de valor.",
                      deliverables: ["Protocolo de ventas definido", "Plantillas aprobadas", "Métricas configuradas"]
                    },
                    {
                      month: 3,
                      title: "Testeo de Nuevos Ganchos & Audiencias",
                      description: "Pruebas masivas de ganchos virales (TOFU/MOFU) y ampliación de públicos públicos similares (Lookalike) calificados.",
                      deliverables: ["Audiencias similars activas", "3 ganchos testeados", "Estabilización del CPL"]
                    },
                    {
                      month: 4,
                      title: "Sincronización de Creative Studio & Automatizaciones",
                      description: "Integración de activos visuales premium mediante el Creative Studio y automatización inicial de leads directo a CRM.",
                      deliverables: ["Pila de prompts instalada", "Integración a CRM", "Estructura de videos BOFU"]
                    },
                    {
                      month: 5,
                      title: "Consolidación de ROAS & Escalamiento de Presupuesto",
                      description: "Análisis mensual consolidado para escalar el presupuesto publicitario de forma sana sin dañar el costo de adquisición.",
                      deliverables: ["Incremento de pauta (+30%)", "Optimización de ganchos", "Consolidación de ROAS"]
                    },
                    {
                      month: 6,
                      title: "Auditoría de Cierre & Plan de Segundo Ciclo",
                      description: "Auditoría ejecutiva final del ciclo de 24 semanas, balance de activos estables y planificación estratégica para la escala continua.",
                      deliverables: ["Reporte de 6 meses", "Captación de leads de valor", "Plan de renovación"]
                    }
                  ];

                  return (
                    <div className="space-y-6">
                      
                      {/* CRONOGRAMA DE OPERACIONES STEPPER PROGRESS BAR */}
                      <div className="w-full bg-slate-50/60 dark:bg-zinc-900/30 border border-slate-200/60 dark:border-zinc-800 rounded-2xl p-5">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">CRONOGRAMA DE OPERACIONES</span>
                            <h4 className="text-sm font-extrabold text-slate-800 dark:text-white tracking-tight font-display mt-0.5">Línea de Tiempo del Ciclo de Crecimiento</h4>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-violet-700 bg-violet-50/80 border border-violet-100 dark:bg-violet-950/20 dark:text-violet-300 dark:border-violet-900 px-3 py-1 rounded-full uppercase self-start sm:self-auto">
                            Mes {selectedClient.currentMonth} de 6 Activo
                          </span>
                        </div>
                        
                        <div className="relative py-2 mt-2">
                          <div className="absolute top-[17px] left-3 right-3 h-[2px] bg-slate-200 dark:bg-zinc-800" />
                          <div 
                            className="absolute top-[17px] left-3 h-[2px] bg-violet-600 transition-all duration-700" 
                            style={{ width: `${Math.max(0, Math.min(100, ((selectedClient.currentMonth - 1) / 5) * 100))}%` }}
                          />

                          <div className="grid grid-cols-6 gap-1 relative z-10">
                            {[1, 2, 3, 4, 5, 6].map((month) => {
                              const isCompletedStep = month < selectedClient.currentMonth;
                              const isCurrentStep = month === selectedClient.currentMonth;

                              return (
                                <div key={month} className="flex flex-col items-center">
                                  <div 
                                    className={`h-6 w-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                                      isCurrentStep 
                                        ? 'bg-violet-600 border-2 border-violet-600 text-white shadow-xs ring-4 ring-violet-100 dark:ring-violet-950' 
                                        : isCompletedStep 
                                          ? 'bg-violet-600 text-white shadow-xs' 
                                          : 'bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 text-slate-400'
                                    }`}
                                  >
                                    {isCompletedStep ? (
                                      <span className="text-[10px] font-bold">✓</span>
                                    ) : (
                                      <span className="text-[9px] font-mono font-extrabold">{month}</span>
                                    )}
                                  </div>
                                  <span 
                                    className={`mt-2 text-[9px] font-bold uppercase tracking-wider hidden sm:block ${
                                      isCurrentStep ? 'text-violet-700 dark:text-violet-400 font-black' : isCompletedStep ? 'text-slate-650 dark:text-slate-400' : 'text-slate-400'
                                    }`}
                                  >
                                    Mes {month}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* SECTION: CONTROL CENTER HEADERS & SEMAFORO */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                        {/* Traffic Light (Semaforo) Card */}
                        <div className="md:col-span-8 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-850 pb-4 mb-4">
                            <div>
                              <span className="text-[9px] font-mono font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest block">Semáforo de Desempeño Comercial del Socio</span>
                              <h3 className="text-lg font-bold text-slate-950 dark:text-white font-display mt-0.5">Control de Tiempos & Avance</h3>
                            </div>
                            
                            {/* Visual Status Traffic Light Indicator */}
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 p-1.5 rounded-2xl">
                                <span className={`w-3.5 h-3.5 rounded-full ${computedSemaforo === 'red' ? 'bg-rose-500 ring-4 ring-rose-100 dark:ring-rose-950' : 'bg-slate-200 dark:bg-zinc-700'}`} title="Retrasado" />
                                <span className={`w-3.5 h-3.5 rounded-full ${computedSemaforo === 'yellow' ? 'bg-amber-500 ring-4 ring-amber-100 dark:ring-amber-950' : 'bg-slate-200 dark:bg-zinc-700'}`} title="En riesgo" />
                                <span className={`w-3.5 h-3.5 rounded-full ${computedSemaforo === 'green' ? 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950' : 'bg-slate-200 dark:bg-zinc-700'}`} title="Al día" />
                              </div>
                              <span className={`text-[10px] font-mono font-bold uppercase px-3 py-1.5 rounded-xl border ${
                                computedSemaforo === 'green' ? 'bg-emerald-50 text-emerald-700 border-emerald-150 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' :
                                computedSemaforo === 'yellow' ? 'bg-amber-50 text-amber-700 border-amber-150 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30' :
                                'bg-rose-50 text-rose-700 border-rose-150 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30'
                              }`}>
                                {getSemaforoText(computedSemaforo)}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-4 font-sans text-xs">
                            <p className="text-slate-650 dark:text-slate-400 leading-relaxed">
                              {getSemaforoDescription(computedSemaforo)}
                            </p>

                            {/* Quick progress stats */}
                            <div className="grid grid-cols-3 gap-4 bg-slate-50 dark:bg-zinc-950 border border-slate-150 dark:border-zinc-800 p-4 rounded-2xl">
                              <div>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block">PROGRESO</span>
                                <span className="text-base font-extrabold text-slate-800 dark:text-white font-mono">{progressPercent}%</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block">COMPLETADOS</span>
                                <span className="text-base font-extrabold text-slate-800 dark:text-white font-mono">{completedCount}/{totalTasksCount}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block">PENDIENTES</span>
                                <span className="text-base font-extrabold text-slate-800 dark:text-white font-mono">{totalTasksCount - completedCount}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Team Guide block */}
                        <div className="md:col-span-4 bg-violet-600 text-white rounded-3xl p-6 shadow-xs flex flex-col justify-between relative overflow-hidden">
                          <div className="absolute right-[-10%] bottom-[-10%] opacity-15">
                            <Users className="w-40 h-40" />
                          </div>
                          <div>
                            <span className="text-[9px] font-mono font-bold tracking-widest text-violet-200 uppercase bg-violet-700 px-2.5 py-1 rounded border border-violet-500">GROWTH TEAM CONTROL</span>
                            <h4 className="text-base font-extrabold mt-3 font-display">Centro de Control de Operaciones</h4>
                            <p className="text-violet-100 text-[11.5px] leading-relaxed mt-2">
                              Audita diariamente qué guiones debe grabar o publicar el socio <strong className="text-white font-black">{selectedClient.name}</strong> para mantenerse alineado con la estrategia de crecimiento activa.
                            </p>
                          </div>
                          <div className="text-[10px] font-mono text-violet-200 mt-4 border-t border-violet-500/50 pt-3">
                            Monitoreo: Online · Sincronizado
                          </div>
                        </div>
                      </div>

                      {/* SPECTACULAR EXECUTIVE COMMAND CENTER - AGENDA DIARIA PRO */}
                      <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6 relative overflow-hidden">
                        <div className="absolute right-[-10%] top-[-10%] w-80 h-80 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
                        
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                              <span className="text-[9px] font-mono font-black text-emerald-400 uppercase tracking-widest">AGENDA DIARIA EN TIEMPO REAL</span>
                            </div>
                            <h3 className="text-xl font-black font-display tracking-tight text-white">¿Qué debe hacer el socio hoy?</h3>
                            <p className="text-slate-400 text-xs font-sans">
                              Agenda operativa para el <strong className="text-violet-400">Día {selectedDay || 8}</strong> de <strong className="text-violet-400">{calendarMonthsList[selectedMonth]}</strong>. Selecciona otro día en el calendario de abajo para auditar su agenda estratégica.
                            </p>
                          </div>

                          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-4.5 py-2.5 rounded-2xl shrink-0 shadow-3xs">
                            <span className="text-xs text-slate-400 font-medium">Día Seleccionado:</span>
                            <span className="text-sm font-black font-mono text-violet-400 bg-violet-950/60 border border-violet-800/40 px-2.5 py-1 rounded-lg">DÍA {selectedDay || 8}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                          
                          {/* LEFT COLUMN: SAMUEL'S ACTIONS (🎥 GRABAR O 🚀 PUBLICAR) */}
                          <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-5 flex flex-col justify-between">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                                <div className="flex items-center gap-2.5 text-rose-400">
                                  <Video className="w-4.5 h-4.5" />
                                  <span className="text-[10px] font-mono font-black uppercase tracking-widest">Tareas de Producción de Hoy</span>
                                </div>
                                <span className="text-[9px] font-mono font-extrabold text-slate-500">PARTNER FOCUS</span>
                              </div>

                              {/* Display Scheduled Recording Scripts */}
                              {(() => {
                                const todayShootScripts = (selectedClient.marketingStrategy?.calendar || []).filter(s => s.shootDay === (selectedDay || 8));
                                const todayPublishScripts = (selectedClient.marketingStrategy?.calendar || []).filter(s => s.publishDay === (selectedDay || 8));

                                return (
                                  <>
                                    {todayShootScripts.length > 0 && (
                                      <div className="space-y-4">
                                        <p className="text-slate-450 text-xs leading-relaxed font-sans">
                                          El socio tiene <strong className="text-white font-semibold">{todayShootScripts.length} script(s) de video</strong> asignados para filmación hoy:
                                        </p>
                                        {todayShootScripts.map((script) => (
                                          <div key={script.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4.5 space-y-3.5 transition-all hover:border-slate-700/80">
                                            <div className="flex justify-between items-start gap-2 border-b border-slate-800/60 pb-2">
                                              <span className="text-[9px] font-mono font-black text-rose-400 bg-rose-950/30 border border-rose-900/40 px-2 py-0.5 rounded uppercase">🎥 Guión de Grabación</span>
                                              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">{script.phase || 'Estrategia'}</span>
                                            </div>
                                            
                                            <h5 className="font-extrabold text-xs text-white leading-snug">{script.title}</h5>
                                            
                                            <div className="grid grid-cols-1 gap-2.5 text-[11px] font-sans">
                                              <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-850">
                                                <strong className="text-rose-300 font-mono text-[9px] block uppercase tracking-wider mb-1">🪝 Gancho de Entrada (Hook)</strong>
                                                <p className="text-slate-200 italic leading-relaxed">"{script.hook}"</p>
                                              </div>
                                              <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-850">
                                                <strong className="text-indigo-300 font-mono text-[9px] block uppercase tracking-wider mb-1">⚡ Estructura del Cuerpo</strong>
                                                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{script.bodyStructure}</p>
                                              </div>
                                              <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-850">
                                                <strong className="text-emerald-300 font-mono text-[9px] block uppercase tracking-wider mb-1">📣 Llamado a la Acción (CTA)</strong>
                                                <p className="text-slate-200 leading-relaxed font-medium">"{script.cta}"</p>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {todayPublishScripts.length > 0 && (
                                      <div className="space-y-4">
                                        <p className="text-slate-405 text-xs leading-relaxed font-sans">
                                          El socio tiene <strong className="text-white font-semibold">{todayPublishScripts.length} contenido(s)</strong> listos para pauta hoy:
                                        </p>
                                        {todayPublishScripts.map((script) => (
                                          <div key={script.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4.5 space-y-3 transition-all hover:border-slate-700/80">
                                            <div className="flex justify-between items-start gap-2 border-b border-slate-800/60 pb-2">
                                              <span className="text-[9px] font-mono font-black text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 px-2 py-0.5 rounded uppercase">🚀 Contenido a Publicar</span>
                                              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">{script.phase || 'Estrategia'}</span>
                                            </div>
                                            <h5 className="font-extrabold text-xs text-white leading-snug">{script.title}</h5>
                                            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-850">
                                              <strong className="text-emerald-300 font-mono text-[9px] block uppercase tracking-wider mb-1">📣 Llamado a la Acción / CTA</strong>
                                              <p className="text-slate-200 text-[11px] leading-relaxed font-sans">"{script.cta}"</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {todayShootScripts.length === 0 && todayPublishScripts.length === 0 && (
                                      <div className="text-center py-10 text-slate-500 space-y-2">
                                        <CheckCircle2 className="w-8 h-8 mx-auto text-slate-600" />
                                        <p className="text-xs font-mono font-bold text-slate-400">Sin grabaciones o publicaciones para hoy</p>
                                        <p className="text-[10px] text-slate-500 max-w-[280px] mx-auto font-sans leading-relaxed">
                                          Hoy el socio no tiene programadas grabaciones ni publicaciones en la agenda.
                                        </p>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>

                            <div className="border-t border-slate-900 pt-3 text-[10px] font-mono text-slate-500 flex items-center justify-between mt-4">
                              <span>CONTROL DE SOCIO</span>
                              <span>SITIO SEGURO</span>
                            </div>
                          </div>

                          {/* RIGHT COLUMN: GRAPHIC POSTS & DESIGN OF THE DAY */}
                          <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-5 flex flex-col justify-between">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                                <div className="flex items-center gap-2.5 text-purple-400">
                                  <Layers className="w-4.5 h-4.5" />
                                  <span className="text-[10px] font-mono font-black uppercase tracking-widest">Artes & Creativos de Hoy</span>
                                </div>
                                <span className="text-[9px] font-mono font-bold text-violet-500">DÍA {selectedDay || 8}</span>
                              </div>

                              {/* Display Scheduled Designs */}
                              {(() => {
                                const todayDesigns = (selectedClient.marketingStrategy?.creativeImages || []).filter(c => c.dayNum === (selectedDay || 8) && (c.monthNum === undefined || c.monthNum === selectedMonth));

                                return todayDesigns.length > 0 ? (
                                  <div className="space-y-4">
                                    <p className="text-slate-400 text-xs leading-relaxed font-sans">
                                      Hay <strong className="text-white font-semibold">{todayDesigns.length} post(s) gráfico(s)</strong> programados para hoy:
                                    </p>
                                    <div className="space-y-3">
                                      {todayDesigns.map((img) => (
                                        <div key={img.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
                                          <div className="flex justify-between items-center text-[8.5px] font-mono">
                                            <span className="text-purple-400 uppercase font-black bg-purple-950/30 px-2 py-0.5 rounded border border-purple-900/40">🎨 CREATIVO ESTRATÉGICO</span>
                                            <span className="text-slate-400 uppercase">{img.category}</span>
                                          </div>
                                          <h6 className="font-extrabold text-xs text-white leading-snug">{img.title}</h6>
                                          <p className="text-[11px] text-slate-300 italic font-sans leading-relaxed">
                                            "{img.prompt}"
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-12 text-slate-500 space-y-2">
                                    <Sparkles className="w-8 h-8 mx-auto text-slate-600" />
                                    <p className="text-xs font-mono font-bold text-slate-400">Sin requerimientos gráficos hoy</p>
                                    <p className="text-[10px] text-slate-500 max-w-[220px] mx-auto font-sans leading-relaxed">
                                      No hay artes de pauta agendados para diseño en esta jornada.
                                    </p>
                                  </div>
                                );
                              })()}
                            </div>

                            <div className="bg-slate-900/40 border border-slate-850 p-3 rounded-xl mt-4">
                              <span className="text-[8px] font-mono font-bold text-violet-400 uppercase tracking-wider block mb-1">RECORDATORIO DE ALGORITMO</span>
                              <p className="text-slate-300 text-[10.5px] leading-relaxed font-sans">
                                El ritmo constante de publicación es vital para optimizar las audiencias.
                              </p>
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* CALENDAR & DAILY TASKS GRID */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        
                        {/* 1. Monthly Calendar Grid (7 Columns) */}
                        <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-850 pb-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 font-mono font-black">Calendario de Operación</h4>
                            </div>
                            
                            {/* Month selector updating dynamically */}
                            <select
                              value={selectedMonth}
                              onChange={(e) => setSelectedMonth(Number(e.target.value))}
                              className="text-xs font-bold text-violet-700 bg-violet-50 border border-violet-150 dark:bg-zinc-950 dark:text-violet-400 dark:border-zinc-800 rounded-xl px-3 py-1.5 focus:ring-1 focus:ring-violet-400 focus:outline-hidden"
                            >
                              {calendarMonthsList.map((m, idx) => (
                                <option key={idx} value={idx}>{m} 2026</option>
                              ))}
                            </select>
                          </div>

                          <p className="text-slate-550 dark:text-slate-400 text-xs font-sans mt-1">
                            Haz clic en cualquier día de la matriz para verificar o auditar la agenda estratégica asignada al socio:
                          </p>

                          {/* Calendar Grid Header */}
                          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] font-bold text-slate-400 border-b border-slate-100 dark:border-zinc-850 pb-1.5">
                            <span>LUN</span>
                            <span>MAR</span>
                            <span>MIÉ</span>
                            <span>JUE</span>
                            <span>VIE</span>
                            <span>SÁB</span>
                            <span>DOM</span>
                          </div>

                          {/* 35/42 Calendar Cells represent a grid */}
                          <div className="grid grid-cols-7 gap-1.5 pt-1">
                            {(() => {
                              const currentMonthConfig = MONTHS_CONFIG_2026[selectedMonth];
                              const startOffset = currentMonthConfig.startOffset;
                              const maxDays = currentMonthConfig.days;
                              const totalCells = startOffset + maxDays > 35 ? 42 : 35;
                              
                              return Array.from({ length: totalCells }).map((_, idx) => {
                                const dayNumber = idx + 1 - startOffset;
                                const isActiveDay = dayNumber >= 1 && dayNumber <= maxDays;

                                // Find tasks matching this dayNumber and selected month
                                const dayTasks = currentChecklist.filter(t => t.dayNum === dayNumber && (t.monthNum === undefined || t.monthNum === selectedMonth));
                                const hasShoot = dayTasks.some(t => t.category === 'grabacion');
                                const hasReview = dayTasks.some(t => t.category === 'estrategia');
                                const hasPublish = dayTasks.some(t => t.category === 'publicacion');
                                const hasDesign = dayTasks.some(t => t.category === 'diseno');

                                const isSelected = selectedDay === dayNumber;

                                return (
                                  <div
                                    key={idx}
                                    onClick={() => isActiveDay && setSelectedDay(dayNumber)}
                                    className={`min-h-[56px] border rounded-xl p-1.5 flex flex-col justify-between transition-all select-none ${
                                      isActiveDay 
                                        ? 'cursor-pointer hover:border-violet-300 hover:bg-violet-50/20' 
                                        : 'bg-slate-50/50 dark:bg-zinc-950/20 border-slate-100 dark:border-zinc-850 opacity-30 text-slate-300'
                                    } ${
                                      isSelected && isActiveDay
                                        ? 'border-violet-500 bg-violet-50/40 ring-2 ring-violet-100 dark:ring-violet-950 dark:bg-violet-950/20'
                                        : isActiveDay
                                          ? 'border-slate-150 bg-white dark:bg-zinc-900 dark:border-zinc-800'
                                          : 'border-slate-100 dark:border-zinc-850'
                                    }`}
                                  >
                                    <div className="flex justify-between items-center">
                                      <span className={`text-[10px] font-mono font-bold ${
                                        isSelected && isActiveDay ? 'text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-950 px-1 rounded' : 'text-slate-650 dark:text-slate-400'
                                      }`}>
                                        {isActiveDay ? dayNumber : ''}
                                      </span>
                                      {dayTasks.length > 0 && isActiveDay && (
                                        <span className="text-[7.5px] font-mono bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 font-extrabold px-1 rounded-sm">
                                          {dayTasks.length}
                                        </span>
                                      )}
                                    </div>

                                    {/* Render indicators/dots for tasks */}
                                    {isActiveDay && dayTasks.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {hasShoot && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Grabación" />}
                                        {hasReview && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Revisión" />}
                                        {hasPublish && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Publicación" />}
                                        {hasDesign && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" title="Diseño Gráfico" />}
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>

                          {/* Calendar Legend */}
                          <div className="flex flex-wrap gap-4 pt-3 border-t border-slate-100 dark:border-zinc-850 text-[10px] font-mono font-bold text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-rose-500" />
                              <span>🎥 Grabación</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-400" />
                              <span>📝 Revisión</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span>🚀 Publicación</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-purple-500" />
                              <span>🎨 Diseño de Post</span>
                            </div>
                          </div>
                        </div>

                        {/* 2. Tasks for the Selected Day Panel (5 Columns) */}
                        <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4 min-h-[380px]">
                          <div className="border-b border-slate-100 dark:border-zinc-850 pb-3">
                            <span className="text-[8px] font-mono font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest block">DETALLE DE AGENDA</span>
                            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white font-display mt-0.5 font-black">
                              {selectedDay ? `Día ${selectedDay} de ${calendarMonthsList[selectedMonth]}` : 'Selecciona un día'}
                            </h4>
                          </div>

                          {selectedDay ? (
                            <div className="space-y-4">
                              {currentChecklist.filter(t => t.dayNum === selectedDay && (t.monthNum === undefined || t.monthNum === selectedMonth)).length > 0 ? (
                                <div className="space-y-3 font-sans text-xs">
                                  {currentChecklist.filter(t => t.dayNum === selectedDay && (t.monthNum === undefined || t.monthNum === selectedMonth)).map((task) => (
                                    <div 
                                      key={task.id}
                                      className={`p-3 rounded-2xl border transition-all ${
                                        task.completed 
                                          ? 'bg-slate-50/50 border-slate-150 dark:bg-zinc-955 dark:border-zinc-800 opacity-70 line-through text-slate-400' 
                                          : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-zinc-900 dark:border-zinc-800 shadow-3xs'
                                      }`}
                                    >
                                      <div className="flex items-start gap-2.5">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleRoadmapChecklistItem(task.id)}
                                          className="mt-0.5 text-slate-400 dark:text-slate-500 hover:text-violet-600 shrink-0 transition-all cursor-pointer font-extrabold"
                                        >
                                          {task.completed ? (
                                            <Check className="w-4 h-4 text-violet-600 dark:text-violet-400 font-extrabold" />
                                          ) : (
                                            <span className="w-4 h-4 border border-slate-300 dark:border-zinc-700 rounded block" />
                                          )}
                                        </button>
                                        <div className="space-y-1">
                                          <p className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">{task.title}</p>
                                          <div className="flex items-center gap-2">
                                            <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-sm uppercase ${
                                              task.category === 'grabacion' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400' :
                                              task.category === 'publicacion' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                                              task.category === 'diseno' ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400' :
                                              'bg-violet-50 text-violet-700 dark:bg-violet-950/20 dark:text-violet-400'
                                            }`}>
                                              {task.category || 'estrategia'}
                                            </span>
                                            <span className="text-[9px] text-slate-450 dark:text-slate-500 font-mono">{task.dueDate}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-12 text-slate-450 space-y-2">
                                  <Check className="w-8 h-8 mx-auto text-slate-300 dark:text-zinc-700" />
                                  <p className="text-xs font-mono">No hay tareas de grabación, diseño ni publicación para este día</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-20 text-slate-400">
                              <Calendar className="w-10 h-10 mx-auto text-slate-200 dark:text-zinc-800 mb-2" />
                              <p className="text-xs font-mono font-bold">Sin Día Seleccionado</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* INTEGRATED COMPLETE INTERACTIVE CHECKLIST ENGINE */}
                      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-850 pb-4">
                          <div>
                            <span className="text-[9px] font-mono font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest block">CHECKLIST COMPLETO DEL MES</span>
                            <h3 className="text-base font-bold text-slate-950 dark:text-white font-display">Tareas Operativas Consolidadas</h3>
                          </div>

                          {/* Filter tabs */}
                          <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-zinc-950 p-1 rounded-xl">
                            {(['all', 'grabacion', 'publicacion', 'diseno', 'estrategia'] as const).map((filter) => (
                              <button
                                key={filter}
                                type="button"
                                onClick={() => setChecklistFilter(filter)}
                                className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                                  checklistFilter === filter 
                                    ? 'bg-violet-600 text-white shadow-2xs' 
                                    : 'text-slate-500 hover:text-slate-950 dark:hover:text-white'
                                }`}
                              >
                                {filter === 'all' ? 'Todo' : 
                                 filter === 'grabacion' ? 'Grabación' : 
                                 filter === 'publicacion' ? 'Publicar' :
                                 filter === 'diseno' ? 'Diseño' : 'Estrategia'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Checklist List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                          {currentChecklist
                            .filter(t => (t.monthNum === undefined || t.monthNum === selectedMonth) && (checklistFilter === 'all' || t.category === checklistFilter))
                            .length > 0 ? (
                              currentChecklist
                                .filter(t => (t.monthNum === undefined || t.monthNum === selectedMonth) && (checklistFilter === 'all' || t.category === checklistFilter))
                                .map((task) => (
                                  <div 
                                    key={task.id} 
                                    className={`flex justify-between items-start p-3 bg-slate-50/55 dark:bg-zinc-955 border border-slate-150 dark:border-zinc-800 rounded-2xl group transition-all ${
                                      task.completed ? 'opacity-65 border-slate-200 dark:border-zinc-800 bg-slate-100/30' : ''
                                    }`}
                                  >
                                    <div className="flex items-start gap-2.5 min-w-0">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleRoadmapChecklistItem(task.id)}
                                        className="mt-0.5 text-slate-400 dark:text-slate-500 hover:text-violet-600 shrink-0 transition-all cursor-pointer"
                                      >
                                        {task.completed ? (
                                          <Check className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                        ) : (
                                          <span className="w-4 h-4 border border-slate-300 dark:border-zinc-700 rounded block" />
                                        )}
                                      </button>
                                      <div className="min-w-0">
                                        <p className={`text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug break-words ${
                                          task.completed ? 'line-through text-slate-400 dark:text-zinc-550' : ''
                                        }`}>
                                          {task.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-[8.5px] font-mono font-bold uppercase text-violet-600 dark:text-violet-400">{task.dueDate}</span>
                                          <span className="text-slate-300 dark:text-zinc-700 font-mono text-[8.5px]">•</span>
                                          <span className="text-[8px] font-mono uppercase bg-slate-200/50 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 px-1 rounded font-bold">
                                            {task.category || 'estrategia'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))
                            ) : (
                              <div className="col-span-2 text-center py-10 text-slate-405">
                                <p className="text-xs font-mono font-bold">No hay tareas en este filtro</p>
                              </div>
                            )}
                        </div>
                      </div>

                      {/* ORIGINAL HITOS GENERALES & CHECKLISTS FOLLOWS */}
                      <div className="border-t border-slate-100 dark:border-zinc-800 pt-6">
                        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-4">MÓDULOS DE EDICIÓN & ASIGNACIÓN</span>
                      </div>

                      {/* 1. Siguientes Pasos (Hitos Resumen) */}
                      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-3xs space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-850">
                        <div className="flex items-center gap-2">
                          <Check className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450 font-mono">RESUMEN EJECUTIVO</h4>
                            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white font-display">Hitos Generales de Siguientes Pasos</h3>
                          </div>
                        </div>
                        <span className="text-[10px] bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-350 px-2 py-0.5 rounded font-mono font-bold">{selectedClient.nextSteps.length} Hitos</span>
                      </div>

                      <div className="space-y-2.5 font-sans text-xs">
                        {selectedClient.nextSteps.map((step, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-850 rounded-xl group transition-colors hover:bg-slate-100/50">
                            <span className="text-xs text-slate-700 dark:text-slate-300 pr-2 leading-snug font-medium flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                              {step}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveStep(idx)}
                              className="text-slate-400 hover:text-rose-600 opacity-50 group-hover:opacity-100 transition-all p-1.5 cursor-pointer"
                              title="Eliminar Paso"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}

                        <div className="flex gap-2 pt-2">
                          <input
                            type="text"
                            placeholder="Agregar nuevo hito de siguiente paso..."
                            value={newStepText}
                            onChange={(e) => setNewStepText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddStep(); } }}
                            className="flex-grow bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-violet-500 text-slate-900 dark:text-white"
                          />

                          <button
                            type="button"
                            onClick={handleAddStep}
                            className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs active:scale-97 select-none"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Añadir</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 2. Interactive Roadmap Checklist (Calendario de Actividades Operativas) */}
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-3xs space-y-5">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-850">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450 font-mono">CRONOGRAMA DE OPERACIONES</h4>
                            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white font-display">Checklist Operativo Interactivo (Socio + Consultor)</h3>
                          </div>
                        </div>
                        <span className="text-[10px] bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded font-mono font-bold">
                          {(selectedClient.roadmapChecklist || []).length} Tareas Totales
                        </span>
                      </div>

                      <p className="text-slate-550 dark:text-slate-400 text-xs leading-relaxed font-sans">
                        Este checklist dinámico alimenta la <strong>"Agenda Diaria Pro"</strong> y el <strong>"Calendario Mensual"</strong> en el panel de tu cliente. Puedes crear asignaciones de Grabación, Diseño, Publicación o Estrategia, y tanto tú como tu cliente podrán verlas y marcarlas como completadas en tiempo real.
                      </p>

                      {/* Add Checklist Task Form */}
                      <div className="bg-slate-50/50 dark:bg-zinc-950/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-4 space-y-3.5">
                        <span className="text-[10px] font-mono font-extrabold text-violet-700 dark:text-violet-400 uppercase tracking-wide block">Asignar Nueva Tarea Operativa</span>
                        
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                          <div className="md:col-span-5">
                            <input
                              type="text"
                              placeholder="Ej: Grabar video gancho #2 en oficina..."
                              value={newChecklistText}
                              onChange={(e) => setNewChecklistText(e.target.value)}
                              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-violet-500 text-slate-900 dark:text-white"
                            />
                          </div>

                          <div className="md:col-span-3">
                            <select
                              value={newChecklistCategory}
                              onChange={(e) => setNewChecklistCategory(e.target.value as any)}
                              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-violet-500 text-slate-750 dark:text-slate-350 font-medium"
                            >
                              <option value="grabacion">🎥 Grabación</option>
                              <option value="diseno">🎨 Diseño</option>
                              <option value="publicacion">📅 Publicación</option>
                              <option value="estrategia">📊 Estrategia</option>
                            </select>
                          </div>

                          <div className="md:col-span-2">
                            <select
                              value={newChecklistMonth}
                              onChange={(e) => setNewChecklistMonth(Number(e.target.value))}
                              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-2.5 py-2 text-xs focus:outline-hidden focus:border-violet-500 text-slate-750 dark:text-slate-350 font-medium"
                            >
                              {monthsList.map((m, idx) => (
                                <option key={idx} value={idx}>Mes {idx + 1}</option>
                              ))}
                            </select>
                          </div>

                          <div className="md:col-span-2">
                            <input
                              type="number"
                              min="1"
                              max="30"
                              value={newChecklistDay}
                              onChange={(e) => setNewChecklistDay(Math.max(1, Math.min(30, Number(e.target.value))))}
                              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-violet-500 text-slate-900 dark:text-white text-center font-mono font-bold"
                              title="Día de la agenda (1-30)"
                              placeholder="Día"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={handleAddRoadmapChecklistItem}
                            className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs hover:shadow-2xs active:scale-97 select-none"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Asignar Tarea</span>
                          </button>
                        </div>
                      </div>

                      {/* Render Current Checklist Items */}
                      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                        {!(selectedClient.roadmapChecklist && selectedClient.roadmapChecklist.length > 0) ? (
                          <div className="text-center py-6 text-slate-400 dark:text-zinc-550 text-xs font-mono">
                            No hay tareas cargadas en el cronograma operativo de este socio.
                          </div>
                        ) : (
                          [...selectedClient.roadmapChecklist].map((item) => {
                            const catLabel = item.category === 'grabacion' ? '🎥 Grabación' :
                                             item.category === 'diseno' ? '🎨 Diseño' :
                                             item.category === 'publicacion' ? '📅 Publicación' : '📊 Estrategia';
                            const catColor = item.category === 'grabacion' ? 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30' :
                                             item.category === 'diseno' ? 'bg-violet-50 text-violet-700 border-violet-200/60 dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-900/30' :
                                             item.category === 'publicacion' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' :
                                             'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30';

                            return (
                              <div 
                                key={item.id} 
                                className={`flex items-center justify-between p-3 border rounded-xl transition-all ${
                                  item.completed 
                                    ? 'bg-slate-50/60 border-slate-200 text-slate-400 dark:bg-zinc-950/45 dark:border-zinc-800/80 line-through' 
                                    : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 dark:bg-zinc-900 dark:border-zinc-800 dark:text-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <input
                                    type="checkbox"
                                    checked={item.completed}
                                    onChange={() => handleToggleRoadmapChecklistItem(item.id)}
                                    className="h-4 w-4 text-violet-600 rounded border-slate-300 focus:ring-violet-500 cursor-pointer shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className={`text-xs font-semibold block leading-tight ${item.completed ? 'line-through text-slate-400 dark:text-zinc-550' : 'text-slate-800 dark:text-slate-200'}`}>
                                      {item.title}
                                    </span>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded border ${catColor}`}>
                                        {catLabel}
                                      </span>
                                      <span className="text-[9px] text-slate-450 dark:text-slate-500 font-mono font-bold">
                                        Mes {Number(item.monthNum || 0) + 1} - Día {item.dayNum || 1}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveRoadmapChecklistItem(item.id)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded-lg cursor-pointer transition-colors shrink-0 ml-2"
                                  title="Eliminar del Checklist"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* 3. Plan de Creativos Gráficos & Posts (Moved from ClientView to AdminPanel as requested) */}
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-3xs space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-850 pb-4">
                        <div className="flex items-center gap-3">
                          <Layers className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450 font-mono">PLAN DE CONTENIDO ESTÁTICO & ARTES</h4>
                            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white font-display">Planificador de Creativos Gráficos & Posts</h3>
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingCreative(true);
                          }}
                          className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-3xs cursor-pointer shrink-0 active:scale-97 select-none"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Planificar Post Gráfico</span>
                        </button>
                      </div>

                      <p className="text-slate-550 dark:text-slate-400 text-xs leading-relaxed font-sans">
                        Diseña, planifica y asocia artes estáticos, carruseles o banners de descuento a un ángulo de ventas específico. Al guardar un post gráfico aquí, se creará automáticamente un hito de diseño (<span className="text-purple-650 font-bold dark:text-purple-400">🎨 Diseñar post gráfico</span>) en el checklist de operaciones de arriba.
                      </p>

                      {/* Strategic Post planning form */}
                      <AnimatePresence>
                        {isAddingCreative && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-slate-50/60 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl space-y-4 overflow-hidden"
                          >
                            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-zinc-800/60 pb-2">
                              <span className="text-[10px] font-mono font-extrabold text-violet-700 dark:text-violet-400 uppercase">Añadir Nuevo Creativo Gráfico</span>
                              <button
                                type="button"
                                onClick={() => setIsAddingCreative(false)}
                                className="text-slate-400 hover:text-slate-600 dark:text-slate-300 p-1 rounded-lg cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-mono font-bold text-slate-550 dark:text-slate-400 uppercase block">Título del Post / Tópico</label>
                                <input
                                  type="text"
                                  placeholder="Ej: 3 Errores de Inversión Inmobiliaria"
                                  value={newCreativeTitle}
                                  onChange={(e) => setNewCreativeTitle(e.target.value)}
                                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-violet-500 text-slate-900 dark:text-white"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-mono font-bold text-slate-550 dark:text-slate-400 uppercase block">Formato / Red Social</label>
                                <select
                                  value={newCreativeCategory}
                                  onChange={(e) => setNewCreativeCategory(e.target.value)}
                                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs focus:outline-hidden focus:border-violet-500 text-slate-750 dark:text-slate-350 font-medium"
                                >
                                  <option value="Instagram Feed (1:1)">Instagram Feed (1:1)</option>
                                  <option value="Instagram Story (9:16)">Instagram Story (9:16)</option>
                                  <option value="LinkedIn Carousel (PDF)">LinkedIn Carousel (PDF)</option>
                                  <option value="Facebook Ad Banner">Facebook Ad Banner</option>
                                  <option value="Infografía Educativa">Infografía Educativa</option>
                                  <option value="Banner de Descuento">Banner de Descuento</option>
                                </select>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-mono font-bold text-slate-550 dark:text-slate-400 uppercase block">Día de Publicación (1-30)</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="30"
                                  placeholder="Ej: 15"
                                  value={newCreativePublishDay}
                                  onChange={(e) => setNewCreativePublishDay(Math.max(1, Math.min(30, Number(e.target.value))))}
                                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-violet-500 text-slate-900 dark:text-white font-mono"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-mono font-bold text-slate-550 dark:text-slate-400 uppercase block">Vincular a Ángulo de Venta</label>
                                <select
                                  value={newCreativeAngle}
                                  onChange={(e) => setNewCreativeAngle(e.target.value)}
                                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs focus:outline-hidden focus:border-violet-500 text-slate-750 dark:text-slate-350 font-medium"
                                >
                                  <option value="">-- Seleccionar Ángulo --</option>
                                  {(selectedClient.marketingStrategy?.angles || []).map((angle: string, idx: number) => (
                                    <option key={idx} value={angle}>{angle}</option>
                                  ))}
                                  <option value="General Branding">General Branding / Educacional</option>
                                </select>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-mono font-bold text-slate-550 dark:text-slate-400 uppercase block">Mes de Planificación</label>
                                <select
                                  value={newCreativeMonth}
                                  onChange={(e) => setNewCreativeMonth(Number(e.target.value))}
                                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs focus:outline-hidden focus:border-violet-500 text-slate-750 dark:text-slate-350 font-medium"
                                >
                                  {monthsList.map((m, idx) => (
                                    <option key={idx} value={idx}>{m} 2026</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-mono font-bold text-slate-550 dark:text-slate-400 uppercase block">Instrucciones de Diseño / Prompt Creativo</label>
                              <textarea
                                rows={3}
                                placeholder="Describe la composición visual, textos destacados, colores sugeridos..."
                                value={newCreativePrompt}
                                onChange={(e) => setNewCreativePrompt(e.target.value)}
                                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-violet-500 text-slate-900 dark:text-white placeholder-slate-400 font-sans"
                              />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-zinc-850">
                              <button
                                type="button"
                                onClick={() => setIsAddingCreative(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-350 dark:hover:bg-zinc-850 transition-all cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={handleCreateStrategicPost}
                                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-all shadow-3xs cursor-pointer active:scale-97 select-none"
                              >
                                Guardar y Agendar
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Display grid of planned creative graphic posts */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {!(selectedClient.marketingStrategy?.creativeImages && selectedClient.marketingStrategy.creativeImages.length > 0) ? (
                          <div className="col-span-full bg-slate-50/50 dark:bg-zinc-950/40 border border-slate-200/60 dark:border-zinc-800 rounded-2xl p-8 text-center text-slate-400 dark:text-zinc-500 text-xs font-mono">
                            No hay artes planificados aún. Usa el botón "Planificar Post Gráfico" de arriba para crear artes vinculados a tus ángulos estratégicos.
                          </div>
                        ) : (
                          [...selectedClient.marketingStrategy.creativeImages].map((creative) => (
                            <div 
                              key={creative.id} 
                              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-3xs flex flex-col group relative"
                            >
                              <div className="h-32 w-full relative overflow-hidden">
                                <img 
                                  src={creative.imageUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60"} 
                                  alt={creative.title} 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                {generatingCreativeId === creative.id && (
                                  <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-2 p-2 text-center text-white backdrop-blur-xs z-10">
                                    <span className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin"></span>
                                    <span className="text-[8px] font-mono font-black animate-pulse uppercase">CREANDO CON {imageEngine === 'supabase_edge' ? 'SUPABASE EDGE' : imageEngine === 'openai' ? 'CHATGPT' : 'GEMINI'}...</span>
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
                                
                                <div className="absolute top-2.5 left-2.5">
                                  <span className="text-[8.5px] font-mono font-bold bg-white/90 backdrop-blur-md text-slate-800 border border-slate-100 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                                    {creative.category}
                                  </span>
                                </div>

                                <div className="absolute top-2.5 right-2.5">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCreativePost(creative.id)}
                                    className="p-1.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded-lg shadow-sm transition-all cursor-pointer active:scale-95"
                                    title="Eliminar Arte Planificado"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                                  <span className="text-[8.5px] font-mono text-emerald-300 font-extrabold block">
                                    Mes {Number(creative.monthNum || 0) + 1} - Día {creative.dayNum || 15}
                                  </span>
                                  <h4 className="text-xs font-black truncate leading-tight mt-0.5" title={creative.title}>
                                    {creative.title}
                                  </h4>
                                </div>
                              </div>

                              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2 text-[11px]">
                                <div className="space-y-1">
                                  <span className="text-[8.5px] font-bold text-slate-400 block uppercase font-mono">Ángulo de Venta:</span>
                                  <span className="text-slate-700 dark:text-slate-300 font-bold block leading-relaxed line-clamp-1 bg-slate-50 dark:bg-zinc-950 p-1.5 rounded-lg border border-slate-150/60 dark:border-zinc-800">
                                    {creative.angle || 'General / Educación'}
                                  </span>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[8.5px] font-bold text-slate-400 block uppercase font-mono">Prompt / Visual:</span>
                                  <p className="text-slate-550 dark:text-slate-450 italic leading-snug line-clamp-3">
                                    "{creative.prompt}"
                                  </p>
                                </div>

                                <div className="pt-2">
                                  <button
                                    type="button"
                                    onClick={() => handleGenerateCreativeImageInStudio(creative.id, creative.prompt, creative.title, creative.category)}
                                    className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-slate-200 font-bold py-1 px-2.5 rounded-lg text-[9px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <span>🔄 Generar Arte con IA</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )})()}

                  {/* EDIT INTUIVELY FOUR KPI NUMBERS */}
                  {activeWorkspaceSubTab === 'kpis' && (
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
                  )}

                  {/* MONTHS PROGRESS GRAPH EDIT VALUES */}
                  {activeWorkspaceSubTab === 'graficos' && (
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
                  )}

                  {/* ADD TIMELINE/BITÁCORA LOGS */}
                  {activeWorkspaceSubTab === 'bitacoras' && (
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
                  )}
                </div>

                {/* ========================================================================= */}
                {/* SECCIÓN ADICIONAL: MOTOR DE ESTRATEGIA DE MARKETING & CALENDARIO COMPLETO */}
                {/* ========================================================================= */}
                {activeWorkspaceSubTab === 'estrategia' && (
                  <div className="bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 space-y-6 mt-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-violet-600 text-white rounded-2xl shadow-xs">
                        <Sparkles className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Motor Estratégico & Creative Studio</h3>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white font-display">Planes de Crecimiento para {selectedClient.companyName}</h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold font-sans uppercase tracking-wider px-3 py-1.5 rounded-full border shadow-2xs ${selectedClient.serviceType === 'partner_prime' ? 'bg-violet-50 border-violet-150 text-violet-850 dark:bg-violet-950/20' : 'bg-emerald-50 border-emerald-150 text-emerald-850 dark:bg-emerald-950/20'}`}>
                        {selectedClient.serviceType === 'partner_prime' ? '🚀 Partner Prime (Acompañamiento)' : '📋 Systeme Prime (Consultoría)'}
                      </span>
                      
                      {selectedClient.marketingStrategy && (
                        <button
                          onClick={() => {
                            setStrategyClient(selectedClient);
                            setStrategyVideoCount(selectedClient.marketingStrategy?.calendar?.length || 12);
                            setStrategySuccessMsg('');
                            setShowStrategyPopup(true);
                          }}
                          className="bg-white dark:bg-zinc-900 hover:bg-slate-50 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-1.5 text-xs font-bold text-violet-750 transition-all cursor-pointer"
                        >
                          Regenerar Estrategia IA
                        </button>
                      )}
                    </div>
                  </div>

                  {!selectedClient.marketingStrategy ? (
                    /* BLANK SLATE: NO STRATEGY CONFIGURED YET */
                    <div className="p-8 text-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-3xl space-y-4 max-w-xl mx-auto shadow-xs">
                      <div className="inline-flex p-4 bg-amber-50 rounded-full border border-amber-100 text-amber-500">
                        <Calendar className="w-8 h-8" />
                      </div>
                      <div className="space-y-1.5">
                        <h5 className="font-bold text-slate-900 dark:text-white text-base">Estrategia de 30 Días Pendiente de Generar</h5>
                        <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-sans max-w-md mx-auto">
                          Este socio aún no cuenta con un Plan de Marketing activo en su panel privado. Al activarlo, generaremos de inmediato el público objetivo, oferta de valor, cronograma de contenidos virales TOFU/MOFU/BOFU y un Studio Creativo adaptado a su nicho.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setStrategyClient(selectedClient);
                          setStrategyVideoCount(selectedClient.serviceType === 'partner_prime' ? 12 : 5);
                          setStrategySuccessMsg('');
                          setShowStrategyPopup(true);
                        }}
                        className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Inicializar Plan de Contenidos & Estrategia IA</span>
                      </button>
                    </div>
                  ) : (
                    /* STRATEGY CONTROL PANEL SUITE */
                    <div className="space-y-8">
                      {/* Sub-Sección 1: Estrategia Core (Audience, Offer, Pillars, Angles) */}
                      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-zinc-800 pb-2.5">
                          <Compass className="w-4 h-4 text-violet-600" />
                          <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-white">Pila de Posicionamiento Estratégico</h5>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">Público Objetivo / Cliente Ideal</label>
                            <textarea
                              rows={3}
                              value={selectedClient.marketingStrategy.targetAudience}
                              onChange={(e) => handleUpdateStrategyField('targetAudience', e.target.value)}
                              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white leading-relaxed resize-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">Oferta Comercial Irresistible</label>
                            <textarea
                              rows={3}
                              value={selectedClient.marketingStrategy.coreOffer}
                              onChange={(e) => handleUpdateStrategyField('coreOffer', e.target.value)}
                              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white leading-relaxed resize-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <div className="space-y-2.5 bg-slate-50 dark:bg-zinc-950/30 p-4 rounded-xl border border-slate-150 dark:border-zinc-850">
                            <label className="block text-[10px] font-bold text-violet-700 uppercase font-mono">Pilares de Contenido (Alineación Editorial)</label>
                            <div className="space-y-2 text-xs font-sans">
                              {(selectedClient.marketingStrategy.pillars || ['Pilar 1', 'Pilar 2', 'Pilar 3']).map((pillar, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                  <span className="text-[10px] font-bold font-mono h-5 w-5 bg-violet-100 text-violet-750 rounded-full flex items-center justify-center shrink-0">{idx + 1}</span>
                                  <input
                                    type="text"
                                    value={pillar}
                                    onChange={(e) => {
                                      const nextPillars = [...(selectedClient.marketingStrategy?.pillars || [])];
                                      nextPillars[idx] = e.target.value;
                                      handleUpdateStrategyField('pillars', nextPillars);
                                    }}
                                    className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2.5 bg-slate-50 dark:bg-zinc-950/30 p-4 rounded-xl border border-slate-150 dark:border-zinc-850">
                            <label className="block text-[10px] font-bold text-violet-700 uppercase font-mono">Ángulos de Venta (Fórmulas Publicitarias)</label>
                            <div className="space-y-2 text-xs font-sans">
                              {(selectedClient.marketingStrategy.angles || ['Ángulo 1', 'Ángulo 2', 'Ángulo 3']).map((angle, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                  <span className="text-[10px] font-bold font-mono h-5 w-5 bg-violet-100 text-violet-750 rounded-full flex items-center justify-center shrink-0">{idx + 1}</span>
                                  <input
                                    type="text"
                                    value={angle}
                                    onChange={(e) => {
                                      const nextAngles = [...(selectedClient.marketingStrategy?.angles || [])];
                                      nextAngles[idx] = e.target.value;
                                      handleUpdateStrategyField('angles', nextAngles);
                                    }}
                                    className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sub-Sección 2: Cronograma Diario / Calendario de Guiones */}
                      {selectedClient.serviceType === 'partner_prime' && (
                        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-5">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-zinc-800 pb-3">
                            <div className="flex items-center gap-1.5">
                              <Video className="w-4 h-4 text-violet-600" />
                              <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-white">Cronograma & Calendario de Videos de 30 Días ({selectedClient.marketingStrategy.calendar?.length || 0})</h5>
                            </div>
                            
                            <button
                              onClick={() => setShowAddScriptForm(!showAddScriptForm)}
                              className="text-xs bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold px-3 py-2 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{showAddScriptForm ? 'Cerrar Formulario' : 'Añadir Guión Manual'}</span>
                            </button>
                          </div>

                          {showAddScriptForm && (
                            <form onSubmit={handleAddScriptCard} className="p-4 bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-200 dark:border-zinc-800/80 space-y-3 font-sans text-xs">
                              <h6 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] font-mono">Nuevo Guión Planificado</h6>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2">
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Título del Video</label>
                                  <input
                                    type="text"
                                    placeholder="Ej: El mayor error de tu rubro..."
                                    value={scriptTitle}
                                    onChange={(e) => setScriptTitle(e.target.value)}
                                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 rounded-lg px-2.5 py-1.5"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Fase de Contenido</label>
                                  <select
                                    value={scriptPhase}
                                    onChange={(e: any) => setScriptPhase(e.target.value)}
                                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 rounded-lg px-2 py-1.5 text-violet-700 font-bold"
                                  >
                                    <option value="TOFU">TOFU (Atracción/Viral)</option>
                                    <option value="MOFU">MOFU (Educación/Confianza)</option>
                                    <option value="BOFU">BOFU (Conversión/Venta)</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Día de Publicación (1 al 30)</label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={30}
                                    value={scriptPublishDay}
                                    onChange={(e) => setScriptPublishDay(Number(e.target.value))}
                                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 rounded-lg px-2.5 py-1.5"
                                  />
                                </div>
                                <div className="p-2.5 bg-violet-50/40 rounded-xl text-[10px] flex items-center">
                                  💡 Grabación (Shoot Day): Día {Math.max(1, scriptPublishDay - 3)} del mes (automático)
                                </div>
                                <div className="p-2.5 bg-violet-50/40 rounded-xl text-[10px] flex items-center">
                                  💡 Revisión (Review Day): Día {Math.max(1, scriptPublishDay - 1)} del mes (automático)
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Gancho Inicial Rompe-Scroll (Hook)</label>
                                  <input
                                    type="text"
                                    placeholder="Ej: ¿Sabías que el 90% de las marcas...?"
                                    value={scriptHook}
                                    onChange={(e) => setScriptHook(e.target.value)}
                                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Estructura del Cuerpo del Guión</label>
                                  <textarea
                                    rows={2}
                                    placeholder="Escribe el desarrollo paso a paso del video..."
                                    value={scriptBody}
                                    onChange={(e) => setScriptBody(e.target.value)}
                                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs resize-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Llamado a la Acción Potente (CTA)</label>
                                  <input
                                    type="text"
                                    placeholder="Ej: Comenta la palabra SONRISA para darte una evaluación..."
                                    value={scriptCTA}
                                    onChange={(e) => setScriptCTA(e.target.value)}
                                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-violet-700"
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setShowAddScriptForm(false)}
                                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="submit"
                                  className="bg-violet-600 text-white rounded-lg px-4 py-1.5 font-bold"
                                >
                                  Añadir al Calendario
                                </button>
                              </div>
                            </form>
                          )}

                          {/* List of Scripts */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
                            {(selectedClient.marketingStrategy.calendar || []).map((script, idx) => (
                              <div key={script.id} className="p-4 bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-850 rounded-2xl space-y-3 flex flex-col justify-between font-sans text-xs">
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-bold font-mono h-5 w-5 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center">#{idx + 1}</span>
                                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${script.phase === 'TOFU' ? 'bg-amber-50 text-amber-800 border-amber-100' : script.phase === 'MOFU' ? 'bg-cyan-50 text-cyan-800 border-cyan-100' : 'bg-violet-50 text-violet-800 border-violet-100'}`}>
                                        {script.phase}
                                      </span>
                                    </div>
                                    <div className="flex gap-1">
                                      <select
                                        value={script.status}
                                        onChange={(e: any) => handleUpdateScriptCard(script.id, { status: e.target.value })}
                                        className="bg-white dark:bg-zinc-900 border border-slate-200 rounded-lg text-[10px] px-2 py-0.5 font-semibold text-slate-700 outline-none"
                                      >
                                        <option value="pending">⏳ Pendiente</option>
                                        <option value="shooting">🎥 Grabación</option>
                                        <option value="review">✍ Revisión</option>
                                        <option value="published">✓ Publicado</option>
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveScriptCard(script.id)}
                                        className="p-1 border border-slate-200 rounded-lg text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">Título & Gancho</label>
                                    <input
                                      type="text"
                                      value={script.title}
                                      onChange={(e) => handleUpdateScriptCard(script.id, { title: e.target.value })}
                                      className="w-full bg-white dark:bg-zinc-900 border border-slate-250/70 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 dark:text-white mt-1"
                                    />
                                    <input
                                      type="text"
                                      value={script.hook}
                                      onChange={(e) => handleUpdateScriptCard(script.id, { hook: e.target.value })}
                                      className="w-full bg-white dark:bg-zinc-900 border border-slate-250/70 rounded-lg px-2 py-1 text-xs italic font-medium text-slate-750 mt-1"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">Estructura del Cuerpo</label>
                                    <textarea
                                      rows={2}
                                      value={script.bodyStructure}
                                      onChange={(e) => handleUpdateScriptCard(script.id, { bodyStructure: e.target.value })}
                                      className="w-full bg-white dark:bg-zinc-900 border border-slate-250/70 rounded-lg px-2 py-1 text-xs resize-none mt-1 leading-relaxed"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">CTA (Acción Potente)</label>
                                    <input
                                      type="text"
                                      value={script.cta}
                                      onChange={(e) => handleUpdateScriptCard(script.id, { cta: e.target.value })}
                                      className="w-full bg-white dark:bg-zinc-900 border border-slate-250/70 rounded-lg px-2 py-1 text-xs font-semibold text-violet-750 mt-1"
                                    />
                                  </div>
                                </div>

                                <div className="border-t border-slate-150 pt-2.5 mt-2.5 grid grid-cols-3 gap-2 text-[10px] text-slate-500 font-mono font-medium">
                                  <div>
                                    <span>🎥 Grabar:</span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={30}
                                      value={script.shootDay}
                                      onChange={(e) => handleUpdateScriptCard(script.id, { shootDay: Number(e.target.value) })}
                                      className="w-full bg-white dark:bg-zinc-900 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-slate-800"
                                    />
                                  </div>
                                  <div>
                                    <span>✍ Revisar:</span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={30}
                                      value={script.reviewDay}
                                      onChange={(e) => handleUpdateScriptCard(script.id, { reviewDay: Number(e.target.value) })}
                                      className="w-full bg-white dark:bg-zinc-900 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-slate-800"
                                    />
                                  </div>
                                  <div>
                                    <span>📢 Publicar:</span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={30}
                                      value={script.publishDay}
                                      onChange={(e) => handleUpdateScriptCard(script.id, { publishDay: Number(e.target.value) })}
                                      className="w-full bg-white dark:bg-zinc-900 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-violet-750"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sub-Sección 3: Studio Creativo Integrado (Imágenes) */}
                      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-2.5">
                          <div className="flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-violet-600" />
                            <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-white">Studio Creativo Integrado · Plantillas Gráficas ({selectedClient.marketingStrategy.creativeImages?.length || 0})</h5>
                          </div>

                          {/* Selector de Motor de IA */}
                          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-950 p-1 rounded-xl shrink-0 self-end sm:self-auto">
                            <span className="text-[9px] font-mono font-bold text-slate-500 px-1 font-mono">Motor IA:</span>
                            <button
                              type="button"
                              onClick={() => setImageEngine('gemini')}
                              className={`text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${imageEngine === 'gemini' ? 'bg-violet-600 text-white shadow-3xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                            >
                              ♊ Gemini
                            </button>
                            <button
                              type="button"
                              onClick={() => setImageEngine('openai')}
                              className={`text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${imageEngine === 'openai' ? 'bg-violet-600 text-white shadow-3xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                            >
                              🤖 ChatGPT (Local)
                            </button>
                            <button
                              type="button"
                              onClick={() => setImageEngine('supabase_edge')}
                              className={`text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${imageEngine === 'supabase_edge' ? 'bg-violet-600 text-white shadow-3xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                              title="Ejecuta la función Edge en tu Supabase"
                            >
                              ⚡ Supabase Edge
                            </button>
                          </div>
                        </div>

                        {imageEngine === 'supabase_edge' && (
                          <div className="bg-violet-50/50 dark:bg-violet-950/10 border border-violet-100 dark:border-violet-900/30 rounded-xl p-3.5 space-y-2 text-xs font-sans">
                            <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300 font-bold">
                              <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                              </span>
                              <span>Motor Seguro: Supabase Edge Function Activa (Recomendado)</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                              La aplicación se comunicará directamente con tu propia <strong>Edge Function</strong> de Supabase en <code className="bg-slate-100 dark:bg-zinc-800 px-1 rounded font-mono text-[10px]">{supabaseUrl || getSupabaseCredentials()?.url || 'tu-proyecto'}</code> para generar imágenes con DALL-E 3 de forma 100% segura. El API Key no pasa por los servidores de la app.
                            </p>
                            <div className="bg-slate-900 text-slate-300 dark:bg-zinc-950 rounded-lg p-2.5 font-mono text-[10px] leading-normal border border-zinc-800">
                              <span className="text-slate-500"># 1. Registra tu API Key de OpenAI en los secrets de tu Supabase:</span><br />
                              <span className="text-violet-400 font-bold">supabase secrets set OPENAI_API_KEY=sk-proj-...</span><br />
                              <span className="text-slate-500 mt-1 block"># 2. Despliega la función usando la CLI de Supabase:</span>
                              <span className="text-violet-400 font-bold">supabase functions deploy generate-image --no-verify-jwt</span>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              💡 El código listo de la función está disponible en este workspace bajo la ruta <code className="underline font-mono">/supabase/functions/generate-image/index.ts</code> para que solo tengas que copiarlo y desplegarlo.
                            </p>
                          </div>
                        )}

                        {/* Éxito / Feedback de Generación */}
                        {imageGenSuccessMessage && (
                          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-350 p-3 rounded-xl text-xs flex items-center justify-between gap-2">
                            <span>{imageGenSuccessMessage}</span>
                            <button onClick={() => setImageGenSuccessMessage(null)} className="font-bold text-[10px] uppercase hover:underline">Entendido</button>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          {(selectedClient.marketingStrategy.creativeImages || []).map((img) => (
                            <div key={img.id} className="bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-850 rounded-2xl overflow-hidden flex flex-col justify-between font-sans text-xs">
                              <div className="relative aspect-video bg-slate-900 overflow-hidden shrink-0">
                                <img
                                  src={img.imageUrl}
                                  alt={img.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover opacity-90 hover:scale-105 transition-all duration-500"
                                />
                                {generatingCreativeId === img.id && (
                                  <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-2 p-2 text-center text-white backdrop-blur-xs">
                                    <span className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin"></span>
                                    <span className="text-[8px] font-mono font-bold animate-pulse uppercase">CREANDO CON {imageEngine === 'supabase_edge' ? 'SUPABASE EDGE' : imageEngine === 'openai' ? 'CHATGPT' : 'GEMINI'}...</span>
                                  </div>
                                )}
                                <span className="absolute top-2 left-2 text-[9px] uppercase tracking-wider font-bold bg-slate-950/70 text-white px-2 py-0.5 rounded backdrop-blur-xs font-mono">
                                  {img.category}
                                </span>
                              </div>

                              <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                                <div className="space-y-1">
                                  <h6 className="font-bold text-slate-900 dark:text-white truncate leading-tight">{img.title}</h6>
                                  <p className="text-[10px] text-slate-550 dark:text-slate-400 leading-normal line-clamp-3">{img.prompt}</p>
                                </div>

                                <button
                                  onClick={() => handleGenerateCreativeImageInStudio(img.id, img.prompt, img.title, img.category)}
                                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-1.5 rounded-lg text-[10px] transition-colors cursor-pointer text-center"
                                >
                                  🔄 Generar con IA
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sub-Sección 4: Reportes Quincenales (Ventas y Contenidos) */}
                      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-zinc-800 pb-3">
                          <div className="flex items-center gap-1.5">
                            <BarChart3 className="w-4 h-4 text-violet-600" />
                            <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-white">Reportes de Rendimiento Quincenales (Cada 15 Días)</h5>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowAddReportForm(!showAddReportForm)}
                              className="text-[11px] border border-slate-200 dark:border-zinc-800 bg-white hover:bg-slate-50 text-slate-700 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>{showAddReportForm ? 'Cerrar Formulario' : 'Manual'}</span>
                            </button>
                            <button
                              onClick={handleGenerateReportWithIA}
                              disabled={generatingReportIA}
                              className="text-[11px] bg-violet-600 hover:bg-violet-700 text-white font-bold px-4 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>{generatingReportIA ? 'Generando Reporte...' : 'Generar Reporte IA'}</span>
                            </button>
                          </div>
                        </div>

                        {showAddReportForm && (
                          <form onSubmit={handleAddReportManually} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 font-sans text-xs">
                            <h6 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] font-mono">Nuevo Reporte Quincenal</h6>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Período del Reporte</label>
                                <select
                                  value={reportPeriod}
                                  onChange={(e: any) => setReportPeriod(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 font-bold"
                                >
                                  <option value="Día 1-15 (Fase de Instalación)">Día 1-15 (Instalación)</option>
                                  <option value="Día 16-30 (Fase de Escala)">Día 16-30 (Escala)</option>
                                  <option value="Día 31-45 (Optimización)">Día 31-45 (Optimización)</option>
                                </select>
                              </div>
                              <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Publicaciones Realizadas</label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={reportPostsCount}
                                    onChange={(e) => setReportPostsCount(Number(e.target.value))}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                                  />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Resumen de Ventas & Embudo</label>
                                <textarea
                                  rows={2}
                                  placeholder="Escribe los resultados comerciales..."
                                  value={reportSales}
                                  onChange={(e) => setReportSales(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs resize-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Resumen de Contenido & Redes</label>
                                <textarea
                                  rows={2}
                                  placeholder="Escribe el avance del plan de publicaciones..."
                                  value={reportContent}
                                  onChange={(e) => setReportContent(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs resize-none"
                                />
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Recomendación Clave #1</label>
                                  <input
                                    type="text"
                                    placeholder="Ej: Duplicar presupuesto de remarketing..."
                                    value={reportRecommendation1}
                                    onChange={(e) => setReportRecommendation1(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Recomendación Clave #2</label>
                                  <input
                                    type="text"
                                    placeholder="Ej: Acelerar revisión de videos..."
                                    value={reportRecommendation2}
                                    onChange={(e) => setReportRecommendation2(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setShowAddReportForm(false)}
                                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                              >
                                Cancelar
                              </button>
                              <button
                                type="submit"
                                className="bg-violet-600 text-white rounded-lg px-4 py-1.5 font-bold"
                              >
                                Registrar Reporte
                              </button>
                            </div>
                          </form>
                        )}

                        <div className="space-y-2.5">
                          {(selectedClient.marketingStrategy.reports || []).map((report) => (
                            <div key={report.id} className="p-4 bg-slate-50 dark:bg-zinc-950/40 border border-slate-250/70 dark:border-zinc-850 rounded-2xl flex flex-col md:flex-row justify-between items-start gap-4 font-sans text-xs">
                              <div className="space-y-3 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[10px] font-bold font-mono text-slate-400">{report.date}</span>
                                  <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md border bg-violet-50 border-violet-100 text-violet-750">
                                    {report.period}
                                  </span>
                                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-100">
                                    {report.postsCount} Posts Publicados
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <span className="block text-[9px] font-extrabold uppercase tracking-widest text-slate-450 font-mono">Resumen Comercial (Ventas/Leads)</span>
                                    <p className="text-[11px] leading-relaxed text-slate-650 dark:text-slate-300 italic">"{report.salesSummary}"</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="block text-[9px] font-extrabold uppercase tracking-widest text-slate-450 font-mono">Progreso de Publicaciones & Contenido</span>
                                    <p className="text-[11px] leading-relaxed text-slate-650 dark:text-slate-300 italic">"{report.contentSummary}"</p>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <span className="block text-[9px] font-extrabold uppercase tracking-widest text-slate-450 font-mono">Recomendaciones del Growth Partner</span>
                                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-450">
                                    {(report.recommendations || []).map((rec, rIdx) => (
                                      <li key={rIdx}>{rec}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveReport(report.id)}
                                className="p-1.5 border border-slate-200 dark:border-zinc-850 hover:border-rose-200 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 rounded-lg shrink-0 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                )}
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

                    {/* OPENAI API KEY INTEGRATION (SECURE STORAGE IN SUPABASE) */}
                    {isSupaConnected && (
                      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                          <div className="flex items-center gap-2">
                            <Key className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-850 dark:text-white">API Key de OpenAI (ChatGPT)</h3>
                          </div>
                          <span className={`text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-full ${isOpenAiKeyConfigured ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                            {isOpenAiKeyLoading ? 'Cargando...' : isOpenAiKeyConfigured ? '✓ CONFIGURADA' : '❌ SIN CONFIGURAR'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-sans">
                          Para generar imágenes de alta calidad con <strong>ChatGPT DALL-E 3</strong>, ingresa tu API Key de OpenAI. Esta llave se guardará de forma <strong>100% segura en tu propia base de datos de Supabase</strong> y nunca quedará expuesta en el código del navegador.
                        </p>

                        <form onSubmit={handleSaveOpenAiKey} className="space-y-3 font-sans text-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 font-mono">
                              {isOpenAiKeyConfigured ? 'Actualizar API Key de OpenAI' : 'Ingresa tu OpenAI API Key (sk-...)'}
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="password"
                                placeholder={isOpenAiKeyConfigured ? '••••••••••••••••••••••••••••••••' : 'sk-proj-...'}
                                value={openAiKeyInput}
                                onChange={(e) => setOpenAiKeyInput(e.target.value)}
                                className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono"
                              />
                              <button
                                type="submit"
                                disabled={isOpenAiKeyLoading}
                                className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-4 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs shrink-0"
                              >
                                {isOpenAiKeyLoading ? 'Guardando...' : 'Guardar Key'}
                              </button>
                            </div>
                          </div>

                          {openAiKeyStatusMessage && (
                            <div className={`p-3 rounded-xl border text-[11px] leading-relaxed ${openAiKeyStatusMessage.startsWith('Error') ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 text-rose-800 dark:text-rose-300' : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-800 dark:text-emerald-300'}`}>
                              {openAiKeyStatusMessage}
                            </div>
                          )}

                          {isOpenAiKeyConfigured && (
                            <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-zinc-850">
                              <span className="text-[10px] text-slate-400 font-mono">Almacenada de forma encriptada en tu tabla "app_settings"</span>
                              <button
                                type="button"
                                onClick={handleDeleteOpenAiKey}
                                className="text-[10px] text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer"
                              >
                                Eliminar Key de Supabase
                              </button>
                            </div>
                          )}
                        </form>
                      </div>
                    )}

                  </div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

      {/* OVERLAY POPUP: GENERADOR DE ESTRATEGIA CON IA */}
      <AnimatePresence>
        {showStrategyPopup && strategyClient && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-600 animate-pulse" />
                  <div>
                    <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-500">Asistente de Estrategia Digital</h3>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">Motor de Crecimiento para {strategyClient.companyName}</h4>
                  </div>
                </div>
                <button 
                  onClick={() => setShowStrategyPopup(false)}
                  className="text-slate-400 hover:text-slate-650 font-mono text-sm p-1.5 border border-slate-100 dark:border-zinc-800 rounded-xl hover:bg-slate-50"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-4 font-sans text-xs">
                <div className="p-4 bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900 rounded-2xl flex gap-3.5 items-start">
                  <div className="bg-violet-600 text-white p-2.5 rounded-xl shrink-0 shadow-xs">
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-violet-900 dark:text-violet-300">¿Cómo funciona el Motor Estratégico IA?</h5>
                    <p className="text-[11px] text-slate-550 dark:text-slate-400 leading-normal">
                      Nuestro algoritmo de Inteligencia Artificial (con Gemini 2.5 Flash) analizará el rubro comercial de <strong>{strategyClient.industry}</strong>, mapeará su público objetivo y creará una oferta irresistible única.
                    </p>
                    <p className="text-[11px] text-slate-550 dark:text-slate-400 leading-normal font-semibold">
                      {strategyClient.serviceType === 'partner_prime' 
                        ? 'Generará un cronograma interactivo de videos con estructuras TOFU/MOFU/BOFU con ganchos virales y Studio Creativo.'
                        : 'Diseñará un reporte ejecutivo directo optimizado para descarga estratégica inmediata.'}
                    </p>
                  </div>
                </div>

                {strategyClient.serviceType === 'partner_prime' && (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Frecuencia / Videos a generar para el mes:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[8, 12, 15].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setStrategyVideoCount(num)}
                          className={`p-2.5 rounded-xl border font-bold text-center transition-all ${strategyVideoCount === num ? 'bg-violet-600/10 border-violet-500 text-violet-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                        >
                          {num} Videos ({Math.round(30 / num)} días c/u)
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {generatingStrategy ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-3.5">
                    <div className="h-10 w-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-center space-y-1">
                      <p className="font-bold text-violet-700 font-mono text-[11px] animate-pulse">GENERANDO ESTRATEGIA INTEGRADORA...</p>
                      <p className="text-[10px] text-slate-500">Mapeando audiencias, ganchos virales y cronogramas de grabación...</p>
                    </div>
                  </div>
                ) : strategySuccessMsg ? (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-2xl flex items-center justify-between">
                    <span className="font-bold">{strategySuccessMsg}</span>
                    <button
                      onClick={() => {
                        setShowStrategyPopup(false);
                      }}
                      className="bg-emerald-600 text-white font-bold px-4 py-1.5 rounded-lg text-xs"
                    >
                      Entrar al Tablero
                    </button>
                  </div>
                ) : null}
              </div>

              {!generatingStrategy && !strategySuccessMsg && (
                <div className="flex justify-end gap-2 shrink-0 border-t border-slate-100 dark:border-zinc-800 pt-3">
                  <button
                    onClick={() => setShowStrategyPopup(false)}
                    className="bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-150 transition-all cursor-pointer"
                  >
                    Omitir por ahora
                  </button>
                  <button
                    onClick={handleGenerateStrategy}
                    className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span>Generar Plan Estratégico Completo</span>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
