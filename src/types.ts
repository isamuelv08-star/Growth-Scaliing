/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface KPIValue {
  value: string;
  change: string; // e.g. "+24%", "-12%"
  isPositive: boolean; // green vs red
  rating: 'success' | 'warning' | 'alert';
  label: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface LogEntry {
  id: string;
  date: string;
  title: string;
  description: string;
  category: 'estrategia' | 'contenido' | 'pauta' | 'optimizacion';
}

export interface ContentScript {
  id: string;
  day: number;
  phase: 'TOFU' | 'MOFU' | 'BOFU';
  title: string;
  hook: string; // "Estructura ganadora viral que llame la atención"
  bodyStructure: string; // The core outline or script structure
  cta: string; // "potente CTA para llevar a acción"
  publishDay: number;
  shootDay: number;
  reviewDay: number;
  status: 'pending' | 'shooting' | 'review' | 'published';
}

export interface CreativeImage {
  id: string;
  title: string;
  prompt: string;
  category: 'inicio_semana' | 'fin_semana' | 'promocion' | 'descuento' | 'educativo' | 'testimonio';
  imageUrl?: string;
  generatedAt?: string;
}

export interface SalesContentReport {
  id: string;
  date: string;
  period: string; // e.g., "Día 1-15" or "Día 16-30"
  salesSummary: string;
  contentSummary: string;
  postsCount: number;
  recommendations: string[];
}

export interface MarketingStrategy {
  id: string;
  createdAt: string;
  targetAudience: string;
  coreOffer: string;
  pillars: string[];
  angles: string[];
  calendar: ContentScript[]; // The 30 days complete schedule
  creativeImages: CreativeImage[]; // Studio creativo integrado
  reports: SalesContentReport[]; // Historial de reportes quincenales (cada 15 días)
}

export interface ClientBoard {
  id: string;
  companyName: string;
  ownerName: string;
  startDate: string;
  industry: string;
  currentMonth: number; // 1 to 6
  statusMessage: string;
  accessKey?: string; // Unique client key for logging in
  serviceType?: 'partner_prime' | 'systeme_prime'; // Partner Prime vs Systeme Prime
  marketingStrategy?: MarketingStrategy | null;
  kpis: {
    ventas: KPIValue;
    leads: KPIValue;
    cpl: KPIValue;
    roas: KPIValue;
  };
  salesHistory: ChartDataPoint[]; // For visual progress
  leadsHistory: ChartDataPoint[]; // Sparkline history
  logEntries: LogEntry[];
  nextSteps: string[];
  semaforo?: 'green' | 'yellow' | 'red';
  roadmapChecklist?: {
    id: string;
    title: string;
    completed: boolean;
    dueDate?: string;
    dayNum?: number;
    monthNum?: number;
    category?: 'grabacion' | 'publicacion' | 'diseno' | 'estrategia';
  }[];
}

export interface AppState {
  clients: ClientBoard[];
  adminCode: string;
}
