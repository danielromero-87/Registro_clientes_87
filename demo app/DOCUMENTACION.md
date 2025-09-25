# Demo App – Consulta de Clientes

Este documento describe los archivos, flujos y configuraciones necesarias para que la aplicación web **demo app** muestre la información de un cliente a partir de su número telefónico. Ahora puedes elegir entre dos opciones de backend:

- **Apps Script (JSONP)**: la versión original que lee directamente de Google Sheets.
- **API Node.js**: un servicio Express que actúa como proxy seguro frente a la misma hoja.

## Guía rápida de arranque

1. **Selecciona backend:** publica la WebApp de Apps Script como `Cualquiera con el enlace` y comprueba `https://.../exec?telefono=NUMERO&callback=prueba` en incógnito, o levanta el backend Node (`npm install` + `npm run dev` en `backend/`).
2. **Configura `script.js`:** asigna `SERVER_API_URL` cuando uses el backend Node, o actualiza `WEBAPP_URL` con la URL `/exec` vigente si consumes Apps Script.
3. **Inicia el servidor estático:** desde la raíz del proyecto ejecuta `python3 -m http.server 8000 -d "demo app"` y abre `http://localhost:8000/index.html` (la app local; hard reload tras cambios).

   ```bash
   python3 -m http.server 8000 -d "demo app"
   ```
4. **Verifica la búsqueda:** ingresa un teléfono registrado y en DevTools → Network confirma que `exec?...callback=...` responde `200` o que `/api/clientes` devuelve JSON.
5. **Documenta cambios:** cada vez que redeployes Apps Script o modifiques credenciales del backend Node, repite los pasos anteriores antes de compartir la URL.

## Estructura de archivos

- `Code.gs`: Script de Google Apps Script con soporte JSONP y encabezados CORS para la WebApp. Permite indicar `SHEET_ID` si no usas un script ligado directamente a la hoja.
- `index.html`: Interfaz web con formulario de búsqueda y tarjeta de resultados.
- `script.js`: Lógica del frontend. Puede consumir la WebApp JSONP o la API REST (configurable).
- `backend/`: Backend Node.js que consulta Google Sheets (cuenta de servicio o credenciales predeterminadas) y expone `/api/clientes`.

> El archivo `Code.gs` en la raíz del repositorio **no se modifica** durante este flujo. Usa la versión ubicada dentro de `demo app`.

## Datos esperados en Google Sheets

La hoja `Registros` debe tener la primera fila con los encabezados en este orden exacto:

```
Timestamp | Fecha y Hora | Sede | Nombre Asesor | Fuente | Nombre Cliente |
Número telefónico | Cédula | Necesidad Principal | Busca / Vende |
Serie del vehículo | Serie del vehículo 2 | Serie del vehículo 3 |
Presupuesto | Siguiente paso | Observaciones
```

La coincidencia se realiza de forma exacta sobre la columna **Número telefónico** (después de eliminar caracteres no numéricos).

## Opciones de backend

### WebApp de Google Apps Script (JSONP)

1. Crear un proyecto de Google Apps Script asociado a la hoja de cálculo que contiene la pestaña `Registros`.
2. Reemplazar el contenido con `demo app/Code.gs`.
3. Guardar cambios y desplegar desde **Desplegar → Nueva implementación**.
4. Configurar:
   - **Ejecutar como:** tu cuenta de Google.
   - **Quién tiene acceso:** `Cualquiera con el enlace`.
5. Confirmar el despliegue y copiar la **URL del WebApp** (termina en `/exec`).
6. Probar en incógnito con `?telefono=NUMERO&callback=prueba` para verificar que devuelve `prueba({...})`.

### API Node.js (`backend/`)

1. Crear un proyecto en Google Cloud y habilitar la API de Google Sheets.
2. Elige una de estas opciones de autenticación:
   - **Cuenta de servicio**: crea la cuenta, comparte la hoja con su correo y descarga la clave JSON. Luego, define `GOOGLE_APPLICATION_CREDENTIALS` en `.env`.
   - **Credenciales predeterminadas (ADC)**: ejecuta `gcloud auth application-default login` con la cuenta que tiene acceso a la hoja. No necesitas archivo JSON; deja sin definir `GOOGLE_APPLICATION_CREDENTIALS`.
3. Copia `.env.example` a `.env` dentro de `backend/` y completa:
   - `SPREADSHEET_ID`: identificador en la URL de la hoja.
   - `SHEET_NAME`: normalmente `Registros`.
   - `GOOGLE_APPLICATION_CREDENTIALS`: solo si usas cuenta de servicio.
4. Instala dependencias y ejecuta:

   ```bash
   cd backend
   npm install
   npm run dev
   ```

6. El servidor quedará escuchando en `http://localhost:8080/api/clientes?telefono=NUMERO` y responderá JSON estándar.

> El backend implementa un caché en memoria (TTL configurable con `CACHE_TTL_MS`) para reducir llamadas repetitivas a la hoja.

## Configuración del frontend (`script.js`)

1. Define **una** de las siguientes constantes:
   - `SERVER_API_URL`: apunta a la API Node.js (por ejemplo `http://localhost:8080/api/clientes`).
   - `WEBAPP_URL`: apunta a la WebApp de Apps Script (`https://script.google.com/.../exec`).
2. Si `SERVER_API_URL` tiene un valor válido, el frontend usará `fetch` y CORS estándar. Si está vacío, se activa el modo JSONP usando `WEBAPP_URL`.
3. Serve la carpeta `demo app` desde un servidor local:
   - Python: `python -m http.server 8000 -d "demo app"`
   - Node (serve): `npx serve "demo app"`
4. Abre `http://localhost:8000/index.html` y realiza la búsqueda por número.

> Abrir `index.html` con `file://` funciona en la mayoría de navegadores, pero ejecutar desde un servidor local evita bloqueos adicionales (ORB) y te permitirá consumir el backend Node.js sin problemas de CORS.

## Flujo de consulta

1. El usuario ingresa el teléfono y se normaliza a solo dígitos.
2. Dependiendo de la configuración:
   - **API Node.js**: se construye `GET /api/clientes?telefono=...`, el backend consulta Sheets con la cuenta de servicio y responde `{ telefono, data }`.
   - **WebApp Apps Script**: se genera un callback dinámico (`clienteCallback_TIMESTAMP_ALEATORIO`) y se inyecta un `<script>` apuntando al WebApp con `telefono` y `callback`.
3. El frontend procesa el payload y renderiza la tarjeta respetando el orden definido en `HEADERS`.
4. Cualquier campo vacío se muestra como `Sin información`; **Presupuesto** se formatea con separador de miles (`Intl.NumberFormat('es-CO')`).

## Manejo de errores

- Falta de parámetro `telefono` o caracteres no numéricos.
- Número sin coincidencias en la hoja.
- Errores de red, timeouts o URL incorrectas.
- Para el backend Node.js se propagan los mensajes de error (`404` si no encuentra el cliente, `502` ante problemas consultando Sheets).

## Solución de problemas

| Síntoma | Causa posible | Acción sugerida |
| ------- | ------------- | --------------- |
| `Error al conectar con el servidor` | WebApp privada, backend apagado o URL errónea | Verifica permisos de Apps Script o que `npm run dev` esté activo. |
| `SERVER_API_URL no es una URL válida` | Valor vacío o relativo sin servidor | Ajusta la constante, p. ej. `http://localhost:8080/api/clientes` o `/api/clientes`. |
| `net::ERR_BLOCKED_BY_ORB` | Chrome detecta respuesta sin JSONP esperado | Revisa la WebApp o usa el backend Node.js que responde JSON estándar. |
| `Error: No se pudo cargar el recurso JSONP.` | WebApp redirigida a login (`302`) o URL desactualizada en el frontend. | Redeploy con acceso `Cualquiera con el enlace`, validar `callback({...})` en incógnito y actualizar `WEBAPP_URL` en `demo app/script.js`. |
| Respuesta vacía / sin cliente | El número no coincide exactamente en la hoja | Verifica la columna `Número telefónico` (sin espacios ni prefijos). |

## Próximos pasos

- Añadir métricas o logs al backend para auditoría.
- Implementar autenticación básica si debes limitar el acceso al listado.
- Si la aplicación crece, considera migrar los datos a una base de datos (Supabase, Postgres, etc.) y reutilizar la misma arquitectura REST.

Mantén este documento actualizado cada vez que cambie la estructura, URLs de backend o el proceso de despliegue.

## Historial de incidencias resueltas

| Momento | Detalle | Acción aplicada |
| ------- | ------- | ---------------- |
| Error de JSONP (`No se pudo cargar el recurso JSONP`) | La WebApp exigía inicio de sesión y Chrome bloqueó la respuesta (`net::ERR_BLOCKED_BY_ORB`). | Redeploy como `Cualquiera con el enlace`, validación manual en incógnito con `?telefono=NUMERO&callback=prueba`. |

### Guía detallada para recuperar el JSONP

1. **Identificar el fallo:** El modal muestra “No se pudo cargar el recurso JSONP.” y la consola señala `script.js:183`. En Network se observa `exec?...callback=clienteCallback_...` con `302` seguido de `net::ERR_BLOCKED_BY_ORB`.
2. **Probar la URL del WebApp:** Abrir incógnito y visitar `https://script.google.com/macros/s/AKfycbyrJyq5ve6WPo-yPmJIjDWwdO9L6GZ6YLZ22bJBwCmK3y9dzj6MTF-1SpepY9pVMS8l/exec?telefono=3112191576&callback=prueba`. Si la respuesta no es texto plano `prueba({...})`, la implementación no es pública.
3. **Redplegar (si es necesario):** En Apps Script crear una nueva implementación con `Ejecutar como: Tu cuenta` y `Quién tiene acceso: Cualquiera con el enlace`. Copiar la URL `/exec` resultante.
4. **Actualizar el frontend:** Sustituir la constante `WEBAPP_URL` en `demo app/script.js:6` con la URL vigente. Guardar y recargar `http://localhost:8000/index.html` usando hard reload (Ctrl+Shift+R) para evitar cache.
5. **Confirmar la corrección:** En DevTools → Network verificar que la petición `exec?...callback=clienteCallback_...` responde `200` y la vista Response contiene `clienteCallback_...({...})`. La tarjeta debe rellenarse con los datos de Sheets.
| `TypeError: output.setHeader is not a function` | `ContentService.createTextOutput` no permite `setHeader`. | Se retiraron las cabeceras personalizadas en `Code.gs`. |
| `Error interno: No se encontró la hoja "Registros"` | La pestaña objetivo tenía otro nombre. | Se parametrizó `SHEET_ID` y se añadió fallback a la primera hoja disponible. |
| `No se encontró información para este número` | Número sin coincidencia en Sheets. | Se verificó la columna `Número telefónico` y se probó con registros reales (3112191576). |

### Comandos ejecutados en la terminal

```bash
cd /home/danielromero/Datos/registro_clientes_87
python3 -m http.server 8000 -d "demo app"  # Servidor local (Ctrl+C para detener)
```

### Pasos para reproducir la prueba final

1. Publicar Apps Script y copiar la URL `/exec`.
2. Confirmar en incógnito que responde `callback({...})`.
3. Verificar que `WEBAPP_URL` en `script.js` coincide con la URL publicada.
4. Levantar el servidor local y abrir `http://localhost:8000/index.html`.
5. Buscar el número telefónico real registrado en la hoja.
