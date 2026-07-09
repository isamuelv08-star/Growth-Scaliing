# Guía de Despliegue: Supabase Edge Function para Imágenes con ChatGPT (DALL-E 3)

¡Excelente decisión! Alojar la integración de OpenAI directamente en una **Edge Function de Supabase** es el estándar de oro en cuanto a seguridad y escalabilidad, eliminando por completo cualquier riesgo de filtración de claves en el cliente.

A continuación, tienes los pasos exactos para crearlo, configurarlo y desplegarlo en tu cuenta de Supabase en menos de 3 minutos.

---

## Paso 1: Inicializar la Edge Function en tu terminal local

En tu máquina local donde tengas el proyecto clonado o tu entorno de desarrollo, inicializa la función ejecutando:

```bash
# Asegúrate de tener instalada la CLI de Supabase
supabase functions new generate-image
```

Esto creará una carpeta llamada `supabase/functions/generate-image/index.ts`. 

## Paso 2: Copia el código
Reemplaza el archivo `index.ts` recién creado con el código que hemos guardado para ti en el archivo de este proyecto:
📂 `/supabase/functions/generate-image/index.ts`

## Paso 3: Configura tu API Key de OpenAI en los Secretos de Supabase
Para que la función pueda consultar tu clave de ChatGPT de forma 100% encriptada y segura, debes registrarla como un secreto en tu proyecto ejecutando:

```bash
supabase secrets set OPENAI_API_KEY=tu_clave_sk_aqui...
```

*Alternativa desde el Dashboard Web:*
1. Ve al panel de tu proyecto en [supabase.com](https://supabase.com).
2. Haz clic en **Settings** (Configuración) > **API** o **Edge Functions**.
3. En la sección **Secrets** (Secretos), añade una nueva variable:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** *Tu API Key de OpenAI (sk-proj-...)*

## Paso 4: Desplegar la función en Supabase Cloud
Envía la función a la nube para que esté disponible de forma pública para tu app:

```bash
supabase functions deploy generate-image --no-verify-jwt
```

*(El indicador `--no-verify-jwt` es ideal si vas a llamar a la función de manera libre utilizando tu clave pública `anonKey` estándar de Supabase).*

---

## ¿Cómo la consume la aplicación?
¡Ya está todo listo! En la sección **Studio Creativo** de tu panel de administración, ahora puedes elegir entre 3 opciones de motor de IA:
1. **Gemini**: Motor gratuito (limitado por cuotas de uso de Google).
2. **ChatGPT DALL-E 3 (Backend)**: Usando el servidor local de la app.
3. **Supabase Edge Function (Recomendado)**: Ejecuta tu Edge Function recién creada de forma directa y ultra segura.

*La app detecta automáticamente la URL de tu proyecto de Supabase (`https://<tu-id>.supabase.co`) y llama directamente a la función `/functions/v1/generate-image` de forma transparente.*
