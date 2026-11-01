# Spec: index.tsx — Dashboard (INICIO)

## Diagnóstico actual

La pantalla funciona y tiene buena estructura. Los problemas identificados son:

- **Touch targets subóptimos:** los filter pills tienen `minHeight: 32` — demasiado pequeño para uso con el pulgar durante el trabajo activo. Mínimo 44pt iOS / 48dp Android.
- **Accesibilidad de la barra de métricas:** los tres `MetricCell` no tienen `accessibilityRole` ni `accessibilityLabel`. Un lector de pantalla no puede nombrarlos.
- **Hardcodeo de colores en el header:** el header usa `"#F5F3EF"` y `"rgba(138,134,128,0.65)"` directos en lugar de tokens del tema. Si el tema cambia, estos no se actualizan.
- **Presión en operaciones no ofrece acción:** `OperationRow` en el dashboard no es pressable — no hay forma de navegar al detalle de una operación ni de repetirla. El PRODUCT.md indica "Repetir una operación anterior en un toque."
- **`quickCta` duplica funcionalidad del botón FAB central:** el botón "+ NUEVA OPERACIÓN" dentro del scroll repite lo que hace el tab central. No aporta valor y fragmenta la atención.
- **Estado error nunca se muestra:** el `load()` silencia errores (`catch` vacío). No hay estado para fallo de carga.
- **`loading` solo muestra ActivityIndicator:** la pantalla carga en frío y muestra un spinner sin estructura. Un skeleton sería más estable visualmente.
- **Número de operaciones en scroll:** el `countRow` aparece al final del scroll — el usuario nunca lo ve en listas largas.

---

## Estructura visual propuesta

```
┌───────────────────────────────────┐
│ Header (color: header, dark)       │
│  ┌ carrier: "REGISTRO COMERCIAL"  │
│  ├ businessName (27pt, bold)       │
│  ├ userName (opcional, muted)      │
│  └ fecha HOY (top-right, MONO)    │
│                                   │
│  ┌─ Métricas (3 columnas) ────────┤
│  │  VENTAS · EGRESOS · GANANCIA   │
│  └────────────────────────────────┤
│  └ nota: "* ganancia estimada…"   │
├───────────────────────────────────┤
│ Scroll (color: bg)                 │
│  ├ Filtros pills (TODOS/VENTAS…)  │
│  │                                │
│  ├ Sección "OPERACIONES RECIENTES"│
│  │  ├ [DateSectionHeader]         │
│  │  ├ [OperationRow pressable]    │
│  │  ├ [OperationRow pressable]    │
│  │  └ …                           │
│  │                                │
│  └ Estado vacío / carga / error   │
└───────────────────────────────────┘
```

**Cambio clave de estructura:** eliminar el bloque "+ NUEVA OPERACIÓN" del scroll. El FAB del tab bar ya cumple esa función. El espacio liberado mejora la densidad de información.

---

## Tipografía

| Elemento            | Tamaño | Peso   | Familia | Espaciado letras |
|---------------------|--------|--------|---------|------------------|
| carrier label       | 8pt    | 400    | MONO    | 2                |
| businessName        | 27pt   | 700    | system  | -0.5             |
| userName            | 9pt    | 400    | MONO    | 1                |
| fecha (HOY / dd/mm) | 18pt   | 600    | MONO    | 1                |
| metricLabel         | 7pt    | 400    | MONO    | 1.2              |
| metricValue         | 14pt   | 600    | MONO    | 0.2              |
| nota estimada       | 7pt    | 400    | MONO    | 0.3              |
| sectionTitle        | 8pt    | 400    | MONO    | 2                |
| filterText          | 8pt    | 400    | MONO    | 1.2              |
| opConcept           | 14pt   | 500    | system  | -0.1             |
| opAmount            | 13pt   | 600    | MONO    | 0.2              |
| opType              | 8pt    | 600    | MONO    | 1.2              |
| emptyText           | 11pt   | 400    | MONO    | 0.3              |

---

## Colores

Todos deben venir de `useTheme().colors`:

| Elemento              | Token              |
|-----------------------|--------------------|
| Header bg             | `colors.header`    |
| Header texto principal| `colors.ink` (via LIGHT = #F5F3EF cuando header es oscuro → usar `'#F5F3EF'` como excepción consciente, documentada) |
| Header muted          | `colors.muted`     |
| Fondo scroll          | `colors.bg`        |
| Pill activa bg        | `colors.ink`       |
| Pill activa texto     | `colors.bg`        |
| Pill inactiva border  | `colors.border`    |
| Venta (acento/monto)  | `colors.amber`     |
| Gasto/compra monto    | `colors.error`     |
| Tipo COMPRA           | `'rgba(100,160,255,0.9)'` (sin token, documentado) |
| Estado vacío / muted  | `colors.muted`     |
| Error banner bg       | `colors.error` al 14% |

---

## Espaciado (múltiplos de 4pt)

| Zona                        | Valor  |
|-----------------------------|--------|
| Header padding horizontal   | 24pt   |
| Header padding top + insets | insets.top + 16pt |
| Header padding bottom       | 0pt (sin espacio desperdiciado) |
| Métrica padding vertical    | 20pt   |
| Nota estimada padding bottom| 12pt   |
| Scroll section padding H    | 20pt   |
| Scroll section padding top  | 20pt (reducido de 24, elimina el CTA) |
| Gap entre filtros            | 8pt    |
| Filtro pill padding V       | **12pt** (subida desde 6pt para cumplir 44pt) |
| Filtro pill padding H       | 14pt   |
| Op row padding V            | 14pt   |
| Op row padding H            | 20pt   |
| DateGroupHeader padding top | 20pt   |
| Empty state padding V       | 40pt   |

---

## Estados

### Carga
- Skeleton de header: dos bloques grises de 120×14 y 200×22, animados con opacidad pulsante (0.3 → 0.6, ciclo de 1200ms, `withRepeat` + `withSequence`).
- Skeleton de 3 filas de operación: cada fila es un rectángulo 100% ancho × 52pt, opacidad pulsante con delay escalonado de 100ms.

### Vacío (sin operaciones)
- Icono `◌` en `colors.muted`, 36pt.
- Texto: "Aún no hay operaciones.\nEmpezá registrando tu primera venta." — MONO 11pt, centrado, muted.
- Sin botón secundario (el FAB ya está en la tab bar).

### Error de carga
- Mostrar banner en lugar del spinner eterno.
- Icono `⚠` en `colors.error`.
- Texto: "No se pudieron cargar los datos. Deslizá para reintentar." — MONO 11pt.
- RefreshControl ya disponible como acción de reintento.

### Contenido normal
- Lista agrupada por fecha.
- Máximo 50 operaciones antes del fold de paginación.

---

## Accesibilidad

- Cada `MetricCell` agrega:
  ```
  accessibilityRole="text"
  accessibilityLabel={`${label}: ${value}`}
  ```
- Cada `OperationRow` convierte la fila en Pressable con:
  ```
  accessibilityRole="button"
  accessibilityLabel={`${concept}, ${type}, ${date}, ${sign}$${amount}`}
  accessibilityHint="Toca para ver opciones"
  ```
- Los filter pills ya tienen `accessibilityRole="radio"` — correcto.
- El `DateSectionHeader` agrega:
  ```
  accessibilityRole="header"
  accessibilityLabel={`${label}, ventas +$${ventas}, egresos -$${gastos}`}
  ```

---

## Animaciones

| Elemento          | Tipo          | Curva                    | Duración |
|-------------------|---------------|--------------------------|----------|
| Header entrada    | fade + slide  | `Easing.out(Easing.cubic)` | 400ms  |
| MetricCell entrada| fade + slideY | `Easing.out(Easing.cubic)` | 300ms, delay escalonado 60/120/180ms |
| DateGroupHeader   | fade + slideY | `Easing.out(Easing.quad)`  | 320ms, delay 80ms × gi |
| OperationRow      | fade + slideX | `Easing.out(Easing.cubic)` | 280ms, delay escalonado |
| Skeleton pulse    | opacidad      | `Easing.inOut(Easing.sin)` | 600ms, repeat infinito |
| Filter pill press | scale         | spring damping 20        | —        |

Todas las animaciones de entrada usan el patrón `mounted.current` para evitar re-animación en re-renders.

---

## Cambios específicos respecto a la pantalla actual

1. **Eliminar** el bloque `quickCta` "+ NUEVA OPERACIÓN" del scroll.
2. **Aumentar** `filterPill minHeight` de 32 → 44, padding vertical de 6 → 12.
3. **Agregar** `accessibilityRole` + `accessibilityLabel` a cada `MetricCell`.
4. **Convertir** `OperationRow` en `Pressable` que navega a `/historial` (o muestra bottom sheet de opciones: Repetir / Eliminar).
5. **Agregar** estado de error visible (no solo silenciar el catch).
6. **Agregar** skeleton de carga en lugar del ActivityIndicator central.
7. **Reemplazar** los colores hardcodeados del header (`"#F5F3EF"`, etc.) con los tokens del tema, o documentar explícitamente por qué se ignoran (header siempre oscuro).
8. **Mover** el contador de operaciones del día al header, junto a la fecha.
