# 5Bro (leticIA) — Product Backlog, Historias y Tareas

Construido leyendo la app real (`mi-app/src`), el esquema de base de datos, las pruebas y los documentos de `docs/`. El formato de tarjeta sigue tu ejemplo de Trello.

**Cómo leerlo**
- **Estado:** `HECHO` = ya existe en la app (puedes moverlo a *Terminado* o *En revisión*) · `AJUSTAR` = existe pero difiere de lo que dice Trello · `PENDIENTE` = la app aún no lo tiene.
- **Dónde está:** archivo y pantalla de la app para ubicarlo rápido.
- Los IDs de tu tablero se conservan (F1-HU-01, F1-HU-02, F3-HU-01, F4-HU-01, F5-HU-01, F6-HU-01 y sus T-01…). Lo nuevo sigue la misma numeración.
- Cada tarea suma 5 puntos entre sus criterios de aceptación (CA).

---

## 0. Hallazgos: lo que la app hace distinto a lo que dice el tablero

| # | Hallazgo | Impacto |
|---|----------|---------|
| 1 | El botón **«+»** (`nueva.tsx`) solo ofrece **Venta** y **Gasto**. No existe pantalla de «registrar compra». Las compras nacen al **reponer inventario** (Productos → Inventario) y aparecen en el historial como salida. | La tarjeta *T-04 [F1-HU-01] Programar la pantalla de registro de compras* corresponde, en la app, al formulario de **reposición de existencias**. |
| 2 | En **modo administrador** el botón «+» **oculta Venta** y solo muestra Gasto; las ventas se registran en el **modo vendedor (Caja)**, o con la pestaña Venta en modo vendedor. | Las ventas son una función de F8 (Caja), no solo de F1. |
| 3 | La app tiene **modo vendedor/administrador con PIN**, **biometría**, **modo oscuro con transición circular**, **recetas y costos**, **exportación CSV** y **búsqueda y borrado en historial**. Nada de esto está como épica en el tablero. | Se agregan épicas F8 y F9 y historias nuevas en F1, F5, F6 y F7. |
| 4 | Trello pide contraseña de **8 caracteres**; el código acepta **6**. Trello dice que mantener sesión y entrar sin contraseña están fuera de alcance; la app ya **mantiene la sesión y desbloquea con biometría**. | Ajustar criterio o código (F6). |
| 5 | F5-HU-01 excluye búsqueda y borrado, pero el historial **ya busca por concepto y elimina por pulsación larga**. Las **etiquetas de estado** que pide F5 **no existen**. | Historias F5-HU-02 y F5-HU-03 (hechas) y F5-HU-04 (pendiente). |
| 6 | F4-HU-01 habla de reglas RLS por usuario, pero las operaciones se guardan en **SQLite local (`ventas.db`)** del dispositivo; Supabase se usa para cuenta, perfil y ajustes. El esquema de Supabase y el local **no son idénticos**. | Decisión de arquitectura pendiente (F9-HU-04). |
| 7 | La opción **«Exportar mis datos»** no es un botón en Configuración sino un enlace a la pantalla **Exportar** (`ventas/exportar.tsx`). | Cumple CA4 con otro camino. |
| 8 | Hay **código sin uso**: `ventas/index`, `ventas/insumos`, `ventas/metricas`, `ventas/productos` solo redirigen; `ventas/historial.tsx` (historial por día) no tiene enlace de entrada. | Limpieza (F9-HU-02). |
| 9 | Riesgos de seguridad: PIN sin límite de intentos; en web el hash del PIN no es criptográfico; sin hardware biométrico el desbloqueo pasa sin validar; el servidor de IA es solo de desarrollo. | Historias F8-HU-04, F6-HU-02 y F9-HU-03. |

---

## 1. Product Backlog (9 épicas)

| ID | Épica | Qué cubre en la app | Dónde |
|----|-------|---------------------|-------|
| F1 | Registro de operaciones, productos e inventario | Registrar gastos y ventas, catálogo de productos, insumos, recetas, inicio y navegación | Inicio, «+», Productos |
| F2 | Métricas Financieras | Balance, ventas, gastos, comparación, gráfico diario, venta promedio, producto destacado | Pestaña Métricas |
| F3 | Asistente Financiero con IA | Chat con IA sobre los datos del negocio | Pestaña Asistente |
| F4 | Datos y Seguridad | Montos en centavos, fechas locales, migración, aislamiento, exportación CSV | Base de datos, Exportar |
| F5 | Historial de Operaciones | Lista, filtros, búsqueda, paginación, eliminación | Historial |
| F6 | Inicio de Sesión y Cuenta | Registro, login, sesión persistente, biometría | Pantallas de acceso |
| F7 | Configuración y Preferencias | Perfil, modo oscuro, accesos, cerrar sesión | Engranaje → Configuración |
| F8 | Modo Vendedor (Caja) y PIN | Punto de venta rápido, PIN de administrador, cambio de modo | Caja, PIN |
| F9 | Calidad, Pruebas y Preparación a Producción | Pruebas, limpieza de código, servidor de IA, esquema de datos | Transversal |

---

## 2. Historias de usuario (30)

| Historia | Épica | Estado | Pts | Prioridad |
|----------|-------|--------|-----|-----------|
| F1-HU-01 Registrar gastos y ventas desde «+» | F1 | AJUSTAR | 5 | Highest |
| F1-HU-02 Navegar fácil y rápido | F1 | HECHO | 3 | High |
| F1-HU-03 Administrar el catálogo de productos | F1 | HECHO | 8 | High |
| F1-HU-04 Controlar insumos y reponer existencias | F1 | HECHO | 8 | High |
| F1-HU-05 Definir receta y costo de cada producto | F1 | HECHO | 5 | Medium |
| F1-HU-06 Ver el resumen del día en Inicio | F1 | HECHO | 5 | High |
| F1-HU-07 Recibir aviso de stock bajo | F1 | PENDIENTE | 3 | Low |
| F2-HU-01 Ver mi balance por período | F2 | HECHO | 5 | High |
| F2-HU-02 Ver cómo evolucionan mis ventas | F2 | HECHO | 5 | Medium |
| F2-HU-03 Conocer venta promedio y producto destacado | F2 | HECHO | 3 | Medium |
| F3-HU-01 Resolver dudas con el asistente de IA | F3 | HECHO | 10 | High |
| F3-HU-02 Usar sugerencias y limpiar la conversación | F3 | HECHO | 2 | Low |
| F4-HU-01 Datos protegidos y aislados | F4 | AJUSTAR | 8 | High |
| F4-HU-02 Exportar mi historial a CSV | F4 | HECHO | 5 | Medium |
| F4-HU-03 Mantener mis datos unificados tras actualizar | F4 | HECHO | 5 | Medium |
| F4-HU-04 Respaldar y restaurar mis datos | F4 | PENDIENTE | 8 | Low |
| F5-HU-01 Revisar operaciones pasadas | F5 | HECHO | 5 | Low |
| F5-HU-02 Buscar operaciones por concepto | F5 | HECHO | 3 | Medium |
| F5-HU-03 Eliminar una operación registrada por error | F5 | HECHO | 5 | Medium |
| F5-HU-04 Etiquetar y editar operaciones | F5 | PENDIENTE | 5 | Low |
| F6-HU-01 Crear cuenta e iniciar sesión | F6 | AJUSTAR | 3 | Medium |
| F6-HU-02 Mantener sesión y entrar con biometría | F6 | AJUSTAR | 5 | Medium |
| F6-HU-03 Recuperar mi contraseña | F6 | PENDIENTE | 5 | Low |
| F7-HU-01 Editar el perfil de mi negocio | F7 | HECHO | 3 | Low |
| F7-HU-02 Elegir modo oscuro o claro | F7 | HECHO | 5 | Low |
| F7-HU-03 Cerrar sesión y salir de la app | F7 | HECHO | 2 | Medium |
| F7-HU-04 Elegir la moneda del negocio | F7 | PENDIENTE | 3 | Low |
| F8-HU-01 Registrar ventas rápido en caja | F8 | HECHO | 8 | Highest |
| F8-HU-02 Proteger el modo administrador con PIN | F8 | HECHO | 5 | High |
| F8-HU-03 Cambiar entre modo administrador y vendedor | F8 | HECHO | 3 | High |
| F8-HU-04 Reforzar la seguridad del PIN | F8 | PENDIENTE | 5 | Medium |

Historias de F9 (calidad) en la sección 3, al final.

---

## 3. Historias con sus tareas

Formato de tarea: **título** · `dónde` · estado → descripción → Resultado Esperado → estimación → CA con puntos.

---

# F1 — Registro de operaciones, productos e inventario

## F1-HU-01 — Como emprendedor quiero poder registrar mis movimientos de manera fácil para tener cuentas claras *(en tablero, AJUSTAR)*
**Dónde:** botón «+» → `src/app/(app)/nueva.tsx` · **Prioridad:** Highest · **Pts:** 5
**Ajuste:** los tipos reales son **Gasto** y **Venta** (venta solo visible en modo vendedor). Las compras se registran al reponer inventario (F1-HU-04).
**Resultado Esperado:** pantalla «Registrar» que guarda gastos y ventas y los muestra en Inicio e Historial.
**Criterios de aceptación:**
- CA1 - Dado que el usuario eligió Venta o Gasto, cuando presiona «Guardar», se guarda y muestra «✓ GUARDADO · PUEDES REGISTRAR OTRO».
- CA2 - Dado que registra un monto, se despliega teclado decimal y el valor se guarda en centavos exactos.
- CA3 - Dado que tiene un caso especial, puede dejar una nota.

**Tareas**
- **T-01 [F1-HU-01]: Diseñar las pantallas** · `docs/diseno/nueva.tsx.md` · *(en tablero)*
- **T-02 [F1-HU-01]: Programar el registro de gasto** · `nueva.tsx` · HECHO
  - Descripción: formulario con concepto, monto, fecha (flechas ← →, «HOY» bloqueado), categoría opcional (Mercancía, Transporte, Comisiones, Otros) y nota; chip «REPONER INVENTARIO →».
  - Resultado Esperado: gasto guardado como operación manual de tipo gasto.
  - CA1 - Muestra todos los campos y el botón «GUARDAR GASTO» — 2 puntos
  - CA2 - Concepto vacío muestra «El concepto es obligatorio.» y monto 0 muestra «Ingresa un monto mayor a cero.» — 2 puntos
  - CA3 - Tras guardar, se limpia el formulario y aparece la confirmación — 1 punto
- **T-03 [F1-HU-01]: Programar el registro de venta con importe libre** · `nueva.tsx` · HECHO
  - Descripción: venta sin productos (ej. «Venta del día») con concepto, monto, fecha, categoría y nota.
  - Resultado Esperado: venta manual guardada que suma a ventas del día.
  - CA1 - Guarda el monto en centavos exactos — 2 puntos
  - CA2 - Aplica las mismas validaciones que el gasto — 2 puntos
  - CA3 - La venta aparece en Inicio, Historial y Métricas — 1 punto
- **T-04 [F1-HU-01]: Programar el registro de venta con productos** · `nueva.tsx` + `operation-products.tsx` · HECHO
  - Descripción: elegir productos y cantidades en modal con búsqueda, método de pago (Efectivo, Tarjeta, Transferencia, Otro), total y margen estimado; descuenta stock de insumos.
  - Resultado Esperado: venta con detalle que actualiza el inventario.
  - CA1 - Sin productos muestra «Elige al menos un producto.» — 1 punto
  - CA2 - Muestra total y margen estimado cuando hay costos — 2 puntos
  - CA3 - Al guardar, descuenta insumos y no crea una operación manual duplicada — 2 puntos
- **T-05 [F1-HU-01]: Programar el selector de fecha y los atajos del pie** · `nueva.tsx` · HECHO
  - Descripción: fecha con flechas y accesos directos Productos, Inventario, Métricas y Exportar.
  - Resultado Esperado: usuario llega a otras funciones sin volver al menú.
  - CA1 - No permite fechas futuras ni inválidas — 2 puntos
  - CA2 - Cada atajo abre la pantalla correcta — 2 puntos
  - CA3 - Funciona en pantallas pequeñas — 1 punto
- **T-06 [F1-HU-01]: Mostrar errores de guardado sin perder lo escrito** · `nueva.tsx` · HECHO
  - Resultado Esperado: ante fallo, mensaje claro y datos conservados.
  - CA1 - Muestra «No se pudo guardar. Intenta de nuevo.» — 2 puntos
  - CA2 - Si falla la actualización de productos, indica volver a entrar — 2 puntos
  - CA3 - El formulario no se limpia tras un error — 1 punto
- **T-07 [F1-HU-01]: Registrar compras al reponer inventario (equivale a la tarjeta T-04 actual)** · `inventory-panel.tsx` · HECHO
  - Descripción: la «compra» se registra desde Inventario; ver F1-HU-04. Sugerencia: renombrar la tarjeta T-04 a «Programar la reposición de existencias».

## F1-HU-02 — Como empresario quiero utilizar y navegar en la aplicación de manera fácil y rápida *(en tablero, HECHO)*
**Dónde:** `src/app/(app)/_layout.tsx`, `app-toolbar.tsx` · **Pts:** 3
**Criterios de aceptación:** CA1 la página principal muestra opciones claras · CA2 cada opción lleva al módulo correspondiente.

**Tareas**
- **T-01 [F1-HU-02]: Programar la página principal** · *(en tablero, terminada)*
- **T-02 [F1-HU-02]: Programar el teclado numérico** · *(en tablero, terminada)*
- **T-03 [F1-HU-02]: Programar la barra de pestañas con botón «+» flotante** · `_layout.tsx` · HECHO
  - Descripción: 5 pestañas: Inicio, Asistente, «+» (círculo ámbar elevado), Productos, Métricas; solo en modo administrador.
  - Resultado Esperado: acceso a cualquier sección en un toque.
  - CA1 - Muestra las 5 pestañas con el «+» destacado — 2 puntos
  - CA2 - La pestaña activa se distingue — 1 punto
  - CA3 - En modo vendedor la barra se oculta — 2 puntos
- **T-04 [F1-HU-02]: Programar la barra superior con engranaje de Configuración** · `app-toolbar.tsx` · HECHO
  - Resultado Esperado: acceso a Configuración desde cualquier pantalla.
  - CA1 - El engranaje abre Configuración — 2 puntos
  - CA2 - En Configuración muestra botón «← Volver» y el engranaje resaltado — 2 puntos
  - CA3 - Si no hay historial de navegación, vuelve a Inicio — 1 punto
- **T-05 [F1-HU-02]: Proteger el acceso con guardas de navegación** · `_layout.tsx` · HECHO
  - Resultado Esperado: cada usuario cae en la pantalla correcta.
  - CA1 - Sin cuenta va al registro — 2 puntos
  - CA2 - Cuenta sin desbloquear va al login — 2 puntos
  - CA3 - Modo vendedor redirige a Caja — 1 punto

## F1-HU-03 — Como emprendedor quiero administrar mi catálogo de productos para vender y controlar lo que ofrezco *(nueva, HECHO)*
**Dónde:** Pestaña Productos → `productos.tsx` + `catalog/products-panel.tsx` · **Pts:** 8 · **Prioridad:** High
**Resultado Esperado:** lista de productos activos e inactivos con alta, edición, activar/desactivar y eliminación.
**Criterios de aceptación:**
- CA1 - Dado que el usuario crea un producto con nombre y precio, entonces aparece en el catálogo y se puede vender.
- CA2 - Dado que desactiva un producto, entonces deja de ofrecerse pero conserva su historial.
- CA3 - Dado que elimina un producto con ventas, entonces se oculta y se conserva su historial.

**Tareas**
- **T-01 [F1-HU-03]: Diseñar las pantallas de productos** · `docs/diseno/` · HECHO
  - CA1 - Lista, formulario y modales muestran todos los campos — 3 puntos
  - CA2 - Diseño coherente con el sistema de diseño — 1 punto
  - CA3 - Adaptable a distintos dispositivos — 1 punto
- **T-02 [F1-HU-03]: Programar la lista de productos activos e inactivos** · `products-panel.tsx` · HECHO
  - Descripción: activos primero, separador «INACTIVOS», link a receta con costo estimado.
  - CA1 - Muestra nombre, precio y receta — 2 puntos
  - CA2 - Inactivos aparecen aparte y atenuados — 2 puntos
  - CA3 - Vacío «Sin productos» con enlace «Agregar primero»; error con reintento — 1 punto
- **T-03 [F1-HU-03]: Programar el modal «Nuevo producto» con receta y compra inicial** · `products-panel.tsx` · HECHO
  - Descripción: nombre, precio, insumos (nombre, cantidad por pieza, unidad kg/g/L/ml/pza) y compra inicial opcional con costo.
  - CA1 - Valida «El nombre es obligatorio» y «El precio debe ser mayor a cero» — 2 puntos
  - CA2 - Valida cada insumo y la compra inicial con mensajes claros — 2 puntos
  - CA3 - Guarda producto, receta e inventario inicial en una sola operación — 1 punto
- **T-04 [F1-HU-03]: Programar el modal «Editar producto»** · `products-panel.tsx` · HECHO
  - CA1 - Edita nombre y precio — 2 puntos
  - CA2 - Mismas validaciones que el alta — 2 puntos
  - CA3 - La lista se actualiza al guardar — 1 punto
- **T-05 [F1-HU-03]: Programar activar/desactivar y eliminar con archivado** · `products-panel.tsx` · HECHO
  - CA1 - El interruptor activa o desactiva el producto — 2 puntos
  - CA2 - Eliminar pide confirmación — 1 punto
  - CA3 - Si tiene ventas, se archiva y avisa «Producto conservado»; si no, se borra — 2 puntos

## F1-HU-04 — Como emprendedor quiero controlar mis insumos y reponer existencias para saber cuánto tengo y cuánto me cuesta *(nueva, HECHO)*
**Dónde:** Productos → pestaña Inventario → `catalog/inventory-panel.tsx` · **Pts:** 8 · **Prioridad:** High
**Resultado Esperado:** inventario de insumos con unidad, existencias, costo por unidad y reposición que queda como salida de dinero en el historial.
**Criterios de aceptación:**
- CA1 - Dado que el usuario crea un insumo con su unidad, entonces aparece en existencias.
- CA2 - Dado que repone existencias con cantidad y costo total, entonces el stock sube y se registra una compra visible en el historial.
- CA3 - Dado que repone varias veces, entonces el costo por unidad es el promedio ponderado.

**Tareas**
- **T-01 [F1-HU-04]: Programar el formulario de insumos** · `inventory-panel.tsx` · HECHO
  - Descripción: nombre, unidad de medida (kg, g, L, ml, pza), compra inicial opcional.
  - CA1 - Valida «Escribe el nombre del insumo.» — 2 puntos
  - CA2 - Valida cantidad y costo de la compra inicial — 2 puntos
  - CA3 - Guarda y limpia el formulario — 1 punto
- **T-02 [F1-HU-04]: Programar la lista de existencias** · `inventory-panel.tsx` · HECHO
  - CA1 - Cada insumo muestra stock y costo por unidad («Costo pendiente» si no hay) — 2 puntos
  - CA2 - Vacío muestra guía para agregar ingredientes — 2 puntos
  - CA3 - Error de carga con reintento — 1 punto
- **T-03 [F1-HU-04]: Programar la reposición de existencias (la «compra»)** · `inventory-panel.tsx` + `restockInsumo` · HECHO
  - Descripción: «+ AGREGAR EXISTENCIAS» con cantidad y costo total; recalcula costo promedio.
  - CA1 - Valida cantidad y costo mayores a cero — 1 punto
  - CA2 - Aumenta el stock y calcula el costo promedio ponderado — 2 puntos
  - CA3 - Aparece en el historial como salida, sin duplicarla como gasto manual — 2 puntos
- **T-04 [F1-HU-04]: Programar editar, eliminar y archivar insumos** · `inventory-panel.tsx` · HECHO
  - CA1 - Permite cambiar el nombre — 1 punto
  - CA2 - Eliminar pide confirmación — 1 punto
  - CA3 - Si tiene compras, existencias o recetas se archiva sin romper recetas ni ventas — 3 puntos

## F1-HU-05 — Como emprendedor quiero definir qué insumos lleva cada producto para conocer su costo y margen *(nueva, HECHO)*
**Dónde:** Productos → «AGREGAR RECETA →» → `ventas/receta.tsx` («Costo y porciones») · **Pts:** 5
**Resultado Esperado:** receta por producto con costo estimado por unidad y margen bruto.
**Criterios de aceptación:**
- CA1 - Dado un producto, el usuario agrega ingredientes con cantidad (decimales).
- CA2 - Dado que hay costos de compra, ve costo por unidad y margen bruto estimado.
- CA3 - Dado que vende el producto, los insumos se descuentan.

**Tareas**
- **T-01 [F1-HU-05]: Programar el editor de composición** · `receta.tsx` · HECHO
  - CA1 - Lista ingredientes con cantidad por unidad y existencia — 2 puntos
  - CA2 - Permite agregar, editar cantidad y quitar con confirmación — 2 puntos
  - CA3 - Valida «Elige un insumo.» y cantidad mayor a cero — 1 punto
- **T-02 [F1-HU-05]: Programar el cálculo de costo y margen** · `receta.tsx` · HECHO
  - CA1 - Muestra costo de insumos por unidad con el costo promedio — 2 puntos
  - CA2 - Muestra precio y margen bruto estimado — 2 puntos
  - CA3 - Sin costos muestra «Agrega costos de compra» — 1 punto
- **T-03 [F1-HU-05]: Programar el descuento de stock al vender y su validación** · `queries.ts` · HECHO
  - CA1 - Valida el stock de todos los insumos antes de guardar — 2 puntos
  - CA2 - Si falta, muestra «Stock insuficiente de X: hay Y, se necesitan Z.» — 2 puntos
  - CA3 - Guarda el costo unitario al momento de la venta — 1 punto

## F1-HU-06 — Como emprendedor quiero ver el resumen de mi día al abrir la app para saber cómo voy *(nueva, HECHO)*
**Dónde:** pestaña Inicio → `src/app/(app)/index.tsx` · **Pts:** 5 · **Prioridad:** High
**Resultado Esperado:** pantalla de inicio con ventas, egresos y balance estimado y la lista de operaciones recientes.
**Criterios de aceptación:**
- CA1 - Dado que hay operaciones, ve Ventas, Egresos y Balance est.
- CA2 - Dado que filtra Todos, Ventas o Gastos, la lista cambia.
- CA3 - Dado que toca una operación, va al Historial.

**Tareas**
- **T-01 [F1-HU-06]: Diseñar la pantalla Inicio** · `docs/diseno/index.tsx.md` · HECHO
  - CA1 - Encabezado con negocio, usuario y fecha — 2 puntos
  - CA2 - Tres tarjetas de métricas y filtros — 2 puntos
  - CA3 - Adaptable a distintos dispositivos — 1 punto
- **T-02 [F1-HU-06]: Programar tarjetas de resumen y nota del balance** · `index.tsx` · HECHO
  - CA1 - Muestra ventas, egresos y balance — 2 puntos
  - CA2 - Incluye la nota «balance estimado: ventas − gastos registrados» — 1 punto
  - CA3 - Las cifras coinciden con el historial — 2 puntos
- **T-03 [F1-HU-06]: Programar la lista agrupada por día y los filtros** · `index.tsx` · HECHO
  - CA1 - Secciones HOY, AYER y fecha — 2 puntos
  - CA2 - Filtros TODOS, VENTAS y GASTOS — 2 puntos
  - CA3 - Pull-to-refresh actualiza los datos — 1 punto
- **T-04 [F1-HU-06]: Programar estados de carga, vacío y error** · `index.tsx` · HECHO
  - CA1 - Esqueletos animados mientras carga — 2 puntos
  - CA2 - Vacío invita a registrar la primera venta — 1 punto
  - CA3 - Error con aviso para reintentar, sin mostrar ceros — 2 puntos

## F1-HU-07 — Como emprendedor quiero un aviso cuando un insumo se esté acabando para reponerlo a tiempo *(nueva, PENDIENTE)*
**Dónde:** Inventario · **Pts:** 3 · **Prioridad:** Low
**Resultado Esperado:** indicador visible de stock bajo en cada insumo.
**Criterios de aceptación:** CA1 el usuario define un mínimo por insumo · CA2 el insumo bajo el mínimo se marca · CA3 se ve en la lista de Inventario.
- **T-01 [F1-HU-07]: Agregar campo de stock mínimo al insumo** · 5 pts — CA1 campo en el formulario (2) · CA2 persistencia (2) · CA3 validación numérica (1)
- **T-02 [F1-HU-07]: Mostrar la alerta de stock bajo** · 5 pts — CA1 marca visual (2) · CA2 texto accesible, no solo color (2) · CA3 se oculta al reponer (1)

---

# F2 — Métricas Financieras

## F2-HU-01 — Como emprendedor quiero ver mi balance por período para saber si mi negocio va bien *(nueva, HECHO)*
**Dónde:** pestaña Métricas → `dashboard.tsx` · **Pts:** 5 · **Prioridad:** High
**Resultado Esperado:** balance estimado, ventas y gastos de Hoy, Semana o Mes (por defecto Mes).
**Criterios de aceptación:** CA1 el usuario ve balance, ventas y gastos del período · CA2 al cambiar el período, se actualizan las cifras · CA3 el balance aclara que no es utilidad contable.

**Tareas**
- **T-01 [F2-HU-01]: Diseñar la pantalla de métricas** · HECHO — CA1 encabezado «El pulso de tu negocio» y tarjeta principal (2) · CA2 selector de período (2) · CA3 adaptable (1)
- **T-02 [F2-HU-01]: Programar el selector Hoy / Semana / Mes** · `dashboard.tsx` · HECHO — CA1 tres opciones (1) · CA2 recalcula cifras (3) · CA3 pull-to-refresh (1)
- **T-03 [F2-HU-01]: Programar la tarjeta de balance estimado** · HECHO — CA1 balance = ventas − compras − gastos (3) · CA2 rojo si es negativo y rango de fechas (1) · CA3 aviso «No equivale a utilidad contable» (1)
- **T-04 [F2-HU-01]: Programar tarjetas de ventas y gastos** · HECHO — CA1 ventas con conteo (2) · CA2 gastos incluyen reposición de inventario (2) · CA3 el consumo de recetas no suma como gasto (1)
- **T-05 [F2-HU-01]: Programar estados vacío, carga y error** · HECHO — CA1 periodo vacío invita a usar «+» (2) · CA2 indicador de carga (1) · CA3 error con reintento (2)

## F2-HU-02 — Como emprendedor quiero ver cómo evolucionan mis ventas para detectar si crecen o caen *(nueva, HECHO)*
**Dónde:** Métricas, tarjeta «Cómo van tus ventas» · **Pts:** 5
**Criterios de aceptación:** CA1 compara contra el período anterior · CA2 gráfico de barras diario · CA3 incluye ventas libres y con productos.
- **T-01 [F2-HU-02]: Programar la comparación con el período anterior** · `metrics.ts` — CA1 calcula % de crecimiento o caída (3) · CA2 maneja sin datos previos (1) · CA3 pruebas unitarias (1)
- **T-02 [F2-HU-02]: Programar el gráfico de barras diario** · `dashboard.tsx` — CA1 barras por día con etiqueta (2) · CA2 desplazable horizontalmente (2) · CA3 incluye ventas libres y con productos (1)

## F2-HU-03 — Como emprendedor quiero conocer mi venta promedio y mi producto destacado para decidir qué impulsar *(nueva, HECHO)*
**Dónde:** Métricas, segunda fila de tarjetas · **Pts:** 3
- **T-01 [F2-HU-03]: Programar la venta promedio (ticket)** — CA1 total ÷ número de ventas (3) · CA2 con cero ventas no falla (1) · CA3 redondeo correcto (1)
- **T-02 [F2-HU-03]: Programar el producto destacado** — CA1 muestra el más vendido y sus unidades (3) · CA2 sin datos: «Registra ventas con productos para conocerlo.» (1) · CA3 solo cuenta ventas con productos (1)
- **T-03 [F2-HU-03]: Programar los atajos «Ver movimientos» y «Exportar datos»** — CA1 el primero abre Historial (2) · CA2 el segundo abre Exportar (2) · CA3 visibles en pantalla pequeña (1)

---

# F3 — Asistente Financiero con IA

## F3-HU-01 — Como empresario independiente, quiero poder resolver dudas respecto al estado actual de mis finanzas, para poder tomar decisiones informadas sobre mi negocio *(en tablero, HECHO)*
**Dónde:** pestaña Asistente → `asistente.tsx`, `lib/ai-client.ts`, `lib/financial-summary.ts`, `server/ai-server.mjs` · **Pts:** 10
**Criterios de aceptación:** CA1 responde con datos de la cuenta · CA2 respuesta clara sobre ventas, gastos o ganancias · CA3 si faltan datos no inventa cifras · CA4 solo usa información del usuario.

**Tareas**
- **T-01 [F3-HU-01]: Construir la pantalla «Asistente financiero con IA»** · *(en tablero)* · en la app es un chat con burbujas, campo de pregunta y botón de envío.
- **T-02 [F3-HU-01]: Programar el resumen financiero que se envía a la IA** · `financial-summary.ts` · HECHO
  - Descripción: instantánea de hoy, semana y mes (ventas, compras, gastos, ganancia estimada) tomada antes de cada pregunta.
  - CA1 - Las cifras coinciden con Métricas — 3 puntos
  - CA2 - Un error de lectura no se convierte en ceros: avisa «No se pudieron leer los datos del negocio… no se enviaron cifras incompletas» — 1 punto
  - CA3 - Nunca se envía el archivo de la base de datos — 1 punto
- **T-03 [F3-HU-01]: Programar el cliente de IA** · `ai-client.ts` · HECHO
  - Descripción: valida pregunta (no vacía, máximo 4000 caracteres), envía hasta 10 mensajes previos, tiempo máximo 45 s y errores tipados.
  - CA1 - Rechaza preguntas vacías o demasiado largas antes de usar la red — 2 puntos
  - CA2 - Distingue configuración, red, tiempo agotado, cuota y facturación — 2 puntos
  - CA3 - Pruebas automáticas cubren los casos — 1 punto
- **T-04 [F3-HU-01]: Programar el servidor proxy de IA** · `server/ai-server.mjs` · HECHO
  - Descripción: endpoint `/chat` que llama a OpenAI; la clave nunca llega a la app; token, CORS, 10 solicitudes por minuto, máximo 2 simultáneas.
  - CA1 - Rechaza peticiones sin token válido — 2 puntos
  - CA2 - Aplica límites de tamaño, ritmo y tiempo (35 s) — 2 puntos
  - CA3 - Valida que ganancia = ventas − compras − gastos antes de usar el resumen — 1 punto
- **T-05 [F3-HU-01]: Definir el prompt del asistente (sin inventar datos)** · `ai-server.mjs` · HECHO
  - CA1 - Responde en español usando solo el resumen recibido — 2 puntos
  - CA2 - Si faltan datos, lo dice y no inventa cifras — 2 puntos
  - CA3 - No afirma haber modificado datos — 1 punto
- **T-06 [F3-HU-01]: Programar el chat: burbujas, «Analizando datos…» y reintento** · `asistente.tsx` · HECHO
  - CA1 - Burbujas de usuario y de IA, indicador de escritura — 2 puntos
  - CA2 - Burbuja de error con botón REINTENTAR (manual, no duplica consumo) — 2 puntos
  - CA3 - Conserva un máximo de 10 mensajes de contexto — 1 punto

## F3-HU-02 — Como usuario quiero preguntas sugeridas y poder limpiar la conversación para empezar rápido *(nueva, HECHO)*
**Dónde:** `asistente.tsx` · **Pts:** 2
- **T-01 [F3-HU-02]: Programar el estado vacío con 3 preguntas sugeridas** — CA1 «¿Cuánto vendí hoy?», «¿Cuánto gasté este mes?», «Resumen de esta semana» (2) · CA2 al tocar una, se envía (2) · CA3 desaparecen al iniciar el chat (1)
- **T-02 [F3-HU-02]: Programar «Limpiar» con confirmación** — CA1 pide confirmación (2) · CA2 borra solo esta sesión (2) · CA3 vuelve al estado vacío (1)

---

# F4 — Datos y Seguridad

## F4-HU-01 — Como emprendedor independiente, quiero que mis datos financieros estén protegidos y aislados *(en tablero, AJUSTAR)*
**Dónde:** `docs/supabase-schema.sql`, `src/db/*`, `lib/money.ts`, `lib/dates.ts` · **Pts:** 8
**Ajuste:** el aislamiento por usuario (RLS) está definido en Supabase; las operaciones viven en SQLite local del dispositivo. Confirmar con el equipo (F9-HU-04).
**Criterios de aceptación:** CA1 solo ve sus operaciones · CA2 la base rechaza acceso a datos ajenos · CA3 monto $15.50 se guarda como 1550 · CA4 puede exportar su historial a CSV (hoy desde Exportar, F4-HU-02).

**Tareas**
- **T-01 [F4-HU-01]: Configurar reglas de seguridad en base de datos y lógica de exportación** · *(en tablero)* · `supabase-schema.sql` ya define la política «solo el dueño» (`auth.uid() = user_id`) en todas las tablas.
- **T-02 [F4-HU-01]: Guardar montos en centavos y formatear para la vista** · `money.ts` · HECHO
  - CA1 - Todo monto se guarda como entero en centavos — 2 puntos
  - CA2 - Muestra `$1.500,00` y compacto `$15.000` — 2 puntos
  - CA3 - Pruebas de `parsePesosInput` y `formatCents` — 1 punto
- **T-03 [F4-HU-01]: Manejar fechas en zona horaria local** · `dates.ts` · HECHO
  - CA1 - Usa fecha local `YYYY-MM-DD`, nunca UTC — 2 puntos
  - CA2 - Rechaza fechas inexistentes (ej. 30 de febrero) — 2 puntos
  - CA3 - Pruebas de `addDays` y períodos previos — 1 punto

## F4-HU-02 — Como emprendedor quiero exportar mi historial a un archivo CSV para tener mi propio respaldo *(nueva, HECHO)*
**Dónde:** Configuración / Métricas / «+» → `ventas/exportar.tsx`, `lib/csv.ts` · **Pts:** 5
**Resultado Esperado:** archivo `operaciones_YYYY-MM-DD.csv` con todas las operaciones, compatible con Excel y Sheets.
**Criterios de aceptación:** CA1 muestra cuántas operaciones y el rango de fechas · CA2 descarga en web y comparte en celular · CA3 sin operaciones, el botón queda deshabilitado.
- **T-01 [F4-HU-02]: Programar la pantalla Exportar** — CA1 tarjeta con total y rango (2) · CA2 botón EXPORTAR CSV / EXPORTANDO… (2) · CA3 estado vacío «Sin operaciones registradas aún» (1)
- **T-02 [F4-HU-02]: Generar el CSV** · `csv.ts` — CA1 columnas id, fecha, tipo, concepto, monto, categoría, nota, origen (2) · CA2 BOM y saltos CRLF para Excel (1) · CA3 evita inyección de fórmulas (=, +, @, −) (2)
- **T-03 [F4-HU-02]: Compartir o descargar según la plataforma** — CA1 web: descarga con Blob (2) · CA2 celular: hoja de compartir (2) · CA3 errores «No se pudo cargar el resumen…» y «Error al exportar…» (1)

## F4-HU-03 — Como usuario quiero que mis datos antiguos se conserven al actualizar la app *(nueva, HECHO)*
**Dónde:** `db/financial-migration.ts`, `docs/financial-data.md` · **Pts:** 5
**Criterios de aceptación:** CA1 la migración corre una sola vez · CA2 se conservan identificadores y fechas · CA3 el archivo anterior no se borra · CA4 un fallo permite reintentar.
- **T-01 [F4-HU-03]: Programar la migración única de `letica.db` a `ventas.db`** — CA1 copia perfil, ajustes y operaciones en lotes (2) · CA2 transacción: si falla, se puede reintentar (2) · CA3 marca de finalización (1)
- **T-02 [F4-HU-03]: Crear la vista unificada `financial_operations`** — CA1 cada operación manual, venta y compra aparece una sola vez (3) · CA2 el consumo de recetas no se cuenta como compra (1) · CA3 pruebas de conciliación (1)
- **T-03 [F4-HU-03]: Verificar con pruebas contra SQLite real** · `scripts/test-finances.cjs` — CA1 recuperación tras fallo (2) · CA2 reversión de ventas y concurrencia (2) · CA3 búsqueda, paginación, fechas y CSV (1)

## F4-HU-04 — Como emprendedor quiero respaldar y restaurar mis datos para no perderlos si cambio de teléfono *(nueva, PENDIENTE)*
**Dónde:** nueva · **Pts:** 8 · **Prioridad:** Low
**Criterios de aceptación:** CA1 puede crear un respaldo completo · CA2 puede restaurarlo en otro dispositivo · CA3 el respaldo está protegido.
- **T-01 [F4-HU-04]: Diseñar el flujo de respaldo y restauración** — CA1 pantalla en Configuración (2) · CA2 advertencias antes de restaurar (2) · CA3 adaptable (1)
- **T-02 [F4-HU-04]: Programar el respaldo en la nube** — CA1 respaldo de productos, insumos, ventas y operaciones (3) · CA2 asociado a la cuenta del usuario (1) · CA3 manejo de errores (1)
- **T-03 [F4-HU-04]: Programar la restauración** — CA1 restaura sin duplicar datos (3) · CA2 pide confirmación (1) · CA3 pruebas (1)

---

# F5 — Historial de Operaciones

## F5-HU-01 — Como emprendedor independiente necesito revisar operaciones pasadas para que nada pase desapercibido *(en tablero, HECHO)*
**Dónde:** `historial.tsx` (se llega tocando una operación en Inicio, o el atajo «HISTORIAL» de «+» y Configuración) · **Pts:** 5
**Criterios de aceptación:** CA1 ver fecha, hora y tipo · CA2 lista ordenada con filtros · CA3 etiquetas de estado (ver F5-HU-04, pendiente).

**Tareas**
- **T-01 [F5-HU-01]: Diseñar en Figma las plantillas visuales del historial** · *(en tablero)*
- **T-02 [F5-HU-01]: Programar la lista agrupada por fecha con totales diarios** · HECHO
  - CA1 - Secciones HOY, AYER y fecha con total del día — 2 puntos
  - CA2 - Cada fila muestra concepto, monto, tipo, categoría y nota — 2 puntos
  - CA3 - Orden del más reciente al más antiguo — 1 punto
- **T-03 [F5-HU-01]: Programar los filtros TODOS / VENTAS / GASTOS** · HECHO
  - CA1 - Al filtrar solo se ven ese tipo — 2 puntos
  - CA2 - Se puede volver a TODOS — 1 punto
  - CA3 - Cada tipo se distingue por color — 2 puntos
- **T-04 [F5-HU-01]: Programar la paginación de 50 registros** · HECHO
  - CA1 - Botón «Cargar más» y contador «X de Y registros» — 2 puntos
  - CA2 - No se congela con muchos registros — 2 puntos
  - CA3 - Estados de error con reintento y vacío — 1 punto

## F5-HU-02 — Como emprendedor quiero buscar una operación por su concepto para encontrarla rápido *(nueva, HECHO)*
**Dónde:** `historial.tsx` (campo «Buscar concepto…») · **Pts:** 3
- **T-01 [F5-HU-02]: Programar el buscador con retardo** — CA1 busca mientras escribe con 200 ms de espera (2) · CA2 botón ✕ limpia (1) · CA3 «No hay resultados para «X»» (2)

## F5-HU-03 — Como emprendedor quiero eliminar una operación registrada por error sin romper mi inventario *(nueva, HECHO)*
**Dónde:** `historial.tsx`, pulsación larga · **Pts:** 5
**Criterios de aceptación:** CA1 pide confirmación · CA2 al borrar una venta se revierte el inventario · CA3 las compras de inventario no se pueden borrar desde aquí.
- **T-01 [F5-HU-03]: Programar el borrado con confirmación y pista** — CA1 pulsación larga abre «Eliminar operación» (2) · CA2 pista «Mantén presionado para eliminar» una vez por sesión (1) · CA3 acción destructiva marcada en rojo (2)
- **T-02 [F5-HU-03]: Programar la reversión de inventario al borrar ventas** · `queries.ts` — CA1 elimina venta, detalle y consumo (2) · CA2 restituye el stock (2) · CA3 si falla, no queda a medias (1)
- **T-03 [F5-HU-03]: Bloquear el borrado de compras vinculadas al stock** — CA1 muestra «Esta compra está vinculada al stock…» (3) · CA2 no modifica datos (1) · CA3 prueba que cubra el caso (1)

## F5-HU-04 — Como emprendedor quiero etiquetar y editar operaciones para corregir y clasificar mejor *(nueva, PENDIENTE)*
**Dónde:** `historial.tsx` · **Pts:** 5 · **Prioridad:** Low · Pedido en el CA3 de F5-HU-01 del tablero.
- **T-01 [F5-HU-04]: Diseñar etiquetas de estado y pantalla de edición** — CA1 diseño de etiquetas (2) · CA2 pantalla de edición (2) · CA3 adaptable (1)
- **T-02 [F5-HU-04]: Programar etiquetas por operación** — CA1 asignar y quitar (2) · CA2 filtrar por etiqueta (2) · CA3 persisten (1)
- **T-03 [F5-HU-04]: Programar la edición de una operación** — CA1 cambia concepto, monto, categoría y nota (3) · CA2 las ventas con productos no permiten editar montos (1) · CA3 métricas se actualizan (1)

---

# F6 — Inicio de Sesión y Cuenta

## F6-HU-01 — Como vendedor independiente quiero crear mi cuenta e iniciar sesión con mi correo y contraseña *(en tablero, AJUSTAR)*
**Dónde:** `src/app/(auth)/register.tsx`, `login.tsx`, `lib/auth-context.tsx`, `lib/supabase.ts` · **Pts:** 3
**Ajuste:** el código pide contraseña de **6** caracteres y solo valida que el correo contenga «@»; el tablero pide **8**.
**Criterios de aceptación:** CA1 login correcto entra a la app · CA2 error «Correo o contraseña incorrectos» · CA3 registro válido crea la cuenta · CA4 correo repetido muestra error.

**Tareas**
- **T-01 [F6-HU-01]: Crear la tabla de usuarios (perfil) con correo único y contraseña cifrada** · *(en tablero)* · en la app la contraseña la maneja Supabase Auth y la tabla `profiles` guarda nombre del negocio, usuario, correo y moneda.
- **T-02 [F6-HU-01]: Programar la pantalla de registro** · `register.tsx` · HECHO
  - CA1 - Campos: nombre del negocio, correo y contraseña — 1 punto
  - CA2 - Valida nombre obligatorio, correo con formato y contraseña mínima — 2 puntos
  - CA3 - Muestra el error si el correo ya existe — 2 puntos
- **T-03 [F6-HU-01]: Programar la pantalla de inicio de sesión** · `login.tsx` · HECHO
  - CA1 - Campos de correo y contraseña con botón de entrar — 1 punto
  - CA2 - Credenciales incorrectas muestran mensaje claro — 2 puntos
  - CA3 - Credenciales correctas llevan a Inicio en menos de 3 segundos — 2 puntos
- **T-04 [F6-HU-01]: Integrar Supabase Auth y crear el perfil** · `auth-context.tsx` · HECHO
  - CA1 - Crea usuario y perfil al registrarse — 2 puntos
  - CA2 - Si el correo requiere confirmación, el perfil se crea por trigger — 2 puntos
  - CA3 - Actualiza nombre del negocio y del usuario — 1 punto
- **T-05 [F6-HU-01]: Ajustar la regla de contraseña a 8 caracteres y validar correo con expresión** · PENDIENTE
  - CA1 - Rechaza menos de 8 caracteres — 2 puntos
  - CA2 - Valida formato de correo completo — 2 puntos
  - CA3 - Actualiza las pruebas — 1 punto

## F6-HU-02 — Como usuario quiero mantener mi sesión y desbloquear con mi huella o rostro *(nueva, AJUSTAR)*
**Dónde:** `login.tsx`, `auth-context.tsx` · **Pts:** 5 · Trello lo dejó fuera de HU-01; la app ya lo tiene.
**Criterios de aceptación:** CA1 la sesión se conserva al cerrar la app · CA2 la biometría se pide sola al abrir · CA3 si falla, puede entrar con contraseña.
- **T-01 [F6-HU-02]: Persistir la sesión de forma segura** — CA1 `expo-secure-store` en celular, almacenamiento del navegador en web (3) · CA2 la sesión sobrevive al reinicio (1) · CA3 cerrar sesión la elimina (1)
- **T-02 [F6-HU-02]: Programar el desbloqueo biométrico automático** — CA1 se lanza 0.4 s después de abrir si hay sesión (2) · CA2 mensajes por tipo de error (2) · CA3 requiere hardware y huella registrada (1)
- **T-03 [F6-HU-02]: Corregir el desbloqueo cuando no hay biometría disponible** · PENDIENTE — hoy, sin hardware, el acceso pasa como válido. CA1 pide contraseña (3) · CA2 mensaje explicativo (1) · CA3 prueba (1)

## F6-HU-03 — Como usuario quiero recuperar mi contraseña si la olvido *(nueva, PENDIENTE)*
**Dónde:** `login.tsx` · **Pts:** 5 · **Prioridad:** Low · No existe en el código.
- **T-01 [F6-HU-03]: Diseñar la pantalla «Olvidé mi contraseña»** — CA1 campo de correo y botón (2) · CA2 mensaje de confirmación (2) · CA3 adaptable (1)
- **T-02 [F6-HU-03]: Programar el envío del enlace de recuperación** — CA1 envía correo con Supabase Auth (3) · CA2 no revela si el correo existe (1) · CA3 manejo de errores (1)

---

# F7 — Configuración y Preferencias

## F7-HU-01 — Como emprendedor quiero editar los datos de mi negocio para que la app me identifique *(nueva, HECHO)*
**Dónde:** engranaje → `configuraciones.tsx`, tarjeta «Perfil del negocio» · **Pts:** 3
- **T-01 [F7-HU-01]: Diseñar la pantalla de configuración** · `docs/diseno/configuraciones.tsx.md` — CA1 cinco tarjetas: Perfil, Apariencia, Actividad y datos, Modo de uso y Sesión (3) · CA2 coherente con el sistema de diseño (1) · CA3 adaptable (1)
- **T-02 [F7-HU-01]: Programar el formulario de perfil** — CA1 edita nombre del negocio y «Tu nombre» (máx. 100) y muestra el correo solo lectura (2) · CA2 valida «Escribe el nombre de tu negocio.» (1) · CA3 muestra «Cambios guardados.» o el error (2)

## F7-HU-02 — Como usuario quiero elegir entre modo oscuro y claro para usar la app cómodamente *(nueva, HECHO)*
**Dónde:** Configuración → «Apariencia» → `lib/theme.tsx`, `theme-transition.ts` · **Pts:** 5
**Criterios de aceptación:** CA1 el interruptor cambia toda la app · CA2 la transición es circular desde el toque · CA3 se recuerda al reabrir · CA4 respeta «reducir movimiento».
- **T-01 [F7-HU-02]: Programar el tema con paleta clara y oscura** — CA1 10 colores por tema (2) · CA2 todas las pantallas usan el tema (2) · CA3 sincroniza el color de fondo del sistema (1)
- **T-02 [F7-HU-02]: Programar la transición circular** — CA1 captura la pantalla y expande un círculo desde el toque (2) · CA2 usa desvanecimiento si el equipo no lo soporta o hay «reducir movimiento» (2) · CA3 ignora toques repetidos y se cancela al pasar a segundo plano (1)
- **T-03 [F7-HU-02]: Guardar la preferencia** — CA1 persiste el modo en ajustes (3) · CA2 se restaura al abrir (1) · CA3 pruebas del proveedor de tema (1)

## F7-HU-03 — Como usuario quiero cerrar sesión y salir de la app de forma segura *(nueva, HECHO)*
**Dónde:** Configuración → tarjeta «Sesión» · **Pts:** 2
- **T-01 [F7-HU-03]: Programar la salida en dos pasos** — CA1 primero «Salir de la app», luego «¿Quieres salir ahora?» (2) · CA2 Cancelar no cierra la sesión (1) · CA3 confirmar cierra sesión, vuelve al login y en Android cierra la app (2)

## F7-HU-04 — Como usuario quiero elegir la moneda de mi negocio *(nueva, PENDIENTE)*
**Dónde:** Configuración · **Pts:** 3 · El campo `currency` existe en el perfil (por defecto ARS) pero ninguna pantalla lo usa.
- **T-01 [F7-HU-04]: Agregar selector de moneda** — CA1 lista de monedas (2) · CA2 se guarda en el perfil (2) · CA3 pruebas (1)
- **T-02 [F7-HU-04]: Aplicar la moneda al formato de montos** — CA1 todos los montos usan la moneda elegida (3) · CA2 el CSV la incluye (1) · CA3 el asistente de IA la conoce (1)

---

# F8 — Modo Vendedor (Caja) y PIN de administrador

## F8-HU-01 — Como vendedor quiero registrar ventas con pocos toques para atender rápido *(nueva, HECHO)*
**Dónde:** `caja.tsx` (se llega al activar el modo vendedor) · **Pts:** 8 · **Prioridad:** Highest
**Resultado Esperado:** pantalla de punto de venta con cuadrícula de productos, total y método de pago.
**Criterios de aceptación:**
- CA1 - Dado un producto activo, un toque suma 1 al carrito y pulsación larga abre el selector de cantidad.
- CA2 - Dado que hay productos en el carrito, ve el total y elige el método de pago.
- CA3 - Dado que presiona «REGISTRAR VENTA», se guarda, descuenta stock y el carrito se vacía.

**Tareas**
- **T-01 [F8-HU-01]: Diseñar la pantalla de caja** · `docs/diseno/caja.md` — CA1 cuadrícula 2 o 3 columnas según ancho (2) · CA2 pie con total y pagos (2) · CA3 adaptable (1)
- **T-02 [F8-HU-01]: Programar las tarjetas de producto** — CA1 nombre, precio y existencias o «SIN STOCK» (2) · CA2 borde ámbar y contador cuando está seleccionado (2) · CA3 retroalimentación de toque (1)
- **T-03 [F8-HU-01]: Programar el selector de cantidad** — CA1 hoja inferior con − / cantidad / + (2) · CA2 botones LISTO y QUITAR DEL CARRITO (2) · CA3 animación de entrada (1)
- **T-04 [F8-HU-01]: Programar total y método de pago** — CA1 total en grande (2) · CA2 Efectivo, Tarjeta, Transf. u Otro (2) · CA3 el método se conserva tras vender (1)
- **T-05 [F8-HU-01]: Programar el registro de la venta** — CA1 guarda venta y descuenta insumos (2) · CA2 vibración y destello del total al terminar (1) · CA3 error «No se pudo registrar. Intenta de nuevo.» (2)
- **T-06 [F8-HU-01]: Programar estados de carga, vacío y error** — CA1 6 esqueletos mientras carga (2) · CA2 vacío «Sin productos activos» (2) · CA3 error con REINTENTAR (1)

## F8-HU-02 — Como dueño quiero proteger el modo administrador con un PIN para que mis empleados no vean mis finanzas *(nueva, HECHO)*
**Dónde:** `components/pin-modal.tsx`, `lib/pin.ts` · **Pts:** 5 · **Prioridad:** High
**Criterios de aceptación:** CA1 la primera vez crea un PIN de 4 dígitos y lo confirma · CA2 después lo pide para entrar al modo administrador · CA3 PIN incorrecto muestra error.
- **T-01 [F8-HU-02]: Diseñar el PIN** · `docs/diseno/pin-modal.md` — CA1 teclado numérico propio y 4 puntos (3) · CA2 versiones crear, confirmar y verificar (1) · CA3 adaptable (1)
- **T-02 [F8-HU-02]: Programar crear y confirmar PIN** — CA1 paso 1 «Crear PIN» y paso 2 «Confirmar PIN» (2) · CA2 si no coinciden: sacudida y «Los PINs no coinciden.» y vuelve al inicio (2) · CA3 no se puede cerrar tocando fuera hasta terminar (1)
- **T-03 [F8-HU-02]: Programar verificar PIN** — CA1 se valida solo al completar 4 dígitos (2) · CA2 incorrecto: sacudida, vibración y «PIN incorrecto.» (2) · CA3 botón Cancelar (1)
- **T-04 [F8-HU-02]: Guardar el PIN de forma segura** · `pin.ts` — CA1 guarda solo el hash en almacenamiento seguro (3) · CA2 SHA-256 en celular (1) · CA3 nunca se guarda en texto plano (1)

## F8-HU-03 — Como dueño quiero alternar entre modo administrador y vendedor *(nueva, HECHO)*
**Dónde:** `lib/mode-context.tsx`, `_layout.tsx`, Configuración «Modo de uso», Caja «⚙ CONFIG» · **Pts:** 3
- **T-01 [F8-HU-03]: Programar el contexto de modo** — CA1 modo vendedor por defecto (2) · CA2 desbloquear y bloquear administrador (2) · CA3 sabe si hay PIN creado (1)
- **T-02 [F8-HU-03]: Programar el cambio desde Configuración y Caja** — CA1 «Cambiar a modo vendedor» lleva a Caja (2) · CA2 «⚙ CONFIG» abre el PIN (2) · CA3 PIN correcto lleva a Inicio (1)
- **T-03 [F8-HU-03]: Adaptar la navegación por modo** — CA1 modo vendedor oculta barra y encabezado (2) · CA2 en administrador el «+» muestra solo Gasto (2) · CA3 pruebas de entrada unificada (1)

## F8-HU-04 — Como dueño quiero que el PIN sea difícil de adivinar o robar *(nueva, PENDIENTE)*
**Dónde:** `pin.ts`, `pin-modal.tsx` · **Pts:** 5 · **Prioridad:** Medium
**Riesgos detectados:** sin límite de intentos; en web el hash usa un método reversible; no hay «olvidé mi PIN».
- **T-01 [F8-HU-04]: Limitar intentos y bloquear temporalmente** — CA1 bloqueo tras 5 intentos (2) · CA2 cuenta regresiva visible (2) · CA3 pruebas (1)
- **T-02 [F8-HU-04]: Usar un hash criptográfico también en web** — CA1 reemplaza el método actual (3) · CA2 migra PINs existentes (1) · CA3 pruebas (1)
- **T-03 [F8-HU-04]: Programar «Olvidé mi PIN»** — CA1 se restablece con la contraseña de la cuenta (3) · CA2 confirma identidad primero (1) · CA3 pruebas (1)

---

# F9 — Calidad, Pruebas y Preparación a Producción

## F9-HU-01 — Como equipo queremos pruebas automáticas de la lógica financiera para no romper cuentas al cambiar código *(nueva, AJUSTAR)*
**Dónde:** `__tests__/`, `scripts/test-finances.cjs` · **Pts:** 8
**Ya cubierto:** dinero, fechas, métricas, cliente de IA, transición de tema, proveedor de tema, entrada unificada y cierre de sesión.
- **T-01 [F9-HU-01]: Probar `operations.ts`** — CA1 combina operaciones manuales, ventas y compras (3) · CA2 identificadores de la vista unificada (1) · CA3 validaciones (1)
- **T-02 [F9-HU-01]: Probar `financial-summary.ts`** — CA1 hoy, semana y mes correctos (3) · CA2 error de lectura no da ceros (1) · CA3 ganancia = ventas − compras − gastos (1)
- **T-03 [F9-HU-01]: Probar consultas de ventas y stock** · `queries.ts` — CA1 stock insuficiente (2) · CA2 borrado con reversión (2) · CA3 costo promedio ponderado (1)
- **T-04 [F9-HU-01]: Probar el servidor de IA** · `scripts/test-ai-server.mjs` — CA1 token inválido (2) · CA2 límite de solicitudes (2) · CA3 resumen inconsistente (1)

## F9-HU-02 — Como equipo queremos eliminar rutas y pantallas sin uso para que el código sea claro *(nueva, PENDIENTE)*
**Dónde:** `src/app/(app)/ventas/*` · **Pts:** 3
**Detectado:** `ventas/index`, `insumos`, `metricas` y `productos` solo redirigen; `ventas/historial.tsx` (historial por día) no tiene entrada; `docs/diseno` no cubre todas las pantallas.
- **T-01 [F9-HU-02]: Retirar las rutas de redirección** — CA1 ninguna pantalla las usa (2) · CA2 la app sigue navegando igual (2) · CA3 pruebas pasan (1)
- **T-02 [F9-HU-02]: Decidir sobre «Historial por día»** — CA1 integrarla al historial o eliminarla (3) · CA2 sin código muerto (1) · CA3 documentar la decisión (1)

## F9-HU-03 — Como equipo queremos un servidor de IA listo para producción *(nueva, PENDIENTE)*
**Dónde:** `server/ai-server.mjs`, `docs/ai-setup.md` · **Pts:** 8
**Hoy:** solo desarrollo local, token compartido en la app, sin HTTPS ni autenticación por usuario.
- **T-01 [F9-HU-03]: Autenticación por usuario en el servidor** — CA1 valida la sesión de Supabase (3) · CA2 rechaza sin sesión (1) · CA3 pruebas (1)
- **T-02 [F9-HU-03]: Límites persistentes por usuario** — CA1 límite diario y por minuto (2) · CA2 persiste entre reinicios (2) · CA3 mensaje claro al llegar al límite (1)
- **T-03 [F9-HU-03]: Publicar con HTTPS y configuración segura** — CA1 HTTPS (2) · CA2 secretos en variables de entorno (2) · CA3 CORS por lista de orígenes (1)

## F9-HU-04 — Como equipo queremos definir una sola fuente de datos y alinear los esquemas *(nueva, PENDIENTE)*
**Dónde:** `docs/supabase-schema.sql`, `src/db/` · **Pts:** 5
**Detectado:** el esquema de Supabase y el de SQLite local difieren (por ejemplo, el costo unitario del producto); las operaciones se guardan en el dispositivo.
- **T-01 [F9-HU-04]: Documentar el modelo de datos actual** — CA1 diagrama de tablas (2) · CA2 dónde vive cada dato (2) · CA3 revisión del equipo (1)
- **T-02 [F9-HU-04]: Decidir y alinear esquemas** — CA1 decisión: local, nube o sincronizado (3) · CA2 esquemas iguales (1) · CA3 plan de migración (1)

---

## 4. Mapa rápido: dónde está cada cosa en la app

| Lo que ves en la app | Archivo | Épica |
|---------------------|---------|-------|
| Pantalla de inicio y lista del día | `(app)/index.tsx` | F1-HU-06 |
| Botón «+» (Registrar gasto/venta) | `(app)/nueva.tsx` | F1-HU-01 |
| Pestaña Productos | `(app)/productos.tsx` + `catalog/products-panel.tsx` | F1-HU-03 |
| Subpestaña Inventario | `catalog/inventory-panel.tsx` | F1-HU-04 |
| Costo y porciones | `(app)/ventas/receta.tsx` | F1-HU-05 |
| Pestaña Métricas | `(app)/dashboard.tsx` | F2 |
| Pestaña Asistente | `(app)/asistente.tsx` | F3 |
| Exportar | `(app)/ventas/exportar.tsx` | F4-HU-02 |
| Historial | `(app)/historial.tsx` | F5 |
| Login / Registro | `(auth)/login.tsx`, `register.tsx` | F6 |
| Configuración | `(app)/configuraciones.tsx` | F7 |
| Caja (modo vendedor) | `(app)/caja.tsx` | F8-HU-01 |
| Teclado de PIN | `components/pin-modal.tsx` | F8-HU-02 |
| Servidor de IA | `server/ai-server.mjs` | F3 / F9-HU-03 |

> Mover a *Terminado* lo marcado `HECHO` es una decisión tuya: se basa en lectura del código y de las pruebas, no en haber probado cada pantalla en un dispositivo.
