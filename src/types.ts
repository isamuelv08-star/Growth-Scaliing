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

export interface ClientBoard {
  id: string;
  companyName: string;
  ownerName: string;
  startDate: string;
  industry: string;
  currentMonth: number; // 1 to 6
  statusMessage: string;
  accessKey?: string; // Unique client key for logging in
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
}

export interface AppState {
  clients: ClientBoard[];
  adminCode: string;
}
