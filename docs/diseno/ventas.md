# Spec: Módulo VENTAS

> Fecha: 2026-10-26  
> Framework: React Native + Expo Go (sin dev build)  
> Animaciones: react-native-reanimated 4.5.1  
> Fuente: MONO (Courier New iOS / monospace Android)  
> Paleta: constantes B de `@/constants/boarding`

---

## Convenciones generales del módulo

### Formato de moneda
- Almacenamiento: enteros en centavos (`number`)
- Display: `$X.XXX,XX` — separador de miles punto, decimal coma (formato español)
- Función helper recomendada:
  ```ts
  function formatCentavos(c: number): string {
    const base = (c / 100).toFixed(2).replace('.', ',');
    return '$' + base.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  ```
- Nunca mostrar decimales de más de 2 dígitos

### Tab bar
- El tab ◉ VENTAS es el 5.º tab, se inserta antes de AJUSTES
- El símbolo `◉` usa `fontSize: 18`, `lineHeight: 22`, igual que los otros tabs laterales
- Etiqueta: `"VENTAS"` en MONO 6.5pt, `letterSpacing: 0.6`
- Color activo: `B.amber` — igual que el resto del tab bar

### Ruta raíz del módulo
`src/app/(app)/ventas/` — grupo de rutas anidadas bajo el tab VENTAS

---

## Pantalla 1 — Nueva Venta (`ventas/index.tsx`)

### Propósito
Pantalla primaria del módulo. El usuario selecciona productos de una lista, ajusta cantidades y registra la venta. Es la pantalla de más uso diario.

### Estructura (jerarquía de layout)

```
SafeAreaView (bg: B.screenBg, flex: 1)
├── Header fijo (bg: B.screenBg, borderBottom: B.border 1pt)
│   ├── Título "NUEVA VENTA" — MONO 8pt, B.muted, letterSpacing: 2
│   └── Subtítulo "X producto(s) seleccionado(s)" — MONO 10pt, B.ink
│
├── FlatList (flex: 1, bg: B.screenBg)
│   └── ProductRow (por cada producto activo)
│       ├── [izquierda] Nombre — system 14pt, peso 500, B.ink
│       ├── [izquierda-sub] Precio unitario — MONO 11pt, B.muted
│       ├── [derecha] QuantityControl
│       │   ├── Botón "−" (44×44pt mínimo)
│       │   ├── Cantidad — MONO 13pt, peso 600, B.ink, ancho fijo 32pt
│       │   └── Botón "+" (44×44pt mínimo)
│       └── [derecha-sub] Subtotal fila — MONO 11pt, B.amber (si qty > 0)
│
├── EstadoVacío (si no hay productos activos)
│   ├── Símbolo "◌" — 36pt, B.muted
│   └── Texto "Sin productos activos.\nIr a PRODUCTOS para agregar." — MONO 11pt, B.muted, centrado
│
└── Panel inferior fijo (bg: B.ivory, borderTop: B.borderStrong 1pt)
    ├── Fila total
    │   ├── Label "TOTAL" — MONO 8pt, B.muted, letterSpacing: 2
    │   └── Monto — MONO 22pt, peso 700, B.ink
    ├── Selector método de pago (3 opciones: EFECTIVO / TRANSFERENCIA / CUENTA)
    │   └── Pills horizontales — MONO 8pt, peso 600, letterSpacing: 1.2
    └── Botón "REGISTRAR VENTA"
        ├── Estado normal: bg B.amber, texto B.ink, MONO 11pt, peso 700, letterSpacing: 1.5
        ├── Estado deshabilitado (total = 0): bg B.border, texto B.muted
        └── Estado cargando: ActivityIndicator pequeño reemplaza texto
```

### Tipografía

| Elemento              | Tamaño | Peso | Familia | Espaciado |
|-----------------------|--------|------|---------|-----------|
| Header título         | 8pt    | 400  | MONO    | 2         |
| Header subtítulo      | 10pt   | 500  | system  | –0.1      |
| Nombre producto       | 14pt   | 500  | system  | –0.1      |
| Precio unitario       | 11pt   | 400  | MONO    | 0.2       |
| Cantidad control      | 13pt   | 600  | MONO    | 0.2       |
| Botones ± label       | 18pt   | 400  | system  | 0         |
| Subtotal fila         | 11pt   | 600  | MONO    | 0.2       |
| Label "TOTAL"         | 8pt    | 400  | MONO    | 2         |
| Monto total           | 22pt   | 700  | MONO    | –0.5      |
| Pills pago            | 8pt    | 600  | MONO    | 1.2       |
| Botón registrar       | 11pt   | 700  | MONO    | 1.5       |
| Estado vacío texto    | 11pt   | 400  | MONO    | 0.3       |

### Colores y superficie

| Elemento                  | Color                       |
|---------------------------|-----------------------------|
| Fondo pantalla            | `B.screenBg`                |
| Fondo panel inferior      | `B.ivory`                   |
| Borde panel inferior      | `B.borderStrong`            |
| Nombre producto           | `B.ink`                     |
| Precio unitario           | `B.muted`                   |
| Subtotal (qty > 0)        | `B.amber`                   |
| Subtotal (qty = 0)        | transparente / oculto       |
| Botones ± bg              | `B.border`                  |
| Botones ± texto           | `B.ink`                     |
| Fila producto seleccionado (qty > 0) bg | `rgba(245,166,35,0.06)` |
| Label TOTAL               | `B.muted`                   |
| Monto total               | `B.ink`                     |
| Pill pago activa bg       | `B.ink`                     |
| Pill pago activa texto    | `B.ivory`                   |
| Pill pago inactiva border | `B.border`                  |
| Pill pago inactiva texto  | `B.muted`                   |
| Botón registrar activo    | `B.amber`                   |
| Botón registrar texto     | `B.ink`                     |
| Botón deshabilitado bg    | `B.border`                  |
| Botón deshabilitado texto | `B.muted`                   |

> **Modo oscuro:** el módulo hereda los tokens de `useTheme().colors`. No hardcodear `B.ivory` ni `B.screenBg` directamente donde ya exista el token equivalente en `colors`.

### Espaciado

| Zona                                | Valor   |
|-------------------------------------|---------|
| Header padding horizontal           | 20pt    |
| Header padding vertical             | 16pt    |
| ProductRow padding horizontal       | 20pt    |
| ProductRow padding vertical         | 14pt    |
| ProductRow separador (borderBottom) | 1pt `B.border` |
| Control ± padding interno           | 8pt     |
| Panel inferior padding horizontal   | 20pt    |
| Panel inferior padding top          | 16pt    |
| Panel inferior padding bottom       | `insets.bottom + 16pt` |
| Gap label/monto total               | 4pt     |
| Gap monto/pills pago                | 16pt    |
| Gap entre pills pago                | 8pt     |
| Gap pills/botón registrar           | 16pt    |
| Botón registrar height              | 52pt    |
| Botón registrar border radius       | 8pt     |
| Pill pago padding horizontal        | 16pt    |
| Pill pago height                    | 44pt    |

### Estados

**Carga inicial de productos:**
- Skeleton: 5 filas de `ProductRow` con bloque de nombre (140×14pt) y control (96×32pt), opacidad pulsante 0.3→0.6, ciclo 1200ms con `withRepeat(withSequence(withTiming, withTiming), -1)`

**Lista vacía (sin productos activos):**
- Símbolo `◌` 36pt, B.muted, centrado verticalmente en el área del FlatList
- Texto de 2 líneas descrito en estructura
- El panel inferior permanece visible pero el botón se deshabilita

**Error de carga:**
- Banner inline en lugar de lista: `⚠ No se pudieron cargar los productos. Deslizá para reintentar.` — MONO 11pt, B.error, fondo `rgba(192,57,43,0.08)`, padding 16pt, bordes 8pt

**Con productos, total = 0:**
- Lista visible y scrolleable
- Panel inferior: monto muestra `$0,00` en B.muted
- Botón deshabilitado

**Con productos, total > 0:**
- Panel inferior: monto en B.ink peso 700
- Botón activo, B.amber

**Registrando (loading):**
- Botón: spinner pequeño (ActivityIndicator size 16, color B.ink) centrado, sin texto
- Interacción bloqueada: FlatList no-scroll mientras procesa

**Éxito:**
- Feedback de éxito animado (ver sección Animaciones)
- Después de 1400ms: resetear todas las cantidades a 0 y volver al estado inicial

**Error al registrar:**
- Banner en la parte superior de la pantalla (por encima del header) — aparece con slide-down 240ms
- Texto: `⚠ Error al registrar. Intentá de nuevo.` — MONO 10pt, B.ivory, fondo B.error
- Desaparece automáticamente después de 3000ms con fade-out 280ms

### Accesibilidad

- Cada `ProductRow`: `accessibilityRole="none"` en el contenedor; los botones ± tienen `accessibilityRole="button"` con `accessibilityLabel="Reducir cantidad de [nombre]"` / `"Aumentar cantidad de [nombre]"`
- Botón registrar: `accessibilityRole="button"`, `accessibilityLabel="Registrar venta por [monto total]"`, `accessibilityState={{ disabled: total === 0 }}`
- Pills de pago: `accessibilityRole="radio"`, `accessibilityLabel="Método [nombre]"`, `accessibilityState={{ checked: activo }}`
- Touch targets mínimos: 44×44pt en todos los botones

### Animaciones

| Elemento                        | Qué anima          | Curva                         | Duración |
|---------------------------------|--------------------|-------------------------------|----------|
| ProductRow entrada (FlatList)   | opacity 0→1, translateX –12→0 | `withTiming`, easing `Easing.out(Easing.cubic)` | 240ms, delay 30ms×índice (máx 120ms) |
| Cantidad cambia                 | scale 1→1.15→1     | `withSequence(withSpring, withSpring)` damping 12 | ~180ms total |
| Subtotal fila aparece (qty 0→1) | opacity 0→1        | `withTiming`, `Easing.out(Easing.cubic)` | 200ms |
| Fila highlight (qty cambia)     | backgroundColor pulse amber 6% | `withSequence(withTiming 120ms, withTiming 200ms)` | 320ms |
| Monto total cambia              | scale 1→1.06→1     | `withSpring`, damping 14      | ~200ms |
| Botón habilitar/deshabilitar    | opacity 0.45→1     | `withTiming`                  | 180ms |
| Animación de éxito              | checkmark scale 0→1 con bounce | `withSpring`, damping 10, stiffness 120 | ~280ms |
| Panel éxito overlay             | opacity 0→0.95     | `withTiming`                  | 200ms |
| Panel éxito dismissal           | opacity 0.95→0     | `withTiming`                  | 280ms |

**Animación de éxito (detalle):**  
Overlay semitransparente `rgba(26,26,26,0.72)` cubre la pantalla completa. Centrado: círculo `B.amber` de 72pt radio, símbolo `✓` en B.ink 36pt. El círculo entra con `withSpring(1, { damping: 10, stiffness: 120 })` desde scale 0. Permanece 900ms visibles. Luego fade-out `withTiming(0, { duration: 280ms })`. El reset de cantidades ocurre durante el fade-out.

---

## Pantalla 2 — Ventas por Día (`ventas/historial.tsx`)

### Propósito
Revisión del historial de ventas organizadas por fecha. Permite navegar entre días, ver detalle de cada venta y eliminar registros.

### Estructura

```
SafeAreaView (bg: B.screenBg, flex: 1)
├── Header de navegación de fecha (bg: B.screenBg, borderBottom: B.border 1pt)
│   ├── Botón "‹" (anterior) — 44×44pt, B.ink 20pt
│   ├── Fecha central — MONO 13pt, peso 600, B.ink, letterSpacing: 0.8
│   │   └── Subtexto "HOY" / "AYER" (si aplica) — MONO 8pt, B.amber, letterSpacing: 1.5
│   └── Botón "›" (siguiente) — 44×44pt, B.ink 20pt (deshabilitado si es hoy)
│
├── Resumen del día (bg: B.ivory, padding 16pt H, 14pt V, borderBottom: B.border)
│   ├── Fila: "VENTAS" — MONO 8pt, B.muted, letterSpacing: 2
│   ├── Monto total día — MONO 20pt, peso 700, B.ink
│   └── Fila: "X venta(s)" — MONO 9pt, B.muted
│
├── FlatList (flex: 1)
│   └── VentaRow (expandible)
│       ├── [Estado colapsado]
│       │   ├── Hora — MONO 11pt, B.muted
│       │   ├── Total venta — MONO 14pt, peso 600, B.ink
│       │   ├── N ítems — MONO 9pt, B.muted
│       │   └── Método pago badge — MONO 8pt, peso 600
│       └── [Estado expandido]
│           └── Lista de productos con cantidad y subtotal (animado)
│
└── EstadoVacío (si no hay ventas en la fecha)
    ├── Símbolo "◌" — 36pt, B.muted
    └── Texto "Sin ventas registradas\npara este día." — MONO 11pt, B.muted, centrado
```

### Tipografía

| Elemento                    | Tamaño | Peso | Familia | Espaciado |
|-----------------------------|--------|------|---------|-----------|
| Navegación fecha (texto)    | 13pt   | 600  | MONO    | 0.8       |
| Subtexto HOY/AYER           | 8pt    | 400  | MONO    | 1.5       |
| Label "VENTAS" resumen      | 8pt    | 400  | MONO    | 2         |
| Monto total día             | 20pt   | 700  | MONO    | –0.5      |
| Contador ventas             | 9pt    | 400  | MONO    | 0.3       |
| Hora venta                  | 11pt   | 400  | MONO    | 0.3       |
| Total venta                 | 14pt   | 600  | MONO    | 0.2       |
| N ítems                     | 9pt    | 400  | MONO    | 0.3       |
| Badge método pago           | 8pt    | 600  | MONO    | 1.2       |
| Detalle ítem (nombre)       | 12pt   | 400  | system  | –0.1      |
| Detalle ítem (subtotal)     | 12pt   | 500  | MONO    | 0.2       |

### Colores y superficie

| Elemento                   | Color                          |
|----------------------------|--------------------------------|
| Fondo pantalla             | `B.screenBg`                   |
| Fondo resumen día          | `B.ivory`                      |
| Monto total día            | `B.ink`                        |
| Botones navegación activos | `B.ink`                        |
| Botón navegación deshabilitado | `B.border`                  |
| Subtexto HOY/AYER          | `B.amber`                      |
| Badge EFECTIVO             | bg `rgba(245,166,35,0.15)`, texto `B.amber` |
| Badge TRANSFERENCIA        | bg `rgba(26,26,26,0.08)`, texto `B.muted` |
| Badge CUENTA               | bg `rgba(26,26,26,0.08)`, texto `B.muted` |
| VentaRow bg normal         | `B.ivory`                      |
| VentaRow bg expandido      | `B.screenBg`                   |
| VentaRow bg longpress (eliminar) | `rgba(192,57,43,0.08)`   |
| Separador entre filas      | `B.border`                     |
| Detalle ítem nombre        | `B.ink`                        |
| Detalle ítem subtotal      | `B.ink`                        |

### Espaciado

| Zona                                    | Valor   |
|-----------------------------------------|---------|
| Header navegación padding horizontal    | 8pt     |
| Header navegación height                | 56pt    |
| Resumen día padding horizontal          | 20pt    |
| Resumen día padding vertical            | 16pt    |
| VentaRow padding horizontal             | 20pt    |
| VentaRow padding vertical (colapsado)   | 16pt    |
| VentaRow padding vertical (expandido)   | 16pt top + 12pt bottom |
| Detalle ítem padding vertical           | 8pt     |
| Detalle ítem padding horizontal (indent)| 0pt (mismo nivel) |
| Gap detalle ítems                       | 4pt     |
| VentaRow separador                      | 1pt `B.border` |
| FlatList padding bottom (sobre tab bar) | 16pt    |

### Estados

**Cargando datos del día:**
- Resumen día: skeleton bloque 100×14pt + 80×20pt, opacidad pulsante
- Lista: 4 filas skeleton de 100% ancho × 56pt, pulsante

**Sin ventas (vacío):**
- `◌` y texto centrado (sin botón adicional)

**Con ventas:**
- Lista scrolleable, cada fila tappable

**Long press en VentaRow:**
- Confirmación: Alert nativo `"¿Eliminar esta venta? Esta acción no se puede deshacer."` con opciones `Cancelar` (neutral) y `Eliminar` (destructivo)
- Si confirma: la fila sale con fade-out + translateX +60pt en 240ms, después se remueve del estado

**Error de carga:**
- Banner: `⚠ Error al cargar el historial.` — igual que en Nueva Venta

### Accesibilidad

- Botones `‹` `›`: `accessibilityRole="button"`, `accessibilityLabel="Día anterior"` / `"Día siguiente"`, `accessibilityState={{ disabled: esMásTarde }}`
- `VentaRow`: `accessibilityRole="button"`, `accessibilityLabel="Venta a las [hora], [monto], [n] productos, método [método]"`, `accessibilityHint="Toca para ver detalle, mantén para eliminar"`
- Fila de detalle ítems: `accessibilityRole="text"`, `accessibilityLabel="[nombre], [cantidad] unidades, [subtotal]"`
- Resumen del día: `accessibilityRole="summary"`, `accessibilityLabel="Total del día: [monto], [n] ventas"`

### Animaciones

| Elemento                         | Qué anima                     | Curva                             | Duración |
|----------------------------------|-------------------------------|-----------------------------------|----------|
| Cambio de fecha (swipe/botón)    | Contenido fade opacity 1→0→1  | `withTiming`, `Easing.out(Easing.cubic)` | 200ms salida + 200ms entrada |
| Expansión VentaRow               | height 0→auto (maxHeight), opacity 0→1 | `withTiming`, `Easing.out(Easing.cubic)` | 260ms |
| Colapso VentaRow                 | height auto→0, opacity 1→0    | `withTiming`, `Easing.in(Easing.cubic)` | 220ms |
| Ícono expand/collapse (chevron)  | rotate 0→180                  | `withTiming`, `Easing.out(Easing.cubic)` | 220ms |
| Eliminación de fila              | opacity 1→0, translateX 0→60  | `withTiming`, `Easing.in(Easing.cubic)` | 240ms |
| Entrada de VentaRow (FlatList)   | opacity 0→1, translateX –8→0  | `withTiming`, `Easing.out(Easing.cubic)` | 200ms, delay 20ms×índice |

---

## Pantalla 3 — Métricas (`ventas/metricas.tsx`)

### Propósito
Visualización de rendimiento de ventas. Selectores de período HOY / SEMANA / MES. Gráfico de barras personalizado con Views puras de React Native (sin librerías de charting externas).

### Estructura

```
SafeAreaView (bg: B.screenBg, flex: 1)
├── Header fijo
│   └── Título "MÉTRICAS" — MONO 8pt, B.muted, letterSpacing: 2, centrado
│
└── ScrollView (flex: 1)
    ├── Selector período (HOY / SEMANA / MES)
    │   └── 3 pills full-width distribuidos en fila
    │
    ├── Tarjetas de estadísticas (2 columnas, 2 filas = 4 tarjetas)
    │   ├── [0,0] Total — monto grande, B.amber accent
    │   ├── [0,1] Ventas — número de transacciones
    │   ├── [1,0] Ticket promedio — monto con flecha comparativa
    │   └── [1,1] Producto top — nombre + cantidad
    │
    ├── Sección comparación período anterior
    │   ├── Label "VS PERÍODO ANTERIOR" — MONO 8pt, B.muted, letterSpacing: 2
    │   └── Fila: porcentaje de cambio + tendencia (↑/↓/=) + descripción
    │
    ├── Gráfico de barras (pure RN Views)
    │   ├── Título "VENTAS POR DÍA/HORA" — MONO 8pt, B.muted, letterSpacing: 2
    │   ├── [Eje Y]: 3 referencias de valor — MONO 8pt, B.muted
    │   └── [Barras]: filas de View de altura proporcional + etiqueta eje X
    │
    └── Sección hora pico
        ├── Label "HORA PICO" — MONO 8pt, B.muted, letterSpacing: 2
        └── Hora + monto vendido en ese bloque
```

### Tipografía

| Elemento                    | Tamaño | Peso | Familia | Espaciado |
|-----------------------------|--------|------|---------|-----------|
| Header título               | 8pt    | 400  | MONO    | 2         |
| Pills selector período      | 9pt    | 600  | MONO    | 1.5       |
| Label tarjeta               | 7pt    | 400  | MONO    | 1.5       |
| Valor principal tarjeta     | 20pt   | 700  | MONO    | –0.5      |
| Valor secundario tarjeta    | 12pt   | 500  | MONO    | 0.2       |
| Label comparación           | 8pt    | 400  | MONO    | 2         |
| Porcentaje cambio           | 16pt   | 700  | MONO    | 0.3       |
| Texto comparación           | 10pt   | 400  | MONO    | 0.2       |
| Título gráfico              | 8pt    | 400  | MONO    | 2         |
| Eje Y gráfico               | 8pt    | 400  | MONO    | 0.2       |
| Etiqueta eje X gráfico      | 8pt    | 400  | MONO    | 0.2       |
| Label hora pico             | 8pt    | 400  | MONO    | 2         |
| Valor hora pico             | 14pt   | 600  | MONO    | 0.3       |
| Monto hora pico             | 12pt   | 400  | MONO    | 0.2       |

### Colores y superficie

| Elemento                           | Color                                    |
|------------------------------------|------------------------------------------|
| Fondo pantalla                     | `B.screenBg`                             |
| Tarjeta stats bg                   | `B.ivory`                                |
| Tarjeta stats borde                | `B.border`                               |
| Valor total (tarjeta principal)    | `B.amber`                                |
| Otros valores tarjeta              | `B.ink`                                  |
| Labels tarjeta                     | `B.muted`                                |
| Pill selector activa bg            | `B.ink`                                  |
| Pill selector activa texto         | `B.ivory`                                |
| Pill selector inactiva border      | `B.border`                               |
| Pill selector inactiva texto       | `B.muted`                                |
| Comparación positiva (↑)           | `'#2ECC71'` (verde, constante explícita) |
| Comparación negativa (↓)           | `B.error`                                |
| Comparación neutral (=)            | `B.muted`                                |
| Barra gráfico activa (período sel) | `B.amber`                                |
| Barra gráfico fondo (vacía)        | `B.border`                               |
| Barra gráfico hover/día-top        | `rgba(245,166,35,0.75)`                  |
| Eje Y / X gráfico texto            | `B.muted`                                |
| Sección hora pico bg               | `B.ivory`                                |
| Sección hora pico borde            | `B.border`                               |

### Especificación del gráfico de barras (puro RN Views)

```
Contenedor: width 100%, height: 160pt, flexDirection: 'row', alignItems: 'flex-end'
  └── Por cada barra:
      ├── View barra: 
      │   ├── width: (totalWidth - gaps) / nBarras
      │   ├── height: (valor / valorMax) * 136pt  → altura proporcional
      │   ├── borderRadius: 4pt (solo top-left, top-right)
      │   ├── bg: B.amber (o B.border si valor = 0)
      │   └── Animated.View con scaleY 0→1 desde bottom (transformOrigin bottom)
      └── Etiqueta X: MONO 8pt, B.muted, centrado bajo barra
```

- Para barras de 0pt de altura mostrar mínimo 2pt de altura visual (para que se vea la línea base)
- `nBarras` = 7 (semana), 24 (horas del día para HOY), 4 semanas (MES)
- Para MES con 4 semanas, las etiquetas son "S1", "S2", "S3", "S4"
- Para SEMANA las etiquetas son "L", "M", "X", "J", "V", "S", "D"
- Para HOY las etiquetas muestran cada 4 horas: "0", "4", "8", "12", "16", "20"

### Espaciado

| Zona                              | Valor   |
|-----------------------------------|---------|
| ScrollView padding horizontal     | 20pt    |
| ScrollView padding top            | 16pt    |
| ScrollView padding bottom         | `insets.bottom + 20pt` |
| Gap entre secciones               | 24pt    |
| Pills selector gap                | 8pt     |
| Pills selector height             | 44pt    |
| Grid tarjetas gap                 | 12pt    |
| Tarjeta padding                   | 16pt    |
| Tarjeta border radius             | 8pt     |
| Gráfico padding top               | 8pt     |
| Gráfico gap barras                | 6pt     |
| Sección hora pico padding         | 16pt    |
| Sección hora pico border radius   | 8pt     |

### Estados

**Cargando:**
- Skeleton: cuatro bloques 50% de ancho × 64pt, opacidad pulsante
- Gráfico: barras estáticas en B.border de alturas aleatorias

**Sin datos en el período:**
- Tarjetas muestran `$0,00` / `0 ventas` / `—`
- Gráfico vacío: todas las barras en B.border al 10% de altura
- Mensaje: `"Sin ventas en este período."` — MONO 10pt, B.muted, centrado bajo el gráfico

**Con datos:**
- Animación de barras al cambiar de período (ver Animaciones)

### Accesibilidad

- Selector período: `accessibilityRole="tablist"` en contenedor, cada pill `accessibilityRole="tab"`, `accessibilityState={{ selected: activo }}`
- Cada tarjeta stats: `accessibilityRole="text"`, `accessibilityLabel="[label]: [valor]"`
- Gráfico: `accessibilityRole="image"`, `accessibilityLabel="Gráfico de [tipo de período]. [Descripción del dato más alto y más bajo]"` — no navegar barra por barra (demasiado verboso)
- Hora pico: `accessibilityRole="text"`, `accessibilityLabel="Hora pico: [hora], [monto vendido]"`

### Animaciones

| Elemento                         | Qué anima                     | Curva                             | Duración |
|----------------------------------|-------------------------------|-----------------------------------|----------|
| Cambio de período (pills)        | Contenido fade opacity 1→0→1  | `withTiming`, `Easing.out(Easing.cubic)` | 180ms + 180ms |
| Barras gráfico (entrada/cambio)  | scaleY 0→1 (desde bottom)     | `withTiming`, `Easing.out(Easing.cubic)` | 260ms, delay 20ms×índice (máx 140ms) |
| Pill selector animación active   | bg color cross-fade           | `withTiming`                      | 180ms |
| Valores tarjeta (cambio)         | opacity 1→0.3→1               | `withSequence`                    | 280ms total |
| Porcentaje comparación           | Número animado (interpolate)  | `withTiming`, `Easing.out(Easing.cubic)` | 600ms |

---

## Pantalla 4 — Exportar CSV (`ventas/exportar.tsx`)

### Propósito
Pantalla de exportación simple. Genera y comparte un archivo CSV con las ventas del período seleccionado.

### Estructura

```
SafeAreaView (bg: B.screenBg, flex: 1)
├── Header fijo
│   └── Título "EXPORTAR" — MONO 8pt, B.muted, letterSpacing: 2, centrado
│
└── ScrollView (flex: 1)
    ├── Selector de período (SEMANA / MES / TODO)
    │   └── 3 pills — mismo diseño que métricas
    │
    ├── Tarjeta de info del archivo
    │   ├── Ícono de documento "▤" — 32pt, B.muted
    │   ├── Nombre de archivo estimado — MONO 12pt, B.ink
    │   │   ejemplo: "ventas_2026-10.csv"
    │   ├── Tamaño estimado — MONO 10pt, B.muted
    │   └── Descripción columnas — MONO 9pt, B.muted, listado de campos
    │
    ├── Nota informativa (si aplica período TODO)
    │   └── "⚠ Exportar todo puede demorar varios segundos." — MONO 9pt, B.muted
    │
    └── Botón "EXPORTAR Y COMPARTIR"
        ├── Tamaño: width 100%, height: 52pt, borderRadius: 8pt
        ├── Normal: bg B.amber, texto B.ink, MONO 11pt, peso 700, letterSpacing: 1.5
        └── Cargando: spinner ActivityIndicator + "Generando…"
```

### Tipografía

| Elemento                    | Tamaño | Peso | Familia | Espaciado |
|-----------------------------|--------|------|---------|-----------|
| Header título               | 8pt    | 400  | MONO    | 2         |
| Pills período               | 9pt    | 600  | MONO    | 1.5       |
| Ícono documento             | 32pt   | —    | system  | —         |
| Nombre archivo              | 12pt   | 500  | MONO    | 0.2       |
| Tamaño archivo              | 10pt   | 400  | MONO    | 0.2       |
| Columnas descripción        | 9pt    | 400  | MONO    | 0.2       |
| Nota advertencia            | 9pt    | 400  | MONO    | 0.2       |
| Botón exportar              | 11pt   | 700  | MONO    | 1.5       |

### Colores y superficie

| Elemento                    | Color                   |
|-----------------------------|-------------------------|
| Fondo pantalla              | `B.screenBg`            |
| Tarjeta info bg             | `B.ivory`               |
| Tarjeta info borde          | `B.border`              |
| Nombre archivo              | `B.ink`                 |
| Tamaño / descripción        | `B.muted`               |
| Ícono documento             | `B.muted`               |
| Nota advertencia            | `B.muted`               |
| Botón exportar activo       | `B.amber`               |
| Botón exportar texto        | `B.ink`                 |
| Botón cargando bg           | `rgba(245,166,35,0.6)`  |

### Espaciado

| Zona                         | Valor   |
|------------------------------|---------|
| Padding horizontal general   | 20pt    |
| Padding top scroll           | 24pt    |
| Padding bottom scroll        | `insets.bottom + 20pt` |
| Gap entre secciones          | 24pt    |
| Pills gap                    | 8pt     |
| Pills height                 | 44pt    |
| Tarjeta padding              | 20pt    |
| Tarjeta border radius        | 8pt     |
| Gap ícono/nombre             | 12pt    |
| Gap nombre/tamaño            | 4pt     |
| Gap tamaño/descripción       | 8pt     |
| Nota padding                 | 16pt    |
| Nota border radius           | 6pt     |
| Botón margin top             | 8pt     |

### Estados

**Inactivo (antes de exportar):**
- Toda la UI visible, botón habilitado

**Generando:**
- Botón: spinner + "GENERANDO…" en B.ink, bg `rgba(245,166,35,0.6)`
- Interacción bloqueada

**Éxito:**
- `Share.share()` de React Native abre el diálogo nativo del OS
- No overlay propio: el OS gestiona el feedback

**Error:**
- Banner slide-down: `"⚠ No se pudo generar el archivo."` — MONO 10pt, B.ivory, bg B.error
- Duración 3000ms, fade-out 280ms

### Accesibilidad

- Pills período: mismo patrón `accessibilityRole="tab"` que métricas
- Tarjeta info: `accessibilityRole="text"`, `accessibilityLabel="Archivo [nombre], tamaño estimado [n] KB, incluye columnas: [lista]"`
- Botón exportar: `accessibilityRole="button"`, `accessibilityLabel="Exportar y compartir ventas del período [período seleccionado]"`, `accessibilityState={{ disabled: false }}`

### Animaciones

| Elemento               | Qué anima            | Curva         | Duración |
|------------------------|----------------------|---------------|----------|
| Cambio de período      | Nombre archivo fade  | `withTiming`  | 200ms    |
| Botón press feedback   | scale 1→0.97→1       | `withSpring`, damping 18 | ~160ms |

---

## Pantalla 5 — Gestión de Productos (`ventas/productos.tsx`)

### Propósito
CRUD completo de productos. Permite agregar, editar, activar/desactivar y eliminar productos desde una sola pantalla. El formulario aparece inline (sin modal ni navegación separada).

### Estructura

```
SafeAreaView (bg: B.screenBg, flex: 1)
├── Header fijo
│   ├── Título "PRODUCTOS" — MONO 8pt, B.muted, letterSpacing: 2
│   └── Botón "+ AGREGAR" — MONO 8pt, B.amber, letterSpacing: 1.5, 44pt alto mínimo
│
└── KeyboardAvoidingView (flex: 1)
    └── FlatList
        ├── Formulario inline (visible cuando se agrega/edita)
        │   ├── Input "Nombre del producto" — MONO 13pt, B.ink
        │   ├── Input "Precio (centavos)" — MONO 13pt, B.ink, teclado numérico
        │   ├── Precio formateado en tiempo real — MONO 11pt, B.muted
        │   └── Fila de botones
        │       ├── "CANCELAR" — MONO 9pt, B.muted, 44pt alto
        │       └── "GUARDAR" — MONO 9pt, bg B.amber, B.ink, 44pt alto, borderRadius 6pt
        │
        └── ProductoAdminRow (por cada producto)
            ├── Toggle activo/inactivo (lado izquierdo)
            │   └── Switch nativo o View circular animado
            ├── Nombre — MONO 13pt, peso 500
            │   └── Si inactivo: opacity 0.45
            ├── Precio — MONO 11pt
            │   └── Si inactivo: opacity 0.45
            └── Acciones (lado derecho)
                ├── Botón "✎" editar — 44×44pt
                └── Botón "✕" eliminar — 44×44pt, B.error
```

### Tipografía

| Elemento                 | Tamaño | Peso | Familia | Espaciado |
|--------------------------|--------|------|---------|-----------|
| Header título            | 8pt    | 400  | MONO    | 2         |
| Botón agregar            | 8pt    | 600  | MONO    | 1.5       |
| Input texto (form)       | 13pt   | 400  | MONO    | 0.2       |
| Precio formateado live   | 11pt   | 400  | MONO    | 0.2       |
| Botón cancelar           | 9pt    | 500  | MONO    | 1.2       |
| Botón guardar            | 9pt    | 700  | MONO    | 1.2       |
| Nombre producto activo   | 13pt   | 500  | MONO    | 0.2       |
| Nombre producto inactivo | 13pt   | 500  | MONO    | 0.2       |
| Precio producto          | 11pt   | 400  | MONO    | 0.2       |
| Botones acción (✎ ✕)    | 16pt   | 400  | system  | —         |

### Colores y superficie

| Elemento                     | Color                          |
|------------------------------|--------------------------------|
| Fondo pantalla               | `B.screenBg`                   |
| ProductoAdminRow bg          | `B.ivory`                      |
| ProductoAdminRow inactivo bg | `rgba(138,134,128,0.08)`       |
| Nombre producto activo       | `B.ink`                        |
| Nombre producto inactivo     | `B.muted` (opacity 0.45 extra) |
| Precio activo                | `B.muted`                      |
| Precio inactivo              | `B.muted` (opacity 0.45 extra) |
| Toggle activo                | `B.amber`                      |
| Toggle inactivo              | `B.border`                     |
| Botón editar                 | `B.muted`                      |
| Botón eliminar               | `B.error`                      |
| Formulario bg                | `B.ivory`                      |
| Formulario borde             | `B.borderStrong`               |
| Input borde                  | `B.border`                     |
| Input borde focus            | `B.ink`                        |
| Separador filas              | `B.border`                     |
| Botón guardar bg             | `B.amber`                      |
| Botón guardar texto          | `B.ink`                        |
| Botón guardar deshabilitado  | `B.border`                     |

### Espaciado

| Zona                               | Valor   |
|------------------------------------|---------|
| Header padding horizontal          | 20pt    |
| Header padding vertical            | 16pt    |
| Formulario padding horizontal      | 16pt    |
| Formulario padding vertical        | 16pt    |
| Formulario margin horizontal       | 0pt (full width, parte del FlatList) |
| Formulario border radius           | 0pt (ocupa borde a borde dentro del list) |
| Gap entre inputs                   | 12pt    |
| Input height                       | 48pt    |
| Input padding horizontal           | 12pt    |
| Input border radius                | 6pt     |
| Gap botones form                   | 8pt     |
| Botón form flex                    | 1       |
| Botón form height                  | 44pt    |
| ProductoAdminRow padding H         | 20pt    |
| ProductoAdminRow padding V         | 16pt    |
| Gap nombre/precio en fila          | 4pt     |
| Gap acciones                       | 0pt (44pt cada botón, alineados derecha) |
| Separador entre filas              | 1pt     |
| FlatList padding bottom            | `insets.bottom + 20pt` |

### Validaciones del formulario

- Nombre: requerido, 1–60 caracteres, trim
- Precio: requerido, entero > 0 en centavos
- Si el input de precio recibe texto no numérico: ignorar la entrada, mostrar valor previo
- El precio en centavos se muestra formateado en tiempo real bajo el input
- Guardar deshabilitado si validación falla

### Estados

**Lista cargando:**
- Skeleton: 5 filas × 64pt, pulsante

**Lista vacía:**
- `◌` + `"Aún no hay productos.\nToca + AGREGAR para crear el primero."` — MONO 11pt, B.muted, centrado

**Formulario oculto (modo normal):**
- Solo la lista

**Formulario visible (agregar/editar):**
- El formulario se inserta como primer item del FlatList
- Si editar: los campos precargan nombre y precio
- El FlatList hace scroll hasta la parte superior al abrir el formulario

**Guardando:**
- Botón GUARDAR muestra spinner, campos bloqueados

**Error de guardado:**
- Mensaje de error inline bajo el campo con problemas: MONO 9pt, B.error
- O banner superior si el error es del servidor

**Eliminando:**
- Confirmación con Alert nativo antes de eliminar
- Fila sale con fade-out 220ms

### Accesibilidad

- Botón "+ AGREGAR": `accessibilityRole="button"`, `accessibilityLabel="Agregar nuevo producto"`
- Input nombre: `accessibilityRole="none"` (usa `accessible` y `accessibilityLabel="Nombre del producto"`)
- Input precio: `accessibilityLabel="Precio en centavos"`, `accessibilityHint="Ingresa el precio en centavos. Se mostrará formateado."`
- Precio formateado: `accessibilityRole="text"`, `accessibilityLabel="Precio formateado: [valor]"`, `importantForAccessibility="no-hide-descendants"` para que el lector no lo lea dos veces
- Toggle activo/inactivo: `accessibilityRole="switch"`, `accessibilityLabel="Producto [nombre] [activo/inactivo]"`, `accessibilityState={{ checked: activo }}`
- Botón editar: `accessibilityRole="button"`, `accessibilityLabel="Editar [nombre]"`
- Botón eliminar: `accessibilityRole="button"`, `accessibilityLabel="Eliminar [nombre]"`

### Animaciones

| Elemento                     | Qué anima                        | Curva                              | Duración |
|------------------------------|----------------------------------|------------------------------------|----------|
| Formulario aparece           | opacity 0→1, translateY –20→0    | `withTiming`, `Easing.out(Easing.cubic)` | 260ms |
| Formulario desaparece        | opacity 1→0, translateY 0→–12    | `withTiming`, `Easing.in(Easing.cubic)` | 200ms |
| Toggle activo/inactivo       | backgroundColor cross-fade, thumb translateX | `withTiming`         | 200ms |
| Opacidad fila al desactivar  | opacity 1→0.45                   | `withTiming`                       | 200ms |
| Eliminación fila             | opacity 1→0, translateX 0→48     | `withTiming`, `Easing.in(Easing.cubic)` | 220ms |
| Entrada de fila nueva        | opacity 0→1, translateY –8→0     | `withTiming`, `Easing.out(Easing.cubic)` | 240ms |
| Input focus                  | borderColor cross-fade           | `withTiming`                       | 160ms |

---

## Notas de implementación transversales

### Persistencia
- Todas las escrituras (ventas, productos) van a través de `@/lib/operations` o equivalente del módulo ventas
- No acceder a `db.ts` directamente desde los componentes; usar una capa de servicio `@/lib/ventas-operations.ts`

### Navegación entre pantallas del módulo
- `ventas/index.tsx` es la raíz del tab ◉
- El acceso a historial, métricas, exportar y productos se hace via tabs anidados dentro del grupo `ventas/` o mediante un sub-header de navegación horizontal (a definir en la implementación)
- Si se usan tabs anidados: la barra secundaria va entre el header de cada pantalla y su contenido, altura 44pt, bg `B.ivory`, borde inferior `B.border`

### Consistencia del formateo de moneda
- La función `formatCentavos` debe vivir en un archivo utilitario compartido del módulo, no inline en cada componente

### Reanimated
- Todas las animaciones usan `useAnimatedStyle` + `useSharedValue`
- Nunca usar `Animated` de React Native directamente en este módulo
- `cancelAnimation` debe llamarse en el cleanup de `useEffect` para evitar memory leaks en unmount

### Duración máxima de transiciones UI
- Ninguna transición de interfaz supera 280ms
- Las animaciones de datos (gráfico, número animado) pueden ir hasta 600ms por ser visualizaciones, no respuestas a interacción directa
