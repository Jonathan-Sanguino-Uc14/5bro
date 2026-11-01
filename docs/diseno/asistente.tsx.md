# Spec: asistente.tsx — Chat con IA financiera

## Contexto de la pantalla

El asistente es un chat de lenguaje natural donde el usuario pregunta sobre sus propias finanzas. No es un chatbot genérico — es una interfaz de consulta sobre datos reales que el usuario ya registró. El tono del PRODUCT.md es honesto: la IA solo razona sobre lo que fue registrado, nunca fabrica cifras, siempre etiqueta estimaciones como tales.

La pantalla actual es un placeholder. Este documento es el diseño completo desde cero.

**Modo UX:** Operate. El usuario llega a hacer una pregunta rápida y salir. El diseño subordina la expresión a la claridad y velocidad.

---

## Estructura visual completa

```
┌────────────────────────────────────┐
│ Header (safe area top)             │
│  ✦ ASISTENTE DE NEGOCIO (carrier) │
│  leticIA          [🗑 LIMPIAR]     │
├────────────────────────────────────┤
│                                    │
│  Área de mensajes (scroll)         │
│                                    │
│  ┌─────────────────────────────┐  │
│  │ Estado vacío (sin mensajes)  │  │
│  │                              │  │
│  │   ✦                          │  │
│  │   "¿Qué querés saber         │  │
│  │    sobre tu negocio?"        │  │
│  │                              │  │
│  │  [¿Cuánto vendí hoy?]        │  │
│  │  [¿Cuál es mi gasto mayor?]  │  │
│  │  [Resumen de esta semana]    │  │
│  └─────────────────────────────┘  │
│                                    │
│  [Burbuja IA]                      │
│  [Burbuja usuario]                 │
│  [Indicador de escritura…]        │
│                                    │
├────────────────────────────────────┤
│ Barra de entrada (safe area bottom)│
│  [Escribí tu pregunta…] [→ ENVIAR]│
└────────────────────────────────────┘
```

---

## Tipografía

| Elemento                   | Tamaño | Peso  | Familia | Espaciado | LineHeight |
|----------------------------|--------|-------|---------|-----------|------------|
| carrier label              | 7pt    | 400   | MONO    | 2         | —          |
| título "leticIA"            | 24pt   | 700   | system  | -0.5      | 30         |
| btn "LIMPIAR" texto        | 8pt    | 400   | MONO    | 1.5       | —          |
| burbuja IA texto           | 14pt   | 400   | system  | 0         | 20         |
| burbuja usuario texto      | 14pt   | 400   | system  | 0         | 20         |
| indicador "Analizando…"   | 10pt   | 400   | MONO    | 0.5       | —          |
| suggestion chip texto      | 11pt   | 400   | MONO    | 0.3       | 16         |
| empty state headline       | 15pt   | 600   | system  | -0.2      | 22         |
| empty state sub            | 11pt   | 400   | MONO    | 0.2       | 17         |
| input placeholder          | 14pt   | 400   | system  | 0         | —          |
| input texto                | 14pt   | 400   | system  | 0         | 20         |
| btn ENVIAR texto           | 9pt    | 700   | MONO    | 1.5       | —          |
| error inline texto         | 10pt   | 400   | MONO    | 0.3       | 16         |
| límite diario texto        | 9pt    | 400   | MONO    | 0.3       | 14         |

---

## Colores

| Elemento                      | Token / Valor                              |
|-------------------------------|--------------------------------------------|
| Root bg                       | `colors.bg`                                |
| Header bg                     | `colors.bg`                                |
| carrier                       | `colors.muted`                             |
| título                        | `colors.ink`                               |
| btn limpiar texto             | `colors.muted`                             |
| btn limpiar pressed           | `colors.ink`                               |
| ─ mensajes ─                  |                                            |
| burbuja IA bg                 | `colors.screenBg` (leve contraste con bg) |
| burbuja IA texto              | `colors.ink`                               |
| burbuja IA border             | `colors.border`                            |
| burbuja usuario bg            | `colors.ink`                               |
| burbuja usuario texto         | `colors.bg`                               |
| indicador "Analizando" texto  | `colors.muted`                             |
| indicador puntos              | `colors.amber`                             |
| ─ estado vacío ─              |                                            |
| ✦ icono                       | `colors.amber`                             |
| headline                      | `colors.ink`                               |
| sub                           | `colors.muted`                             |
| suggestion chip bg            | `colors.screenBg`                          |
| suggestion chip border        | `colors.border`                            |
| suggestion chip texto         | `colors.ink`                               |
| suggestion chip pressed bg    | `colors.ink`                               |
| suggestion chip pressed texto | `colors.bg`                                |
| ─ barra entrada ─             |                                            |
| barra bg                      | `colors.bg`                                |
| barra border top              | `colors.border`                            |
| input bg                      | `colors.screenBg`                          |
| input border                  | `colors.border`                            |
| input focused border          | `colors.borderStrong`                      |
| input texto                   | `colors.ink`                               |
| input placeholder             | `colors.muted`                             |
| btn enviar bg (activo)        | `colors.amber`                             |
| btn enviar bg (inactivo)      | `colors.border`                            |
| btn enviar texto activo       | `#1A1A1A`                                  |
| btn enviar texto inactivo     | `colors.muted`                             |
| ─ error ─                     |                                            |
| error banner bg               | `colors.error` al 12%                     |
| error banner acento           | `colors.error`                             |
| error banner texto            | `colors.error`                             |
| límite alcanzado texto        | `colors.muted`                             |

---

## Espaciado

| Zona                             | Valor  |
|----------------------------------|--------|
| Header padding H                 | 20pt   |
| Header padding top               | 16pt   |
| Header padding bottom            | 12pt   |
| Header gap entre carrier y título| 4pt    |
| ─ mensajes ─                     |        |
| Scroll padding H                 | 16pt   |
| Scroll padding top               | 12pt   |
| Scroll padding bottom            | 12pt   |
| Gap entre burbujas               | 12pt   |
| Burbuja IA padding H             | 16pt   |
| Burbuja IA padding V             | 12pt   |
| Burbuja IA max-width             | 85% del ancho disponible |
| Burbuja usuario padding H        | 16pt   |
| Burbuja usuario padding V        | 12pt   |
| Burbuja usuario max-width        | 80% del ancho disponible |
| Alineación IA                    | izquierda |
| Alineación usuario               | derecha |
| ─ estado vacío ─                 |        |
| Icono ✦ tamaño                   | 32pt   |
| Icono margin bottom              | 16pt   |
| Headline margin bottom           | 8pt    |
| Sub margin bottom                | 24pt   |
| Gap entre suggestion chips       | 8pt    |
| Chip padding H                   | 16pt   |
| Chip padding V                   | 12pt   |
| Chip minHeight                   | 44pt   |
| ─ barra entrada ─                |        |
| Barra padding H                  | 12pt   |
| Barra padding V                  | 8pt    |
| Barra padding bottom             | insets.bottom + 8pt |
| Input padding H                  | 12pt   |
| Input padding V                  | 10pt   |
| Input border radius              | 0pt (consistente con el resto de la app) |
| Input min-height                 | 44pt   |
| Input max-height                 | 120pt (scroll interno para textos largos) |
| Gap input → btn enviar           | 8pt    |
| Btn enviar size                  | 44×44pt |

---

## Layout detallado de la barra de entrada

```
┌─────────────────────────────────────────┐
│ padding H: 12pt,  padding V: 8pt        │
│                                         │
│  ┌─────────────────────────────┐ ┌────┐ │
│  │ TextInput multiline         │ │ →  │ │
│  │ "Escribí tu pregunta…"      │ │ENVIAR│
│  │ minH 44, maxH 120           │ │44×44│
│  └─────────────────────────────┘ └────┘ │
│                                         │
│ padding bottom: insets.bottom + 8pt     │
└─────────────────────────────────────────┘
```

- El input crece con el texto hasta `maxH: 120`, luego hace scroll interno.
- El botón ENVIAR es cuadrado (44×44), fondo `colors.amber` cuando hay texto, `colors.border` cuando vacío.
- Cuando el teclado aparece, la barra sube con `KeyboardAvoidingView` (behavior `padding` en iOS, `height` en Android).

---

## Estructura de datos de un mensaje

```typescript
type MessageRole = 'user' | 'assistant' | 'error';

interface ChatMessage {
  id: string;           // uuid o timestamp string
  role: MessageRole;
  content: string;      // texto del mensaje
  timestamp: number;    // Date.now()
}
```

El historial de chat se almacena en `useState<ChatMessage[]>`. Persistencia opcional en `AsyncStorage` o SQLite — fuera del alcance de este spec.

---

## Estados de la pantalla

### Vacío (sin mensajes previos)
- Icono `✦` en `colors.amber`, centrado, 32pt.
- Headline: "¿Qué querés saber sobre tu negocio?" — 15pt system, `colors.ink`.
- Sub: "Preguntame sobre tus ventas, gastos o tendencias." — MONO 11pt, `colors.muted`.
- 3 chips de sugerencia debajo:
  1. "¿Cuánto vendí hoy?"
  2. "¿Cuál es mi gasto más grande del mes?"
  3. "Resumen de esta semana"
- Al tocar un chip: el texto se copia en el input y se envía automáticamente (1 toque = pregunta enviada).
- El estado vacío desaparece en cuanto hay al menos un mensaje.

### Cargando respuesta (IA pensando)
- La burbuja de respuesta aparece en el lugar donde irá la respuesta.
- Dentro de la burbuja: tres puntos animados (`•••`) con fade in/out escalonado.
- Texto superpuesto debajo de la burbuja: "Analizando datos…" — MONO 10pt, `colors.muted`.
- El input queda habilitado (el usuario puede escribir otra pregunta).
- El botón ENVIAR está deshabilitado mientras hay una respuesta en curso (evitar múltiples requests en paralelo). El ícono cambia a un spinner pequeño.

### Respuesta recibida
- El texto de la IA aparece con fade in en 300ms.
- El scroll se mueve automáticamente al último mensaje.
- El input vuelve al estado normal.

### Error de red / servicio
- En lugar de la burbuja de respuesta: banner de error dentro del hilo de chat.
- Fondo `colors.error` al 12%, acento izquierdo 2pt en `colors.error`.
- Texto: "No se pudo conectar. Verificá tu conexión e intentá de nuevo."
- Botón "REINTENTAR" a la derecha del texto: MONO 8pt, `colors.error`.
- `accessibilityRole="button"`, `accessibilityLabel="Reintentar el último mensaje"`.

### Sin conexión
- Banner permanente debajo del header (no dentro del hilo):
  - Texto: "Sin conexión — los mensajes no se pueden enviar." — MONO 9pt, `colors.muted`.
  - Fondo `colors.screenBg`, border `colors.border`.
- El input y el botón ENVIAR están deshabilitados (`opacity: 0.4`, `editable: false`).

### Límite diario alcanzado
- Cuando el servidor responde con error de cuota:
  - Banner debajo del header:
    - Texto: "Alcanzaste el límite de preguntas de hoy. Volvé mañana."
  - Input deshabilitado.

### Conversación activa (con mensajes)
- Las burbujas del usuario están alineadas a la derecha, fondo `colors.ink`, texto `colors.bg`.
- Las burbujas de la IA están alineadas a la izquierda, fondo `colors.screenBg`, borde `colors.border`.
- El scroll salta al último mensaje cuando llega una respuesta nueva.
- No hay timestamps visibles entre mensajes (reducen la densidad de información sin aportar valor en este contexto).

### Limpiar conversación
- El botón "LIMPIAR" en el header es un Pressable con texto MONO 8pt.
- Al tocar: `Alert.alert` nativo:
  - Título: "Limpiar conversación"
  - Mensaje: "Se borrarán todos los mensajes de esta sesión."
  - Acciones: Cancelar / Limpiar (destructivo)
- Al confirmar: `setMessages([])` → vuelve al estado vacío.

---

## Accesibilidad

- `accessibilityRole="header"` en el título "leticIA".
- Las burbujas de mensaje usan `accessibilityRole="text"`.
- Cada burbuja tiene `accessibilityLabel`:
  - Usuario: `"Tú: ${content}"`
  - IA: `"leticIA: ${content}"`
- El indicador de escritura tiene `accessibilityLabel="leticIA está procesando tu pregunta"` y `accessibilityLiveRegion="polite"`.
- El input tiene:
  ```
  accessibilityLabel="Escribe tu pregunta"
  accessibilityRole="search"
  returnKeyType="send"
  ```
- El botón enviar tiene:
  ```
  accessibilityRole="button"
  accessibilityLabel="Enviar pregunta"
  accessibilityState={{ disabled: !hasText || loading }}
  ```
- El botón limpiar tiene:
  ```
  accessibilityRole="button"
  accessibilityLabel="Limpiar conversación"
  ```
- Los chips de sugerencia tienen:
  ```
  accessibilityRole="button"
  accessibilityLabel={`Preguntar: ${sugerencia}`}
  ```
- El scroll de mensajes tiene `accessibilityLiveRegion="polite"` para que los lectores de pantalla anuncien nuevos mensajes.

---

## Animaciones

| Elemento                      | Tipo              | Curva                          | Duración  |
|-------------------------------|-------------------|--------------------------------|-----------|
| Header entrada                | fade + slideY     | `Easing.out(Easing.cubic)`     | 320ms     |
| Estado vacío entrada          | fade              | `Easing.out(Easing.cubic)`     | 300ms, delay 120ms |
| Suggestion chips              | fade + slideY     | `Easing.out(Easing.quad)`      | 250ms, delay escalonado 40ms por chip |
| Burbuja usuario entrada       | fade + slideX(+8) | `Easing.out(Easing.cubic)`     | 220ms     |
| Burbuja IA entrada            | fade + slideX(-8) | `Easing.out(Easing.cubic)`     | 280ms     |
| Indicador puntos (•••)        | opacidad cíclica  | `Easing.inOut(Easing.sin)`     | 400ms por punto, delay 150ms entre puntos |
| Error banner entrada          | fade              | `Easing.out(Easing.quad)`      | 200ms     |
| Btn enviar habilitado/inactivo| color/opacity     | sin animación (estado inmediato) | —       |
| Chip sugerencia press         | scale 0.97        | spring damping 20              | —         |
| Scroll al nuevo mensaje       | scroll automático | `scrollToEnd({ animated: true })` | 300ms  |

**Nota sobre Reduce Motion:** los slides de burbujas se reducen a solo fade. El scroll automático permanece.

---

## Lógica de envío de mensaje

```
1. Usuario escribe texto → btn ENVIAR se activa.
2. Usuario toca ENVIAR (o pulsa Return en teclado):
   - Agregar mensaje { role: 'user', content: text } al hilo.
   - Limpiar el input.
   - Hacer scroll al final.
   - Mostrar burbuja de carga (dots).
3. Llamar a la función de proxy de IA (cloud function).
   - Preparar contexto: resumen financiero (totales del día/semana/mes) + historial de chat (últimos N mensajes).
   - La IA recibe: system instructions + business_summary + conversation_history + pregunta.
4. Respuesta recibida:
   - Reemplazar burbuja de carga con burbuja de respuesta.
   - Animar entrada (fade in).
   - Hacer scroll al final.
5. Error:
   - Reemplazar burbuja de carga con burbuja de error + btn REINTENTAR.
```

El último mensaje del usuario se guarda en estado para el reintento. Al tocar REINTENTAR se reenvía sin agregar un mensaje nuevo al hilo.

---

## Flujo de datos para el contexto de la IA

El componente debe construir un `businessSummary` antes de enviar. Este resumen incluye:
- Fecha actual.
- Nombre del negocio.
- Totales del período (hoy, esta semana, este mes): ventas, compras, gastos, ganancia estimada.
- Cantidad de días con registros en el mes.
- Conceptos más frecuentes (top 3).

El resumen se pasa como parte del prompt del sistema. La IA **no** tiene acceso a la base de datos — todo el cálculo ocurre en el cliente antes de enviar.

---

## Cambios respecto a la pantalla actual

La pantalla actual es un placeholder con header animado y una card de "PRÓXIMAMENTE". Esta spec reemplaza **todo** el contenido de la pantalla con el diseño funcional completo.

Elementos del placeholder que se conservan:
- El `header` con el carrier "ASISTENTE DE NEGOCIO" y el título "leticIA".
- Las animaciones de entrada del header.

Elementos que se reemplazan:
- El `body` con la card vacía → reemplazado por el `ScrollView` de mensajes + barra de entrada.
- El texto "PRÓXIMAMENTE" → eliminado.
- El estilo `card` → eliminado.

Nuevos elementos a agregar:
- Estado vacío con icono, headline, sub y chips de sugerencia.
- `FlatList` o `ScrollView` de mensajes con burbujas IA y usuario.
- Indicador de escritura animado.
- Barra de entrada con TextInput multiline + botón ENVIAR.
- Botón "LIMPIAR" en el header.
- Estados de error / sin conexión / límite alcanzado.
- Lógica de envío, estado de carga y manejo de errores.
