import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client if API key is present
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log("Gemini API client initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini API client:", err);
  }
} else {
  console.log("No GEMINI_API_KEY found. Using high-quality offline strategy generator.");
}

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
        title: 'Tour Exclusivo: Departamento de Lujo listo para entrega',
        hook: 'Acompáñame a conocer este penthouse de $180,000 USD con alberca privada y mensualidades desde...',
        body: 'Recorrido dinámico en primera persona mostrando la cocina equipada, la vista panorámica y las amenidades. Menciona que quedan únicamente 2 unidades con descuento especial.',
        cta: '📲 Agenda una videollamada de asesoría directa haciendo clic en el botón de contacto.'
      }
    ],
    prompts: [
      { title: 'Estilo de Vida Inmobiliario', category: 'inicio_semana', prompt: 'Una fotografía de un apartamento moderno y luminoso con ventanales de piso a techo, acabados en madera clara, decoración minimalista y vista a la ciudad al amanecer, estilo fotografía editorial de arquitectura.' },
      { title: 'Oportunidad de Preventa', category: 'promocion', prompt: 'Render fotorrealista en 3D de un desarrollo de condominios de lujo con alberca infinity en la azotea, palmeras, iluminación cálida al atardecer y un banner elegante que dice "Preventa Exclusiva" en tipografía moderna.' },
      { title: 'Testimonio de Inversionista Feliz', category: 'testimonio', prompt: 'Una pareja joven sonriendo y celebrando frente a una casa moderna con llaves en mano, fondo difuminado y colores cálidos, transmitiendo seguridad, logro y felicidad familiar.' }
    ]
  },
  'Salud y Bienestar / Odontología': {
    audience: 'Pacientes que buscan mejorar su estética dental, profesionales ocupados que descuidan su salud bucal, padres de familia.',
    offer: 'Diseño de sonrisa personalizado e implantes de alta tecnología con financiamiento directo y diagnóstico digital sin costo.',
    pillars: ['Mitos y Verdades de la Salud Bucal', 'Transformaciones de Sonrisas Reales', 'Tecnología sin dolor y Experiencia VIP'],
    angles: [
      'Cómo la alineación dental mejora tu confianza y tu éxito profesional',
      'La realidad oculta detrás de los blanqueamientos caseros baratos',
      'Procedimientos dentales de última generación que se realizan en un solo día sin dolor'
    ],
    hooks: [
      {
        phase: 'TOFU',
        title: 'El peligro de los blanqueamientos dentales de internet',
        hook: '⚠️ Deja de usar estos carbones activados o pastas blanqueadoras antes de destruir tu esmalte por completo...',
        body: 'Explica de forma visual por qué los abrasivos caseros destruyen el diente. Enseña cómo se ve un diente desgastado por dentro frente a un tratamiento clínico seguro.',
        cta: '💬 Comenta "SONRISA" y te regalo una evaluación digital gratuita para analizar el color de tus dientes.'
      },
      {
        phase: 'MOFU',
        title: 'La diferencia entre Carillas de Resina y de Porcelana',
        hook: '¿Carillas de resina o de porcelana? Si quieres mejorar tu sonrisa pero no sabes cuál elegir, mira esto...',
        body: 'Compara durabilidad, costo, estética y nivel de desgaste de cada una. Rompe el mito de que "todas las carillas destruyen tus dientes naturales".',
        cta: '👉 Visita el enlace en nuestro perfil para ver nuestra galería de casos clínicos antes y después de pacientes reales.'
      },
      {
        phase: 'BOFU',
        title: 'Caso de Éxito: Diseño de Sonrisa en 2 Citas',
        hook: 'Mira el cambio radical de Juan, quien no sonreía en las fotos y ahora recuperó su confianza en solo dos visitas...',
        body: 'Muestra imágenes o video del testimonio del paciente real. Explica brevemente el proceso digital guiado y la comodidad durante las citas.',
        cta: '📲 Agenda hoy mismo tu consulta de valoración digital haciendo clic en el botón de abajo.'
      }
    ],
    prompts: [
      { title: 'Sonrisa Brillante Profesional', category: 'inicio_semana', prompt: 'Retrato de primer plano de una mujer sonriendo con dientes perfectamente blancos y alineados en un consultorio odontológico moderno, limpio y luminoso con luces suaves de fondo.' },
      { title: 'Tecnología Dental Avanzada', category: 'educativo', prompt: 'Una toma detallada de un escáner dental 3D de alta tecnología en un consultorio de lujo con tonos azules y plateados, transmitiendo profesionalismo, precisión y modernidad.' },
      { title: 'Promoción del Mes', category: 'promocion', prompt: 'Una composición limpia con flores blancas, un cepillo de dientes de bambú y un kit de higiene dental elegante, fondo de mármol blanco con espacio para texto minimalista de descuento.' }
    ]
  },
  'E-commerce / Retail': {
    audience: 'Compradores en línea recurrentes, amantes de la moda/tecnología práctica, personas buscando regalos premium.',
    offer: 'Colección exclusiva de temporada con envío express gratis, garantía total de satisfacción y 3 meses sin intereses.',
    pillars: ['Unboxing e Interacción con el Producto', 'Problemas cotidianos resueltos por nuestro producto', 'Garantías, Detrás de Escenas y Confianza de Marca'],
    angles: [
      'Cómo combinar o usar nuestro producto estrella en tu rutina diaria',
      'Comparativa de nuestro producto de alta calidad frente a imitaciones baratas',
      'La reacción real de clientes abriendo su paquete por primera vez'
    ],
    hooks: [
      {
        phase: 'TOFU',
        title: '3 Cosas que no sabías que necesitabas en tu escritorio',
        hook: 'Si trabajas más de 6 horas al día en una computadora, estas 3 cosas van a salvar tu postura y productividad...',
        body: 'Presenta el producto estrella en uso dinámico y rápido. Destaca el diseño ergonómico, los materiales premium y la facilidad de instalación.',
        cta: '💬 Escribe "PRODUCTO" en los comentarios y te envío un cupón exclusivo de 15% de descuento más envío gratis.'
      },
      {
        phase: 'MOFU',
        title: 'Poniendo a prueba la resistencia de nuestro producto',
        hook: '¿Realmente resiste el agua y los golpes como dicen? Hoy lo ponemos a prueba extrema en vivo...',
        body: 'Muestra experimentos prácticos de durabilidad (como verter agua, dejarlo caer o compararlo con una opción convencional). Demuestra superioridad técnica.',
        cta: '👉 Entra al link de nuestra tienda y aprovecha la garantía de devolución de 30 días si no estás 100% convencido.'
      },
      {
        phase: 'BOFU',
        title: 'Envío Gratis + Regalo Sorpresa solo por 24 horas',
        hook: '¿Querías renovar tus accesorios? Solo por hoy activamos envío express gratis a todo el país y regalo...',
        body: 'Muestra cómo se empaca un pedido con cuidado, papel personalizado, notas de agradecimiento y el regalo especial. Crea urgencia de inventario.',
        cta: '📲 Compra directo con un toque en el botón "Ver Tienda" antes de que se agoten las existencias de temporada.'
      }
    ],
    prompts: [
      { title: 'Unboxing Premium', category: 'inicio_semana', prompt: 'Manos elegantes abriendo una caja de regalo negra minimalista con un lazo de seda, revelando un producto tecnológico de lujo envuelto en papel de seda premium, fondo minimalista de estudio.' },
      { title: 'Estilo de Vida Urbano', category: 'promocion', prompt: 'Una fotografía de estilo urbano que muestra el producto (mochila o accesorio elegante) siendo utilizado por un modelo en una cafetería moderna de diseño industrial, iluminación natural.' },
      { title: 'Promoción Flash', category: 'descuento', prompt: 'Un fondo abstracto en tonos pastel con formas orgánicas, luces de neón sutiles y un pedestal donde se exhibe el producto estrella con elegancia arquitectónica.' }
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
        cta: '👉 Pulsa el botón de mi biografía para acceder a la clase interactiva grabada donde revelo todo nuestro embudo.'
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
  
  // Distribute calendar publish days
  const publishDays = [];
  const interval = Math.floor(30 / videoCount);
  for (let i = 0; i < videoCount; i++) {
    const day = Math.min(30, Math.max(1, Math.round((i * interval) + 2)));
    if (!publishDays.includes(day)) {
      publishDays.push(day);
    }
  }
  // Sort publish days
  publishDays.sort((a, b) => a - b);

  const calendar: any[] = [];
  publishDays.forEach((pubDay, index) => {
    // Alternate phases TOFU, MOFU, BOFU
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
    category: p.category as any,
    imageUrl: `https://images.unsplash.com/photo-${1600000000000 + (idx * 50000)}?q=80&w=600&auto=format&fit=crop`,
    generatedAt: new Date().toISOString()
  }));

  // Create two bi-weekly reports
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
      contentSummary: `Completamos la publicación de 8 piezas de contenido adicionales enfocadas en las fases BOFU y testimonios. El Studio Creativo produjo 3 anuncios gráficos altamente atractivos para remarketing masivo.`,
      postsCount: 8,
      recommendations: [
        'Lanzar la campaña de remarketing de fin de semana con los nuevos creativos generados.',
        'Iniciar la planeación del siguiente ciclo mensual optimizando los ganchos virales con mayor tasa de retención.'
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

// 1. ENDPOINT: Generate complete strategy with AI (or mock fallback)
app.post('/api/generate-strategy', async (req, res) => {
  const { companyName, ownerName, industry, serviceType, videoCount } = req.body;
  
  if (!companyName || !ownerName || !industry) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para generar la estrategia.' });
  }

  const vCount = Number(videoCount) || 12;

  // If no AI client, or key is missing, return fallback immediately
  if (!ai) {
    console.log("Using offline strategy engine for", companyName);
    const strategy = generateMockStrategy(companyName, ownerName, industry, serviceType, vCount);
    return res.json({ strategy, mode: 'offline_fallback' });
  }

  try {
    console.log("Calling Gemini 2.5 Flash to generate custom strategy for", companyName);
    
    const prompt = `Actúa como un Consultor Growth Partner Experto. Necesitamos crear una Estrategia Completa de Marketing de 30 días para un nuevo socio/cliente en la modalidad: "${serviceType}".
Nombre de la Empresa/Marca: "${companyName}"
Propietario: "${ownerName}"
Rubro o Industria: "${industry}"
Cantidad de videos solicitados para el mes: ${vCount}

Queremos que la respuesta sea un objeto JSON estrictamente estructurado que contenga:
1. targetAudience: Una descripción detallada del cliente ideal y público objetivo para este rubro.
2. coreOffer: Una propuesta de valor irresistible enfocada en el mercado para este negocio.
3. pillars: Un array de exactamente 3 pilares de contenido principales adaptados a la industria.
4. angles: Un array de exactamente 3 ángulos de venta virales para pauta o contenido orgánico.
5. calendar: Un array de exactamente ${vCount} vídeos. Cada elemento en el array representa un vídeo y debe tener la siguiente estructura exacta:
   - id: Un string único que empiece por 'script-[index]'
   - day: El número de vídeo de 1 a ${vCount}
   - phase: Debe ser uno de 'TOFU' (atracción masiva), 'MOFU' (educación/confianza), o 'BOFU' (conversión/oferta directa). Haz una distribución equilibrada.
   - title: Un título persuasivo del vídeo.
   - hook: Un gancho inicial altamente viral y enganchador (estructura ganadora que rompa el scroll en 3 segundos).
   - bodyStructure: Estructura esquematizada del cuerpo del guión (qué debe decir o mostrar paso a paso).
   - cta: Un llamado a la acción directo y muy potente que lleve a la conversión o interacción.
   - publishDay: Un día específico del mes (1 a 30) donde se publicará. Distribuye estos días espaciados a lo largo de los 30 días del mes (ej: día 2, 5, 8, etc.).
   - shootDay: Un día específico de grabación del mes (debe ser siempre exactamente 3 días antes de su publishDay).
   - reviewDay: Un día específico para pasar a revisión técnica (debe ser siempre exactamente 1 día antes de su publishDay).
   - status: Inicialmente 'pending'
6. creativePrompts: Un array de exactamente 4 prompts detallados para el estudio creativo integrado. Cada uno debe tener la estructura:
   - title: Un título del creativo de imagen.
   - category: Uno de: 'inicio_semana', 'fin_semana', 'promocion', 'descuento', 'educativo', 'testimonio'.
   - prompt: Un prompt de generación de imágenes ultra detallado en español para crear el recurso gráfico en base a la marca y estrategia comercial.

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

    // Transform parsed schema into our expected MarketingStrategy model
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

    // Ensure we have creativeImages with dynamic Unsplash placeholders
    const creativeImages = (parsed.creativePrompts || []).map((p: any, idx: number) => ({
      id: `creative-${idx + 1}-${Date.now()}`,
      title: p.title || 'Diseño de Marca',
      prompt: p.prompt || 'Un diseño gráfico publicitario moderno.',
      category: p.category || 'promocion',
      imageUrl: `https://images.unsplash.com/photo-${1600000000000 + (idx * 60000)}?q=80&w=600&auto=format&fit=crop`,
      generatedAt: new Date().toISOString()
    }));

    // Prepopulate bi-weekly reports matching client name
    const reports = [
      {
        id: `rep-1-${Date.now()}`,
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        period: 'Día 1-15 (Fase de Lanzamiento)',
        salesSummary: `Instalamos el ecosistema para ${companyName}. Las campañas de validación de leads ya están rodando y recopilando datos demográficos de alto valor.`,
        contentSummary: `Los primeros guiones de vídeos TOFU/MOFU han sido estructurados. Hemos calendarizado la producción completa para garantizar constancia.`,
        postsCount: 4,
        recommendations: [
          'Mantener estrecho seguimiento al flujo de atención inmediata en el CRM.',
          'Revisar las métricas de CTR de los anuncios gráficos de inicio de semana.'
        ]
      },
      {
        id: `rep-2-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        period: 'Día 16-30 (Optimización Estratégica)',
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

    return res.json({ strategy, mode: 'gemini_ai' });
  } catch (err: any) {
    console.error("Gemini strategy generation failed, falling back to offline engine:", err);
    const strategy = generateMockStrategy(companyName, ownerName, industry, serviceType, vCount);
    return res.json({ strategy, mode: 'offline_fallback_error', error: err?.message });
  }
});

// 2. ENDPOINT: Generate image for the creative studio
app.post('/api/generate-creative-image', async (req, res) => {
  const { prompt, category, title, engine, supabaseUrl, supabaseAnonKey } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Falta el prompt de generación.' });
  }

  let imageUrl = '';
  let generatorMode = '';
  let statusMessage = '';
  let openaiApiKey = process.env.OPENAI_API_KEY || '';

  // Retrieve OpenAI API Key dynamically from Supabase on the fly if credentials are provided
  if (supabaseUrl && supabaseAnonKey) {
    try {
      console.log(`Buscando OpenAI API Key en la tabla "app_settings" de Supabase (${supabaseUrl})...`);
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await tempSupabase
        .from('app_settings')
        .select('value')
        .eq('key', 'openai_api_key')
        .maybeSingle();

      if (error) {
        console.warn("La tabla 'app_settings' no se pudo consultar (puede que aún no esté creada):", error.message);
      } else if (data && data.value) {
        console.log("¡OpenAI API Key recuperada exitosamente de Supabase!");
        openaiApiKey = data.value.trim();
      } else {
        console.log("No se encontró la clave 'openai_api_key' en la tabla 'app_settings' de tu Supabase.");
      }
    } catch (dbErr: any) {
      console.error("Fallo al consultar la tabla app_settings en Supabase:", dbErr?.message || dbErr);
    }
  }

  try {
    // 1. OpenAI DALL-E (ChatGPT) Generation
    if ((engine === 'openai' || !engine) && openaiApiKey) {
      console.log(`Generating image with OpenAI DALL-E 3 for prompt: "${prompt}"`);
      try {
        const response = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiApiKey}`
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024"
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData?.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        imageUrl = data?.data?.[0]?.url || '';
        generatorMode = 'openai_dalle';
        statusMessage = 'Imagen creada con éxito usando ChatGPT DALL-E 3.';
      } catch (err: any) {
        console.error("OpenAI DALL-E generation failed, falling back to Gemini:", err);
        statusMessage = `Fallo OpenAI (${err?.message || err}). Buscando motor secundario...`;
      }
    } else if (engine === 'openai' && !openaiApiKey) {
      statusMessage = 'No se configuró ninguna OpenAI API Key en Supabase ni en el servidor. Buscando motor secundario...';
      console.log(statusMessage);
    }

    // 2. Gemini Image Generation
    if (!imageUrl && ai) {
      console.log(`Generating image with Gemini for prompt: "${prompt}"`);
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [{ text: prompt }]
          },
          config: {
            imageConfig: {
              aspectRatio: "1:1"
            }
          }
        });

        if (response?.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              const base64EncodeString = part.inlineData.data;
              imageUrl = `data:image/png;base64,${base64EncodeString}`;
              generatorMode = 'gemini_image';
              statusMessage = 'Imagen creada con éxito usando Gemini AI.';
              break;
            }
          }
        }
        if (!imageUrl) {
          throw new Error("El modelo Gemini no retornó datos binarios de imagen.");
        }
      } catch (err: any) {
        console.error("Gemini image generation failed:", err);
        statusMessage = `Fallo Gemini (${err?.message || err}). Usando banco de recursos alternativos...`;
      }
    }

    // 3. Fallback to High-Quality Unsplash Query
    if (!imageUrl) {
      console.log(`Using Unsplash high-quality fallback for prompt: "${prompt}"`);
      const queryTerm = encodeURIComponent(title || category || 'business');
      const randomSeed = Math.floor(Math.random() * 100);
      imageUrl = `https://images.unsplash.com/featured/?${queryTerm}&sig=${randomSeed}`;
      generatorMode = 'unsplash_fallback';
      if (!statusMessage) {
        statusMessage = 'Imagen de recurso premium seleccionada del banco Unsplash.';
      } else {
        statusMessage += ' Mostrando imagen de recurso Unsplash de alta calidad.';
      }
    }

    return res.json({
      success: true,
      imageUrl,
      generatedAt: new Date().toISOString(),
      engineUsed: generatorMode,
      statusMessage,
      creative: {
        id: `creative-${Date.now()}`,
        title: title || 'Estudio de Diseño',
        prompt,
        category,
        imageUrl,
        generatedAt: new Date().toISOString(),
        engineUsed: generatorMode
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error en el generador de imágenes.' });
  }
});

// 3. ENDPOINT: Generate 15-day sales & content report via Gemini
app.post('/api/generate-report', async (req, res) => {
  const { companyName, industry, currentMonth, periodName } = req.body;

  if (!companyName) {
    return res.status(400).json({ error: 'Nombre de la empresa es obligatorio.' });
  }

  if (!ai) {
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
    return res.json({ report: mockReport, mode: 'offline' });
  }

  try {
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

    return res.json({ report, mode: 'gemini_ai' });
  } catch (err: any) {
    // Fallback on error
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
    return res.json({ report: mockReport, mode: 'error_fallback', error: err?.message });
  }
});

// Serve frontend assets in production / use Vite dev middleware in development
const startServer = async () => {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
};

startServer();
