## Diseño de interfaz

- Cualquier tarea que cree o modifique interfaz (HTML, CSS, componentes, layouts, animaciones, textos de UI) debe usar las skills de diseño instaladas sin que yo lo pida.
- Antes de construir una pantalla o sección nueva, usa /impeccable shape para planearla; al terminar, usa /impeccable polish y /impeccable audit sobre lo que cambiaste.
- Si la tarea involucra animaciones o transiciones, usa también las skills animate y review-animations, y animation-performance si hay lag.
- Si la tarea es para móvil, usa mobile-native. Antes de dar por terminada una pantalla, usa break-ui con datos extremos (nombres largos, listas vacías).
- No apliques estas reglas a cambios que no toquen la interfaz.
- Al terminar, dime en una línea qué skills usaste.

## Equipo de agentes

Para pantallas o funciones nuevas, el flujo es:
1. **app-disenador** → produce `docs/diseno/<pantalla>.md`
2. **app-programador** → implementa leyendo esa spec
3. **app-tester** → prueba y reporta fallos

Si app-tester reporta fallos, vuelve a app-programador (máximo 2 vueltas antes de escalar al usuario).

Para cambios pequeños (un color, un texto, un bug de una línea) hazlo tú directamente sin agentes.

Al terminar cualquier tarea con agentes, di en una línea qué agentes usaste.
