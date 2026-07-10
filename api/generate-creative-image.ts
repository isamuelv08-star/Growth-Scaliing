import { createClient } from '@supabase/supabase-js';

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

  const { prompt, category, title, supabaseUrl, supabaseAnonKey } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Falta el prompt de generación.' });
  }

  let openaiApiKey = process.env.OPENAI_API_KEY || '';

  // 1. Try to fetch from Supabase database table "app_settings" if credentials are provided and we don't have a direct env key
  if (!openaiApiKey && supabaseUrl && supabaseAnonKey) {
    try {
      console.log(`Buscando OpenAI API Key en la tabla "app_settings" de Supabase (${supabaseUrl})...`);
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await tempSupabase
        .from('app_settings')
        .select('value')
        .eq('key', 'openai_api_key')
        .maybeSingle();

      if (error) {
        console.warn("La tabla 'app_settings' no se pudo consultar o no existe aún:", error.message);
      } else if (data && data.value) {
        console.log("¡OpenAI API Key recuperada exitosamente de la base de datos de Supabase!");
        openaiApiKey = data.value.trim();
      }
    } catch (dbErr: any) {
      console.error("Fallo al consultar la tabla app_settings en Supabase:", dbErr?.message || dbErr);
    }
  }

  if (!openaiApiKey) {
    return res.status(400).json({ 
      error: 'No se encontró la clave de API de OpenAI (OPENAI_API_KEY). Asegúrate de agregarla en las variables de entorno de Vercel.' 
    });
  }

  try {
    console.log(`Intentando generación directa de imagen con OpenAI DALL-E 3...`);
    let response = await fetch("https://api.openai.com/v1/images/generations", {
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

    let data;
    let usedModel = "dall-e-3";

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData?.error?.message || "";
      console.warn("DALL-E 3 directa falló con error:", errMsg);
      
      if (
        errMsg.toLowerCase().includes("dall-e-3") || 
        errMsg.toLowerCase().includes("does not exist") || 
        errMsg.toLowerCase().includes("not_found") ||
        errMsg.toLowerCase().includes("access") ||
        errMsg.toLowerCase().includes("permission")
      ) {
        console.log("Intentando fallback directa a dall-e-2...");
        usedModel = "dall-e-2";
        response = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiApiKey}`
          },
          body: JSON.stringify({
            model: "dall-e-2",
            prompt: prompt,
            n: 1,
            size: "1024x1024"
          })
        });

        if (!response.ok) {
          const errData2 = await response.json().catch(() => ({}));
          const errMsg2 = errData2?.error?.message || `Error HTTP de OpenAI en DALL-E 2: ${response.status}`;
          return res.status(400).json({ 
            error: `Error de OpenAI (DALL-E 2): ${errMsg2}. Verifica tu cuenta y saldo en OpenAI.` 
          });
        }
        data = await response.json();
      } else {
        return res.status(400).json({ 
          error: `Error de OpenAI (DALL-E 3): ${errMsg}. Verifica tu cuenta y saldo en OpenAI.` 
        });
      }
    } else {
      data = await response.json();
    }

    const imageUrl = data?.data?.[0]?.url || '';
    if (!imageUrl) {
      return res.status(400).json({ error: 'La API de OpenAI no devolvió ninguna URL de imagen.' });
    }

    return res.status(200).json({
      success: true,
      imageUrl,
      statusMessage: `¡Imagen creada con éxito usando OpenAI ${usedModel.toUpperCase()}!`,
      creative: {
        id: `creative-${Date.now()}`,
        title: title || 'Estudio de Diseño',
        prompt,
        category,
        imageUrl,
        generatedAt: new Date().toISOString(),
        engineUsed: `openai_${usedModel}`
      }
    });

  } catch (err: any) {
    console.error("Error crítico en el backend de generación de imágenes:", err);
    return res.status(500).json({ 
      error: `Error de red al conectar con OpenAI: ${err?.message || err}` 
    });
  }
}
