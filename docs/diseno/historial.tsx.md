# Spec: historial.tsx — Historial completo

## Diagnóstico actual

Pantalla sólida con FlatList correctamente virtualizada. Problemas identificados:

- **Eliminar con long press no tiene affordance visual:** el usuario no sabe que puede eliminar con long press. Solo el `accessibilityHint` lo indica — invisible para usuarios sin lector. Necesita un hint visible.
- **El `Alert.alert` nativo para confirmar eliminación es correcto en iOS.** En Android el estilo es más nativo pero aceptable. Sin cambios necesarios aquí.
- **No hay búsqueda por concepto** — PRODUCT.md lo requiere. El campo de búsqueda está ausente.
- **No hay filtro por fecha** — PRODUCT.md menciona "hoy, semana, mes, rango personalizado". Solo hay filtro por tipo.
- **El contador "X registros"** aparece en una `countBar` pegada al fondo — correcto pero el `borderTopColor` usa `colors.border` mientras que hay una línea `dividerLine` entre el header y la lista que también usa `colors.border`. Consistente.
- **El header no tiene `accessibilityRole="header"`** para el elemento de título.
- **La pantalla se accede solo desde configuraciones** (no tiene tab propio). La navegación de vuelta usa el back nativo — sin botón explícito, lo cual es correcto en iOS (edge swipe). En Android el back button del sistema funciona. No hay problema aquí.
- **La acción de eliminación no tiene feedback de éxito/error visual:** después de confirmar en el Alert, el item desaparece sin animación de salida — abruptamente.
- **El color COMPRA `rgba(100,160,255,0.9)` no tiene token** — está hardcodeado igual que en index.tsx.

---

## Estructura visual propuesta

```
┌───────────────────────────────────┐
│ Header (safe area top)            │
│  "REGISTRO COMERCIAL" (carrier)   │
│  HISTORIAL (título 24pt)          │
│                                   │
│  [Buscar…] ← campo de texto       │
│                                   │
│  [TODOS] [VENTAS] [COMPRAS] [GASTOS] │
├───────────────────────────────────┤
│ ─ divider ─────────────────────── │
│                                   │
│  FlatList (virtualizada)          │
│   ├ DateSectionHeader             │
│   ├ OpRow (swipe left → eliminar) │  ← nuevo
│   ├ OpRow                         │
│   └ …                             │
│                                   │
│ ─ countBar ──────── "X registros" │
└───────────────────────────────────┘
```

**Cambio principal:** agregar campo de búsqueda y, opcionalmente, swipe-to-delete como affordance explícita.

---

## Campo de búsqueda

- `TextInput` debajo del título, antes de los filtros de tipo.
- Placeholder: "Buscar concepto…" en `colors.muted`.
- Icono `◎` a la izquierda (MONO, 14pt, muted).
- Borde solo inferior: `borderBottomWidth: 1`, color `colors.border`.
- Texto: 14pt, `colors.ink`.
- Al escribir: filtra la lista en tiempo real (debounce 200ms para no bloquear).
- Botón `✕` aparece a la derecha solo cuando hay texto (32×32pt mínimo de touch target).
- `accessibilityLabel="Buscar por concepto"`, `accessibilityRole="search"`.

---

## Tipografía

| Elemento              | Tamaño | Peso  | Familia | Espaciado |
|-----------------------|--------|-------|---------|-----------|
| carrier               | 7pt    | 400   | MONO    | 2         |
| headerTitle           | 24pt   | 700   | system  | -0.5      |
| búsqueda input        | 14pt   | 400   | system  | 0         |
| filterText            | 8pt    | 400   | MONO    | 1.2       |
| dayGroupLabel         | 9pt    | 700   | MONO    | 2.5       |
| dayGroupStat          | 8pt    | 600   | MONO    | 0.5       |
| opConcept             | 14pt   | 500   | system  | -0.1      |
| opAmount              | 13pt   | 600   | MONO    | 0.2       |
| opType                | 8pt    | 600   | MONO    | 1.2       |
| opCategory            | 8pt    | 400   | MONO    | 0.8       |
| opNote                | 9pt    | 400   | MONO    | 0.2       |
| emptyText             | 11pt   | 400   | MONO    | 0.3       |
| countText             | 8pt    | 400   | MONO    | 1         |
| hint eliminar         | 9pt    | 400   | MONO    | 0.3       |

---

## Colores

| Elemento              | Token / Valor                     |
|-----------------------|-----------------------------------|
| Root bg               | `colors.bg`                       |
| Header bg             | `colors.bg`                       |
| carrier               | `colors.muted`                    |
| headerTitle           | `colors.ink`                      |
| búsqueda border       | `colors.border`                   |
| búsqueda texto        | `colors.ink`                      |
| búsqueda icon / clear | `colors.muted`                    |
| filter activa bg      | `colors.ink`                      |
| filter activa texto   | `colors.bg`                       |
| filter inactiva border| `colors.border`                   |
| venta acento/monto    | `colors.amber`                    |
| compra acento         | `'rgba(100,160,255,0.9)'` (pendiente tokenizar) |
| gasto acento/monto    | `colors.error`                    |
| row pressed bg        | `colors.screenBg`                 |
| divider               | `colors.border`                   |
| empty icon/text       | `colors.muted`                    |
| hint eliminar         | `colors.muted` al 60%            |
| countBar border       | `colors.border`                   |
| countText             | `colors.muted`                    |

---

## Espaciado

| Zona                    | Valor  |
|-------------------------|--------|
| Header padding H        | 20pt   |
| Header padding top      | 16pt   |
| Header padding bottom   | 12pt   |
| Búsqueda margin top     | 12pt   |
| Búsqueda padding V      | 10pt   |
| Gap entre búsqueda y filtros | 12pt |
| Filter pills gap        | 8pt    |
| Filter pill padding V   | **12pt** (subida de 7→12 para 44pt target) |
| Filter pill padding H   | 14pt   |
| Filter pill minHeight   | 44pt   |
| dayGroupHeader padding V| 20pt top, 6pt bottom |
| dayGroupHeader padding H| 20pt   |
| opRow padding V         | 14pt   |
| opRow padding H         | 20pt   |
| countBar padding V      | 8pt    |

---

## Estados

### Carga
- `ActivityIndicator` centrado con `colors.amber` — correcto. Mantener.

### Vacío (sin operaciones)
- Icono `◌` 36pt, `colors.muted`.
- Texto específico según filtro activo.
- Si hay búsqueda activa: "No hay resultados para «{query}»."

### Error
- Actualmente: `catch` → `setOps([])`. El usuario ve el estado vacío sin saber si fue un error.
- Propuesta: agregar `setError(true)` en catch y mostrar un estado de error diferente:
  - Icono `⚠` en `colors.error`.
  - Texto: "No se pudo cargar el historial."
  - Acción: Pressable "REINTENTAR" con `accessibilityRole="button"`.

### Long press (eliminar)
- El `Alert.alert` nativo es correcto — no cambiar.
- Agregar un hint visual discreto al pie del primer ítem visible (solo si la lista tiene elementos):
  - Texto: "Mantén presionado para eliminar" — MONO 9pt, `colors.muted` al 50%, centrado.
  - Desaparece después de 5 segundos (state local `showHint`).
  - No se vuelve a mostrar en la misma sesión.

### Eliminación en curso
- Al confirmar en Alert: animación de salida del ítem eliminado.
- `opacity` de 1 a 0 en 200ms + `height` a 0 en 200ms (`LayoutAnimation` o `Animated.Value` en el item).
- La animación es sutil — el foco es que la lista se reorganice visualmente, no que sea espectacular.

---

## Accesibilidad

- `headerTitle` agrega `accessibilityRole="header"`.
- `OpRow` ya tiene `accessibilityRole="button"` y `accessibilityLabel` completo — correcto.
- `accessibilityHint="Mantén presionado para eliminar"` — ya existe, correcto.
- `DateSectionHeader` agrega `accessibilityRole="header"`.
- Campo de búsqueda: `accessibilityRole="search"`, `accessibilityLabel="Buscar por concepto"`.
- Botón limpiar búsqueda: `accessibilityRole="button"`, `accessibilityLabel="Limpiar búsqueda"`.
- Filter pills: `accessibilityRole="radio"` ya presente — correcto.

---

## Animaciones

| Elemento               | Tipo             | Curva                      | Duración  |
|------------------------|------------------|----------------------------|-----------|
| Header entrada         | fade + slideY    | `Easing.out(Easing.cubic)` | 320ms     |
| DateSectionHeader      | fade + slideY    | `Easing.out(Easing.quad)`  | 280ms, delay 60ms × gi |
| OpRow                  | fade + slideX    | `Easing.out(Easing.cubic)` | 240ms, delay escalonado |
| Eliminación salida     | opacity → 0      | `Easing.in(Easing.cubic)`  | 200ms     |
| Filter press           | scale 0.97       | spring damping 20          | —         |
| Hint aparecer          | fade in          | `Easing.out(Easing.quad)`  | 300ms     |
| Hint desaparecer       | fade out         | `Easing.in(Easing.quad)`   | 500ms     |

---

## Cambios específicos respecto a la pantalla actual

1. **Agregar** campo de búsqueda por concepto (TextInput con icono + botón limpiar).
2. **Implementar** filtrado en tiempo real por búsqueda (debounce 200ms, sobre la lista ya filtrada por tipo).
3. **Agregar** `accessibilityRole="header"` al `headerTitle` y a cada `DateSectionHeader`.
4. **Aumentar** `filterPill` padding V de 7 → 12pt para cumplir 44pt de touch target.
5. **Agregar** estado de error diferenciado del estado vacío.
6. **Agregar** hint visual de eliminación por long press (aparece una vez por sesión).
7. **Agregar** animación de salida para ítems eliminados.
8. **Pendiente (fuera de este spec):** filtro por fecha (hoy/semana/mes/rango). Requiere un bottom sheet o modal separado — alcance de una spec futura.
