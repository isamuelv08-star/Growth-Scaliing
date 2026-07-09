import { createClient } from '@supabase/supabase-js';
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

  const { prompt, category, title, supabaseUrl, supabaseAnonKey } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Falta el prompt de generación.' });
  }

  let imageUrl = '';
  let generatorMode = '';
  let statusMessage = '';
  let openaiApiKey = process.env.OPENAI_API_KEY || '';

  // 1. Try to fetch from Supabase database table "app_settings" if credentials are provided and we don't have a direct key
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

  try {
    // 2. Try Method A: Direct OpenAI API call (if key is found on Vercel environment or database table)
    if (openaiApiKey) {
      console.log(`Intentando generación directa de imagen con OpenAI...`);
      try {
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
            errMsg.toLowerCase().includes("access")
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
              throw new Error(errData2?.error?.message || `Error HTTP de OpenAI en DALL-E 2: ${response.status}`);
            }
            data = await response.json();
          } else {
            throw new Error(errMsg || `Error HTTP de OpenAI: ${response.status}`);
          }
        } else {
          data = await response.json();
        }

        imageUrl = data?.data?.[0]?.url || '';
        if (imageUrl) {
          generatorMode = 'openai_dalle';
          statusMessage = `¡Imagen creada con éxito usando ChatGPT ${usedModel.toUpperCase()} directamente!`;
          console.log(`¡Imagen generada con éxito con ${usedModel.toUpperCase()} directo!`);
        }
      } catch (err: any) {
        console.error("Fallo la llamada directa a OpenAI DALL-E:", err);
      }
    }

    // 3. Try Method B: Call Supabase Edge Function directly from the backend (if key is in Supabase Secrets)
    if (!imageUrl && supabaseUrl && supabaseAnonKey) {
      const cleanUrl = supabaseUrl.replace(/\/$/, "");
      const edgeUrl = `${cleanUrl}/functions/v1/generate-image`;
      console.log(`Intentando llamar de fondo a la Edge Function de Supabase: ${edgeUrl}`);
      
      try {
        const response = await fetch(edgeUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'apikey': supabaseAnonKey
          },
          body: JSON.stringify({ 
            prompt: prompt, 
            title: title || 'Creativo de Marketing', 
            category: category || 'social_post' 
          })
        });

        if (response.ok) {
          const data = await response.json();
          imageUrl = data?.imageUrl || '';
          if (imageUrl) {
            generatorMode = 'supabase_edge';
            statusMessage = '¡Imagen generada con éxito usando tu Supabase Edge Function!';
            console.log("¡Imagen generada exitosamente vía Supabase Edge Function!");
          }
        } else {
          const errText = await response.text().catch(() => "");
          console.warn(`La Edge Function de Supabase retornó código de estado ${response.status}: ${errText}`);
        }
      } catch (err: any) {
        console.error("Error al conectar de fondo con la Edge Function de Supabase:", err);
      }
    }

    // 4. Try Method C: Fallback to Gemini Image Generation (free background fallback)
    if (!imageUrl && process.env.GEMINI_API_KEY) {
      console.log(`Ninguna OpenAI key activa. Intentando generar con Gemini como alternativa de respaldo...`);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: `Genera una imagen publicitaria profesional de alta calidad, fotorrealista o de ilustración corporativa limpia para el siguiente prompt creativo. Debe ser estético, moderno, con iluminación profesional, sin texto ni marcas de agua distorsionadas.
Prompt original: ${prompt}
Categoría: ${category || 'marketing'}
Título del creativo: ${title || ''}`
        });

        const candidates = response?.candidates;
        if (candidates && candidates.length > 0) {
          const parts = candidates[0].content?.parts;
          if (parts && parts.length > 0) {
            for (const part of parts) {
              if (part.inlineData && part.inlineData.data) {
                const base64EncodeString = part.inlineData.data;
                imageUrl = `data:image/png;base64,${base64EncodeString}`;
                generatorMode = 'gemini_image';
                statusMessage = 'Imagen creada usando el motor Gemini AI alternativo de respaldo.';
                console.log("¡Imagen de respaldo generada exitosamente con Gemini AI!");
                break;
              }
            }
          }
        }
      } catch (err: any) {
        console.error("La generación de imagen alternativa con Gemini falló:", err);
      }
    }

    // 5. Try Method D: Fallback to High-Quality Unsplash Query
    if (!imageUrl) {
      console.log(`Usando imagen de Unsplash de alta calidad...`);
      const queryTerm = encodeURIComponent(title || category || 'business');
      const randomSeed = Math.floor(Math.random() * 100);
      imageUrl = `https://images.unsplash.com/featured/?${queryTerm}&sig=${randomSeed}`;
      statusMessage = 'Mostrando una imagen representativa premium de alta definición de Unsplash.';
    }

    return res.status(200).json({
      success: true,
      imageUrl,
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
    console.error("Error crítico en el backend de generación de imágenes:", err);
    return res.status(500).json({ error: err?.message || 'Error en el generador de imágenes.' });
  }
}
