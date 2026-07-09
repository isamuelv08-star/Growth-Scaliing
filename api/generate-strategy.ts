import { GoogleGenAI } from '@google/genai';

// Custom templates for fallback strategy generation based on industry
const INDUSTRY_TEMPLATES: Record<string, {
  audience: string;
  offer: string;
  pillars: string[];
  angles: string[];
  hooks: { phase: 'TOFU' | 'MOFU' | 'BOFU'; title: string; hook: string; body: string; cta: string }[];
  prompts: { title: string; category: string; prompt: string }[];
}> = {
  'Bienes Raíces / Real Estate': {
    audience: 'Inversionistas, familias buscando su primer hogar, profesionales buscando relocalización.',
    offer: 'Acceso exclusivo a preventas exclusivas con alta plusvalía y facilidades de pago (0% enganche inicial).',
    pillars: ['Oportunidades de Inversión', 'Educación Financiera Inmobiliaria', 'Estilo de Vida y Recorridos de Propiedades'],
    angles: [
      'Cómo ganarle a la inflación comprando en preventas',
      'El secreto para evaluar el retorno de inversión inmobiliaria',
      'Recorridos rápidos en primera persona destacando acabados y amenidades'
    ],
    hooks: [
      {
        phase: 'TOFU',
        title: 'El error de $50,000 USD que cometen al comprar casa',
        hook: '❌ NO COMPRES un departamento en preventa sin antes revisar esto que las constructoras ocultan...',
        body: 'Explica los 3 puntos clave: historial del desarrollador, cláusulas de entrega tardía y el costo real del metro cuadrado. Demuestra experiencia analizando contratos de manera muy simple.',
        cta: '💬 Comenta la palabra "PREVENTA" y te envío nuestra checklist gratuita para evaluar proyectos inmobiliarios.'
      },
      {
        phase: 'MOFU',
        title: '3 Zonas con mayor plusvalía proyectada para 2026',
        hook: '¿Quieres comprar para rentar? Estas son las únicas 3 zonas que duplicarán tu dinero en los próximos 3 años...',
        body: 'Muestra un mapa interactivo o imágenes de las zonas en auge. Habla de la infraestructura futura, inversión pública cercana y demanda de alquiler.',
        cta: '👉 Haz clic en el enlace de mi bio para descargar el reporte de plusvalía y retorno de inversión de este mes.'
      },
      {
        phase: 'BOFU',
        title: 'Oportunidad de inversión única',
        hook: '¿Buscas diversificar de manera segura? Este proyecto inmobiliario ofrece rentabilidad anual garantizada...',
        body: 'Presenta un recorrido virtual rápido o imágenes render de alta calidad. Describe las condiciones de preventa únicas y las facilidades de pago.',
        cta: '📲 Agenda una videollamada personalizada para conocer los planos y precios de lanzamiento.'
      }
    ],
    prompts: [
      { title: 'Estilo de Vida Premium', category: 'inicio_semana', prompt: 'Una terraza de un departamento moderno de lujo al atardecer, con vista panorámica a la ciudad, sillones elegantes, plantas decorativas y una copa de vino sobre la mesa.' },
      { title: 'Arquitectura Moderna', category: 'testimonio', prompt: 'Fachada frontal de una casa residencial contemporánea de dos niveles, con grandes ventanales de vidrio, iluminación cálida interior y un jardín frontal impecable.' },
      { title: 'Inversión Inteligente', category: 'educativo', prompt: 'Una maqueta arquitectónica de rascacielos sobre una mesa de diseño con planos impresos, destacando líneas precisas de ingeniería estructural y elegancia corporativa.' }
    ]
  },
  'Servicios Premium B2B': {
    audience: 'Directores de empresas, dueños de negocios medianos en crecimiento, fundadores de startups buscando escalar.',
    offer: 'Auditoría e implementación de sistemas de ventas automatizados con garantía de retorno de inversión de 3x sobre la pauta.',
    pillars: ['Casos de Estudio con Números Reales', 'Sistemas de Automatización y Eficiencia', 'Liderazgo y Estrategia de Negocios Corporativos'],
    angles: [
      'Cómo escalar la facturación de tu negocio sin depender de vendedores estrella',
      'El cuello de botella silencioso en tu embudo de ventas que te cuesta miles de dólares',
      'Cómo automatizar el seguimiento de prospectos por WhatsApp de forma natural'
    ],
    hooks: [
      {
        phase: 'TOFU',
        title: 'Por qué tu negocio está estancado en facturación',
        hook: 'Si tu negocio factura bien pero sigues siendo el único que vende, tienes un autoempleo de lujo, no una empresa...',
        body: 'Describe la trampa del fundador operativo. Enseña de forma estructurada los 3 pilares del escalamiento: procesos documentados, CRM automatizado y pauta predecible.',
        cta: '💬 Comenta la palabra "AUDITORIA" y analizamos el embudo de ventas de tu negocio completamente gratis.'
      },
      {
        phase: 'MOFU',
        title: 'Cómo cerramos 14 clientes high-ticket usando WhatsApp',
        hook: 'Dejamos de agendar llamadas frías y diseñamos este flujo automatizado en WhatsApp que convierte leads en clientes...',
        body: 'Muestra la pantalla con el esquema del flujo paso a paso de forma educativa. Explica qué mensajes enviar, los tiempos de espera y el gancho de valor.',
        cta: '👉 Pulsa el botón de mi bio para acceder a la clase interactiva grabada donde revelo todo nuestro embudo.'
      },
      {
        phase: 'BOFU',
        title: 'Abiertas postulaciones para nuestro programa acelerador',
        hook: 'Buscamos únicamente a 3 dueños de negocios que facturen más de $10,000 USD al mes para ayudarlos a...',
        body: 'Presenta el modelo colaborativo "Hecho Con Nosotros". Enfatiza que es un servicio personalizado, de cupos estrictos, enfocado en optimizar el CAC y LTV de inmediato.',
        cta: '📲 Agenda tu entrevista de selección exclusiva haciendo clic en el enlace adjunto.'
      }
    ],
    prompts: [
      { title: 'Espacio de Trabajo Ejecutivo', category: 'inicio_semana', prompt: 'Un escritorio de madera noble con una laptop moderna mostrando gráficos financieros ascendentes, una taza de café, anteojos elegantes e iluminación natural de una ventana de rascacielos.' },
      { title: 'Reunión de Negocios de Éxito', category: 'testimonio', prompt: 'Un equipo diverso de profesionales de negocios sonriendo en una sala de juntas moderna con paredes de vidrio, celebrando un trato, ambiente corporativo elegante de alta confianza.' },
      { title: 'Infografía de Métricas', category: 'educativo', prompt: 'Una tablet con una interfaz de panel de analítica moderna y colorida sobre una mesa de mármol, rodeada de notas de diseño limpias, transmitiendo crecimiento inteligente y estructurado.' }
    ]
  },
  'Estética / Medicina Estética': {
    audience: 'Mujeres y hombres interesados en rejuvenecimiento facial, cuidado corporal no invasivo, estética de lujo.',
    offer: 'Armonización facial integral con ácido hialurónico y toxina botulínica realizada por especialistas certificados.',
    pillars: ['Resultados Naturales vs Resultados Exagerados', 'Seguridad, Higiene y Ciencia de los Procedimientos', 'Cuidado de la piel y Bienestar diario post-tratamiento'],
    angles: [
      'Cómo rejuvenecer tu piel sin perder la naturalidad de tus expresiones',
      'El tratamiento número uno que eligen los famosos antes de un evento importante',
      'Qué esperar paso a paso en tu primera consulta de medicina estética premium'
    ],
    hooks: [
      {
        phase: 'TOFU',
        title: 'La verdad sobre los tratamientos faciales milagro',
        hook: '❌ NO gastes dinero en cremas de $200 USD sin antes entender la verdadera ciencia detrás de las arrugas faciales...',
        body: 'Explica de forma científica pero muy accesible la diferencia entre productos tópicos y tratamientos clínicos dirigidos como el ácido hialurónico o bioestimuladores de colágeno.',
        cta: '💬 Comenta la palabra "PIEL" y te envío un diagnóstico digital interactivo personalizado de obsequio.'
      },
      {
        phase: 'MOFU',
        title: '¿Ácido Hialurónico o Toxina Botulínica? Te lo aclaro',
        hook: 'Mucha gente confunde estos dos tratamientos estéticos, pero sirven para cosas totalmente diferentes...',
        body: 'Explica de forma clara, apuntando a zonas de la cara, cuál es para rellenar líneas estáticas y volumen, y cuál es para relajar arrugas de expresión dinámicas.',
        cta: '👉 Dale clic al enlace de mi biografía para ver nuestra galería fotográfica de resultados reales "Fresh & Natural".'
      },
      {
        phase: 'BOFU',
        title: 'Armonización Facial: Especial de Temporada',
        hook: '¿Lista para lucir tu mejor versión? Diseñamos este paquete de Armonización Facial Personalizado con...',
        body: 'Muestra a la doctora de bata blanca explicando con un vernier o regla de proporciones estéticas áureas cómo se planifican los puntos de inyección para lograr belleza natural simétrica.',
        cta: '📲 Agenda tu consulta presencial de valoración y diseño estético en el botón de contacto de abajo.'
      }
    ],
    prompts: [
      { title: 'Procedimiento Estético de Lujo', category: 'inicio_semana', prompt: 'Una doctora estética profesional con bata médica blanca y guantes negros aplicando de manera muy sutil un tratamiento en el rostro de una paciente relajada en un spa médico moderno con iluminación cálida.' },
      { title: 'Belleza y Piel Radiante', category: 'testimonio', prompt: 'Retrato de belleza pura de una mujer joven con piel perfectamente tersa, limpia y radiante, fondo de hojas verdes suaves e iluminación fresca de estudio clínico.' },
      { title: 'Ingredientes Activos de Lujo', category: 'educativo', prompt: 'Gotas de suero transparente cayendo sobre un frasco de vidrio de diseño minimalista con flores de lavanda a su alrededor, estética de lujo, salud y bienestar biológico.' }
    ]
  }
};

const DEFAULT_TEMPLATE = INDUSTRY_TEMPLATES['Servicios Premium B2B'];

// Helper to generate comprehensive strategies offline
function generateMockStrategy(companyName: string, ownerName: string, industry: string, serviceType: string, videoCountInput: number) {
  const videoCount = videoCountInput || 12;
  const template = INDUSTRY_TEMPLATES[industry] || DEFAULT_TEMPLATE;
  
  const publishDays: number[] = [];
  const interval = Math.floor(30 / videoCount);
  for (let i = 0; i < videoCount; i++) {
    const day = Math.min(30, Math.max(1, Math.round((i * interval) + 2)));
    if (!publishDays.includes(day)) {
      publishDays.push(day);
    }
  }
  publishDays.sort((a, b) => a - b);

  const calendar: any[] = [];
  publishDays.forEach((pubDay, index) => {
    const phaseOrder: ('TOFU' | 'MOFU' | 'BOFU')[] = ['TOFU', 'MOFU', 'BOFU'];
    const phase = phaseOrder[index % 3];
    const templateHooks = template.hooks.filter(h => h.phase === phase);
    const selectedHook = templateHooks[Math.floor(Math.random() * templateHooks.length)] || template.hooks[0];

    const shootDay = Math.max(1, pubDay - 3);
    const reviewDay = Math.max(1, pubDay - 1);

    calendar.push({
      id: `script-${index + 1}-${Date.now()}`,
      day: index + 1,
      phase: phase,
      title: `${selectedHook.title} (Vídeo #${index + 1})`,
      hook: selectedHook.hook,
      bodyStructure: selectedHook.body,
      cta: selectedHook.cta,
      publishDay: pubDay,
      shootDay: shootDay,
      reviewDay: reviewDay,
      status: 'pending'
    });
  });

  const creativeImages = template.prompts.map((p, idx) => ({
    id: `creative-${idx + 1}-${Date.now()}`,
    title: p.title,
    prompt: p.prompt,
    category: p.category,
    imageUrl: `https://images.unsplash.com/photo-${1600000000000 + (idx * 50000)}?q=80&w=600&auto=format&fit=crop`,
    generatedAt: new Date().toISOString()
  }));

  const reports = [
    {
      id: `rep-1-${Date.now()}`,
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      period: 'Día 1-15 (Fase de Instalación)',
      salesSummary: `Durante las primeras dos semanas de la estrategia para ${companyName}, nos enfocamos plenamente en la auditoría técnica y el lanzamiento comercial. Se estructuraron los píxeles y se completó la campaña inicial de validación.`,
      contentSummary: `Se grabaron los primeros 6 vídeos utilizando las estructuras ganadoras virales TOFU/MOFU. 4 vídeos han sido publicados, logrando tracción orgánica inicial en canales clave.`,
      postsCount: 4,
      recommendations: [
        'Acelerar el proceso de paso a revisión para no retrasar publicaciones.',
        'Duplicar el presupuesto de pauta en el conjunto de anuncios que reporta menor costo por lead (CPL).'
      ]
    },
    {
      id: `rep-2-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      period: 'Día 16-30 (Fase de Optimización)',
      salesSummary: `Sólido incremento en conversiones directas atribuibles al embudo de WhatsApp. Logramos estabilizar el retorno de inversión publicitaria (ROAS) y depurar las audiencias con mayor tasa de abandono en el checkout.`,
      contentSummary: `Las piezas BOFU y de remarketing gráfico han sido desplegadas con éxito. Excelente retención en los primeros segundos de reproducción gracias a los ganchos virales aplicados.`,
      postsCount: 6,
      recommendations: [
        'Introducir variaciones de ganchos basados en las preguntas frecuentes recolectadas.',
        'Exportar el reporte completo para planificar el siguiente mes de escala.'
      ]
    }
  ];

  return {
    id: `strat-${Date.now()}`,
    createdAt: new Date().toISOString(),
    targetAudience: template.audience,
    coreOffer: template.offer,
    pillars: template.pillars,
    angles: template.angles,
    calendar: calendar,
    creativeImages: creativeImages,
    reports: reports
  };
}

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

  const { companyName, ownerName, industry, serviceType, videoCount } = req.body;

  if (!companyName || !ownerName || !industry || !serviceType) {
    return res.status(400).json({ error: 'Faltan parámetros esenciales para armar la propuesta.' });
  }

  const vCount = Number(videoCount) || 12;

  if (!process.env.GEMINI_API_KEY) {
    console.log("No GEMINI_API_KEY found. Generating high-quality offline strategy.");
    const strategy = generateMockStrategy(companyName, ownerName, industry, serviceType, vCount);
    return res.status(200).json({ strategy, mode: 'offline' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `Como Growth Partner experto de nivel mundial, diseña una propuesta estratégica comercial y de adquisición de alto nivel y personalizada para el negocio "${companyName}", propiedad de "${ownerName}", que opera en la industria de "${industry}" ofreciendo el servicio específico de "${serviceType}". El cliente solicita producir una estrategia enfocada para un volumen de exactamente ${vCount} vídeos de formato corto de alto impacto para este mes.
    
Necesito que devuelvas estrictamente un objeto JSON con la siguiente estructura:
{
  "targetAudience": "Descripción ultra-específica del cliente ideal con sus puntos de dolor de negocios",
  "coreOffer": "Una propuesta de valor empaquetada e irresistible que resuelva su dolor",
  "pillars": ["pilar 1", "pilar 2", "pilar 3"], // Exactamente 3 pilares de posicionamiento
  "angles": ["angulo de venta 1", "angulo de venta 2", "angulo de venta 3"], // Exactamente 3 angulos virales
  "calendar": [
    // Un array de exactamente ${vCount} objetos con este formato:
    {
      "day": 1, // Número correlativo de vídeo 1 a ${vCount}
      "phase": "TOFU", // Debe ser 'TOFU', 'MOFU' o 'BOFU'
      "title": "Título llamativo para el vídeo",
      "hook": "Un gancho que rompa el scroll en 3 segundos en redes sociales",
      "bodyStructure": "Estructura del desarrollo del guión en viñetas ordenadas paso a paso",
      "cta": "Llamado a la acción de alto impacto",
      "publishDay": 2, // Día de publicación recomendado (1 al 30 del mes)
      "shootDay": -1, // No definir, lo autocalcularemos
      "reviewDay": -1 // No definir, lo autocalcularemos
    }
  ],
  "creativePrompts": [
    // Un array de exactamente 4 prompts detallados para generar recursos publicitarios gráficos en español. Estructura:
    {
      "title": "Título del creativo",
      "category": "inicio_semana", // Debe ser uno de: 'inicio_semana', 'fin_semana', 'promocion', 'descuento', 'educativo', 'testimonio'
      "prompt": "Prompt ultra descriptivo en español para DALL-E indicando elementos, estilo corporativo, colores, sin texto distorsionado, estética pulida"
    }
  ]
}

Ten en cuenta que:
1. Los días de publicación ("publishDay") deben distribuirse uniformemente a lo largo de 30 días (por ejemplo, si son 12 vídeos, espaciados cada 2-3 días).
2. Los pilares de contenido y los ganchos deben alinearse profundamente con la psicología de compra del cliente ideal de "${industry}".

RESPONDE ÚNICAMENTE CON EL OBJETO JSON LIMPIO. NO COMENTARIOS, NO FORMATO MD ADICIONAL, DEBE SER PARSEABLE DIRECTAMENTE POR JSON.parse().`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const resultText = response.text || '';
    const cleanedText = resultText.trim().replace(/^```json/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleanedText);

    const calendar = (parsed.calendar || []).map((item: any, idx: number) => ({
      id: item.id || `script-${idx + 1}-${Date.now()}`,
      day: item.day || (idx + 1),
      phase: item.phase || 'TOFU',
      title: item.title || `Vídeo Informativo #${idx + 1}`,
      hook: item.hook || '¡Mira esto si quieres escalar tu negocio hoy mismo!',
      bodyStructure: item.bodyStructure || 'Presentación del problema, muestra de la solución rápida y prueba de valor.',
      cta: item.cta || 'Haz clic en el enlace para contactarnos.',
      publishDay: Number(item.publishDay) || Math.min(30, (idx * 3) + 2),
      shootDay: Number(item.shootDay) || Math.max(1, (Number(item.publishDay) || (idx * 3) + 2) - 3),
      reviewDay: Number(item.reviewDay) || Math.max(1, (Number(item.publishDay) || (idx * 3) + 2) - 1),
      status: 'pending'
    }));

    const creativeImages = (parsed.creativePrompts || []).map((p: any, idx: number) => ({
      id: `creative-${idx + 1}-${Date.now()}`,
      title: p.title || 'Diseño de Marca',
      prompt: p.prompt || 'Un diseño gráfico publicitario moderno.',
      category: p.category || 'promocion',
      imageUrl: `https://images.unsplash.com/photo-${1600000000000 + (idx * 60000)}?q=80&w=600&auto=format&fit=crop`,
      generatedAt: new Date().toISOString()
    }));

    const reports = [
      {
        id: `rep-1-${Date.now()}`,
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        period: 'Día 1-15 (Fase de Lanzamiento)',
        salesSummary: `El embudo comercial de ${companyName} muestra mejoras en su conversión de leads. El costo de adquisición está en niveles estables y rentables.`,
        contentSummary: `Los ganchos TOFU/MOFU han logrado captar la atención de las audiencias clave de ${industry}.`,
        postsCount: 5,
        recommendations: [
          'Optimizar la velocidad de respuesta en WhatsApp Business.',
          'Lanzar anuncios gráficos adicionales de descuento en fin de semana.'
        ]
      },
      {
        id: `rep-2-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        period: 'Día 16-30 (Fase de Optimización)',
        salesSummary: `Excelente volumen de leads calificados entrantes. Redujimos el CPL en un 18% afinando las audiencias y optimizamos la conversión en el agendamiento telefónico.`,
        contentSummary: `Las piezas BOFU y de remarketing gráfico han sido desplegadas con éxito. Excelente retención en los primeros segundos de reproducción gracias a los ganchos virales aplicados.`,
        postsCount: 6,
        recommendations: [
          'Introducir variaciones de ganchos basados en las preguntas frecuentes recolectadas.',
          'Exportar el reporte completo para planificar el siguiente mes de escala.'
        ]
      }
    ];

    const strategy = {
      id: parsed.id || `strat-${Date.now()}`,
      createdAt: new Date().toISOString(),
      targetAudience: parsed.targetAudience || 'Clientes ideales y nichos de mercado clave.',
      coreOffer: parsed.coreOffer || 'Propuesta de valor comercial ganadora e irresistible.',
      pillars: parsed.pillars || ['Pilar Comercial', 'Pilar Educativo', 'Pilar de Confianza'],
      angles: parsed.angles || ['Ángulo de Autoridad', 'Ángulo de Dolor Directo', 'Ángulo de Transformación'],
      calendar: calendar,
      creativeImages: creativeImages,
      reports: reports
    };

    return res.status(200).json({ strategy, mode: 'gemini_ai' });
  } catch (err: any) {
    console.error("Gemini strategy generation failed, falling back to offline engine:", err);
    const strategy = generateMockStrategy(companyName, ownerName, industry, serviceType, vCount);
    return res.status(200).json({ strategy, mode: 'offline_fallback_error', error: err?.message });
  }
}
