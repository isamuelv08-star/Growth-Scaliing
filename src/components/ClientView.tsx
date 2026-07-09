/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ClientBoard } from '../types';
import { SVGChart } from './SVGChart';
import { compressClientBoard, getCompanySlug, generatePDFReport } from '../utils';
import { 
  TrendingUp,
  Users, 
  DollarSign, 
  Percent, 
  Calendar, 
  Briefcase, 
  MapPin, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingDown,
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Sparkles,
  Compass,
  Megaphone,
  Video,
  Sliders,
  ChevronRight,
  MessageSquare,
  Award,
  BookOpen,
  Layers,
  BarChart3,
  FileText,
  Download,
  Share2,
  ChevronDown,
  Activity,
  ShieldCheck,
  Building2,
  CheckSquare,
  Square,
  AlertTriangle,
  AlertCircle,
  ThumbsUp,
  Check,
  X,
  Bell,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ClientViewProps {
  board: ClientBoard;
  onGoToAdmin: () => void;
  consultantName?: string;
  consultantAgency?: string;
  activeTab: 'dashboard' | 'strategy' | 'creative';
  setActiveTab: (tab: 'dashboard' | 'strategy' | 'creative') => void;
  onUpdateClient?: (updated: ClientBoard) => void;
}

export const ClientView: React.FC<ClientViewProps> = ({ 
  board, 
  onGoToAdmin, 
  consultantName, 
  consultantAgency,
  activeTab,
  setActiveTab,
  onUpdateClient
}) => {
  const [activeChart, setActiveChart] = useState<'sales' | 'leads'>('sales');
  const [creativeSubTab, setCreativeSubTab] = useState<'scripts' | 'mockups'>('scripts');

  // Roadmap & Control Center States
  const [selectedMonth, setSelectedMonth] = useState<number>(6); // Julio por defecto
  const [selectedDay, setSelectedDay] = useState<number | null>(8); // Día 8 seleccionado por defecto (hoy)
  const [checklistFilter, setChecklistFilter] = useState<'all' | 'grabacion' | 'publicacion' | 'diseno' | 'estrategia'>('all');
  const [newChecklistText, setNewChecklistText] = useState('');

  // Creative Graphics State
  const [isAddingCreative, setIsAddingCreative] = useState(false);
  const [newCreativeTitle, setNewCreativeTitle] = useState('');
  const [newCreativeCategory, setNewCreativeCategory] = useState('Instagram Feed (1:1)');
  const [newCreativePrompt, setNewCreativePrompt] = useState('');
  const [newCreativePublishDay, setNewCreativePublishDay] = useState<number>(15);
  const [newCreativeAngle, setNewCreativeAngle] = useState<string>('');
  const [newCreativeMonth, setNewCreativeMonth] = useState<number>(6);

  const MONTHS_CONFIG_2026 = [
    { name: "Enero", days: 31, startOffset: 3 }, // Thursdays (Monday=0, Tuesday=1, Wednesday=2, Thursday=3)
    { name: "Febrero", days: 28, startOffset: 6 }, // Sunday
    { name: "Marzo", days: 31, startOffset: 6 }, // Sunday
    { name: "Abril", days: 30, startOffset: 2 }, // Wednesday
    { name: "Mayo", days: 31, startOffset: 4 }, // Friday
    { name: "Junio", days: 30, startOffset: 0 }, // Monday
    { name: "Julio", days: 31, startOffset: 2 }, // Wednesday
    { name: "Agosto", days: 31, startOffset: 5 }, // Saturday
    { name: "Septiembre", days: 30, startOffset: 1 }, // Tuesday
    { name: "Octubre", days: 31, startOffset: 3 }, // Thursday
    { name: "Noviembre", days: 30, startOffset: 6 }, // Sunday
    { name: "Diciembre", days: 31, startOffset: 1 } // Tuesday
  ];

  const monthsList = MONTHS_CONFIG_2026.map(m => m.name);

  // Auto-generate checklist if not present on board to link with marketingStrategy
  const getInitialChecklist = () => {
    const list: any[] = [];
    if (board.marketingStrategy) {
      const calendar = board.marketingStrategy.calendar || [];
      calendar.forEach((script) => {
        list.push({
          id: `shoot-${script.id}`,
          title: `🎥 Grabar video #${script.day}: "${script.title}"`,
          completed: script.status === 'shooting' || script.status === 'review' || script.status === 'published',
          dueDate: `Día ${script.shootDay}`,
          dayNum: script.shootDay,
          category: 'grabacion'
        });
        list.push({
          id: `review-${script.id}`,
          title: `📝 Revisión técnica de video #${script.day}: "${script.title}"`,
          completed: script.status === 'review' || script.status === 'published',
          dueDate: `Día ${script.reviewDay}`,
          dayNum: script.reviewDay,
          category: 'estrategia'
        });
        list.push({
          id: `publish-${script.id}`,
          title: `🚀 Publicar video #${script.day}: "${script.title}"`,
          completed: script.status === 'published',
          dueDate: `Día ${script.publishDay}`,
          dayNum: script.publishDay,
          category: 'publicacion'
        });
      });

      // Add design graphics tasks
      const creativeImages = board.marketingStrategy.creativeImages || [];
      creativeImages.forEach((img, idx) => {
        const dNum = Math.min(30, (idx * 7) + 4);
        list.push({
          id: `design-${img.id}`,
          title: `🎨 Diseñar post gráfico (${img.category}): "${img.title}"`,
          completed: false,
          dueDate: `Día ${dNum}`,
          dayNum: dNum,
          category: 'diseno'
        });
      });
    }

    // Add priority next steps
    const nextSteps = board.nextSteps || [];
    nextSteps.forEach((step, idx) => {
      list.push({
        id: `step-${idx}-${Date.now()}`,
        title: `⚡ Meta Prioritaria: ${step}`,
        completed: false,
        dueDate: `Inmediato`,
        dayNum: 1,
        category: 'estrategia'
      });
    });

    return list;
  };

  const currentChecklist = board.roadmapChecklist && board.roadmapChecklist.length > 0 
    ? board.roadmapChecklist 
    : getInitialChecklist();

  // Save checklist helper
  const saveChecklist = (updatedList: typeof currentChecklist) => {
    if (onUpdateClient) {
      onUpdateClient({
        ...board,
        roadmapChecklist: updatedList
      });
    }
  };

  const handleToggleTask = (taskId: string) => {
    const updated = currentChecklist.map(t => {
      if (t.id === taskId) {
        const nextCompleted = !t.completed;
        
        // Let's also sync with the script status in the calendar if applicable!
        if (board.marketingStrategy) {
          const calendar = [...board.marketingStrategy.calendar];
          let scriptChanged = false;

          if (taskId.startsWith('shoot-')) {
            const scriptId = taskId.replace('shoot-', '');
            const idx = calendar.findIndex(s => s.id === scriptId);
            if (idx !== -1) {
              calendar[idx] = { 
                ...calendar[idx], 
                status: nextCompleted ? 'shooting' : 'pending' 
              };
              scriptChanged = true;
            }
          } else if (taskId.startsWith('review-')) {
            const scriptId = taskId.replace('review-', '');
            const idx = calendar.findIndex(s => s.id === scriptId);
            if (idx !== -1) {
              calendar[idx] = { 
                ...calendar[idx], 
                status: nextCompleted ? 'review' : 'shooting' 
              };
              scriptChanged = true;
            }
          } else if (taskId.startsWith('publish-')) {
            const scriptId = taskId.replace('publish-', '');
            const idx = calendar.findIndex(s => s.id === scriptId);
            if (idx !== -1) {
              calendar[idx] = { 
                ...calendar[idx], 
                status: nextCompleted ? 'published' : 'review' 
              };
              scriptChanged = true;
            }
          }

          if (scriptChanged && onUpdateClient) {
            // Update both checklist and calendar
            onUpdateClient({
              ...board,
              roadmapChecklist: currentChecklist.map(item => item.id === taskId ? { ...item, completed: nextCompleted } : item),
              marketingStrategy: {
                ...board.marketingStrategy,
                calendar
              }
            });
            return { ...t, completed: nextCompleted };
          }
        }

        return { ...t, completed: nextCompleted };
      }
      return t;
    });

    // If we didn't return early due to script update, save checklist now
    saveChecklist(updated);
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    const newTask = {
      id: `custom-${Date.now()}`,
      title: newChecklistText.trim(),
      completed: false,
      dueDate: selectedDay ? `Día ${selectedDay}` : 'Personalizado',
      dayNum: selectedDay || 1,
      monthNum: selectedMonth,
      category: 'estrategia' as const
    };
    const updated = [newTask, ...currentChecklist];
    saveChecklist(updated);
    setNewChecklistText('');
  };

  const handleRemoveChecklistItem = (taskId: string) => {
    const updated = currentChecklist.filter(t => t.id !== taskId);
    saveChecklist(updated);
  };

  const handleAddCreativePost = () => {
    if (!newCreativeTitle.trim()) return;
    if (!board.marketingStrategy) return;

    // Use a high-quality, abstract, eye-safe, modern color background image from unsplash as a design placeholder
    const abstractImages = [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1618005198143-e52834641c25?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1604871000636-074fa5117945?w=800&auto=format&fit=crop&q=60"
    ];
    const randomIndex = Math.floor(Math.random() * abstractImages.length);

    const newCreative = {
      id: `creative-${Date.now()}`,
      title: newCreativeTitle.trim(),
      category: newCreativeCategory,
      prompt: newCreativePrompt.trim() || "Concepto de diseño de post e identidad corporativa",
      imageUrl: abstractImages[randomIndex]
    };

    const updatedCreativeImages = [
      ...(board.marketingStrategy.creativeImages || []),
      newCreative
    ];

    // Auto-schedule an actionable design task in the roadmap checklist!
    const newChecklistTask = {
      id: `design-${newCreative.id}`,
      title: `🎨 Diseñar post gráfico (${newCreative.category}): "${newCreative.title}"`,
      completed: false,
      dueDate: "Día 15",
      dayNum: 15,
      category: 'diseno' as const
    };

    if (onUpdateClient) {
      onUpdateClient({
        ...board,
        roadmapChecklist: [newChecklistTask, ...currentChecklist],
        marketingStrategy: {
          ...board.marketingStrategy,
          creativeImages: updatedCreativeImages
        }
      });
    }

    // Reset fields
    setNewCreativeTitle('');
    setNewCreativePrompt('');
    setIsAddingCreative(false);
  };

  const handleCreateStrategicPost = () => {
    if (!newCreativeTitle.trim()) return;
    if (!board.marketingStrategy) return;

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
      ...(board.marketingStrategy.creativeImages || []),
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

    if (onUpdateClient) {
      onUpdateClient({
        ...board,
        roadmapChecklist: [newChecklistTask, ...currentChecklist],
        marketingStrategy: {
          ...board.marketingStrategy,
          creativeImages: updatedCreativeImages
        }
      });
    }

    // Reset fields
    setNewCreativeTitle('');
    setNewCreativePrompt('');
    setNewCreativePublishDay(15);
    setNewCreativeAngle('');
    setIsAddingCreative(false);
  };

  // Compute status color based on checklist progress
  const completedCount = currentChecklist.filter(t => t.completed).length;
  const totalTasksCount = currentChecklist.length;
  const progressPercent = totalTasksCount > 0 ? Math.round((completedCount / totalTasksCount) * 100) : 100;

  // Derive Semáforo status
  // Green if >= 60% completed, Yellow if 30-59%, Red if < 30%
  const computedSemaforo = board.semaforo 
    ? board.semaforo 
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
      case 'green': return 'Excelente progreso. Estás ejecutando las grabaciones y publicaciones a tiempo.';
      case 'yellow': return 'Atención requerida. Tienes tareas de grabación o edición acumuladas.';
      case 'red': return '¡Acción urgente! Hay publicaciones programadas vencidas o sin grabar.';
    }
  };

  const getSemaforoColorClass = (status: 'green' | 'yellow' | 'red') => {
    switch (status) {
      case 'green': return 'bg-emerald-500';
      case 'yellow': return 'bg-amber-500';
      case 'red': return 'bg-rose-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'estrategia': return <Compass className="w-3.5 h-3.5 text-violet-600" />;
      case 'pauta': return <Megaphone className="w-3.5 h-3.5 text-emerald-600" />;
      case 'contenido': return <Video className="w-3.5 h-3.5 text-amber-600" />;
      case 'optimizacion': return <Sliders className="w-3.5 h-3.5 text-cyan-600" />;
      default: return <Sparkles className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'estrategia': return 'bg-violet-50 text-violet-700 border-violet-100';
      case 'pauta': return 'bg-emerald-50 text-emerald-750 border-emerald-100';
      case 'contenido': return 'bg-amber-50 text-amber-750 border-amber-100';
      case 'optimizacion': return 'bg-cyan-50 text-cyan-750 border-cyan-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
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
      deliverables: ["Reporte de 6 meses", "Captación de leads estable", "Plan de renovación"]
    }
  ];

  const handleExportPDF = (report: any) => {
    generatePDFReport(board, consultantName || 'Consultor de Crecimiento', consultantAgency || 'System Prime');
  };

  const renderCycleProgressBar = () => {
    return (
      <div className="w-full bg-slate-50/60 dark:bg-slate-900/30 border border-slate-200/60 rounded-2xl p-5 mb-6" id="progress-steps-stepper">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">CRONOGRAMA DE OPERACIONES</span>
            <h4 className="text-sm font-extrabold text-slate-800 tracking-tight font-display mt-0.5">Línea de Tiempo del Ciclo de Crecimiento</h4>
          </div>
          <span className="text-[10px] font-mono font-bold text-violet-700 bg-violet-50/80 border border-violet-100 px-3 py-1 rounded-full uppercase self-start sm:self-auto">
            Mes {board.currentMonth} de 6 Activo
          </span>
        </div>
        
        <div className="relative py-2 mt-2">
          <div className="absolute top-[17px] left-3 right-3 h-[2px] bg-slate-200" />
          <div 
            className="absolute top-[17px] left-3 h-[2px] bg-violet-600 transition-all duration-700" 
            style={{ width: `${Math.max(0, Math.min(100, ((board.currentMonth - 1) / 5) * 100))}%` }}
          />

          <div className="grid grid-cols-6 gap-1 relative z-10">
            {[1, 2, 3, 4, 5, 6].map((month) => {
              const isCompletedStep = month < board.currentMonth;
              const isCurrentStep = month === board.currentMonth;

              return (
                <div key={month} className="flex flex-col items-center">
                  <div 
                    className={`h-6 w-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isCurrentStep 
                        ? 'bg-violet-600 border-2 border-violet-600 text-white shadow-xs ring-4 ring-violet-100' 
                        : isCompletedStep 
                          ? 'bg-violet-600 text-white shadow-xs' 
                          : 'bg-white border-2 border-slate-200 text-slate-400'
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
                      isCurrentStep ? 'text-violet-700 font-black' : isCompletedStep ? 'text-slate-600' : 'text-slate-400'
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
    );
  };

  return (
    <div className="w-full max-w-full mx-auto px-4 py-4 font-sans antialiased text-slate-800" id={`client-view-${board.id}`}>
      {/* SINGLE COLUMN WORKSPACE */}
      <div className="w-full space-y-6">
          
          {/* BRAND BANNER & WELCOME HEADER */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-md relative overflow-hidden" id="client-executive-hero">
            <div className="absolute top-[-40%] right-[-10%] w-96 h-96 rounded-full bg-violet-600/10 blur-[90px] pointer-events-none" />
            <div className="absolute bottom-[-30%] left-[-10%] w-96 h-96 rounded-full bg-emerald-500/5 blur-[90px] pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 flex-grow">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[9px] font-mono font-black tracking-widest text-violet-400 bg-violet-950/80 border border-violet-800/40 px-3 py-1 rounded-md uppercase">
                    {board.industry.toUpperCase()}
                  </span>
                  <span className="text-[9px] font-mono font-black tracking-widest text-emerald-400 bg-emerald-950/80 border border-emerald-900/40 px-3 py-1 rounded-md uppercase animate-pulse">
                    Socio Activo
                  </span>
                </div>
                
                <h1 className="text-2xl sm:text-3.5xl font-bold font-display tracking-tight leading-tight">
                  ¡Bienvenido, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-200 font-extrabold">{board.ownerName || "Samuel"}</span> a tu centro de mando! 🕹️
                </h1>
                <p className="text-slate-300 text-xs sm:text-sm font-normal max-w-2xl leading-relaxed">
                  Revisa tu cronograma de hoy para saber exactamente qué grabar o publicar para seguir la estrategia de crecimiento, o monitorea el rendimiento comercial en tiempo real.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 shrink-0 flex flex-col justify-between min-w-[220px] shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-wider">Avance del Ciclo</span>
                  <span className="text-xs text-violet-400 font-mono font-black">{Math.round((board.currentMonth / 6) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-2.5 mb-4">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-violet-400 transition-all duration-700" style={{ width: `${(board.currentMonth / 6) * 100}%` }} />
                </div>
                <div className="flex justify-between items-center mt-1 pt-3 border-t border-white/5">
                  <span className="text-[10px] text-slate-400 font-bold font-mono">Mes {board.currentMonth} de 6</span>
                  <div className="flex items-center gap-1.5 bg-violet-950/50 border border-violet-850/40 px-2 py-1 rounded text-[9px] font-mono font-bold text-violet-300">
                    <span>GROW PARTNER VIP</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

      <div className="h-2" />

      {/* CONTENT PANEL TRANSITIONS */}
      <div className="min-h-[500px]" id="client-main-tab-content">
        <AnimatePresence mode="wait">
          
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <motion.div
              key="tab-dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Note from growth partner */}
              <div className="bg-gradient-to-br from-violet-50 to-violet-100/30 p-5 rounded-2xl border border-violet-100 relative overflow-hidden">
                <div className="absolute right-4 bottom-[-15px] opacity-[0.03] pointer-events-none">
                  <Sparkles className="w-24 h-24 text-violet-900" />
                </div>
                <div className="flex gap-4 items-start relative z-10">
                  <div className="bg-violet-600 p-2.5 rounded-xl text-white shrink-0 mt-0.5 shadow-3xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-violet-800 font-mono mb-1.5">Nota Ejecutiva de tu Growth Partner</h4>
                    <p className="text-slate-700 text-xs sm:text-[13.5px] leading-relaxed italic font-medium">
                      "{board.statusMessage}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Bento Grid layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Side: Performance Chart (8 columns) */}
                <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-3xs space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">EVOLUCIÓN MENSUAL</h3>
                      <h4 className="text-base font-extrabold text-slate-900 tracking-tight font-display mt-0.5">Rendimiento Consolidado de Pauta</h4>
                    </div>
                    
                    <div className="flex bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                      <button
                        onClick={() => setActiveChart('sales')}
                        className={`text-[10px] px-4 py-2 rounded-lg font-extrabold transition-all cursor-pointer ${
                          activeChart === 'sales' 
                            ? 'bg-white text-slate-950 shadow-3xs border border-slate-200/40' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        📈 Ventas Atribuibles
                      </button>
                      <button
                        onClick={() => setActiveChart('leads')}
                        className={`text-[10px] px-4 py-2 rounded-lg font-extrabold transition-all cursor-pointer ${
                          activeChart === 'leads' 
                            ? 'bg-white text-slate-950 shadow-3xs border border-slate-200/40' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        👥 Prospectos Totales
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50/50 p-4 border border-slate-200/60 rounded-xl">
                    {activeChart === 'sales' ? (
                      <div>
                        <div className="flex justify-between items-center mb-3 text-[10px] font-mono font-bold">
                          <span className="text-slate-500">Ingresos directos por pauta digital</span>
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Estadísticas Reales</span>
                        </div>
                        <SVGChart data={board.salesHistory} color="#10b981" gradientId="sales-gradient" />
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-center mb-3 text-[10px] font-mono font-bold">
                          <span className="text-slate-500">Prospectos captados en embudo de ventas</span>
                          <span className="text-violet-600 bg-violet-50 px-2 py-0.5 rounded border border-violet-100 font-extrabold">Base Unificada</span>
                        </div>
                        <SVGChart data={board.leadsHistory} color="#8b5cf6" gradientId="leads-gradient" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: KPIs & Stats (4 columns) */}
                <div className="lg:col-span-4 space-y-4">
                  
                  {/* METRICS HEADER */}
                  <div className="px-1">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">Indicadores de Negocio</h3>
                  </div>

                  {/* KPI Cards inside a grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                    
                    {/* Ventas */}
                    <div className="bg-white p-4.5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all flex justify-between items-center shadow-3xs relative overflow-hidden group">
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-mono font-bold text-slate-450 uppercase block">{board.kpis.ventas.label}</span>
                        <div className="text-lg sm:text-2xl font-black text-slate-900 font-display leading-none">{board.kpis.ventas.value}</div>
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-700 bg-emerald-50/80 border border-emerald-100 px-1.5 py-0.5 rounded font-mono">
                          <ArrowUpRight className="w-2.5 h-2.5" /> {board.kpis.ventas.change}
                        </span>
                      </div>
                      <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl border border-emerald-100 group-hover:scale-105 transition-transform shrink-0">
                        <DollarSign className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Leads */}
                    <div className="bg-white p-4.5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all flex justify-between items-center shadow-3xs relative overflow-hidden group">
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-mono font-bold text-slate-450 uppercase block">{board.kpis.leads.label}</span>
                        <div className="text-lg sm:text-2xl font-black text-slate-900 font-display leading-none">{board.kpis.leads.value}</div>
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-violet-700 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded font-mono">
                          <ArrowUpRight className="w-2.5 h-2.5" /> {board.kpis.leads.change}
                        </span>
                      </div>
                      <div className="bg-violet-50 text-violet-600 p-2.5 rounded-xl border border-violet-100 group-hover:scale-105 transition-transform shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>

                    {/* CPL */}
                    <div className="bg-white p-4.5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all flex justify-between items-center shadow-3xs relative overflow-hidden group">
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-mono font-bold text-slate-450 uppercase block">{board.kpis.cpl.label}</span>
                        <div className="text-lg sm:text-2xl font-black text-slate-900 font-display leading-none">{board.kpis.cpl.value}</div>
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-cyan-700 bg-cyan-50 border border-cyan-100 px-1.5 py-0.5 rounded font-mono">
                          <ArrowDownRight className="w-2.5 h-2.5" /> {board.kpis.cpl.change}
                        </span>
                      </div>
                      <div className="bg-cyan-50 text-cyan-600 p-2.5 rounded-xl border border-cyan-100 group-hover:scale-105 transition-transform shrink-0">
                        <TrendingDown className="w-4 h-4" />
                      </div>
                    </div>

                    {/* ROAS */}
                    <div className="bg-white p-4.5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all flex justify-between items-center shadow-3xs relative overflow-hidden group">
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-mono font-bold text-slate-450 uppercase block">{board.kpis.roas.label}</span>
                        <div className="text-lg sm:text-2xl font-black text-slate-900 font-display leading-none">{board.kpis.roas.value}</div>
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-700 bg-emerald-50/80 border border-emerald-100 px-1.5 py-0.5 rounded font-mono">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> {board.kpis.roas.change}
                        </span>
                      </div>
                      <div className="bg-amber-50 text-amber-605 p-2.5 rounded-xl border border-amber-100 group-hover:scale-105 transition-transform shrink-0">
                        <Percent className="w-4 h-4" />
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB: STRATEGY */}
          {activeTab === 'strategy' && (
            <motion.div
              key="tab-strategy"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {!board.marketingStrategy ? (
                <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-4 max-w-md mx-auto">
                  <div className="inline-flex p-4 bg-amber-50 rounded-full border border-amber-100 text-amber-500">
                    <Compass className="w-6 h-6 animate-spin" />
                  </div>
                  <div className="space-y-1.5">
                    <h5 className="font-bold text-slate-900 text-sm">Estrategia en Diseño</h5>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Tu consultor está estructurando el plan de posicionamiento para tu negocio. Visible pronto.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Executive Strategy Bento Header */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-3xs space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <Compass className="w-5 h-5 text-violet-600" />
                      <div>
                        <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">PILA DE POSICIONAMIENTO CORE</h3>
                        <h4 className="text-base font-extrabold text-slate-900 font-display">Identidad Corporativa & Ángulo de Escala</h4>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-all">
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-2">PÚBLICO OBJETIVO AUTORIZADO</span>
                        <p className="text-slate-800 font-bold text-xs sm:text-sm leading-relaxed">{board.marketingStrategy.targetAudience}</p>
                      </div>

                      <div className="p-5 bg-violet-50/40 rounded-xl border border-violet-150">
                        <span className="block text-[8px] font-bold text-violet-500 uppercase tracking-widest font-mono mb-2">NUESTRA OFERTA IRRESISTIBLE (CORE OFFER)</span>
                        <p className="text-slate-950 font-black text-xs sm:text-sm leading-relaxed">{board.marketingStrategy.coreOffer}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                      
                      {/* Pillars */}
                      <div className="space-y-3">
                        <span className="block text-[9px] font-bold text-violet-800 uppercase tracking-widest font-mono font-black">Pilares Editoriales de Contenido</span>
                        <div className="space-y-2">
                          {(board.marketingStrategy.pillars || []).map((pillar, idx) => (
                            <div key={idx} className="flex gap-3 items-center p-3.5 bg-slate-50/70 rounded-xl border border-slate-150/80 hover:bg-slate-50 transition-all">
                              <span className="h-5 w-5 bg-violet-600 text-white text-[10px] font-mono font-bold rounded-full flex items-center justify-center shrink-0">{idx+1}</span>
                              <span className="font-extrabold text-xs text-slate-800">{pillar}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Angles */}
                      <div className="space-y-3">
                        <span className="block text-[9px] font-bold text-violet-800 uppercase tracking-widest font-mono font-black">Ángulos y Ganchos de Ventas</span>
                        <div className="space-y-2">
                          {(board.marketingStrategy.angles || []).map((angle, idx) => (
                            <div key={idx} className="flex gap-3 items-center p-3.5 bg-slate-50/70 rounded-xl border border-slate-150/80 hover:bg-slate-50 transition-all">
                              <span className="h-5 w-5 bg-violet-100 text-violet-700 text-[10px] font-mono font-bold rounded-full flex items-center justify-center shrink-0">{idx+1}</span>
                              <span className="font-bold text-xs text-slate-700">{angle}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* SECTION: PLAN DE CREACIÓN DE POSTS & CREATIVOS GRÁFICOS */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-3xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <Layers className="w-5 h-5 text-violet-600" />
                        <div>
                          <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-450">PLAN DE CONTENIDO ESTÁTICO & ARTES</h3>
                          <h4 className="text-base font-extrabold text-slate-900 font-display">Plan de Creativos Gráficos & Posts Planificados</h4>
                        </div>
                      </div>
                    </div>

                    <p className="text-slate-500 text-xs leading-relaxed font-sans">
                      Este es tu plan estratégico coordinado de artes estáticos, carruseles de valor, infografías y anuncios de conversión. Tu consultor planifica estas piezas estratégicamente para cada mes de operaciones para maximizar la conversión de tus campañas de pauta.
                    </p>

                    {/* GALLERY OF PLANNED GRAPHIC POSTS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {(board.marketingStrategy.creativeImages && board.marketingStrategy.creativeImages.length > 0) ? (
                        board.marketingStrategy.creativeImages.map((img) => (
                          <div 
                            key={img.id}
                            className="bg-slate-50/40 border border-slate-150 rounded-2xl overflow-hidden shadow-3xs hover:shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
                          >
                            <div className="aspect-video relative overflow-hidden bg-slate-200">
                              {img.imageUrl ? (
                                <img 
                                  src={img.imageUrl} 
                                  alt={img.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-103"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-50 to-indigo-100 text-violet-400">
                                  <Plus className="w-8 h-8 opacity-40" />
                                </div>
                              )}
                              <div className="absolute top-2.5 right-2.5">
                                <span className="text-[8.5px] font-mono font-black bg-slate-900/80 text-white px-2 py-1 rounded-md uppercase tracking-wider backdrop-blur-3xs">
                                  {img.category || 'Post'}
                                </span>
                              </div>
                            </div>

                            <div className="p-4.5 space-y-3 flex-grow flex flex-col justify-between">
                              <div className="space-y-1.5">
                                <h5 className="font-bold text-xs text-slate-900 leading-snug">{img.title}</h5>
                                <p className="text-[10px] text-slate-505 line-clamp-2 italic font-sans leading-relaxed">
                                  "{img.prompt}"
                                </p>
                              </div>

                              <div className="border-t border-slate-200/60 pt-2.5 flex flex-wrap items-center justify-between text-[9px] font-mono font-black text-slate-400 gap-2">
                                <span className="uppercase text-slate-450">ÁNGULO: {img.angle ? (img.angle.length > 20 ? `${img.angle.substring(0, 18)}...` : img.angle) : 'GENERAL'}</span>
                                <span className="text-purple-700 uppercase bg-purple-50 px-2.5 py-0.5 rounded border border-purple-100 font-extrabold">
                                  {monthsList[img.monthNum !== undefined ? img.monthNum : 6]} · Día {img.dayNum || 15}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full py-12 text-center text-slate-400 space-y-2.5 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
                          <Layers className="w-8 h-8 mx-auto text-slate-300" />
                          <p className="text-xs font-mono font-bold">Sin Posts Gráficos Planificados</p>
                          <p className="text-[10px] text-slate-450 max-w-sm mx-auto">Comienza planificando tu primer post gráfico o infografía para que tu equipo comercial de pauta lo agende en el cronograma.</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}
            </motion.div>
          )}

          {/* TAB: CREATIVE */}
          {activeTab === 'creative' && (
            <motion.div
              key="tab-creative"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {!board.marketingStrategy ? (
                <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-4 max-w-md mx-auto">
                  <div className="inline-flex p-4 bg-violet-50 rounded-full border border-violet-100 text-violet-500 animate-pulse">
                    <Video className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h5 className="font-bold text-slate-900 text-sm">Estudio Creativo Preparándose</h5>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Los guiones (TOFU/MOFU/BOFU) y mockups de contenido están siendo modelados por tu equipo.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Selectors */}
                  <div className="flex bg-slate-150 p-1 rounded-xl border border-slate-200 max-w-xs" id="creative-tabs-selector">
                    <button
                      onClick={() => setCreativeSubTab('scripts')}
                      className={`flex-1 text-center py-2 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                        creativeSubTab === 'scripts' 
                          ? 'bg-white text-slate-900 shadow-3xs border border-slate-200/40 font-extrabold' 
                          : 'text-slate-500 hover:text-slate-850'
                      }`}
                    >
                      🎥 Guiones de Venta
                    </button>
                    <button
                      onClick={() => setCreativeSubTab('mockups')}
                      className={`flex-1 text-center py-2 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                        creativeSubTab === 'mockups' 
                          ? 'bg-white text-slate-900 shadow-3xs border border-slate-200/40 font-extrabold' 
                          : 'text-slate-500 hover:text-slate-850'
                      }`}
                    >
                      🖼️ Visuales & Mockups
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {creativeSubTab === 'scripts' ? (
                      <motion.div
                        key="creative-scripts"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                      >
                        <div className="flex justify-between items-center">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">Guiones Planificados (Video Ads)</h3>
                          <span className="text-[9px] font-mono font-bold bg-violet-50 text-violet-700 px-2.5 py-0.5 rounded border border-violet-100">
                            {(board.marketingStrategy.calendar || []).length} DISPONIBLES
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(board.marketingStrategy.calendar || []).map((script, idx) => (
                            <div key={script.id} className="p-5 bg-slate-50/60 border border-slate-200 rounded-xl flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all">
                              <div className="space-y-3">
                                <div className="flex justify-between items-center gap-2">
                                  <span className="text-[9px] font-mono font-black text-slate-400">GUIÓN #{idx+1}</span>
                                  <div className="flex gap-1.5">
                                    <span className={`text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                      script.phase === 'TOFU' 
                                        ? 'bg-amber-50 text-amber-800 border-amber-100' 
                                        : script.phase === 'MOFU' 
                                          ? 'bg-cyan-50 text-cyan-800 border-cyan-100' 
                                          : 'bg-violet-50 text-violet-800 border-violet-100'
                                    }`}>
                                      {script.phase}
                                    </span>
                                    <span className="text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded border bg-emerald-50 text-emerald-800 border-emerald-100">
                                      {script.status === 'pending' ? '⏳ Pendiente' : script.status === 'shooting' ? '🎥 Grabación' : script.status === 'review' ? '✍ Revisión' : '✓ Publicado'}
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <h5 className="font-extrabold text-slate-950 text-xs sm:text-sm tracking-tight leading-tight">{script.title}</h5>
                                  <div className="bg-white p-3 rounded-lg border border-slate-150 mt-2 text-xs">
                                    <span className="block text-[8px] font-bold text-violet-600 uppercase font-mono mb-0.5">🚀 Gancho de Alto Impacto (Hook):</span>
                                    <p className="italic font-extrabold text-slate-800">"{script.hook}"</p>
                                  </div>
                                </div>

                                <div className="p-3 bg-white/50 rounded-lg border border-slate-150 text-xs">
                                  <span className="block text-[8px] font-bold text-slate-400 uppercase font-mono mb-0.5">📋 Estructura (Body):</span>
                                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{script.bodyStructure}</p>
                                </div>

                                <div className="p-3 bg-violet-50/50 rounded-lg border border-violet-100 text-xs">
                                  <span className="block text-[8px] font-bold text-violet-700 uppercase font-mono mb-0.5">📢 Llamado a la Acción (CTA):</span>
                                  <p className="font-bold text-violet-850">"{script.cta}"</p>
                                </div>
                              </div>

                              <div className="border-t border-slate-200/60 pt-3 text-[9px] font-mono grid grid-cols-3 gap-1 text-center text-slate-500 font-bold bg-white/60 p-2 rounded-lg border border-slate-100">
                                <div>
                                  <span className="block text-[8px] text-slate-400 font-semibold">GRABAR:</span>
                                  <span className="text-slate-700 font-extrabold">Día {script.shootDay}</span>
                                </div>
                                <div>
                                  <span className="block text-[8px] text-slate-400 font-semibold">REVISAR:</span>
                                  <span className="text-slate-700 font-extrabold">Día {script.reviewDay}</span>
                                </div>
                                <div>
                                  <span className="block text-[8px] text-slate-400 font-semibold">PUBLICAR:</span>
                                  <span className="text-violet-700 font-extrabold">Día {script.publishDay}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="creative-mockups"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                      >
                        <div className="flex justify-between items-center">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">Bocetos de Anuncios y Visuales</h3>
                          
                          <button
                            type="button"
                            onClick={() => setIsAddingCreative(!isAddingCreative)}
                            className="text-[10px] font-mono font-bold bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Añadir Creativo / Post</span>
                          </button>
                        </div>

                        {/* Inline Form to Create Graphic Post */}
                        {isAddingCreative && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4"
                          >
                            <h5 className="text-xs font-bold font-mono uppercase text-slate-500">Nuevo Post de Estrategia Gráfica</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-mono font-bold text-slate-400 block">TÍTULO DEL POST</label>
                                <input
                                  type="text"
                                  placeholder="Ej: 3 Errores comunes en pauta..."
                                  value={newCreativeTitle}
                                  onChange={(e) => setNewCreativeTitle(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-violet-300"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-mono font-bold text-slate-400 block">FORMATO / CANAL</label>
                                <select
                                  value={newCreativeCategory}
                                  onChange={(e) => setNewCreativeCategory(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-hidden focus:border-violet-300"
                                >
                                  <option value="Feed Instagram">Feed Instagram (1:1)</option>
                                  <option value="Stories Instagram">Stories Instagram (9:16)</option>
                                  <option value="LinkedIn Carrucel">LinkedIn Carrusel (PDF)</option>
                                  <option value="Ads Banner">Ads Banner (16:9)</option>
                                  <option value="TikTok Visual">TikTok Visual Cover (9:16)</option>
                                </select>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-mono font-bold text-slate-400 block">DESCRIPCIÓN DEL CONCEPTO / PROMPT PARA DISEÑO</label>
                              <textarea
                                placeholder="Describe qué elementos gráficos debe llevar, los colores principales, y los copies que el diseñador debe incluir..."
                                value={newCreativePrompt}
                                onChange={(e) => setNewCreativePrompt(e.target.value)}
                                rows={2}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-850 placeholder-slate-400 focus:outline-hidden focus:border-violet-300 font-sans"
                              />
                            </div>

                            <div className="flex gap-2 justify-end pt-2">
                              <button
                                type="button"
                                onClick={() => setIsAddingCreative(false)}
                                className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-550 font-bold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={handleAddCreativePost}
                                className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-4 py-1.5 rounded-xl text-xs transition-all cursor-pointer"
                              >
                                Guardar Creativo
                              </button>
                            </div>
                          </motion.div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {(board.marketingStrategy.creativeImages || []).map((img) => (
                            <div key={img.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between shadow-3xs hover:border-slate-300 transition-all group">
                              <div className="relative aspect-video bg-slate-950 overflow-hidden shrink-0">
                                <img
                                  src={img.imageUrl}
                                  alt={img.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-all duration-500"
                                />
                                <span className="absolute top-2 left-2 text-[8px] uppercase tracking-wider font-extrabold bg-slate-950/80 text-white px-2 py-0.5 rounded font-mono">
                                  {img.category}
                                </span>
                              </div>

                              <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                                <div>
                                  <h6 className="font-extrabold text-slate-950 truncate leading-tight text-xs">{img.title}</h6>
                                  <p className="text-[10px] text-slate-500 leading-normal line-clamp-2 mt-1">{img.prompt}</p>
                                </div>
                                <a
                                  href={img.imageUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold py-1.5 rounded-lg text-[9px] transition-all text-center block mt-1"
                                >
                                  ⬇ Descargar Plantilla
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* FOOTER METRICS VERIFICATION */}
      <div className="text-center py-6 mt-12 border-t border-slate-200/60" id="client-view-footer">
        <p className="text-[9px] uppercase font-mono font-bold tracking-widest text-slate-400 flex flex-wrap items-center justify-center gap-2">
          <span>PORTAL VERIFICADO DE SOCIOS</span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span>TABLERO DE CRECIMIENTO</span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span>SYSTEM ACCELERATED V3</span>
        </p>
        <p className="text-[9px] text-slate-400 mt-1 font-sans">
          La información consolidada de ROAS se actualiza en coordinación directa con tu consultor certificado asignado.
        </p>
      </div>

    </div>
  </div>
);
};
