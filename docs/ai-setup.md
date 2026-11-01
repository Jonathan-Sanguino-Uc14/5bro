# Conectar leticIA a OpenAI (desarrollo local)

La app envía la pregunta, hasta 10 mensajes de turnos completados y un resumen financiero actualizado al servidor. El servidor llama a la API Responses de OpenAI. No se envía el archivo SQLite ni se permite modificar operaciones. La clave de OpenAI nunca se incluye en Expo.

## Puesta en marcha

1. Ejecuta `npm run ai:setup` una sola vez. Genera `.env.server.local` y añade la URL y un token de desarrollo a `.env.local`, sin modificar las variables de Supabase.
2. En `.env.server.local`, completa `OPENAI_API_KEY=` con tu clave privada de la API. Este archivo está ignorado por Git. El modelo inicial es `gpt-4.1-mini`, configurable con `OPENAI_MODEL`.
3. Ejecuta `npm run ai:dev` en otra terminal y mantenla abierta.
4. Recarga completamente Expo para cargar las variables de `.env.local`.

## Dispositivo

- Navegador en esta computadora: `EXPO_PUBLIC_AI_URL=http://127.0.0.1:8787/chat`.
- Emulador Android: `EXPO_PUBLIC_AI_URL=http://10.0.2.2:8787/chat`.
- Teléfono físico con Expo Go: computadora y teléfono en la misma red. Cambia `AI_HOST=0.0.0.0` en `.env.server.local` y usa `EXPO_PUBLIC_AI_URL=http://IP_LOCAL_DE_LA_PC:8787/chat` en `.env.local`. Reinicia el servidor y recarga Expo. El firewall debe permitir el puerto 8787 en la red privada.
- Navegador desde otra dirección: añade su origen exacto a `AI_ALLOWED_ORIGINS` (separados por coma) en `.env.server.local`.

El token `AI_DEV_TOKEN` debe coincidir con `EXPO_PUBLIC_AI_DEV_TOKEN`. Es un token exclusivo para probar en una red privada, no un mecanismo de autenticación de usuarios para producción. No publiques este servidor ni este token en Internet. Antes de distribuir la app, se necesita un servidor HTTPS con autenticación individual y límites persistentes por usuario. El inicio de sesión local actual no autentica usuarios ante un servidor.

## Diagnóstico

- Configuración: falta URL/token o clave de OpenAI; también puede faltar acceso al modelo.
- Conexión: servidor apagado, dirección incorrecta o firewall. En teléfono, localhost es el propio teléfono.
- Facturación: la API devuelve `insufficient_quota`.
- Límite temporal: el servicio devuelve 429 o se alcanzaron 10 solicitudes/minuto en este servidor de desarrollo. No implica esperar hasta mañana.
- Tiempo agotado: servidor 35 s, cliente 45 s. El reintento es manual para no duplicar consumo automáticamente.

`npm run test:ai` verifica el contrato con respuestas simuladas, sin gastar cuota. `npm test -- --runInBand` verifica el cliente. Estas pruebas no confirman que una clave tenga acceso o saldo.

Documentación: [Responses](https://developers.openai.com/api/reference/typescript/resources/responses/methods/create), [variables públicas de Expo](https://docs.expo.dev/guides/environment-variables/).
