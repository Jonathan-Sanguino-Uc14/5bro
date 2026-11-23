# 5Bro Dashboard

Dashboard de gestión para 5Bro. Muestra ventas, productos, inventario y operaciones. Se despliega como sitio estático en GitHub Pages.

## Tecnologías

- **Next.js** (App Router, `output: 'export'`)
- **Supabase** (autenticación y base de datos, cliente de navegador)
- **Tailwind CSS** + **shadcn/ui**
- **ECharts** para gráficos

## Configuración local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno

Crear `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

> Nunca commitear `.env.local`. Está en `.gitignore`.

### 3. Correr en desarrollo

```bash
npm run dev
```

### 4. Build local (simula GitHub Pages)

```bash
NEXT_PUBLIC_BASE_PATH=/5bro npm run build
```

Los archivos estáticos quedan en `out/`.

## Despliegue en GitHub Pages

### Configuración de secretos en el repositorio

En **Settings → Secrets and variables → Actions**, agregar:

| Nombre | Valor |
|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key del proyecto Supabase |

### Rama de deploy

El workflow `.github/workflows/deploy-pages.yml` se dispara al hacer push a la rama `dashboard`. Genera el sitio estático con `basePath=/5bro` y lo publica en la rama `gh-pages`.

### Configurar GitHub Pages

En **Settings → Pages**:
- **Source**: Deploy from a branch
- **Branch**: `gh-pages` / `/ (root)`

El sitio queda disponible en: `https://<usuario>.github.io/5bro/`

## Estructura

```
src/
  app/
    dashboard/           # Páginas del dashboard (client components)
    login/               # Página de login
  components/            # Componentes reutilizables
  lib/
    auth/                # AuthProvider y hook useAuth
    data/                # Fetchers de Supabase (browser client)
    metrics.ts           # Funciones de agregación puras
    periods.ts           # Manejo de rangos de fechas
    supabase/client.ts   # Cliente de Supabase para el navegador
  types/                 # Tipos TypeScript
public/
  .nojekyll              # Evita que GitHub Pages procese _next/ como Jekyll
```

## Autenticación

La autenticación es completamente client-side usando `@supabase/ssr` con `createBrowserClient`. La sesión se persiste en `localStorage`. El `AuthProvider` escucha cambios de sesión con `onAuthStateChange`.

No hay server components, server actions ni middleware en este proyecto.
