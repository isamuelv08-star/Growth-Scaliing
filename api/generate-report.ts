import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { companyName, industry, currentMonth, periodName } = req.body;

  if (!companyName) {
    return res.status(400).json({ error: 'Nombre de la empresa es obligatorio.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    const mockReport = {
      id: `rep-custom-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      period: periodName || 'Historial Quincenal',
      salesSummary: `Reporte de ventas quincenal consolidado. Hemos observado estabilidad en la adquisición de clientes calificados y una tasa de cierre comercial optimizada en un 12%.`,
      contentSummary: `Los contenidos publicados han sostenido un buen nivel de interacción. Los ganchos virales aplicados ayudaron a aumentar las visualizaciones de perfil orgánicas de forma consistente.`,
      postsCount: Math.floor(Math.random() * 6) + 4,
      recommendations: [
        'Ajustar la pauta de remarketing para maximizar conversiones los fines de semana.',
        'Reforzar la estructura BOFU con el nuevo caso de éxito documentado.'
      ]
    };
    return res.status(200).json({ report: mockReport, mode: 'offline' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `Como Consultor Growth Partner, redacta un informe de rendimiento de 15 días (quincenal) estructurado para el socio: "${companyName}", que opera en el sector de "${industry}". El cliente está actualmente en el mes ${currentMonth || 1} de su ciclo comercial.
El informe se titula: "${periodName || 'Días 15-30 de Operación'}".

Entrega un objeto JSON que contenga:
1. salesSummary: Un párrafo ejecutivo que describa los avances comerciales, reducción de CAC, mejora del embudo de ventas y agilidad en WhatsApp.
2. contentSummary: Un párrafo analítico que describa la retención de los vídeos publicados, el engagement del Studio Creativo y el rendimiento de las publicaciones.
3. postsCount: Un número de posts publicados (entre 3 y 8).
4. recommendations: Un array con exactamente 2 recomendaciones de negocio prácticas de crecimiento.

RESPONDE ÚNICAMENTE CON EL OBJETO JSON LIMPIO.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '';
    const cleaned = text.trim().replace(/^```json/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleaned);

    const report = {
      id: `rep-ai-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      period: periodName || 'Reporte Quincenal IA',
      salesSummary: parsed.salesSummary || 'Resumen de ventas procesado exitosamente por nuestro modelo de inteligencia artificial.',
      contentSummary: parsed.contentSummary || 'Resumen de contenidos procesado exitosamente por nuestro modelo de inteligencia artificial.',
      postsCount: Number(parsed.postsCount) || 5,
      recommendations: parsed.recommendations || ['Continuar con el cronograma pautado.', 'Alinear pautas publicitarias comerciales.']
    };

    return res.status(200).json({ report, mode: 'gemini_ai' });
  } catch (err: any) {
    const mockReport = {
      id: `rep-custom-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      period: periodName || 'Reporte de Progreso',
      salesSummary: `El embudo comercial de ${companyName} muestra mejoras en su conversión de leads. El costo de adquisición está en niveles estables y rentables.`,
      contentSummary: `Los ganchos TOFU/MOFU han logrado captar la atención de las audiencias clave de ${industry}.`,
      postsCount: 5,
      recommendations: [
        'Optimizar la velocidad de respuesta en WhatsApp Business.',
        'Lanzar anuncios gráficos adicionales de descuento en fin de semana.'
      ]
    };
    return res.status(200).json({ report: mockReport, mode: 'error_fallback', error: err?.message });
  }
}
