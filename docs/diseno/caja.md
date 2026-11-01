# Spec: caja.tsx — Pantalla modo caja (empleado)

## Contexto de diseño

Superficie de trabajo para empleados que no tienen acceso de administrador. El
empleado registra ventas tocando productos — sin opciones de edición, sin
navegación a otras pantallas. Todo lo que no sea vender está invisible o
bloqueado. Paleta y tipografía idénticas al resto del producto (boarding-pass
direction: ivory, ink, amber, muted, MONO).

---

## 1. Estructura

Pantalla completa de pantalla, sin tab bar. El empleado entra directo a esta
vista cuando el jefe activa el modo caja (o cuando el rol del usuario es
"empleado"). No hay navegación visible salvo el candado del jefe.

```
┌──────────────────────────────────────────────┐
│ HEADER (safe area top)                        │
│  [nombre del negocio]            [🔒 ADMIN]   │
├──────────────────────────────────────────────┤
│ GRID DE PRODUCTOS (ScrollView, flex: 1)       │
│                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Producto │  │ Producto │  │ Producto │   │
│  │  nombre  │  │  nombre  │  │  nombre  │   │
│  │  $1,200  │  │   $800   │  │  $350    │   │
│  └──────────┘  └──────────┘  └──────────┘   │
│                                               │
│  ┌──────────┐  ┌──────────┐                   │
│  │ Producto │  │ Producto │                   │
│  │  [●2]    │  │  nombre  │                   │  ← badge de cantidad
│  │  $450    │  │  $600    │                   │
│  └──────────┘  └──────────┘                   │
│                                               │
│  Estado vacío: "Sin productos activos"        │
│  Estado carga: 6 tarjetas skeleton            │
│  Estado error: aviso + reintentar             │
├──────────────────────────────────────────────┤
│ FOOTER (fijo, safe area bottom)               │
│                                               │
│  TOTAL: $2,400                                │
│                                               │
│  [EFECTIVO] [TARJETA] [TRANSF.] [OTRO]        │  ← pills
│                                               │
│  [ REGISTRAR VENTA ]  ← CTA grande            │
│  (deshabilitado si total = 0)                 │
└──────────────────────────────────────────────┘
```

### Jerarquía de componentes

```
CajaScreen
├── CajaHeader
│   ├── Text businessName
│   └── Pressable adminLock (ícono 🔒 + texto "ADMIN")
├── ScrollView productsGrid
│   ├── FlatList (numColumns: 2 o 3 según ancho)
│   │   └── ProductCard (por cada producto activo)
│   │       ├── Text productName
│   │       ├── Text productPrice
│   │       └── QuantityBadge (visible solo si qty > 0)
│   ├── EmptyState (sin productos)
│   ├── LoadingState (skeletons)
│   └── ErrorState (error de carga)
└── CajaFooter
    ├── Text totalAmount
    ├── PaymentPills
    │   └── Pressable × 4 (efectivo, tarjeta, transferencia, otro)
    └── Pressable registerButton (CTA)
```

---

## 2. Tipografía

| Elemento              | Familia | Tamaño | Peso | Letter-spacing | Line-height |
|-----------------------|---------|--------|------|----------------|-------------|
| Business name (header)| MONO    | 11pt   | 400  | 2.0            | —           |
| "ADMIN" lock label    | MONO    | 8pt    | 400  | 1.5            | —           |
| Product name (card)   | MONO    | 11pt   | 600  | 0.8            | 15pt        |
| Product price (card)  | MONO    | 14pt   | 400  | 0.5            | —           |
| Badge quantity        | MONO    | 9pt    | 700  | 0              | —           |
| Total label "TOTAL"   | MONO    | 8pt    | 400  | 2.0            | —           |
| Total amount "$X,XXX" | MONO    | 28pt   | 700  | -0.5           | —           |
| Payment pill text     | MONO    | 8pt    | 400  | 1.5            | —           |
| CTA button text       | MONO    | 13pt   | 700  | 2.0            | —           |
| Empty state text      | MONO    | 13pt   | 400  | 0.5            | 20pt        |
| Error text            | MONO    | 10pt   | 400  | 0.3            | 16pt        |

Justificación de tamaños: el nombre del producto se lee rápido a distancia de
brazo con la pantalla sobre el mostrador — 11pt bold es el mínimo. El precio
en 14pt permite comparación rápida. El total en 28pt es la cifra más importante
de la pantalla y debe ser visible de un vistazo.

---

## 3. Colores y superficie

Todos los valores usan los tokens del tema (`colors.*`) para soportar modo
oscuro automáticamente.

| Elemento                       | Token claro                  | Token oscuro                 |
|--------------------------------|------------------------------|------------------------------|
| Fondo pantalla                 | `colors.screenBg` (#EAE7E1)  | `colors.screenBg` dark       |
| Header bg                      | `colors.bg` (#F5F3EF)        | `colors.bg` dark             |
| Header border bottom           | `colors.border`              | `colors.border` dark         |
| Business name                  | `colors.ink`                 | `colors.ink` dark            |
| Lock icon + label              | `colors.muted`               | `colors.muted` dark          |
| Card bg                        | `colors.bg`                  | `colors.bg` dark             |
| Card border                    | `colors.border`              | `colors.border` dark         |
| Card bg cuando qty > 0         | `#F5A62310` (amber 6%)       | `#F5A62318` dark             |
| Card border cuando qty > 0     | `colors.amber` (#F5A623)     | `colors.amber`               |
| Product name (normal)          | `colors.ink`                 | `colors.ink` dark            |
| Product price (normal)         | `colors.muted`               | `colors.muted` dark          |
| Product price cuando qty > 0   | `colors.amber`               | `colors.amber`               |
| Badge bg                       | `colors.amber`               | `colors.amber`               |
| Badge text                     | `colors.ink` (#1A1A1A)       | `colors.ink`                 |
| Footer bg                      | `colors.bg`                  | `colors.bg` dark             |
| Footer border top              | `colors.border`              | `colors.border` dark         |
| Total amount                   | `colors.ink`                 | `colors.ink` dark            |
| Total amount cuando > 0        | `colors.amber`               | `colors.amber`               |
| Payment pill border activo     | `colors.ink`                 | `colors.ink` dark            |
| Payment pill bg activo         | `colors.ink`                 | `colors.ink` dark            |
| Payment pill text activo       | `colors.bg`                  | `colors.bg` dark             |
| Payment pill border inactivo   | `colors.border`              | `colors.border` dark         |
| Payment pill text inactivo     | `colors.muted`               | `colors.muted` dark          |
| CTA bg habilitado              | `colors.amber`               | `colors.amber`               |
| CTA text                       | `colors.ink` (#1A1A1A)       | `colors.ink`                 |
| CTA bg deshabilitado           | `colors.border`              | `colors.border` dark         |
| CTA text deshabilitado         | `colors.muted`               | `colors.muted` dark          |
| Skeleton                       | `colors.border`              | shimmer más claro            |

Decisión de modo oscuro: el tema ya maneja el cambio de tokens vía
`useTheme()`. No se hardcodean valores hex en el componente salvo para el
amber/ink que son invariantes de marca.

---

## 4. Espaciado

Todos los valores son múltiplos de 4pt.

| Zona                           | Valor  |
|--------------------------------|--------|
| Header padding H               | 16pt   |
| Header padding V               | 12pt   |
| Header min-height              | 52pt   |
| Grid padding H                 | 12pt   |
| Grid padding top               | 12pt   |
| Grid gap entre columnas        | 8pt    |
| Grid gap entre filas           | 8pt    |
| Card padding interno           | 12pt   |
| Card border radius             | 4pt    |  ← consistente con chips del sistema
| Card min-height                | 80pt   |
| Badge offset esquina           | -8pt top, -8pt right |
| Badge tamaño                   | 24pt × 24pt (min 44pt área de toque via hitSlop) |
| Badge border radius            | 12pt (circular) |
| Footer padding H               | 16pt   |
| Footer padding top             | 16pt   |
| Footer padding bottom          | safe area bottom + 12pt |
| Espacio entre total y pills    | 12pt   |
| Espacio entre pills y CTA      | 16pt   |
| Payment pill padding H         | 12pt   |
| Payment pill padding V         | 8pt    |
| Payment pill gap               | 8pt    |
| Payment pill min-height        | 44pt   |
| CTA padding V                  | 18pt   |
| CTA min-height                 | 56pt   |

Número de columnas del grid:
- Ancho < 375pt → 2 columnas
- Ancho >= 375pt → 3 columnas (la mayoría de iPhones modernos)
- Lógica: `Math.floor((screenWidth - 24) / 120)` clampado a [2, 3]

---

## 5. Estados

### 5.1 Carga inicial
- 6 tarjetas skeleton (FlatList con `data` de 6 items nulos).
- Cada skeleton: rectángulo del mismo tamaño que una tarjeta real, bg
  `colors.border`, sin texto.
- Animación: Reanimated `withRepeat(withSequence(withTiming(0.4), withTiming(1)))`,
  duración 800ms por ciclo. Opacidad de 1.0 a 0.4 y vuelta. Sin `useNativeDriver`
  explícito (Reanimated 4 lo maneja).
- No bloquea el header ni el footer — ambos se renderizan desde el inicio.

### 5.2 Vacío (sin productos activos)
- Grid reemplazado por un `View` centrado:
  ```
  ▦
  Sin productos activos
  El jefe debe agregar productos
  en el catálogo del negocio.
  ```
- Ícono `▦` en `colors.muted`, 32pt.
- Texto en `colors.muted`, 13pt, centrado.
- Footer visible pero CTA deshabilitado.

### 5.3 Error de carga
- Texto de error + botón "REINTENTAR" en el área del grid.
- Mensaje: "No se pudieron cargar los productos."
- Botón: misma apariencia que los chips del sistema.
- El footer permanece visible (puede tener items del carrito previo si los hubiera).

### 5.4 Grilla con productos (estado normal)
- Productos ordenados como los devuelva la query (por defecto: nombre ASC o
  por `orden` si existe el campo).
- Solo se muestran los productos con `activo = true`.
- Cada tarjeta toca-para-agregar. No hay gesto de eliminación del grid.

### 5.5 Carrito con items (qty > 0)
- La tarjeta del producto con qty > 0 recibe borde amber y fondo amber al 6%.
- Badge circular en esquina superior derecha con la cantidad.
- El total del footer actualiza en tiempo real.
- CTA se habilita.

### 5.6 Long-press sobre tarjeta
- Abre `QuantityPicker` (ver sección de interacciones).

### 5.7 Guardando (después de tocar "REGISTRAR VENTA")
- CTA muestra `ActivityIndicator` color `colors.ink`.
- Toda la pantalla se bloquea (`pointerEvents="none"` sobre el grid y el footer,
  excepto el lock del admin que permanece accesible).
- Duración típica: < 1s.

### 5.8 Éxito del registro
- Feedback: vibración corta (`expo-haptics` `ImpactFeedbackStyle.Medium`).
- Animación: el total hace un fade-out + scale down a 0.95 (100ms, ease-out),
  luego el carrito se limpia y el total vuelve a "$0" con fade-in (100ms).
- Carrito se vacía: todas las badges desaparecen, tarjetas vuelven a borde
  normal, total vuelve a $0.
- Método de pago: mantiene la selección del empleado (no resetea).
- No hay modal de confirmación. La velocidad es el feedback.

### 5.9 Error al registrar
- Snackbar bottom (o `Text` sobre el CTA): "No se pudo registrar. Intenta de nuevo."
- Color `colors.error`. Desaparece después de 3s o si el usuario toca otra vez.
- CTA vuelve al estado normal habilitado.

---

## 6. Interacciones

### Toque en tarjeta (tap)
- `onPress`: incrementa `quantities[producto.id]` en 1.
- Feedback inmediato en `pointerDown` (escala 0.95, 80ms ease-out; vuelve en
  80ms ease-out). Ver sección de animaciones.
- No hay límite de cantidad por defecto (el servidor validará stock si existe).

### Long-press en tarjeta
- Después de 400ms de presión → abre `QuantityPickerModal`.
- Vibración: `expo-haptics` `ImpactFeedbackStyle.Light` al activar.
- El modal es un bottom sheet simple (no librería externa):
  ```
  ┌────────────────────────────────────┐
  │ [nombre del producto]              │
  │ $[precio]                          │
  │                                    │
  │  [−]    [  3  ]    [+]             │
  │                                    │
  │   [LISTO]  [QUITAR DEL CARRITO]   │
  └────────────────────────────────────┘
  ```
  - Botones `−` y `+` tienen `minHeight: 44pt`, `minWidth: 44pt`.
  - El número central es texto editable solo con los botones (no TextInput).
  - "QUITAR DEL CARRITO" pone la cantidad a 0 y cierra.
  - "LISTO" confirma y cierra.
  - El modal aparece con `withSpring` desde y=200 a y=0, damping: 18,
    stiffness: 160. Backdrop semitransparente `rgba(0,0,0,0.4)`.

### Toque en lock (admin)
- Abre `PinModal` (ver spec pin-modal.md).
- Si el PIN es correcto: navega a la navegación principal de admin.

### Pull-to-refresh
- Habilitado en el `ScrollView`/`FlatList` para recargar el catálogo.
- `RefreshControl` con `tintColor={colors.amber}`.

---

## 7. Accesibilidad

| Elemento                    | Requisito                                                        |
|-----------------------------|------------------------------------------------------------------|
| Todas las tarjetas          | `accessibilityRole="button"`, `accessibilityLabel="{nombre}, ${precio}"` |
| Tarjeta con qty > 0         | `accessibilityLabel="{nombre}, ${precio}, {qty} en carrito"` |
| Badge de cantidad           | `accessibilityElementsHidden={true}` (la label de la tarjeta ya lo incluye) |
| Lock button                 | `accessibilityRole="button"`, `accessibilityLabel="Acceso administrador"` |
| CTA                         | `accessibilityRole="button"`, `accessibilityLabel="Registrar venta, total ${total}"` |
| CTA deshabilitado           | `accessibilityState={{ disabled: true }}`, hint: "Agrega productos primero" |
| Payment pills               | `accessibilityRole="radio"` en cada pill, contenedor `accessibilityRole="radiogroup"` |
| Total amount                | `accessibilityLabel="Total: ${total}"` |
| Touch targets mínimos       | 44pt × 44pt para todo elemento interactivo (las tarjetas exceden esto) |
| Contraste mínimo            | Todos los textos sobre sus fondos pasan WCAG AA (4.5:1). El amber sobre ink es 7.2:1. El amber sobre fondo ivory es 3.8:1 — usar solo para precios, no para texto informativo pequeño. |

---

## 8. Animaciones

Todas las animaciones usan Reanimated 3 en el UI thread. No se usa el
`Animated` de React Native salvo para `RefreshControl`.

| Elemento                   | Efecto                             | Curva / Spring                    | Duración     |
|----------------------------|------------------------------------|-----------------------------------|--------------|
| Card press-in              | scale 1.0 → 0.95                   | spring damping:20 stiffness:300   | ~80ms        |
| Card press-out             | scale 0.95 → 1.0                   | spring damping:20 stiffness:300   | ~80ms        |
| Badge aparición (qty 0→1)  | scale 0 → 1, opacity 0 → 1        | spring damping:15 stiffness:200   | ~150ms       |
| Badge desaparición (qty→0) | scale 1 → 0, opacity 1 → 0        | withTiming ease-out               | 120ms        |
| Badge cambio de número     | translateY -4 → 0, opacity 0 → 1  | withTiming ease-out               | 100ms        |
| Total cambio de valor      | translateY -6 → 0                  | withTiming Easing.out(cubic)      | 150ms        |
| Footer CTA enable          | opacity 0.4 → 1.0                  | withTiming ease-out               | 150ms        |
| Éxito: total flash         | opacity 1 → 0.4 → 1               | withSequence withTiming           | 200ms total  |
| QuantityPicker enter       | translateY 200 → 0                 | spring damping:18 stiffness:160   | ~300ms       |
| QuantityPicker exit        | translateY 0 → 200                 | withTiming Easing.in(cubic)       | 180ms        |
| Skeleton shimmer           | opacity 1 → 0.4 → 1 (repeat −1)   | withRepeat/withSequence           | 800ms ciclo  |

Regla `prefers-reduced-motion`: si el sistema tiene reducción de movimiento
activada, eliminar las animaciones de escala y badge. Mantener solo los cambios
de opacidad (< 300ms, sin spring).

---

## 9. Interfaces TypeScript sugeridas

```typescript
// Props del componente principal
interface CajaScreenProps {
  businessName: string;
  onAdminUnlock: () => void; // callback cuando PIN es correcto
}

// Producto tal como llega del catálogo
interface ProductoCaja {
  id: number;
  nombre: string;
  precioCentavos: number;
  activo: boolean;
}

// Estado del carrito (local, no persiste entre sesiones)
type CartState = Record<number, number>; // productoId → cantidad

// Métodos de pago disponibles
type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'otro';

// Props de ProductCard
interface ProductCardProps {
  producto: ProductoCaja;
  quantity: number;
  onPress: () => void;     // tap → +1
  onLongPress: () => void; // long press → QuantityPicker
}

// Props del QuantityPickerModal
interface QuantityPickerModalProps {
  visible: boolean;
  producto: ProductoCaja;
  quantity: number;
  onConfirm: (qty: number) => void; // 0 = quitar
  onClose: () => void;
}

// Props del Footer
interface CajaFooterProps {
  totalCents: number;
  payment: MetodoPago;
  onPaymentChange: (p: MetodoPago) => void;
  onRegister: () => void;
  disabled: boolean;
  saving: boolean;
}
```

---

## 10. Notas de implementación

- La pantalla no vive en el tab bar normal. Debe ser una ruta separada
  `/(app)/caja` sin header de tabs. Acceso: desde un botón en configuraciones
  o desde la lógica de roles.
- El carrito vive en estado local de React (useState). No persiste entre
  recargas. Esta es una decisión intencional: el modo caja es efímero.
- Los productos se cargan con `getProductos()` filtrando `activo = true`. La
  query existente ya acepta ese filtro.
- El `createVenta` existente en `db/queries` ya acepta `items[]` + `metodoPago`.
  El componente debe adaptarse a esa interfaz.
- El `formatCents` de `lib/money` formatea el total del carrito.
- Para columnas responsivas: `useWindowDimensions().width` en el componente;
  calcular `numColumns` localmente, no en StyleSheet.
