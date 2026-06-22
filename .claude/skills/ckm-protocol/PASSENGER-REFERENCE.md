# CKM.Passenger — Referencia técnica

Módulo de estimación de tarifa para pasajeros: geocodificación, enrutamiento, mapa y comparación de vehículos.
Ubicación en `index.html`: línea 2727 – ~3490.

---

## Aislamiento de módulos

El módulo declara explícitamente (línea 2725): **"NO toca: CKM.Driver, GPS, CKM.FareEngine, CKM.Fares"**. Solo los lee. La comunicación entre módulos va por eventos del DOM (`document.dispatchEvent(CustomEvent)`), no por llamadas directas — el ejemplo existente es `ckm:gps-origin`.

---

## Acceso a tarifas y cálculos

- Siempre usar `CKM.Fares.getTariff(city, vehicle)` para leer tarifas — nunca construir el objeto a mano.
- Siempre usar `CKM.FareEngine.calculate()` y `CKM.FareEngine.estimateRange()` para calcular — nunca reimplementar la fórmula dentro del módulo.
- Los cambios de vehículo van por `setVehicle(v)` (línea 2781), que reutiliza `lastRouteData` para recalcular sin volver a llamar OSRM.

---

## Estado interno crítico

| Variable | Qué representa | Regla |
|---|---|---|
| `originSelected` / `destSelected` | `{ lat, lon, name }` o `null` | `null` = el usuario escribió texto pero no seleccionó de la lista |
| `lastRouteData` | `{ distKm, durationMin }` | Persiste entre cambios de vehículo; invalidar a `null` al cambiar origen/destino |
| `activeCity` / `activeVehicle` | Fuente de verdad de ciudad y vehículo | Solo modificar mediante `setVehicle()` y `applyPreset()` |
| `isFallback` | Modo sin internet activo | Manipular solo con `showFallback()` / `hideFallback()` |
| `userGps` | GPS del pasajero para ordenar sugerencias | Solo lectura y ordenamiento — nunca usar como GPS de viaje (eso es `CKM.Driver`) |

---

## Geocodificación / autocompletado

- Respetar el rate-limit de Nominatim: 1,1 s entre reintentos (`await new Promise(r => setTimeout(r, 1100))`). No eliminar ni acortar ese delay.
- Verificar `geocodeBlocked` (línea 2766) ante respuestas 403/429 — no confundir con "lugar no encontrado".
- El autocompletado usa `suggestAbortCtrl` (AbortController) para cancelar la petición anterior cuando el usuario sigue escribiendo. Si se añaden más llamadas a Nominatim dentro del módulo, aplicar el mismo patrón.
- El listener de sugerencias usa `mousedown` (no `click`) y la bandera `suppressNextInputClear` (línea 3083) para evitar la carrera de eventos `blur`/`input`. No cambiar a `click`.

### Estrategia de geocodificación (`geocode()`)

4 intentos progresivos en orden de especificidad:
1. `query, metro, departamento, Colombia`
2. `query, ciudad, departamento, Colombia`
3. `query, departamento, Colombia`
4. `query, Colombia`
5. Si la query fue normalizada, un intento extra con la query original.

Validaciones sobre el resultado:
- Si hay `userGps`: descartar candidatos a más de 80 km.
- Sin `userGps`: usar el centro de ciudad (`cityCenters`) para ordenar por proximidad.
- Filtro de homónimos BGA: aceptar solo resultados de los 4 municipios del área metro (`METRO_BGA`). Si el filtro deja lista vacía, devolver la lista sin filtrar.

---

## Validaciones de ruta

Antes de enviar a OSRM: Haversine > 150 km → rechazar (`{ error: 'distance' }`).  
Después de OSRM: ruta real > 3× la línea recta → rechazar.  
No relajar estos umbrales sin justificación.

---

## Mapa Leaflet

- `leafletMap` se inicializa una sola vez. Siempre verificar `if (!window.L) return` antes de usar Leaflet.
- Para actualizar la ruta: remover `routeLayer` y crear uno nuevo — no reusar el layer existente.
- El `invalidateSize()` con timeout de 100 ms es necesario cuando el div estaba oculto; no eliminarlo.
- Colores de marcadores: origen `#00ff66`, destino `#ff003c`, ruta `#00f0ff`.

---

## Renderizado de resultados (`renderResults`)

- Calcula tarifas para **ambos** vehículos siempre (car y moto), independientemente del `activeVehicle`, para la comparación lado a lado.
- El badge `MENOR TARIFA` se añade/elimina dinámicamente en `cardCar` / `cardMoto` según cuál sea más barato.
- Guarda el estado en `CKM.Storage` con clave `PAX` al final de cada renderizado.

---

## Formateo y colores

- Todos los números en COP: `Math.round(n).toLocaleString('es-CO')`.
- Todos los colores vía variables CSS `--ckm-*`. No hardcodear valores hexadecimales en JS ni en estilos inline, excepto los iconos `L.divIcon` de Leaflet donde no hay alternativa.
