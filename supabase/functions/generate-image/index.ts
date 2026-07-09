// supabase/functions/generate-image/index.ts
// Esta es la Edge Function de Supabase (Deno Runtime) para generar imágenes de manera segura con OpenAI DALL-E 3
// Puedes crearla en tu proyecto de Supabase ejecutando: supabase functions new generate-image
// Y desplegarla usando: supabase functions deploy generate-image --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Manejo de peticiones preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, title, category } = await req.json()
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Falta el prompt de generación en el cuerpo de la solicitud.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Recupera la API Key de OpenAI desde las variables de entorno seguras de Supabase
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'No se configuró la variable de entorno "OPENAI_API_KEY" en tu Supabase.\nEjecuta: supabase secrets set OPENAI_API_KEY=tu_clave_sk' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Generando imagen con OpenAI DALL-E 3 en Supabase Edge para el prompt: "${prompt}"`);

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiApiKey}`
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
      throw new Error(errData?.error?.message || `Error HTTP de OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data?.data?.[0]?.url || '';

    if (!imageUrl) {
      throw new Error('OpenAI no retornó ninguna URL de imagen.');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl, 
        statusMessage: '¡Imagen generada de manera exitosa y 100% segura usando tu Supabase Edge Function con DALL-E 3!' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error("Error en generate-image Edge Function:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
