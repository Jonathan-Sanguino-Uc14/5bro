# 5Bro — Panel de métricas

Dashboard web de métricas de ventas para la app móvil **5Bro** (Expo + Supabase).

Mismo email y contraseña que la app móvil.

## Requisitos

- Node.js 18+
- Variables de entorno configuradas en `.env.local`

## Variables de entorno

Crear un archivo `.env.local` en la raíz del proyecto (ver `.env.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

Estos valores son los mismos que `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` en `mi-app/.env.local`.

## Correr en desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

### Ver desde el celular (misma red Wi-Fi)

```bash
npm run dev -- -H 0.0.0.0
```

Luego abrí `http://<IP-de-tu-PC>:3000` desde el celular. Para ver tu IP en Windows: `ipconfig` y buscá "IPv4" bajo tu adaptador Wi-Fi.

## Build de producción

```bash
npm run build
npm start
```

## Deploy en Vercel

1. Crear proyecto en [vercel.com](https://vercel.com) e importar esta carpeta.
2. En **Settings → Environment Variables**, agregar:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Hacer deploy.
4. En el panel de Supabase → **Authentication → URL Configuration → Redirect URLs**, agregar la URL de Vercel: `https://tu-proyecto.vercel.app/**`

## Páginas

| Ruta | Descripción |
|------|-------------|
| `/` | Redirige a `/dashboard` |
| `/login` | Inicio de sesión |
| `/dashboard` | Resumen general con KPIs y gráficas |
| `/dashboard/productos` | Top productos por ingresos y unidades, márgenes |
| `/dashboard/inventario` | Stock de insumos, valor de inventario, compras |
| `/dashboard/operaciones` | Tabla paginada de todas las operaciones con exportación CSV |

## Stack técnico

- **Next.js** (App Router, TypeScript)
- **Tailwind CSS** + **shadcn/ui**
- **Apache ECharts** (renderizado cliente, `ssr: false`)
- **Motion** (animaciones de entrada, respeta `prefers-reduced-motion`)
- **Supabase** (`@supabase/supabase-js` + `@supabase/ssr`, sesiones por cookies)
