# Spec: configuraciones.tsx — Configuraciones

## Diagnóstico actual

La pantalla es funcional y limpia. Problemas menores identificados:

- **El botón "OK" de guardado tiene width: 44 y height: 36** — el height es inferior al mínimo de 44pt.
- **El `navRow` de "VER HISTORIAL" tiene `minHeight` implícito (solo padding V: 14) = ~42pt** — borderline. Agregar `minHeight: 48`.
- **El `toggleRow` con el Switch no tiene `minHeight` explícito** — en iOS el Switch tiene 31pt de altura, más padding. Verificar que el área tocable sea ≥ 44pt.
- **"VER HISTORIAL" está en la sección ACTIVIDAD** — semánticamente raro. Historial es navegación, no actividad. Una sección llamada "NAVEGACIÓN" o simplemente moverlo a la parte superior como acción principal sería más claro. Sin embargo, el cambio es menor y la estructura actual no es confusa.
- **El header usa solo `fade in` de entrada** — el resto de pantallas usan `fade + slideY`. Inconsistente.
- **No hay estado de error para `handleSaveBiz` / `handleSaveUsr`** — si `updateUser` falla, el indicador vuelve al estado "OK" sin mostrar nada.
- **El header no tiene `accessibilityRole="header"`** para el elemento de título.
- **La sección de apariencia tiene "MODO OSCURO" como único ítem** — en la tabla del PRODUCT.md se mencionan: moneda, categorías personalizadas, cambio de contraseña, recordatorio diario. Están ausentes. Esta spec documenta lo que existe; las pantallas faltantes son trabajo futuro.

---

## Estructura visual propuesta

```
┌───────────────────────────────────┐
│ Header (safe area top)            │
│  "REGISTRO COMERCIAL" (carrier)   │
│  CONFIGURACIONES (título 24pt)    │
├───────────────────────────────────┤
│ ─ divider ─────────────────────── │
│                                   │
│ Scroll                            │
│  ├ ACTIVIDAD                      │
│  │  └ [VER HISTORIAL          →]  │
│  │                                │
│  ├ ─ divider ─                    │
│  ├ CUENTA                         │
│  │  ├ NOMBRE DEL NEGOCIO [____][OK│
│  │  └ TU NOMBRE           [____][OK│
│  │                                │
│  ├ ─ divider ─                    │
│  └ APARIENCIA                     │
│     └ MODO OSCURO     [Switch]    │
└───────────────────────────────────┘
```

Sin cambios estructurales. Solo correcciones de touch target, accesibilidad y feedback de error.

---

## Tipografía

| Elemento           | Tamaño | Peso  | Familia | Espaciado |
|--------------------|--------|-------|---------|-----------|
| carrier            | 7pt    | 400   | MONO    | 2         |
| headerTitle        | 24pt   | 700   | system  | -0.5      |
| sectionLabel       | 7pt    | 400   | MONO    | 2         |
| navRowTitle        | 11pt   | 600   | MONO    | 1.2       |
| navRowSub          | 8pt    | 400   | MONO    | 0.5       |
| chevron            | 16pt   | —     | MONO    | —         |
| fieldLabel         | 7pt    | 400   | MONO    | 2         |
| fieldInput         | 15pt   | 400   | system  | 0.1       |
| saveBtnText        | 10pt   | 700   | MONO    | 1         |
| toggleTitle        | 11pt   | 600   | MONO    | 1.2       |
| toggleSub          | 8pt    | 400   | MONO    | 0.5       |
| errorText          | 9pt    | 400   | MONO    | 0.3       |

---

## Colores

| Elemento                  | Token                        |
|---------------------------|------------------------------|
| Root bg                   | `colors.bg`                  |
| Header bg                 | `colors.bg`                  |
| carrier                   | `colors.muted`               |
| headerTitle               | `colors.ink`                 |
| sectionLabel              | `colors.muted`               |
| navRow pressed bg         | `colors.screenBg`            |
| navRowTitle               | `colors.ink`                 |
| navRowSub                 | `colors.muted`               |
| chevron                   | `colors.muted`               |
| fieldLabel                | `colors.muted`               |
| fieldInput text           | `colors.ink`                 |
| fieldInput border         | `colors.borderStrong`        |
| saveBtn bg (normal)       | `colors.ink`                 |
| saveBtn bg (guardado)     | `colors.amber`               |
| saveBtn texto (normal)    | `colors.bg`                  |
| saveBtn texto (guardado)  | `#1A1A1A`                    |
| saveBtn disabled          | opacity 0.4                  |
| errorText                 | `colors.error`               |
| Switch track false        | `colors.border`              |
| Switch track true         | `colors.amber` al 33%        |
| Switch thumb active       | `colors.amber`               |
| Switch thumb inactive     | `colors.muted`               |
| dividers                  | `colors.border`              |

---

## Espaciado

| Zona                        | Valor  |
|-----------------------------|--------|
| Header padding H            | 20pt   |
| Header padding top          | 16pt   |
| Header padding bottom       | 12pt   |
| Section padding H           | 20pt   |
| Section padding top         | 20pt   |
| Section padding bottom      | 4pt    |
| sectionLabel margin bottom  | 12pt   |
| navRow padding V            | 14pt   |
| navRow minHeight            | **48pt** (subida) |
| fieldBlock margin bottom    | 20pt   |
| fieldLabel → fieldRow gap   | 8pt    |
| fieldRow gap (input + btn)  | 10pt   |
| fieldInput padding V        | 8pt    |
| saveBtn width               | 44pt   |
| saveBtn height              | **44pt** (subida de 36→44) |
| toggleRow padding V         | 6pt    |
| toggleRow minHeight         | **48pt** (agregar) |
| sectionDivider margin top   | 8pt    |

---

## Estados

### Campo sin cambios
- `saveBtn` con "OK" en `colors.bg` sobre `colors.ink`.
- Disabled si el campo está vacío (solo businessName, no userName).

### Campo editado
- `saveBtn` habilitado con apariencia normal.

### Guardando
- `saveBtn`: `ActivityIndicator` color `colors.bg`.
- Campo deshabilitado visualmente (opacity reducida o `editable: false`).

### Guardado exitoso
- `saveBtn` cambia a `colors.amber` bg + "✓" en `#1A1A1A`.
- Vuelve al estado normal después de 1800ms.
- La transición amber → ink es instantánea (sin animación — el cambio de estado es suficiente feedback).

### Error de guardado (nuevo)
- Debajo del `fieldRow` correspondiente aparece un `Text` en `colors.error`:
  - "No se pudo guardar. Intentá de nuevo." — MONO 9pt.
  - Fade in en 180ms.
  - Desaparece al volver a escribir en el campo.

### Modo oscuro toggle
- El `Switch` ya tiene estados correctos (`value={isDark}`, `onValueChange={toggleDark}`).
- La transición de tema ya usa el overlay animado en `ThemeTransitionOverlay`.

---

## Accesibilidad

- `headerTitle` agrega `accessibilityRole="header"`.
- `navRow` ya tiene `accessibilityRole="button"` y `accessibilityLabel` — correcto.
- `saveBtn` ya tiene `accessibilityRole="button"` y `accessibilityLabel` — correcto.
- `Switch` ya tiene `accessibilityRole="switch"`, `accessibilityLabel` y `accessibilityState` — correcto.
- Agregar `accessibilityRole="header"` a cada `sectionLabel` (semánticamente son encabezados de sección):
  ```
  accessibilityRole="header"
  ```
- Los `TextInput` de businessName y userName ya tienen acceso implícito — agregar `accessibilityLabel` explícito a cada uno:
  - `accessibilityLabel="Nombre del negocio"`
  - `accessibilityLabel="Tu nombre personal"`

---

## Animaciones

| Elemento          | Tipo       | Curva                      | Duración |
|-------------------|------------|----------------------------|----------|
| Header entrada    | fade       | `Easing.out(Easing.cubic)` | 350ms    |
| Error texto       | fade in    | `Easing.out(Easing.quad)`  | 180ms    |
| saveBtn pressed   | scale 0.94 | spring (ya existe)         | —        |

**Propuesta:** cambiar la entrada del header de solo `fade` a `fade + slideY(-6→0)` para consistencia con las otras pantallas. La diferencia de 350ms se mantiene.

---

## Cambios específicos respecto a la pantalla actual

1. **Aumentar** `saveBtn` height de 36 → 44pt.
2. **Agregar** `minHeight: 48` al `navRow`.
3. **Agregar** `minHeight: 48` al `toggleRow`.
4. **Agregar** `accessibilityRole="header"` al `headerTitle` y a los `sectionLabel`.
5. **Agregar** `accessibilityLabel` explícito a los TextInput de businessName y userName.
6. **Agregar** estado de error visible para `handleSaveBiz` y `handleSaveUsr`.
7. **Cambiar** animación del header de solo fade a fade + slideY para consistencia.
