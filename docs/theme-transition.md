# Transición global de tema

## Implementación

El proveedor conserva `useTheme`, `LIGHT`, `DARK`, `toggleDark` y `triggerTransition`. Se elimina el antiguo círculo de color sólido.

1. El interruptor se mide con `measureInWindow`. El proveedor resta la posición de su contenedor para obtener el origen local, sin sumar manualmente áreas seguras.
2. `react-native-view-shot` captura una sola vez el contenedor completo del navegador, incluida la barra de pestañas. La captura no contiene el overlay.
3. Una imagen SVG de esa captura permanece sobre el navegador. Primero se espera su carga y pintado; después se actualiza el tema real debajo y se esperan sus frames de commit.
4. Una máscara nativa de luminancia mantiene visible la captura anterior fuera del círculo. Dentro del círculo, el negro de la máscara hace transparente la captura y revela la interfaz real con el nuevo tema. La opacidad del círculo sube de 0 a 1 en 500 ms mientras su radio aumenta durante 600 ms. La curva es `Easing.bezier(0.23, 1, 0.32, 1)`.
5. Al terminar, se desmonta el overlay, se libera el archivo temporal y se persiste la preferencia.

No se duplican navegadores, pantallas, formularios ni consultas. No se usa CSS `clip-path`. El árbol React cambia de tema una vez; radio y opacidad se animan mediante Reanimated sin actualizar estado React por frame. La interpolación visual afecta simultáneamente a los píxeles de fondos, textos, bordes, iconos y tarjetas dentro del área revelada, sin migrar cada componente a estilos animados.

El radio usa la distancia hasta la esquina más lejana del contenedor y añade dos píxeles lógicos de margen para el antialiasing. Los archivos `src/lib/theme.tsx` y `src/lib/theme-transition.ts` contienen la implementación completa.

## Archivos e integración

- `src/lib/theme.tsx`: proveedor, captura diferida, overlay nativo, crossfade y recuperación.
- `src/lib/theme-transition.ts`: cálculo independiente de geometría.
- `src/app/_layout.tsx`: mantiene el proveedor sobre todo el Stack y elimina el antiguo overlay separado. La barra de estado usa iconos claros sobre las cabeceras oscuras de Inicio y autenticación; en el resto sigue el tema.
- `src/app/(app)/configuraciones.tsx`: mide el centro del interruptor en coordenadas de ventana. Conserva el bloqueo `disabled={isTransitioning}`.
- La distribución, alturas, botones y estilos de `src/app/(app)/_layout.tsx` no se modifican. El botón + conserva su ámbar.
- `babel.config.js`: preset estándar de Expo explícito para transformar TypeScript/JSX en las pruebas de SDK 57 y conservar la configuración automática de Reanimated.
- `eslint.config.js`: configuración oficial generada por Expo.
- `package.json` y `package-lock.json`: dependencias nativas y herramientas de validación. Se alinearon `jest-expo` a `~57.0.6` y `@react-native/jest-preset` a `0.86.3`; las versiones anteriores eran de SDK/RN posteriores y bloqueaban npm. El preset Jest ahora es `jest-expo`.

## Dependencias

Ya instaladas mediante Expo:

```sh
npx expo install react-native-svg react-native-view-shot
```

Versiones resueltas para este proyecto: `react-native-svg@15.15.4` y `react-native-view-shot@5.1.0`. Reanimated 4.5.1 y Worklets 0.10.1 ya estaban instalados. Se usa también el `expo-system-ui` existente para sincronizar el fondo de la ventana al finalizar.

Un development build anterior a la instalación debe reconstruirse para incluir los módulos nativos. No se generaron ni editaron carpetas ios/android. Tras el cambio de Babel, reiniciar Metro con `npx expo start --clear`.

## Accesibilidad, alternativas y recuperación

- Bloqueo síncrono con ref desde la primera solicitud; no depende de esperar un render para rechazar pulsaciones repetidas.
- Movimiento reducido: crossfade de la captura de 160 ms, sin expansión circular. La preferencia se consulta al iniciar y se escucha si cambia.
- SVG nativo no disponible: crossfade de la captura de 500 ms.
- Captura no disponible, captura rechazada o web: fade moderado de la interfaz durante 480 ms (160 ms con movimiento reducido). La opacidad mínima es 0.65 (0.9 con movimiento reducido), para mantener contenido visible incluso sin una captura. Esta alternativa no es un Circular Reveal.
- Segundo plano, cambio de dimensiones o botón Atrás de Android durante la transición: se completa el tema solicitado y se limpia el overlay. Atrás vuelve a funcionar normalmente después.
- Temporizador de seguridad de 2.5 s: finaliza la operación si una captura, medición o carga no responde. Resultados tardíos se descartan y liberan mediante un identificador de generación.
- Fallos al persistir no bloquean el tema de la sesión actual.
- La imagen del overlay se excluye de VoiceOver/TalkBack; la interfaz real mantiene sus elementos y su estado.

Las áreas seguras dibujadas por la aplicación y las pestañas están incluidas en la captura. Los iconos del sistema operativo, teclado y modales nativos en otras ventanas no forman parte de una captura de View: no pueden recortarse mediante esta máscara. La barra de estado se sincroniza por su API nativa con animación; el fondo de ventana se sincroniza con SystemUI. No se cambia el layout para cubrir barras del sistema.

## Validación

Pruebas de geometría: teléfonos pequeños/grandes, tablet, ventana horizontal, origen central y esquina, coordenadas fuera de ventana y mediciones inválidas.

Pruebas del proveedor con componentes nativos simulados: ambas direcciones, bloqueo de toques repetidos, espera hasta decodificar la captura, persistencia, liberación del archivo, interrupción por segundo plano, captura tardía, movimiento reducido, SVG no disponible y fallo de captura. Estas pruebas validan la coordinación; no miden FPS ni prueban el rasterizador SVG de un teléfono.

Comandos:

```sh
npx tsc --noEmit
npm test -- --runInBand
npx expo lint
```

La revisión de código de animación/polish mantiene la paleta, evita animar medidas del layout y concentra el movimiento en un único overlay. La revisión nativa confirma por código el tratamiento de áreas seguras, movimiento reducido, bloqueo y limpieza. La cobertura de contenido largo/listas vacías se conserva al capturar los píxeles existentes sin cambiar su layout; no se añadieron datos de prueba al producto.

Pendiente de comprobación visual en hardware: ambas direcciones desde Ajustes con scroll, textos grandes, teclado visible, fondo/primer plano, cambios rápidos y tablet/multiventana. Grabar una build de producción y medir frames en un teléfono representativo antes de afirmar 60 FPS. La preparación de captura/decodificación añade tiempo previo a los 600 ms y depende del dispositivo.

Resultados de esta sesión: TypeScript sin errores; 46 pruebas correctas en 5 suites; ESLint sin errores ni advertencias en los archivos de esta implementación. `expo lint` detecta 11 errores previos en otras pantallas (reglas de React Compiler sobre memoización, shared values y setState en efectos); no se cambiaron esas pantallas para ocultarlos. La exportación Android llegó a Hermes pero falló al escribir bytecode temporal por permisos de Windows; la repetición fuera del sandbox no fue autorizada. No se completó una build nativa ni se verificaron FPS en hardware.
