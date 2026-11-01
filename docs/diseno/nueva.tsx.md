# Spec: nueva.tsx — Formulario nueva operación

## Diagnóstico actual

La pantalla es la más crítica del producto (registro rápido en medio de trabajo). Su estructura general es buena. Los problemas identificados:

- **El `titleBar` no es accesible como encabezado:** el `Text "NUEVA OPERACIÓN"` debería tener `accessibilityRole="header"`.
- **El botón "← ATRÁS" tiene hitSlop correcto pero su texto de 9pt es muy pequeño** para feedback visual: usuario midiendo el tamaño real del blanco de toque no ve el área expandida.
- **Los category chips tienen `minHeight: 44` pero no hay `accessibilityLabel` individual** — el lector de pantalla solo oye el texto del chip.
- **El monto usa `parseInt` — trunca decimales**, lo cual es correcto para centavos enteros. Pero el `placeholder "0"` sugiere que "0" es un monto válido — cuando el form permite escribir "0" sin error hasta el submit.
- **El `DatePicker` no tiene `accessibilityValue`** — el lector de pantalla no anuncia la fecha seleccionada.
- **El éxito redirige con `router.replace` después de 700ms** — no hay forma de cancelar si el usuario toca otra vez. Un segundo toque en "GUARDAR" durante esos 700ms no hace nada (disabled), pero el feedback es solo el estado `success` del texto.
- **El campo NOTA tiene un `borderWidth: 1` adicional que crea una caja con borde en todos los lados** — inconsistente con el resto de campos que solo tienen `borderBottomWidth`. Requiere decisión visual consciente.
- **El type selector no tiene `accessibilityRole="radiogroup"`** en el contenedor.
- **`useFocusEffect` resetea el form al volver a la pantalla** — correcto. Pero si el usuario llega desde el tab FAB, el reset sucede cada vez que activa el tab, incluyendo cuando vuelve de una pantalla hija. Esto podría borrar un formulario a medio completar si el usuario navega por error.
- **No hay confirmación de si el usuario tiene sin guardar** al pulsar "← ATRÁS" con datos ingresados.

---

## Estructura visual propuesta

```
┌───────────────────────────────────┐
│ TitleBar (safe area top)          │
│  ← ATRÁS    NUEVA OPERACIÓN       │
├───────────────────────────────────┤
│ Scroll (bg, teclado evitado)       │
│                                   │
│  TIPO                             │
│  [VENTA]  [COMPRA]  [GASTO]       │
│                                   │
│  CONCEPTO *                       │
│  ________________________         │
│                                   │
│  MONTO *                          │
│  $ [  0    ]                      │
│  ──── (borde color del tipo) ─────│
│                                   │
│  FECHA                            │
│  ← HOY →                          │
│                                   │
│  CATEGORÍA (OPCIONAL)             │
│  [Mercancía] [Transporte] …       │
│                                   │
│  NOTA (OPCIONAL)                  │
│  ________________________         │
│                                   │
│  [error si lo hay]                │
│                                   │
│  [GUARDAR VENTA]  ← CTA           │
└───────────────────────────────────┘
```

**Sin cambios estructurales.** Solo ajustes de accesibilidad, consistencia y feedback.

---

## Tipografía

| Elemento              | Tamaño | Peso  | Familia | Espaciado |
|-----------------------|--------|-------|---------|-----------|
| titleText             | 10pt   | 600   | MONO    | 1.8       |
| backText              | 9pt    | 400   | MONO    | 1.5       |
| fieldLabel            | 8pt    | 400   | MONO    | 2         |
| textInput (concept)   | 15pt   | 400   | system  | 0.1       |
| currencySymbol        | 26pt   | 300   | system  | —         |
| amountInput           | 44pt   | 700   | system  | -1        |
| dateDisplay (HOY)     | 15pt   | 600   | MONO    | 1.5       |
| dateISO (sub-display) | 9pt    | 400   | MONO    | 0.5       |
| dateArrow             | 16pt   | —     | MONO    | —         |
| chipText              | 8pt    | 400   | MONO    | 1.5       |
| noteInput             | 14pt   | 400   | system  | —         |
| errorText             | 10pt   | 400   | MONO    | 0.3       |
| saveCtaText           | 13pt   | 700   | MONO    | 2         |

---

## Colores

| Elemento                  | Token / Valor                      |
|---------------------------|------------------------------------|
| Root bg                   | `colors.bg`                        |
| TitleBar border           | `colors.border`                    |
| titleText                 | `colors.ink`                       |
| backText                  | `colors.muted`                     |
| fieldLabel                | `colors.muted`                     |
| concept input text        | `colors.ink`                       |
| concept border            | `colors.borderStrong`              |
| monto acento (borde + $)  | `activeType.color`                 |
| monto placeholder         | `activeType.color` al 25%         |
| date border               | `colors.borderStrong`              |
| date text                 | `colors.ink`                       |
| date arrow disabled       | `colors.muted` al 25%             |
| chip activo bg            | `colors.ink`                       |
| chip activo texto         | `colors.bg`                        |
| chip inactivo border      | `colors.border`                    |
| chip inactivo texto       | `colors.muted`                     |
| nota borde (propuesta)    | `colors.border` solo bottom → unificar con el resto de campos (eliminar caja) |
| errorText                 | `colors.error`                     |
| CTA bg                    | `activeType.color`                 |
| CTA texto                 | `#1A1A1A` (siempre oscuro)        |
| CTA guardado bg           | `activeType.color` (sin cambio)   |
| CTA guardado texto        | `#1A1A1A` + checkmark             |

---

## Espaciado

| Zona                     | Valor  |
|--------------------------|--------|
| TitleBar padding H       | 20pt   |
| TitleBar padding V       | 14pt   |
| Scroll padding H         | 20pt   |
| Scroll padding top       | 24pt   |
| Gap entre campos (gap)   | 24pt   |
| Dentro de cada campo     | 10pt   |
| Type pill minHeight      | 48pt (subida desde actual 48 — ya correcto) |
| Type pill padding V      | 12pt   |
| Gap entre type pills     | 10pt   |
| Chip minHeight           | 44pt   |
| Chip padding V           | 7pt    |
| Chip padding H           | 14pt   |
| Gap entre chips          | 8pt    |
| DatePicker minHeight     | 52pt   |
| Nota textarea altura     | 72pt   |
| CTA padding V            | 18pt   |
| CTA minHeight            | 56pt   |

---

## Estados

### Formulario vacío (inicial)
- TIPO: VENTA pre-seleccionado, color amber.
- CONCEPTO: placeholder visible, sin borde de error.
- MONTO: "0" en placeholder del color del tipo al 25%.
- FECHA: "HOY".
- CATEGORÍA: ninguna activa.
- CTA: "GUARDAR VENTA" en amber. Habilitado.

### Typing en monto
- El número crece visualmente (44pt bold). El cursor está al final.
- El borde inferior toma el color del tipo seleccionado (2pt width).

### Validación en intento de envío
- Si concepto vacío: subrayado rojo + foco automático en el campo + `errorText` debajo del CTA.
- Si monto = 0: `errorText` debajo del CTA.
- Sin bloqueo inline en tiempo real (para no interrumpir el flujo rápido).

### Saving
- CTA: `ActivityIndicator` color `#1A1A1A`. Campos deshabilitados.
- Sin spinner en overlay.

### Éxito
- CTA muestra "✓ GUARDADO", animación fade+slideY desde abajo (200ms, `Easing.out(Easing.cubic)`).
- Después de 700ms → `router.replace('/(app)/')`.
- No es cancelable (la operación ya se guardó).

### Error de guardado
- `errorText` debajo del CTA: "No se pudo guardar. Intentá de nuevo."
- CTA vuelve al estado normal. Formulario editable.

### Teclado visible
- `KeyboardAvoidingView` sube el scroll para que el CTA permanezca visible sobre el teclado.
- En Android: usar `behavior="height"` con offset = insets.bottom.

---

## Accesibilidad

- `View typeRow` agrega `accessibilityRole="radiogroup"` y `accessibilityLabel="Tipo de operación"`.
- Cada `typePill` ya tiene `accessibilityRole="radio"` — correcto.
- `titleText` agrega `accessibilityRole="header"`.
- `DatePicker`:
  - Botón `←` ya tiene `accessibilityLabel="Día anterior"`.
  - Botón `→` ya tiene `accessibilityLabel="Día siguiente"`.
  - Agregar al contenedor:
    ```
    accessibilityRole="adjustable"
    accessibilityValue={{ text: display }}
    ```
- Cada chip de categoría agrega `accessibilityLabel={cat}`.
- El campo NOTA agrega `accessibilityLabel="Nota adicional, opcional"`.
- `saveCta` ya tiene `accessibilityRole="button"` y `accessibilityState` — correcto.

---

## Animaciones

| Elemento             | Tipo             | Curva                      | Duración |
|----------------------|------------------|----------------------------|----------|
| Guardado checkmark   | fade + slideY    | `Easing.out(Easing.cubic)` | 200ms    |
| Error aparición      | fade in          | `Easing.out(Easing.quad)`  | 180ms    |
| Pill/chip press      | scale 0.97       | spring damping 20          | —        |
| CTA press in/out     | scale 0.97/1.0   | spring damping 20          | —        |
| Type cambio de color | (ninguna — cambio inmediato por token, no animar) | — | — |

---

## Cambios específicos respecto a la pantalla actual

1. **Agregar** `accessibilityRole="radiogroup"` al `View` contenedor de type pills.
2. **Agregar** `accessibilityRole="header"` al `titleText`.
3. **Agregar** `accessibilityRole="adjustable"` + `accessibilityValue` al `DatePicker`.
4. **Agregar** `accessibilityLabel` a cada chip de categoría.
5. **Unificar** borde del campo NOTA: cambiar a solo `borderBottomWidth: 1` para consistencia visual con los otros campos. Eliminar el `borderWidth: 1` adicional.
6. **Agregar** `accessibilityRole="radiogroup"` al contenedor de type pills.
7. **Documentar decisión** del `useFocusEffect`: considerar resetear solo cuando `router.replace` venga de dentro de esta pantalla (no al volver del historial). Fuera del alcance del spec de diseño, pero registrado.
8. **Placeholder del monto:** cambiar de "0" a "" (vacío) para evitar confusión — el placeholder visible con 25% de opacidad ya es suficiente indicador de posición.
