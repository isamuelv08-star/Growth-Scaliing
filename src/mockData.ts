/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClientBoard } from './types';

export const DEFAULT_CLIENTS: ClientBoard[] = [
  {
    id: "inversiones-valenzuela",
    companyName: "Inmobiliaria Valenzuela",
    ownerName: "Don Alejandro Valenzuela",
    startDate: "2026-03-01",
    industry: "Bienes Raíces / Real Estate",
    currentMonth: 3,
    statusMessage: "El embudo de captación está madurando rápido. Las campañas en Meta Ads ya alcanzaron la velocidad de crucero óptima y estamos filtrando leads de alta calidad para tu equipo de ventas.",
    kpis: {
      ventas: {
        label: "Ventas Atribuibles",
        value: "$34,500 USD",
        change: "+45% vs. mes anterior",
        isPositive: true,
        rating: "success"
      },
      leads: {
        label: "Contactos Calificados",
        value: "412 leads",
        change: "+28% vs. inicio",
        isPositive: true,
        rating: "success"
      },
      cpl: {
        label: "Costo por Lead (CPL)",
        value: "$2.40 USD",
        change: "-18% de reducción de costo",
        isPositive: true,
        rating: "success"
      },
      roas: {
        label: "Retorno de Pauta (ROAS)",
        value: "4.8x ROI",
        change: "Estable por encima de la meta (4.0x)",
        isPositive: true,
        rating: "success"
      }
    },
    salesHistory: [
      { label: "Mes 1", value: 12000 },
      { label: "Mes 2", value: 21000 },
      { label: "Mes 3", value: 34500 }
    ],
    leadsHistory: [
      { label: "Mes 1", value: 180 },
      { label: "Mes 2", value: 310 },
      { label: "Mes 3", value: 412 }
    ],
    logEntries: [
      {
        id: "l1",
        date: "2026-03-05",
        title: "Sesión de Estrategia Inicial & Propuesta Única de Valor",
        description: "Definimos los avatares de cliente ideal, los pilares de contenido de alto impacto para captar tomadores de decisión y diseñamos la oferta irresistible para captación rápida.",
        category: "estrategia"
      },
      {
        id: "l2",
        date: "2026-03-12",
        title: "Lanzamiento del Embudo y Campañas en Meta Ads",
        description: "Configuración de píxeles, landing page optimizada para móviles y activación de las primeras campañas con formatos de video del inventario activo.",
        category: "pauta"
      },
      {
        id: "l3",
        date: "2026-04-10",
        title: "Optimización de Creativos y Ajuste de Audiencias",
        description: "Reemplazamos creativos de bajo rendimiento. Introdujimos testimonios en video tipo UGC (contenido generado por usuarios) que bajaron el costo por lead un 25%.",
        category: "optimizacion"
      },
      {
        id: "l4",
        date: "2026-05-18",
        title: "Automatización de Seguimiento vía WhatsApp",
        description: "Implementamos un bot de respuesta rápida inicial en WhatsApp para calificar los leads de forma inmediata antes de mandarlos al asesor comercial.",
        category: "contenido"
      }
    ],
    nextSteps: [
      "Escalar el presupuesto en pauta un 20% para los distritos de mayor ticket.",
      "Lanzar campaña de Retargeting en Instagram exclusiva para personas que interactuaron con el video de presentación del proyecto.",
      "Auditar llamada de ventas del equipo para optimizar la tasa de cierre en WhatsApp."
    ]
  },
  {
    id: "odonto-sonic",
    companyName: "Clínica Dental OdontoSonic",
    ownerName: "Dra. Sofía Rivas",
    startDate: "2025-12-15",
    industry: "Salud y Bienestar / Odontología",
    currentMonth: 6,
    statusMessage: "¡Llegamos al final del ciclo de 6 meses con resultados récord! El sistema de reservas automáticas quedó instalado de forma nativa. Es hora de decidir la continuidad o el traspaso final del control técnico.",
    kpis: {
      ventas: {
        label: "Facturación del Sistema",
        value: "68 citas cerradas",
        change: "+112% vs. historial previo",
        isPositive: true,
        rating: "success"
      },
      leads: {
        label: "Citas Solicitadas",
        value: "340 pacientes",
        change: "Flujo constante y predecible",
        isPositive: true,
        rating: "success"
      },
      cpl: {
        label: "Costo por Cita Agendada",
        value: "$5.10 USD",
        change: "Optimizado un 30%",
        isPositive: true,
        rating: "success"
      },
      roas: {
        label: "Rentabilidad Estimada",
        value: "6.2x",
        change: "Superó con creces la meta de 3.5x",
        isPositive: true,
        rating: "success"
      }
    },
    salesHistory: [
      { label: "Mes 1", value: 15 },
      { label: "Mes 2", value: 28 },
      { label: "Mes 3", value: 42 },
      { label: "Mes 4", value: 49 },
      { label: "Mes 5", value: 58 },
      { label: "Mes 6", value: 68 }
    ],
    leadsHistory: [
      { label: "Mes 1", value: 90 },
      { label: "Mes 2", value: 140 },
      { label: "Mes 3", value: 210 },
      { label: "Mes 4", value: 245 },
      { label: "Mes 5", value: 290 },
      { label: "Mes 6", value: 340 }
    ],
    logEntries: [
      {
        id: "ol1",
        date: "2025-12-18",
        title: "Alineación de Tratamientos de Alto Ticket",
        description: "Enfocamos el ciclo únicamente en captar pacientes para Implantes Dentales e Invisaling, dejando los tratamientos de bajo ticket como secundario para maximizar rentabilidad.",
        category: "estrategia"
      },
      {
        id: "ol2",
        date: "2026-01-15",
        title: "Lanzamiento de Campañas de Proximidad",
        description: "Geo-segmentación a 5km a la redonda de la clínica con promociones de diagnóstico integral digital para captar leads altamente locales.",
        category: "pauta"
      },
      {
        id: "ol3",
        date: "2026-02-28",
        title: "Estrategia de Google Maps e Instagram Orgánico",
        description: "Mejoramos la ficha de Google Business Profile para aparecer en el top local y diseñamos plantillas de reels con testimonios de pacientes sonrientes.",
        category: "contenido"
      },
      {
        id: "ol4",
        date: "2026-04-20",
        title: "Automatización de Recordatorios por Mensajería",
        description: "Instalación de flujos de confirmación pre-cita para reducir el ausentismo (noshow rate) del 35% al 8%.",
        category: "optimizacion"
      },
      {
        id: "ol5",
        date: "2026-05-30",
        title: "Cierre de Ciclo de Alta Conversión",
        description: "Sesión grupal de revisión donde consolidamos el proceso comercial y el embudo que se mantendrá funcionando de forma autonoma.",
        category: "estrategia"
      }
    ],
    nextSteps: [
      "Presentación de la propuesta de renovación para ciclo II (estrategia recurrente de fidelización de pacientes existentes).",
      "Migración y entrega de credenciales en caso de optar por manejo interno.",
      "Sesión técnica final de transferencia de activos digitales."
    ]
  }
];
