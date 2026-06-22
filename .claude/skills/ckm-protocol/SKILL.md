---
name: ckm-protocol
description: Protocolo de estabilización y reglas de edición para el proyecto Calkilometro (CKM), un taxímetro PWA en index.html (HTML/CSS/JS vanilla, sin frameworks). Úsala siempre que se trabaje en este repositorio, antes de proponer o aplicar cualquier cambio de código, diagnosticar un bug, o tocar cualquier módulo CKM.*.
---

# Protocolo CKM (Calkilometro)

Este proyecto es un PWA de un solo archivo (`index.html`, monolito modular).
No es Flutter, no es Dart, no tiene build system. Todo vive en namespaces
`CKM.*` dentro de IIFEs en el mismo archivo.

## Módulo congelado — CKM.Passenger

`CKM.Passenger` está estable y bloqueado desde V4.x.
**NO modificar bajo ninguna circunstancia** sin autorización explícita del
usuario, dada en esa misma conversación, para ese cambio puntual. Esto
incluye: autocompletado de ubicaciones, sugerencias, selección
origen/destino (`originSelected` / `destSelected`), validación de ruta,
llamadas OSRM del pasajero, Leaflet del pasajero, estilos del pasajero.

Antes de tocar cualquier parte del código, confirmar si el cambio afecta
directa o indirectamente `CKM.Passenger`. Si afecta, detenerse y pedir
autorización explícita antes de proponer el cambio — no asumir permiso
nunca, ni siquiera si el usuario pidió algo relacionado en términos
generales ("arregla las sugerencias", "mejora el pasajero").

Mejoras futuras se realizan, por defecto, exclusivamente en:
`CKM.Driver`, `CKM.Router`, `CKM.Storage`, `CKM.FareEngine`, `CKM.Fares`,
`CKM.App`, o módulos nuevos independientes.

## Protocolo de cambios (obligatorio, sin excepciones)

1. **Diagnosticar primero.** Encontrar la causa exacta del problema antes
   de proponer ningún cambio. No alterar código todavía.
2. **Identificar alcance.** Señalar el módulo directamente afectado y
   cualquier módulo indirectamente afectado (ej: algo en `CKM.App` que
   llama a una función de `CKM.Driver`).
3. **Confirmar con el usuario.** Presentar el diagnóstico y el cambio
   propuesto. Esperar autorización explícita antes de tocar el archivo.
   Si el cambio toca `CKM.Passenger`, la confirmación debe ser explícita
   sobre ese módulo puntual, no genérica.
4. **Aplicar el cambio mínimo.** Quirúrgico, sin refactorizar, sin scope
   creep, sin "ya que estoy, también arreglo...". Un cambio = un fix.
5. **Verificar sintaxis.** Validar que el/los bloques `<script>` del HTML
   parsean sin errores tras el cambio.
6. **Verificar módulos congelados intactos.** Correr `diff` contra el
   archivo previo al cambio y confirmar que `CKM.Passenger` (si no fue
   autorizado) no tiene ninguna línea alterada.
7. **Entregar el diff.** Mostrar exactamente qué cambió, línea por línea,
   antes de dar el cambio por cerrado.

## Contexto de dominio

- Las tarifas están calibradas con precios reales de calle de
  Bucaramanga/Floridablanca: `total = MAX(minFare, distancia × kmRate)`,
  sin cobro por tiempo.
- La geocodificación está acotada al área metropolitana de Bucaramanga
  (`METRO_BGA`: Bucaramanga, Floridablanca, Girón, Piedecuesta) para
  filtrar homónimos de otras ciudades colombianas.
- Identidad visual: estética "tablero de tuning" oscuro, fuente Orbitron,
  colores neón cian/dorado/verde, variables CSS de tema (oscuro por
  defecto, soporta modo claro).
- Stack: HTML/CSS/JS vanilla, localStorage, Leaflet.js + OpenStreetMap,
  OSRM (ruteo), Nominatim (geocodificación/autocompletado), fórmula de
  Haversine (distancia GPS).

## Errores ya vividos (no repetir)

- Cambios que parecían aislados causaron fallos en cascada: errores
  `CKM is not defined`, slot mostrando 9999, tarjetas sin responder al
  toque, texto duplicado. La causa siempre fue no respetar límites de
  módulo.
- `loadPrefs()` restaurando el texto de un campo sin restaurar el estado
  de selección asociado (`originSelected`/`destSelected`) generó bugs de
  validación. Estado y UI deben mantenerse sincronizados siempre.
- Llamadas a Nominatim/OSRM sin timeout en datos móviles pueden
  percibirse como congelamiento de la app, aunque el JS sigue vivo.

## Validación de sintaxis (cómo hacerlo en este proyecto)

No hay `node --check` directo sobre un `.html`. Extraer cada bloque
`<script>...</script>` y validarlo con `new Function(code)` en Node, o
usar el equivalente que ya use el usuario. Reportar cuántos bloques se
revisaron y si hubo errores.
