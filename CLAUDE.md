# CLAUDE.md

Este archivo proporciona orientación a Claude Code (claude.ai/code) cuando trabaja con el código de este repositorio.

## Descripción del proyecto

**Calkilometro** es una Progressive Web App (PWA) de un solo archivo para el cálculo de tarifas de taxi/moto en tiempo real en ciudades colombianas. Sirve a dos tipos de usuarios: conductores (seguimiento de viaje por GPS + tarifa en vivo) y pasajeros (planificación de ruta + estimación de tarifa con comparación de vehículos).

## Desarrollo

Sin sistema de compilación. Toda la aplicación vive en `index.html` (≈3.900 líneas). Para desarrollar:

- Abrir `index.html` directamente en el navegador, o servir con cualquier servidor estático (p. ej., `python -m http.server`)
- Desplegar subiendo `index.html`, `manifest.json`, `sw.js` y `assets/` a cualquier hosting estático

## Arquitectura

Toda la lógica está bajo el espacio de nombres del objeto global `CKM` usando IIFEs. Los módulos se inicializan en este orden dentro de `CKM.App.init()`:

| Módulo | Responsabilidad |
|---|---|
| `CKM.Storage` | Wrapper de localStorage (claves: `RATES`, `TRIP`, `PAX`, `FARES_PREF`) |
| `CKM.Router` | Navegación entre pantallas: `profile` → `driver` o `passenger` |
| `CKM.Fares` | BD maestra de tarifas: ciudad × vehículo → `{ base, kmRate, minuteRate, minFare }` |
| `CKM.FareEngine` | Fórmula de tarifa: `MAX(minFare, distance_km × kmRate)` rango ±10–18% |
| `CKM.Driver` | Seguimiento GPS, distancia Haversine, slots de dígitos animados, persistencia de viaje |
| `CKM.Passenger` | Geocodificación Nominatim, enrutamiento OSRM, mapa Leaflet, comparación de vehículos |

Tras `CKM.App.init()`, se ejecutan cuatro scripts utilitarios independientes: `initTheme()`, `initDriverCity()`, `initDisplayFix()`, `initPWA()`.

## Dependencias externas (CDN, sin API keys)

- **Leaflet 1.9.4** — renderizado del mapa para pasajeros
- **Nominatim** (`nominatim.openstreetmap.org`) — geocodificación con 4 reintentos, 1,1 s de espera entre intentos por límite de tasa
- **OSRM** (`router.project-osrm.org`) — distancias de ruta giro a giro
- **Google Fonts** — Orbitron (500/700/900) vía CSS `@import`

## Detalles clave de implementación

**Filtrado GPS (Driver):** Se descartan lecturas con precisión >25 m o velocidad >50 km/h. Umbral mínimo de movimiento: 0,003 km para suprimir ruido del sensor.

**Estrategia de geocodificación (Passenger):** Intenta 4 fallbacks progresivos (metro+departamento → ciudad+departamento → departamento → Colombia), valida que el resultado esté dentro de 150 km del centro del área metropolitana y filtra homónimos para cada ciudad soportada.

**Persistencia de viaje:** El estado del viaje activo se guarda en localStorage; al recargar la página, el tiempo transcurrido desde el último guardado se recalcula y el viaje se reanuda automáticamente.

**Datos de tarifas:** Calibrados contra precios de calle en Bucaramanga/Floridablanca (jun 2025). Ciudades soportadas: BGA, BOG, MED, CLO, BAQ, más una opción de tarifa personalizada.

**Temas:** Todos los colores usan propiedades personalizadas CSS (`--ckm-*`). Nunca hardcodear colores. El modo oscuro es el predeterminado; la preferencia persiste en localStorage.

**Localización:** Todo el formateo de números usa `toLocaleString('es-CO')` para la visualización de moneda en español colombiano.

**Service Worker:** `sw.js` se registra con cache-busting (`?v=4.4.0`). La cadena de versión debe coincidir en `index.html` y `sw.js` al actualizarse.
