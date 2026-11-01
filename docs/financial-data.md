# Datos financieros unificados

La base activa es `ventas.db`. Al iniciar, se migran una sola vez el perfil,
los ajustes y las operaciones manuales de `letica.db`. Los identificadores se
conservan y el archivo anterior no se borra ni se modifica. La copia y su marca
de finalización se confirman en una transacción: un fallo permite reintentar.
No se debe volver a usar una versión anterior de la aplicación para registrar
operaciones después de migrar, porque escribiría en el archivo antiguo.

`financial_operations` es la vista común de lectura para Inicio, historial,
métricas, exportación CSV y resumen de IA:

- Cada operación manual aparece una vez.
- Cada venta con productos aparece una vez, con su total original.
- Cada compra de insumos aparece una vez, con el importe pagado.
- El consumo de recetas no es otra salida de dinero y no se suma como compra.

El balance estimado es ventas menos compras menos gastos registrados. Es un
balance de movimientos registrados, no utilidad contable. Los costos de recetas
se conservan para analizar margen bruto por separado. Las ventas manuales no
tienen un costo ni una hora de venta verificables: no se les inventan valores.
Los gráficos horarios y el producto más vendido corresponden a ventas con productos;
los totales y gráficos diarios incluyen también las ventas manuales.

La entrada única es la pestaña «+»: Venta (importe libre o productos) y Gasto.
La interfaz agrupa las compras existentes y los gastos bajo «Gastos». El detalle
interno se conserva para inventario y conciliación; no se reescriben históricos.
Las reposiciones se registran desde Inventario y aparecen automáticamente como
salidas en el historial. No se deben volver a ingresar como gasto manual.

Las fechas de ventas y operaciones existentes se preservan. Las compras antiguas
solo guardaban una marca de tiempo: su fecha se fija usando la zona local del
dispositivo al migrar. Las nuevas compras guardan su fecha local al insertarse.
La IA toma una sola instantánea de los períodos actuales antes de cada pregunta;
un error de lectura nunca se transforma en cifras cero.

No se eliminan posibles duplicados históricos entre una venta manual y una venta
con productos: no hay información para distinguir un duplicado de dos ventas
reales. Si antes se registró el mismo hecho por las dos vías, debe revisarse en el
historial. En adelante se registra una venta por una sola vía.

Eliminar una venta desde el historial común también elimina su detalle y revierte
el consumo de inventario. Las compras vinculadas al inventario no se pueden borrar
desde ese historial, porque afectaría el stock y su valoración.

Verificación:

```sh
npm run lint
npx tsc --noEmit
npm test -- --runInBand
npm run test:finances
```

La última orden requiere Node 22.13 o posterior. Ejecuta migraciones y consultas
reales con SQLite en memoria: recuperación tras fallo, preservación de históricos,
conciliación, reversión de ventas, concurrencia, búsqueda, paginación, fechas y CSV.
No sustituye la validación de la interfaz y del módulo nativo en un dispositivo.
