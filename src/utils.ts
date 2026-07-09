import { ClientBoard } from './types';

// Safe UTF-8 Base64 helpers
export const safeBtoa = (str: string): string => {
  return btoa(unescape(encodeURIComponent(str)));
};

export const safeAtob = (str: string): string => {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch (e) {
    return atob(str);
  }
};

// Generates a clean URL slug from a company name
export const getCompanySlug = (companyName: string): string => {
  return companyName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s-]/g, "") // remove symbols
    .replace(/\s+/g, "-") // replace spaces with hyphens
    .replace(/-+/g, "-") // collapse multiple hyphens
    .trim();
};

// Compacts a ClientBoard into a lightweight, keyless JSON array base64 string
export const compressClientBoard = (board: ClientBoard): string => {
  const compact = [
    board.id,
    board.companyName,
    board.ownerName,
    board.startDate,
    board.industry,
    board.currentMonth,
    board.statusMessage,
    [
      board.kpis.ventas.value,
      board.kpis.ventas.change,
      board.kpis.ventas.isPositive ? 1 : 0,
      board.kpis.ventas.rating,
      board.kpis.ventas.label
    ],
    [
      board.kpis.leads.value,
      board.kpis.leads.change,
      board.kpis.leads.isPositive ? 1 : 0,
      board.kpis.leads.rating,
      board.kpis.leads.label
    ],
    [
      board.kpis.cpl.value,
      board.kpis.cpl.change,
      board.kpis.cpl.isPositive ? 1 : 0,
      board.kpis.cpl.rating,
      board.kpis.cpl.label
    ],
    [
      board.kpis.roas.value,
      board.kpis.roas.change,
      board.kpis.roas.isPositive ? 1 : 0,
      board.kpis.roas.rating,
      board.kpis.roas.label
    ],
    board.salesHistory.map(h => [h.label, h.value]),
    board.leadsHistory.map(h => [h.label, h.value]),
    board.logEntries.map(l => [l.id, l.date, l.title, l.description, l.category]),
    board.nextSteps,
    board.serviceType || 'partner_prime',
    board.marketingStrategy || null
  ];
  return safeBtoa(JSON.stringify(compact));
};

// Generates a pixel-perfect executive growth report printable/saveable to PDF
export const generatePDFReport = (board: ClientBoard, consultantName: string, consultantAgency: string) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  
  document.body.appendChild(iframe);
  
  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    alert("Error al generar el reporte.");
    return;
  }
  
  const kpiVentas = board.kpis.ventas;
  const kpiLeads = board.kpis.leads;
  const kpiCPL = board.kpis.cpl;
  const kpiROAS = board.kpis.roas;

  const logsHtml = board.logEntries.map(log => `
    <div style="margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px dashed #e5e7eb;">
      <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 3px;">
        <span style="font-family: monospace; font-size: 9px; font-weight: bold; background: #f3f4f6; color: #4b5563; padding: 2px 6px; border-radius: 3px;">${log.date}</span>
        <span style="font-family: monospace; font-size: 9px; font-weight: bold; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 3px; text-transform: uppercase;">${log.category}</span>
      </div>
      <h5 style="font-family: system-ui, sans-serif; font-size: 11px; font-weight: bold; color: #111827; margin: 0 0 2px 0;">${log.title}</h5>
      <p style="font-family: system-ui, sans-serif; font-size: 10.5px; color: #4b5563; margin: 0; line-height: 1.4;">${log.description}</p>
    </div>
  `).join('');

  const stepsHtml = board.nextSteps.map(step => `
    <li style="font-family: system-ui, sans-serif; font-size: 11px; color: #374151; margin-bottom: 8px; line-height: 1.4; list-style-type: square; margin-left: 15px;">
      ${step}
    </li>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reporte Crecimiento - ${board.companyName}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        body {
          font-family: system-ui, -apple-system, sans-serif;
          color: #1f2937;
          margin: 0;
          padding: 0;
          background: #ffffff;
          line-height: 1.5;
        }
        .header {
          border-bottom: 2px solid #4f46e5;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
        .header-grid {
          display: table;
          width: 100%;
        }
        .header-left {
          display: table-cell;
          vertical-align: bottom;
        }
        .header-right {
          display: table-cell;
          text-align: right;
          vertical-align: bottom;
        }
        .badge-system {
          font-family: monospace;
          font-size: 9px;
          font-weight: bold;
          color: #4f46e5;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }
        .title {
          font-size: 24px;
          font-weight: 800;
          color: #111827;
          margin: 4px 0 0 0;
        }
        .badge-cycle {
          font-family: monospace;
          font-size: 10px;
          font-weight: bold;
          background: #ecfdf5;
          border: 1px solid #10b981;
          color: #047857;
          padding: 4px 8px;
          border-radius: 5px;
          display: inline-block;
        }
        .info-grid {
          display: table;
          width: 100%;
          margin-bottom: 20px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          border-collapse: separate;
          overflow: hidden;
        }
        .info-row {
          display: table-row;
        }
        .info-cell {
          display: table-cell;
          padding: 10px 12px;
          border-right: 1px solid #e5e7eb;
          border-bottom: 1px solid #e5e7eb;
          width: 25%;
        }
        .info-cell:last-child {
          border-right: none;
        }
        .info-row:last-child .info-cell {
          border-bottom: none;
        }
        .info-label {
          font-family: monospace;
          font-size: 8.5px;
          font-weight: bold;
          color: #6b7280;
          text-transform: uppercase;
          display: block;
          margin-bottom: 2px;
        }
        .info-val {
          font-size: 11px;
          font-weight: bold;
          color: #111827;
        }
        .note-container {
          background: #f5f3ff;
          border-left: 4px solid #8b5cf6;
          padding: 12px 14px;
          margin-bottom: 20px;
          border-radius: 4px;
        }
        .note-title {
          font-family: monospace;
          font-size: 9px;
          font-weight: bold;
          color: #5b21b6;
          margin: 0 0 4px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .note-text {
          font-size: 11.5px;
          line-height: 1.5;
          color: #1e1b4b;
          font-style: italic;
          margin: 0;
        }
        .kpi-title {
          font-family: monospace;
          font-size: 10px;
          font-weight: bold;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 10px;
          border-bottom: 1px solid #f3f4f6;
          padding-bottom: 4px;
        }
        .kpi-grid {
          display: table;
          width: 100%;
          margin-bottom: 22px;
        }
        .kpi-card {
          display: table-cell;
          width: 25%;
          padding: 10px;
          box-sizing: border-box;
        }
        .kpi-card-inner {
          background: #fafafa;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 12px;
          text-align: center;
          height: 70px;
        }
        .kpi-label {
          font-size: 9px;
          color: #4b5563;
          font-weight: 600;
          display: block;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .kpi-val {
          font-size: 18px;
          font-weight: 800;
          color: #111827;
          display: block;
          line-height: 1.1;
        }
        .kpi-change {
          font-size: 8.5px;
          color: #6b7280;
          font-weight: bold;
          display: block;
          margin-top: 3px;
        }
        .columns-grid {
          display: table;
          width: 100%;
          margin-bottom: 20px;
        }
        .column {
          display: table-cell;
          width: 50%;
          vertical-align: top;
          padding: 0 10px;
          box-sizing: border-box;
        }
        .column:first-child {
          padding-left: 0;
          border-right: 1px solid #f3f4f6;
        }
        .column:last-child {
          padding-right: 0;
        }
        .section-title {
          font-family: monospace;
          font-size: 10px;
          font-weight: bold;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 0 0 12px 0;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 6px;
        }
        .footer {
          border-top: 1px solid #e5e7eb;
          padding-top: 15px;
          margin-top: 35px;
          text-align: center;
        }
        .footer-badge {
          font-family: monospace;
          font-size: 8.5px;
          font-weight: bold;
          color: #4f46e5;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .footer-name {
          font-size: 11px;
          font-weight: bold;
          color: #111827;
          margin: 4px 0 1px 0;
        }
        .footer-agency {
          font-size: 9.5px;
          color: #6b7280;
          margin: 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-grid">
          <div class="header-left">
            <span class="badge-system">SYSTEME PARTNER PORTAL</span>
            <h1 class="title">INFORME DE CRECIMIENTO</h1>
          </div>
          <div class="header-right">
            <span class="badge-cycle">MES DE CICLO: MES ${board.currentMonth} DE 6</span>
          </div>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-row">
          <div class="info-cell">
            <span class="info-label">Socio / Empresa</span>
            <span class="info-val">${board.companyName}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">Titular / Dueño</span>
            <span class="info-val">${board.ownerName}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">Rubro comercial</span>
            <span class="info-val">${board.industry}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">Fecha de Inicio</span>
            <span class="info-val">${board.startDate}</span>
          </div>
        </div>
      </div>

      <div class="note-container">
        <h4 class="note-title">Nota Ejecutiva del Growth Partner</h4>
        <p class="note-text">"${board.statusMessage}"</p>
      </div>

      <div class="kpi-title">Métricas Clave de Rendimiento</div>
      <div class="kpi-grid">
        <div class="kpi-card" style="padding-left: 0;">
          <div class="kpi-card-inner" style="border-left: 3px solid #8b5cf6;">
            <span class="kpi-label">${kpiVentas.label}</span>
            <span class="kpi-val" style="color: #6d28d9;">${kpiVentas.value}</span>
            <span class="kpi-change">${kpiVentas.change}</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card-inner" style="border-left: 3px solid #059669;">
            <span class="kpi-label">${kpiLeads.label}</span>
            <span class="kpi-val" style="color: #047857;">${kpiLeads.value}</span>
            <span class="kpi-change">${kpiLeads.change}</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card-inner" style="border-left: 3px solid #0891b2;">
            <span class="kpi-label">${kpiCPL.label}</span>
            <span class="kpi-val" style="color: #0e7490;">${kpiCPL.value}</span>
            <span class="kpi-change">${kpiCPL.change}</span>
          </div>
        </div>
        <div class="kpi-card" style="padding-right: 0;">
          <div class="kpi-card-inner" style="border-left: 3px solid #4f46e5;">
            <span class="kpi-label">${kpiROAS.label}</span>
            <span class="kpi-val" style="color: #4338ca;">${kpiROAS.value}</span>
            <span class="kpi-change">${kpiROAS.change}</span>
          </div>
        </div>
      </div>

      <div class="columns-grid">
        <div class="column">
          <h4 class="section-title">Hitos y Siguientes Pasos</h4>
          <ul style="margin: 0; padding: 0;">
            ${stepsHtml || '<li style="font-size: 11px; color: #6b7280; list-style: none;">No hay siguientes pasos ingresados.</li>'}
          </ul>
        </div>
        
        <div class="column">
          <h4 class="section-title">Bitácora de Acciones y Trabajo</h4>
          <div>
            ${logsHtml || '<p style="font-size: 11px; color: #6b7280; text-align: center; margin-top: 15px;">No hay registros de bitácora aún.</p>'}
          </div>
        </div>
      </div>

      <div class="footer">
        <span class="footer-badge">Growth Partner Portal · Documento Oficial</span>
        <p class="footer-name">Socio Consultor: ${consultantName || 'Growth Partner'}</p>
        <p class="footer-agency">${consultantAgency || 'Portal de Resultados Directivos'}</p>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        }
      </script>
    </body>
    </html>
  `;
  
  doc.open();
  doc.write(htmlContent);
  doc.close();

  // Cleanup iframe after some time (print dialog blocks execution but is async to this thread sometimes)
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 5000);
};

// Rebuilds ClientBoard from compressed base64 string
export const decompressClientBoard = (base64: string): ClientBoard => {
  const compact = JSON.parse(safeAtob(base64));
  return {
    id: compact[0],
    companyName: compact[1],
    ownerName: compact[2],
    startDate: compact[3],
    industry: compact[4],
    currentMonth: compact[5],
    statusMessage: compact[6],
    kpis: {
      ventas: {
        value: compact[7][0],
        change: compact[7][1],
        isPositive: compact[7][2] === 1,
        rating: compact[7][3],
        label: compact[7][4] || "Ventas Atribuibles"
      },
      leads: {
        value: compact[8][0],
        change: compact[8][1],
        isPositive: compact[8][2] === 1,
        rating: compact[8][3],
        label: compact[8][4] || "Contactos Calificados"
      },
      cpl: {
        value: compact[9][0],
        change: compact[9][1],
        isPositive: compact[9][2] === 1,
        rating: compact[9][3],
        label: compact[9][4] || "Costo por Lead"
      },
      roas: {
        value: compact[10][0],
        change: compact[10][1],
        isPositive: compact[10][2] === 1,
        rating: compact[10][3],
        label: compact[10][4] || "Retorno de Pauta"
      }
    },
    salesHistory: compact[11].map((h: any) => ({ label: h[0], value: h[1] })),
    leadsHistory: compact[12].map((h: any) => ({ label: h[0], value: h[1] })),
    logEntries: compact[13].map((l: any) => ({
      id: l[0],
      date: l[1],
      title: l[2],
      description: l[3],
      category: l[4]
    })),
    nextSteps: compact[14],
    serviceType: compact[15] || 'partner_prime',
    marketingStrategy: compact[16] || null
  };
};
