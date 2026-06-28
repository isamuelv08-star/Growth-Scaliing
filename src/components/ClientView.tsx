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
  BookOpen
} from 'lucide-react';
import { motion } from 'motion/react';

interface ClientViewProps {
  board: ClientBoard;
  onGoToAdmin: () => void;
  consultantName?: string;
  consultantAgency?: string;
}

export const ClientView: React.FC<ClientViewProps> = ({ board, onGoToAdmin, consultantName, consultantAgency }) => {
  const [activeChart, setActiveChart] = useState<'sales' | 'leads'>('sales');

  // Determine icon for categories in timeline
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'estrategia':
        return <Compass className="w-4 h-4 text-violet-600" />;
      case 'pauta':
        return <Megaphone className="w-4 h-4 text-emerald-600" />;
      case 'contenido':
        return <Video className="w-4 h-4 text-amber-600" />;
      case 'optimizacion':
        return <Sliders className="w-4 h-4 text-cyan-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-slate-500" />;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'estrategia':
        return 'bg-violet-50 text-violet-700 border-violet-100';
      case 'pauta':
        return 'bg-emerald-50 text-emerald-705 border-emerald-100';
      case 'contenido':
        return 'bg-amber-50 text-amber-705 border-amber-100';
      case 'optimizacion':
        return 'bg-cyan-50 text-cyan-705 border-cyan-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Check if close to Month 6
  const isMonth6 = board.currentMonth >= 6;

  // Render the progress bar dots
  const renderProgressSteps = () => {
    return (
      <div className="w-full" id="progress-steps-stepper">
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">MAPA DE RUTA DEL SOCIO</span>
          <span className="text-[10px] font-mono font-bold text-violet-700 bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-md uppercase tracking-wider">
            Mes {board.currentMonth} / 6 activo
          </span>
        </div>
        
        {/* Connected High-Tech Stepper Bar */}
        <div className="relative py-2 mt-4">
          {/* Background Connecting bar track */}
          <div className="absolute top-[17px] left-3 right-3 h-[2px] bg-slate-200" />
          
          {/* Active progress bar highlight overlay */}
          <div 
            className="absolute top-[17px] left-3 h-[2px] bg-violet-600 transition-all duration-700" 
            style={{ width: `${Math.max(0, Math.min(100, ((board.currentMonth - 1) / 5) * 100))}%` }}
          />

          <div className="grid grid-cols-6 gap-2 relative z-10">
            {[1, 2, 3, 4, 5, 6].map((month) => {
              const isCompletedStep = month < board.currentMonth;
              const isCurrentStep = month === board.currentMonth;
              const isFutureStep = month > board.currentMonth;

              return (
                <div key={month} className="flex flex-col items-center">
                  {/* Glowing Node Button */}
                  <div 
                    className={`h-4.5 w-4.5 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isCurrentStep 
                        ? 'bg-violet-600 border-2 border-violet-600 shadow-sm' 
                        : isCompletedStep 
                          ? 'bg-violet-650 text-white' 
                          : 'bg-white border border-slate-300'
                    }`}
                  >
                    {isCompletedStep ? (
                      <span className="text-[8px] font-bold text-white">✓</span>
                    ) : (
                      <div className={`h-1.5 w-1.5 rounded-full ${isCurrentStep ? 'bg-white' : 'bg-transparent'}`} />
                    )}
                  </div>
                  
                  <div className="mt-2.5 text-center">
                    <span 
                      className={`text-[9px] font-mono block font-bold uppercase tracking-wider transition-all duration-300 ${
                        isCurrentStep 
                          ? 'text-violet-700 font-extrabold' 
                          : isCompletedStep 
                            ? 'text-slate-600' 
                            : 'text-slate-400'
                      }`}
                    >
                      Mes {month}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Parse custom currency numbers safely to highlight values
  const isCplHigh = parseFloat(board.kpis.cpl.value.replace(/[^0-9.]/g, '')) > 10;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 font-sans antialiased text-slate-800" id={`client-view-${board.id}`}>
      
      {/* Elegante sección de bienvenida personalizada para el Socio */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-200/80" id="client-view-welcome-nav">
        <div className="flex items-center gap-3.5" id="welcome-greetings-container">
          <div className="p-2.5 bg-violet-50 rounded-2xl border border-violet-100 hidden sm:block shadow-xs" id="welcome-icon-wrapper">
            <Sparkles className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900" id="welcome-title">
              ¡Hola, <span className="text-violet-600 font-extrabold">{board.ownerName}</span>! 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5" id="welcome-subtitle">
              Te damos la bienvenida a tu portal interactivo de crecimiento y rendimiento estratégico.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5" id="welcome-status-meta">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-600 shadow-2xs font-sans" id="meta-industry-badge">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
            {board.industry}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-150 text-emerald-800 shadow-2xs font-mono" id="meta-month-badge">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            MES {board.currentMonth} DE 6 ACTIVO
          </span>
        </div>
      </div>

      {/* Layer 1: Header / Hero & Progress Bento block */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        {/* Left Side: Brand Card (col-span-8) */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[260px]"
          id="client-hero-card"
        >
          <div className="absolute top-0 right-0 p-8 opacity-[0.015] pointer-events-none text-slate-900">
            <Award className="w-48 h-48 text-violet-600" />
          </div>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4" id="client-header-meta">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-violet-600 font-bold tracking-tight uppercase text-xs">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-600"></span>
                </span>
                <span className="font-mono">{board.industry}</span>
              </div>
              <h1 className="text-3xl md:text-4.5xl font-extrabold tracking-tight text-slate-900 font-display mt-0.5">
                {board.companyName}
              </h1>
              <p className="text-slate-500 text-xs mt-1.5 font-sans">
                Socio Titular: <strong className="text-slate-800 font-bold">{board.ownerName}</strong> · Acceso Exclusivo de Dirección · Fecha de Inicio: <span className="text-slate-500 font-mono font-medium">{board.startDate}</span>
              </p>
            </div>
          </div>

          <div className="border-t border-slate-150 pt-5 mt-5" id="client-human-explanation">
            <div className="flex gap-4 items-start bg-violet-50 p-4 sm:p-5 rounded-2xl border border-violet-100">
              <div className="bg-violet-600 p-2.5 rounded-xl text-white mt-0.5 shadow-xs shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-violet-800 mb-1 font-mono">Nota Ejecutiva del Growth Partner</h4>
                <p className="text-slate-700 text-xs sm:text-sm leading-relaxed font-sans italic font-normal">
                  "{board.statusMessage}"
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Circular Progression & Speed gauge widget (col-span-4) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col justify-between relative overflow-hidden"
          id="client-progression-gauge-card"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-violet-700 font-mono">Ciclo Estratégico</span>
            <span className="text-xs border border-violet-100 bg-violet-50 text-violet-750 font-bold px-2.5 py-0.5 rounded-full">Semana {board.currentMonth * 4} de 24</span>
          </div>

          <div className="flex items-center justify-center gap-6 my-4">
            {/* Elegant Circular Gauge */}
            <div className="relative flex items-center justify-center shrink-0">
              <svg className="w-24 h-24 transform -rotate-90">
                <defs>
                  <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                {/* Outer ring path */}
                <circle cx="48" cy="48" r="40" stroke="rgba(0, 0, 0, 0.04)" strokeWidth="6.5" fill="transparent"/>
                <circle 
                  cx="48" 
                  cy="48" 
                  r="40" 
                  stroke="url(#gaugeGrad)" 
                  strokeWidth="6.5" 
                  fill="transparent" 
                  strokeDasharray="251.2" 
                  strokeDashoffset={251.2 - (251.2 * board.currentMonth / 6)} 
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-2.5xl font-extrabold text-slate-800 block font-display">{Math.round((board.currentMonth / 6) * 100)}%</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block -mt-1 font-mono">Completado</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] text-violet-700 font-bold tracking-widest font-mono">ESTADO DEL PROYECTO</p>
              <p className="text-slate-800 text-lg font-bold font-display leading-tight">Mes {board.currentMonth} en Acciones</p>
              <p className="text-xs text-slate-500">Métricas analizadas y validadas por tu consultor de pauta digital en tiempo real.</p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-2">
            {renderProgressSteps()}
          </div>
        </motion.div>
      </div>

      {/* Layer 2: Core KPI Performance Metrics Grid */}
      <div className="mb-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 px-1 flex items-center gap-2 font-mono" id="section-title-growth">
          <TrendingUp className="w-4 h-4 text-violet-600" />
          <span>Métricas de Desempeño Principal Consolidado</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8" id="client-kpis-grid">
          
          {/* KPI: Ventas Atribuibles */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="bg-white p-5 rounded-2xl border-l-[3.5px] border-l-emerald-500 border-t border-r border-b border-slate-200/80 hover:bg-slate-50/50 transition-all duration-300 flex flex-col justify-between min-h-[148px] group relative overflow-hidden shadow-xs"
            id="kpi-ventas"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">{board.kpis.ventas.label}</span>
                <div className="bg-emerald-50 text-emerald-700 p-1.5 rounded-xl transition-colors border border-emerald-100">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight my-2">
                {board.kpis.ventas.value}
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 self-start px-2 py-0.5 rounded-md mt-1 border border-emerald-100 font-mono">
              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
              <span>{board.kpis.ventas.change}</span>
            </div>
          </motion.div>

          {/* KPI: Leads (Prospectos) */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="bg-white p-5 rounded-2xl border-l-[3.5px] border-l-violet-500 border-t border-r border-b border-slate-200 hover:bg-slate-50/50 transition-all duration-300 flex flex-col justify-between min-h-[148px] group relative overflow-hidden shadow-xs"
            id="kpi-leads"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">{board.kpis.leads.label}</span>
                <div className="bg-violet-50 text-violet-700 p-1.5 rounded-xl transition-colors border border-violet-105">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight my-2">
                {board.kpis.leads.value}
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-violet-700 bg-violet-50 self-start px-2 py-0.5 rounded-md mt-1 border border-violet-100 font-mono">
              <ArrowUpRight className="w-3 h-3 text-violet-600" />
              <span>{board.kpis.leads.change}</span>
            </div>
          </motion.div>

          {/* KPI: Costo por Lead */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="bg-white p-5 rounded-2xl border-l-[3.5px] border-l-cyan-500 border-t border-r border-b border-slate-200 hover:bg-slate-50/50 transition-all duration-300 flex flex-col justify-between min-h-[148px] group relative overflow-hidden shadow-xs"
            id="kpi-cpl"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">{board.kpis.cpl.label}</span>
                <div className="bg-cyan-50 text-cyan-700 p-1.5 rounded-xl transition-colors border border-cyan-105">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight my-2">
                {board.kpis.cpl.value}
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-cyan-700 bg-cyan-50 self-start px-2 py-0.5 rounded-md mt-1 border border-cyan-100 font-mono">
              <ArrowDownRight className="w-3 h-3 text-cyan-600" />
              <span>{board.kpis.cpl.change}</span>
            </div>
          </motion.div>

          {/* KPI: ROAS / Retorno */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="bg-white p-5 rounded-2xl border-l-[3.5px] border-l-amber-500 border-t border-r border-b border-slate-200 hover:bg-slate-50/50 transition-all duration-300 flex flex-col justify-between min-h-[148px] group relative overflow-hidden shadow-xs"
            id="kpi-roas"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">{board.kpis.roas.label}</span>
                <div className="bg-amber-50 text-amber-700 p-1.5 rounded-xl transition-colors border border-amber-100">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight my-2">
                {board.kpis.roas.value}
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 self-start px-2 py-0.5 rounded-md mt-1 border border-amber-100 font-mono">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>{board.kpis.roas.change}</span>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Special Block: Close to Month 6 (Renewal Alert) spans across full width */}
      {isMonth6 && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-violet-50/70 rounded-3xl p-6 sm:p-8 border border-violet-200 mb-8 relative overflow-hidden shadow-xs"
          id="client-renewal-card"
        >
          <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-8 items-center">
            
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2 text-violet-700 font-bold text-xs tracking-widest uppercase font-mono">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>LOGRADO · CICLO ESTRATÉGICO COMPLETADO</span>
              </div>
              
              <h3 className="text-2xl font-bold font-display tracking-tight text-slate-900 leading-snug">
                ¡Tu sistema de ventas está estable, maduro y listo para pasar a escalas superiores de valor!
              </h3>
              
              <p className="text-slate-600 text-sm leading-relaxed font-sans">
                Hemos completado exitosamente las 24 semanas del ciclo metodológico. Tu negocio cuenta ahora con un motor automatizado de pauta digital estructurada, procesos estandarizados en WhatsApp y un canal constante de captación de clientes.
              </p>
              
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200" id="renewal-achievements">
                <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2.5 font-mono">Resumen de Activos Consolidados del Periodo</h4>
                <ul className="space-y-2 text-xs text-slate-600 font-sans">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Configuración exitosa de públicos calificados y píxeles optimizados.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Flujo de reservas / captación de clientes instalado 100% autónomo.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Estabilización del costo de adquisición debajo de la media comercial de tu industria.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-205 text-center w-full lg:w-80 shrink-0 space-y-4 shadow-sm">
              <p className="text-xs text-violet-700 font-bold uppercase tracking-widest font-mono">Siguiente Paso Obligatorio</p>
              <div className="text-xs text-slate-500 font-sans leading-relaxed">
                Agenda tu sesión virtual de auditoría de renovación para planificar el escalado e incremento de presupuesto de pauta de tu siguiente ciclo.
              </div>
              <a 
                href={`https://wa.me/5211234567890?text=Hola!%20Hemos%20completado%2520el%2520mes%25206%2520con%2520muy%2520buenos%2520resultados.%2520Me%2520gustar%C3%ADa%2520agendar%2520nuestra%2520sesi%C3%B3n%2520de%2520renovaci%C3%B3n%2520para%2520el%2520segundo%2520ciclo.`}
                target="_blank" 
                rel="noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3.5 px-4 rounded-xl transition-all shadow-xs block flex items-center justify-center gap-2 active:scale-97"
                id="btn-whatsapp-renew"
              >
                <MessageSquare className="w-4 h-4 fill-white text-white" />
                <span>Agendar Renovación por WhatsApp</span>
              </a>
            </div>

          </div>
        </motion.div>
      )}

      {/* Layer 3: Interactive Visual Charts (Left) vs Real-time Milestone Bitácora (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        
        {/* Left Grid Side: Charts and Next steps (col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Growth Chart Section */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs" id="client-growth-chart-card">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5" id="chart-controls">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 font-mono">Evolución Histórica de Métricas</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-sans">Evolución mensual consolidada de tus KPI estratégicos claves</p>
              </div>
              
              <div className="flex bg-slate-50 rounded-xl p-0.5 border border-slate-200" id="chart-tabs">
                <button
                  onClick={() => setActiveChart('sales')}
                  className={`text-xs px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    activeChart === 'sales' 
                      ? 'bg-white text-slate-900 border border-slate-200/50 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  id="chart-tab-sales"
                >
                  Ventas
                </button>
                <button
                  onClick={() => setActiveChart('leads')}
                  className={`text-xs px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    activeChart === 'leads' 
                      ? 'bg-white text-slate-900 border border-slate-200/50 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  id="chart-tab-leads"
                >
                  Prospectos
                </button>
              </div>
            </div>

            <div className="bg-slate-50/60 p-4 border border-slate-200/80 rounded-2xl mb-2" id="chart-wrapper">
              {activeChart === 'sales' ? (
                <div>
                  <div className="flex justify-between mb-4 text-xs font-mono">
                    <span className="font-medium text-slate-500">Curva de ingresos atribuibles pautados</span>
                    <span className="font-bold text-emerald-600">Consolidado Mensual</span>
                  </div>
                  <SVGChart 
                    data={board.salesHistory} 
                    color="#10b981" 
                    gradientId="sales-gradient"
                    valueSuffix=""
                  />
                </div>
              ) : (
                <div>
                  <div className="flex justify-between mb-4 text-xs font-mono">
                    <span className="font-medium text-slate-500">Captación mensual de prospectos calificados</span>
                    <span className="font-bold text-violet-600">Flujo total</span>
                  </div>
                  <SVGChart 
                    data={board.leadsHistory} 
                    color="#8b5cf6" 
                    gradientId="leads-gradient"
                    valueSuffix=""
                  />
                </div>
              )}
            </div>
            <p className="text-[10px] text-center text-slate-400 mt-3 font-medium font-mono uppercase tracking-widest">
              * Coloca el cursor o toca los puntos del gráfico para revelar valores históricos detallados.
            </p>
          </div>

          {/* Action Priorities check layout */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs" id="next-steps-card">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#8b5cf6] mb-4 flex items-center gap-2 font-mono" id="section-title-nextsteps">
              <ArrowRight className="w-4 h-4 text-violet-600" />
              <span>Prioridades Estratégicas Vigentes del Ciclo</span>
            </h3>

            {board.nextSteps && board.nextSteps.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="next-steps-list">
                {board.nextSteps.map((step, idx) => (
                  <div 
                    key={idx} 
                    className="flex gap-3 items-start bg-slate-50/60 hover:bg-slate-100/50 p-4 rounded-2xl border border-slate-200/80 transition-all font-sans text-xs"
                    id={`next-step-item-${idx}`}
                  >
                    <div className="bg-emerald-50 text-emerald-700 p-1 rounded-full shrink-0 mt-0.5 border border-emerald-150">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div>
                      <span className="font-mono text-[9px] font-bold text-violet-600 uppercase tracking-widest block mb-0.5">PRIORIDAD {idx + 1}</span>
                      <p className="text-slate-800 leading-relaxed font-sans font-semibold text-wrap">{step}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-500 text-xs py-4">No hay prioridades estratégicas definidas en este momento.</div>
            )}
          </div>

        </div>

        {/* Right Grid Side: Real-time Milestones Timeline Bitácora (col-span-5) */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs h-full" id="timeline-card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 font-mono" id="section-title-timeline">
                  <Clock className="w-4 h-4 text-violet-600 animate-spin-slow" />
                  <span>Bitácora de Implementaciones</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-sans">Validación continua de acciones técnicas realizadas en el periodo</p>
              </div>
            </div>

            {/* Vertical Timeline implementation */}
            <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100" id="timeline-entries-list">
              {board.logEntries && board.logEntries.length > 0 ? (
                board.logEntries.slice().reverse().map((entry, index) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={entry.id} 
                    className="relative group"
                    id={`timeline-entry-${entry.id}`}
                  >
                    {/* Visual marker dot */}
                    <div className="absolute -left-[21px] top-1 bg-white border-2 border-slate-200 rounded-full p-1 group-hover:border-violet-500/50 group-hover:scale-110 transition-all shadow-sm shrink-0 flex items-center justify-center z-10">
                      {getCategoryIcon(entry.category)}
                    </div>

                    <div className="flex flex-col gap-1.5" id={`timeline-entry-content-${entry.id}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-50 py-0.5 px-2 rounded border border-slate-100">
                          {entry.date}
                        </span>
                        <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${getCategoryBadgeClass(entry.category)}`}>
                          {entry.category}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        {entry.title}
                      </h4>
                      <p className="text-xs text-slate-550 leading-relaxed font-sans">
                        {entry.description}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center text-slate-400 text-xs py-8 font-mono">No hay bitácoras de trabajo ingresadas aún.</div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Trust Quote Footer */}
      <div className="text-center py-8 mt-4 border-t border-slate-150" id="client-view-footer">
        <p className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400 flex items-center justify-center gap-2">
          <span>PORTAL VERIFICADO DE SOCIOS</span>
          <span className="text-slate-300">|</span>
          <span>TABLERO DE CRECIMIENTO</span>
          <span className="text-slate-300">|</span>
          <span>SYSTEM ACCELERATED V3</span>
        </p>
        <p className="text-[10px] text-slate-400 font-sans mt-1">
          Toda la información consolidada de ROAS se actualiza en coordinación directa con tu consultor certificado.
        </p>
      </div>

    </div>
  );
};
