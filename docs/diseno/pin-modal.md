# Spec: pin-modal.tsx — Modal de PIN (unlock admin / setup)

## Contexto de diseño

Modal que aparece cuando el empleado (o el jefe) toca el candado en la pantalla
de caja. Tiene dos modos: crear PIN por primera vez (Setup) o verificar el PIN
existente (Verify). El pad numérico es custom — sin teclado del sistema — para
que la experiencia sea idéntica en iOS y Android y no dependa de si el teclado
del SO está habilitado.

Paleta idéntica al resto del producto. Presentación: bottom sheet en móvil
(animado desde abajo), modal centrado en tablet/web.

---

## 1. Estructura

### Modo Setup (sin PIN configurado)

```
┌──────────────────────────────────────────────┐
│  BACKDROP (semitransparente, toque cierra)   │
│  ┌────────────────────────────────────────┐  │
│  │  BOTTOM SHEET                          │  │
│  │                                        │  │
│  │  CREAR PIN DE ADMINISTRADOR            │  │  ← título
│  │  Elige 4 dígitos que solo tú sepas.    │  │  ← subtítulo
│  │                                        │  │
│  │  ● ● ● ●   ← indicadores de dígitos   │  │
│  │  (vacíos al inicio, se llenan al       │  │
│  │   tipear)                              │  │
│  │                                        │  │
│  │  [ 1 ] [ 2 ] [ 3 ]                    │  │
│  │  [ 4 ] [ 5 ] [ 6 ]                    │  │  ← pad numérico
│  │  [ 7 ] [ 8 ] [ 9 ]                    │  │
│  │  [ * ] [ 0 ] [⌫ ]                     │  │
│  │                                        │  │
│  │  Si está en paso "confirmar":          │  │
│  │  CONFIRMAR PIN                         │  │  ← título cambia
│  │  Repite los 4 dígitos.                 │  │
│  │                                        │  │
│  │  [error si no coinciden]               │  │
│  │                                        │  │
│  │  (no hay botón cancelar en setup —     │  │
│  │   el jefe debe completar el flujo)     │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### Modo Verify (PIN existente)

```
┌──────────────────────────────────────────────┐
│  BACKDROP                                    │
│  ┌────────────────────────────────────────┐  │
│  │  BOTTOM SHEET                          │  │
│  │                                        │  │
│  │  ACCESO ADMINISTRADOR                  │  │  ← título
│  │  Ingresa tu PIN.                       │  │  ← subtítulo
│  │                                        │  │
│  │  ○ ○ ○ ○   ← 4 círculos vacíos        │  │
│  │                                        │  │
│  │  [ 1 ] [ 2 ] [ 3 ]                    │  │
│  │  [ 4 ] [ 5 ] [ 6 ]                    │  │
│  │  [ 7 ] [ 8 ] [ 9 ]                    │  │
│  │  [ * ] [ 0 ] [⌫ ]                     │  │
│  │                                        │  │
│  │  [texto error si PIN incorrecto]       │  │
│  │                                        │  │
│  │  [ CANCELAR ]                          │  │  ← solo en Verify
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### Jerarquía de componentes

```
PinModal
├── Pressable backdrop (cierra en Verify, no en Setup)
└── Animated.View sheet
    ├── View handleBar (pill decorativa)
    ├── View content
    │   ├── Text title
    │   ├── Text subtitle
    │   ├── View dotsRow
    │   │   └── PinDot × 4 (lleno / vacío / error)
    │   ├── Text errorMessage (condicional)
    │   └── View pad
    │       └── PadButton × 12 (1-9, *, 0, ⌫)
    └── Pressable cancelButton (solo Verify)
```

---

## 2. Tipografía

| Elemento            | Familia | Tamaño | Peso | Letter-spacing | Line-height |
|---------------------|---------|--------|------|----------------|-------------|
| Título modal        | MONO    | 12pt   | 600  | 2.0            | —           |
| Subtítulo           | system  | 14pt   | 400  | 0              | 20pt        |
| Número en pad btn   | system  | 22pt   | 400  | 0              | —           |
| Borrar (⌫)          | system  | 20pt   | 400  | 0              | —           |
| "*" (inactivo)      | system  | 22pt   | 400  | 0              | —           |
| Error text          | MONO    | 10pt   | 400  | 0.3            | 16pt        |
| Cancelar button     | MONO    | 10pt   | 400  | 1.5            | —           |

El pad usa font system (no MONO) para que los números se vean más naturales y
grandes sin verse técnicos. El título y labels usan MONO para consistencia con
el sistema.

---

## 3. Colores y superficie

| Elemento                       | Token claro                      | Token oscuro                     |
|--------------------------------|----------------------------------|----------------------------------|
| Backdrop                       | `rgba(0, 0, 0, 0.55)`            | `rgba(0, 0, 0, 0.70)`            |
| Sheet bg                       | `colors.bg` (#F5F3EF)            | `colors.bg` dark                 |
| Handle bar                     | `colors.border`                  | `colors.border` dark             |
| Título                         | `colors.ink`                     | `colors.ink` dark                |
| Subtítulo                      | `colors.muted`                   | `colors.muted` dark              |
| Dot vacío (○)                  | `colors.border`                  | `colors.border` dark             |
| Dot lleno (●) — entrada normal | `colors.ink`                     | `colors.ink` dark                |
| Dot lleno — setup paso 2       | `colors.amber`                   | `colors.amber`                   |
| Dot en estado error (shake)    | `colors.error` (#C0392B)         | `colors.error`                   |
| Pad button bg                  | `colors.screenBg`                | `colors.screenBg` dark           |
| Pad button text                | `colors.ink`                     | `colors.ink` dark                |
| Pad button bg pressed          | `colors.border`                  | `colors.border` dark             |
| Pad button borrar bg           | `colors.screenBg`                | `colors.screenBg` dark           |
| Pad button borrar text         | `colors.muted`                   | `colors.muted` dark              |
| "*" (deshabilitado)            | `colors.border` (invisible)      | transparente                     |
| Error text                     | `colors.error`                   | `colors.error`                   |
| Cancelar text                  | `colors.muted`                   | `colors.muted` dark              |
| Cancelar border                | `colors.border`                  | `colors.border` dark             |

El botón `*` en la posición [3,1] del pad no tiene función. Se renderiza como
elemento inerte (sin Pressable real) para mantener la grilla simétrica del
teclado estándar. Su texto es invisible o ausente.

---

## 4. Espaciado

| Zona                             | Valor  |
|----------------------------------|--------|
| Sheet border radius (top)        | 20pt   |
| Sheet padding H                  | 24pt   |
| Sheet padding top                | 16pt   |
| Sheet padding bottom             | safe area bottom + 24pt |
| Handle bar width                 | 40pt   |
| Handle bar height                | 4pt    |
| Handle bar border radius         | 2pt    |
| Handle bar margin bottom         | 20pt   |
| Gap título → subtítulo           | 4pt    |
| Gap subtítulo → dots             | 24pt   |
| Gap dots → error text            | 12pt   |
| Gap dots → pad (sin error)       | 28pt   |
| Dots row gap entre círculos      | 16pt   |
| Dot size                         | 16pt × 16pt |
| Dot border radius                | 8pt (circular) |
| Pad row gap                      | 12pt   |
| Pad column gap                   | 12pt   |
| Pad button size                  | 72pt × 56pt (ver nota) |
| Pad button border radius         | 8pt    |
| Gap pad → cancelar               | 20pt   |
| Cancelar button min-height       | 48pt   |

Nota sobre pad button size: en pantallas pequeñas (width < 360pt) el ancho se
calcula como `(screenWidth - 48 - 24) / 3`. En pantallas mayores se fija en
72pt para no que los botones se vean enormes en iPad. Altura fija 56pt siempre.

---

## 5. Estados

### 5.1 Entrada de dígitos (ambos modos)
- Cada dígito ingresado llena un círculo (● negro o ● amber en paso 2 de Setup).
- El llenado del círculo tiene animación de escala (ver sección 8).
- Al llegar a 4 dígitos: procesamiento inmediato (no requiere botón "OK").

### 5.2 Setup — paso 1 (ingresar PIN)
- Título: "CREAR PIN DE ADMINISTRADOR"
- Subtítulo: "Elige 4 dígitos que solo tú sepas."
- Dots: negro (ink) al llenar.
- Al completar 4 dígitos: transición suave al paso 2 (los dots se vacían con
  animación, el título cambia).

### 5.3 Setup — paso 2 (confirmar PIN)
- Título: "CONFIRMAR PIN"
- Subtítulo: "Repite los 4 dígitos."
- Dots: amber al llenar (señal visual de que es el paso de confirmación).
- Al completar 4 dígitos:
  - Coinciden: el PIN se guarda → callback `onSetupComplete()` → modal cierra.
  - No coinciden: shake en los dots + "Los PINes no coinciden." → limpia ambos
    pasos y vuelve al paso 1.

### 5.4 Verify — ingreso correcto
- Al completar 4 dígitos y coincidir: callback `onVerifySuccess()` → modal
  cierra.
- No hay animación de éxito explícita — la navegación es la confirmación.

### 5.5 Verify — ingreso incorrecto
- Shake horizontal en la fila de dots (3 ciclos, 60ms cada uno).
- Vibración: `expo-haptics` `NotificationFeedbackType.Error`.
- Texto bajo los dots: "PIN incorrecto."
- Los dots se vacían después del shake (delay 300ms).
- El texto de error desaparece cuando el usuario empieza a tipear de nuevo.

### 5.6 Borrar dígito (botón ⌫)
- Elimina el último dígito ingresado.
- El dot correspondiente se vacía con animación de escala inversa.
- Si no hay dígitos: el botón ⌫ no tiene efecto (sin feedback).

### 5.7 Estado guardando (Setup paso 2 coincide)
- Los pad buttons se deshabilitan brevemente mientras se guarda el PIN.
- Sin spinner visible (el guardado debe ser < 100ms, es operación local).

### 5.8 Cancelar (solo en Verify)
- Toque en "CANCELAR" o en el backdrop → cierra el modal sin acción.
- Animación de salida (ver sección 8).

---

## 6. Interacciones

### Toque en pad button
- Feedback táctil inmediato en `pointerDown`:
  - Visual: escala 0.92 (80ms ease-out) → 1.0 (80ms ease-out).
  - Sin haptic en cada dígito (solo en error y éxito, para no sobrecargar).
- El número se agrega al PIN interno (string de max 4 chars).

### Completar 4 dígitos
- Procesamiento automático, sin botón "OK".
- Un breve delay de 50ms antes de procesar permite que la animación del último
  dot termine visualmente antes del resultado.

### Long-press en pad (sin función)
- No hacer nada. Prevenir que aparezca el menú contextual del sistema.
  `onLongPress={() => {}}` en cada botón.

### Backdrop
- En modo Verify: toque cierra el modal (callback `onDismiss`).
- En modo Setup: el backdrop no es interactivo. El jefe debe completar el flujo
  o el empleado debe esperar a que alguien complete el setup.

---

## 7. Accesibilidad

| Elemento             | Requisito                                                             |
|----------------------|-----------------------------------------------------------------------|
| Cada pad button      | `accessibilityRole="button"`, `accessibilityLabel="{número}"` para 0-9, "borrar" para ⌫ |
| "*" placeholder      | `accessibilityElementsHidden={true}` o `accessible={false}` |
| Dots row             | `accessibilityRole="none"`, `accessibilityLabel="PIN: {n} de 4 dígitos ingresados"` en el View contenedor |
| Título               | `accessibilityRole="header"` |
| Error text           | `accessibilityRole="alert"` (se anunciará automáticamente al VoiceOver) |
| Cancelar             | `accessibilityRole="button"`, `accessibilityLabel="Cancelar"` |
| Touch targets        | Pad buttons: 72×56pt >> 44×44pt mínimo. ✓ |
| Contraste            | ink (#1A1A1A) sobre screenBg (#EAE7E1): 14.5:1. ✓ |
| Contraste error      | #C0392B sobre screenBg: 4.6:1. ✓ (pasa AA) |

Nota: el PIN no debe anunciarse dígito a dígito por el lector de pantalla
(seguridad). El contenedor de dots usa un label genérico ("n de 4 dígitos").
Los dígitos del pad anuncian el número para que el usuario sepa qué está
pulsando, pero no se confirma qué dígitos forman el PIN.

---

## 8. Animaciones

Todas con Reanimated 3 en UI thread.

| Elemento                    | Efecto                                      | Curva / Spring                          | Duración       |
|-----------------------------|---------------------------------------------|-----------------------------------------|----------------|
| Sheet entrada               | translateY 300 → 0, opacity 0 → 1           | spring damping:20, stiffness:180        | ~350ms         |
| Sheet salida                | translateY 0 → 300                          | withTiming Easing.in(cubic)             | 200ms          |
| Backdrop entrada            | opacity 0 → 1                               | withTiming ease-out                     | 200ms          |
| Backdrop salida             | opacity 1 → 0                               | withTiming ease-out                     | 180ms          |
| Dot fill (vacío → lleno)    | scale 0.4 → 1.0                             | spring damping:15, stiffness:250        | ~120ms         |
| Dot unfill (lleno → vacío)  | scale 1.0 → 0.4, opacity 1 → 0             | withTiming ease-out                     | 100ms          |
| Shake en error              | translateX: 0→-8→8→-8→8→-6→6→0 (3 ciclos) | withSequence de withTiming 60ms cada uno| 420ms total    |
| Color dots step1→step2      | fill ink → amber                            | withTiming ease-out                     | 150ms          |
| Dots clear (step2 fail)     | todos los dots se vacían en secuencia       | stagger 50ms entre cada uno             | ~250ms total   |
| Pad button press-in         | scale 1.0 → 0.92                            | withTiming ease-out                     | 80ms           |
| Pad button press-out        | scale 0.92 → 1.0                            | withTiming ease-out                     | 80ms           |
| Error text aparición        | opacity 0 → 1, translateY -4 → 0           | withTiming ease-out                     | 150ms          |
| Transición paso 1 → 2 Setup | dots fade-out, título cambia, dots fade-in  | withSequence withTiming ease-out        | 300ms total    |

Regla `prefers-reduced-motion`: si reducción de movimiento está activada:
- Sheet: aparece instantáneamente (sin traducción, solo opacity 200ms).
- Dots: sin scale, solo opacity.
- Shake en error: reemplazar por parpadeo de dots a `colors.error` (3×
  withTiming 100ms cada uno).

---

## 9. Interfaces TypeScript sugeridas

```typescript
// Modos del modal
type PinModalMode = 'setup' | 'verify';

// Props del componente
interface PinModalProps {
  visible: boolean;
  mode: PinModalMode;
  onSetupComplete: () => void;    // PIN guardado exitosamente
  onVerifySuccess: () => void;    // PIN correcto, navegar a admin
  onDismiss: () => void;          // Solo en modo verify; backdrop o cancelar
}

// Estado interno del pad (no expuesto)
interface PinState {
  step: 'first' | 'confirm';     // Solo en Setup
  digits: string;                 // Máx 4 chars, sin mostrar
  firstPin: string;               // Solo en Setup, para comparar en step confirm
  error: string | null;
  shaking: boolean;
}

// Props de PadButton
interface PadButtonProps {
  label: string;          // '0'-'9', '⌫', o '' para el placeholder
  onPress: () => void;
  disabled?: boolean;
  variant?: 'default' | 'delete' | 'placeholder';
}

// Props de PinDot
interface PinDotProps {
  filled: boolean;
  color?: 'ink' | 'amber' | 'error';
}
```

---

## 10. Lógica de almacenamiento del PIN

El PIN se guarda de forma segura. En el componente, la lectura y escritura del
PIN se hace a través de una función de la capa `lib/pin.ts` (a implementar):

```typescript
// lib/pin.ts — interfaz esperada por el componente
export async function getPin(): Promise<string | null>   // null si no configurado
export async function savePin(pin: string): Promise<void>
export async function verifyPin(input: string): Promise<boolean>
```

Implementación recomendada:
- iOS / Android: `expo-secure-store` (`SecureStore.setItemAsync`).
- Web (si aplica): `localStorage` cifrado con una clave derivada del
  `installationId`.
- El PIN se almacena como hash (SHA-256 sin salt es suficiente para este
  caso de uso; es local, no de servidor). No almacenar el PIN en texto plano.
- La función `verifyPin` hace el hash del input y compara con el almacenado.

El componente `PinModal` no implementa el storage directamente — recibe las
funciones como dependencias implícitas a través del `lib/pin.ts`. Esto permite
mockear en tests y cambiar la implementación sin modificar el componente.

---

## 11. Notas de implementación

- El modal se presenta como pantalla completa en iOS si se usa
  `Modal presentationStyle="pageSheet"`. Para consistencia con el diseño de
  bottom sheet, usar un `Modal` transparente con el sheet animado manualmente
  (Reanimated). Esto da control total sobre la animación de entrada/salida.
- El `*` en posición [3,0] del pad numérico estándar no tiene función en este
  diseño. Renderizar como `View` vacío o con texto invisible, no como
  `Pressable`.
- El sheet debe respetar el `safe-area-inset-bottom` para el padding inferior.
  Usar `useSafeAreaInsets().bottom`.
- En iPad (pantalla ancha), el sheet puede presentarse como modal centrado con
  `maxWidth: 360pt, borderRadius: 16pt en todos los lados`. Detectar con
  `useWindowDimensions().width > 600`.
- El diseño no incluye "olvidé mi PIN" en v1. Si el jefe olvida el PIN, deberá
  reiniciar el modo caja desde la configuración (con sesión admin activa en
  otro dispositivo). Esta limitación debe documentarse en Settings.
