# Formulario de Registro de Clientes

## 1. Introducción

Esta herramienta se desarrolla con el fin de poder llevar el control de los clientes que llegan a la vitrina. El objetivo principal es capturar todos los datos del formulario que se diligencia y almacenarlos en una base de datos de Google Sheets. Esta es la primera fase del desarrollo de la herramienta.

## 2. Tecnologías Utilizadas

*   **Frontend (Lo que ve el usuario):**
    *   **HTML5:** Para la estructura del formulario.
    *   **CSS3:** Para los estilos y el diseño visual.
    *   **JavaScript (ES6):** Para la lógica de envío de datos del formulario.
    *   **Google Fonts:** Para la tipografía (`Poppins`).

*   **Backend (Lo que pasa en la nube):**
    *   **Google Apps Script:** Para procesar los datos y conectarse con Google Sheets.

*   **Base de Datos:**
    *   **Google Sheets:** Actúa como base de datos para almacenar los registros.

*   **Control de Versiones:**
    *   **Git y GitHub:** Para el seguimiento de cambios en el código y el versionado del proyecto.

## 3. Funcionamiento Detallado

El sistema funciona en dos partes principales: el **Frontend** (el formulario que el usuario ve y rellena) y el **Backend** (el script que procesa y guarda los datos).

### Guía rápida de ejecución (demo app)

1. **Prepara el backend:**
   - Apps Script: despliega la WebApp con acceso `Cualquiera con el enlace` y valida en incógnito `https://.../exec?telefono=NUMERO&callback=prueba` para asegurarte de que responde `prueba({...})`.
   - Backend Node: completa `backend/.env`, ejecuta `npm install` y `npm run dev` para dejar operativo `http://localhost:8080/api/clientes`.
2. **Actualiza `app-config.js`:** define `webAppUrl` con la URL vigente del WebApp (`.../exec`) y, si aplica, `serverApiUrl` para el backend Node. Ambos frontends consumen estas constantes compartidas.
3. **Sirve el frontend:** desde la raíz corre `python3 -m http.server 8000` y visita `http://localhost:8000/Registro-clientes-87.html` para registrar y `http://localhost:8000/consulta-clientes.html` para consultar (usa Ctrl+Shift+R tras cambios).

```bash
python3 -m http.server 8000
```
4. **Verifica la consulta:** realiza una búsqueda con un número real; en DevTools → Network comprueba que la petición JSONP (`exec?...callback=...`) o REST (`/api/clientes`) responde `200` y contiene los datos esperados.
5. **Documenta nuevos despliegues:** si se genera otra URL `/exec` o cambian las credenciales del backend Node, repite los pasos 1-4.

### Frontend (Navegador del Usuario)

1.  **Apertura del Formulario:** El usuario abre el archivo `Registro-clientes-87.html` en su navegador.
2.  **Relleno de Datos:** El usuario completa los campos del formulario, ahora con los campos de contacto (Nombre, Número telefónico y Cédula) en disposición vertical.
3.  **Envío de Datos:** Al hacer clic en "Enviar Registro", el código JavaScript intercepta el envío.
4.  **Construcción y Envío de la Petición:**
    *   JavaScript recopila todos los datos del formulario en un objeto.
    *   Utiliza la función `fetch` para enviar estos datos a la URL del Web App de Google Apps Script mediante una petición `POST`.
    *   **Nota importante:** Se utiliza `mode: 'no-cors'` en la petición `fetch`. Esto permite que el formulario envíe datos desde cualquier origen (por ejemplo, un archivo local) al script de Google sin ser bloqueado por las políticas de seguridad del navegador (CORS). La desventaja es que el código JavaScript no puede leer la respuesta del servidor para saber si el registro fue 100% exitoso, por lo que asume el éxito si el envío se completa sin errores de red.
5.  **Feedback al Usuario:** El formulario despliega un modal accesible con el mensaje "Registro enviado" y se resetea, listo para un nuevo ingreso.
6.  **Acceso rápido a consultas y seguimiento:** Desde el formulario principal se puede abrir `consulta-clientes.html` con el botón "Buscar cliente". Luego de encontrar una ficha, la interfaz muestra el bloque "Observaciones #2" para registrar la nueva razón o avance asociado a esa visita.

#### Consulta y Observaciones #2

1. Al ingresar un número existente, la tarjeta despliega la sección “📝 Seguimiento” con las observaciones históricas.
2. El formulario inferior permite escribir una nueva nota, que se envía al mismo Apps Script (`fetch` con `POST` y `mode: 'cors'`).
3. Tras la confirmación, la tarjeta se refresca con el registro actualizado y la nueva línea queda visible en la columna `Observaciones #2` de Google Sheets (se respeta el salto de línea).
4. El botón “Nueva búsqueda” limpia tanto la ficha como el formulario de seguimiento para evitar enviar notas contra el número equivocado.

### Backend (Google Apps Script)

1.  **Recepción de la Petición:** El Web App de Google Apps Script detecta una petición `POST` y ejecuta automáticamente la función `doPost(e)`.
2.  **Bloqueo para Evitar Conflictos:** Se utiliza `LockService.getScriptLock()` para asegurar que solo una ejecución del script pueda escribir en la hoja de cálculo a la vez. Esto previene que los datos de dos usuarios que envían el formulario simultáneamente se mezclen o corrompan.
3.  **Acceso a la Hoja de Cálculo:**
    *   El script se conecta a la hoja de cálculo activa de Google Sheets.
    *   Busca una hoja llamada "Registros".
    *   Si la hoja no existe, la crea y le añade una fila de encabezados con los nombres de cada campo.
    *   Si la hoja ya existe, alinea la fila de encabezados con `HEADERS`, añadiendo columnas faltantes como "Observaciones #2" antes de escribir los datos.
4.  **Procesamiento de Datos:** El script extrae los datos JSON que vienen en la petición (`e.postData.contents`) y los convierte en un objeto de JavaScript.
5.  **Escritura y seguimiento:**
    *   Para nuevos registros, `doPost` construye `newRow` (con `clienteCedula`, las series distribuidas y `observaciones2`) y la agrega con `sheet.appendRow`.
    *   Cuando la petición incluye `action: "observaciones2"`, `handleObservationUpdate_` ubica la fila por número telefónico, concatena la nota con un sello de tiempo en `Observaciones #2` y devuelve el registro actualizado sin crear nuevas filas.
6.  **Liberación del Bloqueo:** Finalmente, `lock.releaseLock()` libera el bloqueo, permitiendo que otras peticiones puedan ser procesadas.

## 4. Actualizaciones Recientes

*   Se añadió el campo **Cédula** al formulario y se reorganizaron los datos de contacto en filas independientes.
*   Se incorporó un modal de confirmación que aparece tras cada envío exitoso y puede cerrarse con clic o tecla `Escape`.
*   El listado de asesores incluye ahora a **Jorge Rodriguez**, **Juan Manuel Rodriguez** y **Juan Pablo Martinez**.
*   El script de Google Apps Script introduce la función `ensureRegistrosHeaders` para crear/actualizar la columna "Cédula" antes de registrar datos.
*   Se reorganiza la escritura de series de vehículo para que cada selección se guarde en columnas independientes dentro de Google Sheets.
*   Se creó `app-config.js` para centralizar las URLs del backend y compartir la configuración entre registro y consulta.
*   Se añadió `consulta-clientes.html` como interfaz pública de búsqueda por teléfono y un botón de acceso directo desde el formulario de registro.
*   Se habilitó la captura de **Observaciones #2** desde la consulta; el formulario agrega la nota al registro existente y App Script conserva el historial con fecha y hora.
*   Se implementó un sistema de diseño modular (`css/base.css`, `css/components.css`, `css/layout.css`, `css/theme.css`) con tokens corporativos, componentes reutilizables y soporte responsive.

## 5. Control de Versiones con Git

Para gestionar el código y los cambios a lo largo del tiempo, se utilizó Git y GitHub. Los pasos principales para subir el proyecto fueron:

1.  **`git status`:** Para revisar qué archivos habían sido modificados.
2.  **`git add .`:** Para añadir todos los archivos nuevos o modificados al área de preparación.
3.  **`git commit -m "mensaje descriptivo"`:** Para crear una "instantánea" de los cambios con un mensaje que explica qué se hizo.
4.  **`git push origin main`:** Para subir todos los commits al repositorio remoto en GitHub.

## 6. Planes a Futuro

Para la siguiente fase del proyecto, nos enfocaremos en la automatización de procesos y en mejorar la gestión de la información de los clientes.

### Automatización de Tareas con Zapier

*   **Objetivo:** Conectar el formulario con otras aplicaciones para automatizar el flujo de trabajo.
*   **Acciones:**
    *   Integrar con **Google Calendar** para agendar citas automáticamente.
    *   Conectar con **Gmail** para enviar correos de bienvenida personalizados.
    *   Sincronizar con un **CRM** (como HubSpot o Zoho) para una gestión centralizada de clientes.

### Dashboard de Clientes en Looker Studio

*   **Objetivo:** Visualizar la información de los clientes de manera clara y efectiva.
*   **Acciones:**
    *   Crear un dashboard que muestre métricas clave (nuevos registros, datos demográficos, etc.).
    *   Añadir filtros para segmentar a los clientes según diferentes criterios.
    *   Generar reportes automáticos para el seguimiento del negocio.

### Mejoras en el Formulario

*   **Objetivo:** Optimizar la experiencia del usuario y la captura de datos.
*   **Acciones:**
    *   Añadir campos dinámicos que aparezcan según las respuestas del usuario.
    *   Implementar validación de datos en tiempo real.
    *   Realizar pruebas A/B para mejorar la tasa de conversión.

## 7. Plan de Desarrollo (Detallado)

*   [X] **Paso 1: Documentación Inicial**: Crear el archivo `DOCUMENTACION.md` y registrar el plan completo.
*   [X] **Paso 2: Estructura HTML (`Registro-clientes-87.html`)**: Crear el archivo HTML con todos los campos del formulario, la fuente Poppins y la configuración del método `POST`.
*   [X] **Paso 3: Sistema de estilos (`css/*.css`)**: Definir tokens, componentes y layouts modulares siguiendo Atomic Design (base, components, layout, theme).
*   [X] **Paso 4: Google Apps Script (`Code.gs`) - Parte 1: Función `doGet`**: Crear el script inicial y la función `doGet(e)` que servirá el archivo HTML como una página web.
*   [X] **Paso 5: Google Apps Script (`Code.gs`) - Parte 2: Función `doPost`**: Implementar la función `doPost(e)` para recibir los datos enviados desde el formulario.
*   [X] **Paso 6: Instrucciones Finales**: Proveer un resumen y los pasos para desplegar el proyecto en Google Apps Script.

## 8. Bitácora de la fase de consulta (demo app)

Esta sección resume cronológicamente las acciones realizadas para que la demo app consultara clientes desde Google Sheets usando Apps Script.

### 8.1 Preparación

1. Revisión de `demo app/DOCUMENTACION.md` y `Code.gs` original para entender el flujo JSONP.
2. Identificación de la URL inicial del WebApp y actualización de `app-config.js` cuando se generaron nuevas implementaciones.
3. Inclusión de la constante `SHEET_ID` en `Code.gs` para apuntar explícitamente a la hoja `1v8qrn9_XiYQWjcqNClUcHqEdYppwVhIL7YqpvBreLEE`.

### 8.2 Incidencias y soluciones

- **`No se pudo cargar el recurso JSONP` / `net::ERR_BLOCKED_BY_ORB`:**
  - *Causa:* La WebApp redirigía a la pantalla de login al estar restringida.
  - *Acción:* Se redeployó como `Cualquiera con el enlace`, se confirmó el callback manualmente y se actualizó `webAppUrl` en `app-config.js`.

#### Procedimiento aplicado paso a paso

1. **Reproducción:** En `demo app/script.js` la promesa JSONP fallaba en `script.onerror`, mostrando `Error: No se pudo cargar el recurso JSONP.`.
2. **Validación externa:** Se abrió una ventana de incógnito y se visitó `https://script.google.com/macros/s/AKfycbyrJyq5ve6WPo-yPmJIjDWwdO9L6GZ6YLZ22bJBwCmK3y9dzj6MTF-1SpepY9pVMS8l/exec?telefono=3112191576&callback=prueba`. La respuesta devolvió `prueba({...})`, confirmando que la implementación ya era pública; en caso contrario se habría mostrado la pantalla de login.
3. **Revisión de despliegue:** Se documentó que, si la respuesta no llega en formato `callback({...})`, se debe crear una nueva implementación en Apps Script con acceso `Cualquiera con el enlace` y repetir la verificación en incógnito.
4. **Actualización del frontend:** Se revisó `app-config.js` para garantizar que `webAppUrl` apunte a la última URL `/exec`. Tras editar, se recargó `http://localhost:8000/index.html` con Ctrl+Shift+R para limpiar cache.
5. **Resultado:** La petición `exec?...callback=clienteCallback_...` volvió a responder con `200 OK` y la tarjeta mostró la información del cliente sin errores.
- **`TypeError: output.setHeader is not a function`:**
  - *Causa:* `ContentService.createTextOutput` no admite `setHeader`.
  - *Acción:* Se eliminaron las llamadas a `setHeader` y se dejó solo `setMimeType`.
- **`Error interno: No se encontró la hoja "Registros"`:**
  - *Causa:* La pestaña objetivo tenía otro nombre.
  - *Acción:* Se actualizó `Code.gs` para usar `SHEET_ID` y, en su defecto, tomar la primera hoja disponible.
- **`No se encontró información para este número`:**
  - *Causa:* El número consultado no existía en la columna normalizada.
  - *Acción:* Se verificó la fila en Sheets y se probó con registros reales.

### 8.3 Cambios clave en el código

- `Code.gs` (raíz):
  - `doPost` y `doGet` conviven en un solo script, comparten constantes (`SHEET_ID`, `SHEET_NAME`, `HEADERS`) y normalizan la respuesta en formato JSON o JSONP.
  - Se validan entradas (`JSON.parse`, número telefónico) antes de escribir o consultar, con bloqueos `LockService` y registro de errores en consola.
- `app-config.js`:
  - Punto único para definir `webAppUrl` (Apps Script) y `serverApiUrl` (Node). Ambas interfaces leen estos valores, evitando duplicar URLs.
- `Registro-clientes-87.html`:
  - Botón "Buscar cliente" enlaza con la nueva página de consulta y el formulario usa `app-config.js` antes de ejecutar `fetch`.
  - Modal accesible se mantiene, pero ahora se refuerza con verificaciones cuando el modal no está disponible.
- `consulta-clientes.html` y `demo app/script.js`:
  - La consulta JSONP consume el mismo WebApp con callbacks únicos, interpreta `success/error` del backend y reutiliza la lista de encabezados de Google Sheets.

### 8.4 Pruebas locales

- Comando usado para servir todo el proyecto desde la raíz:
  ```bash
  cd /home/danielromero/Datos/registro_clientes_87
  python3 -m http.server 8000
  ```
- Navegación a `http://localhost:8000/Registro-clientes-87.html` para crear un registro y ver el modal de confirmación.
- Acceso a `http://localhost:8000/consulta-clientes.html` (o `demo app/index.html`) para buscar el número `3112191576`.
- Verificación en DevTools → Network de que la petición JSONP (`exec?...callback=...`) respondió `200` con los datos esperados.

### 8.5 Resultados

- Respuesta JSONP confirmada: `prueba({"Timestamp":"2025-09-18 14:57:00", ... })`.
- La interfaz muestra la ficha con los datos de Google Sheets sin errores de consola.
- Se dejó documentada la existencia del backend Node.js como alternativa para entornos con políticas más restrictivas.
- El botón "Buscar cliente" desde el formulario abre `consulta-clientes.html`, reutilizando la misma configuración.
- `app-config.js` centraliza la URL del WebApp, evitando olvidos al publicar nuevas implementaciones.

### 8.6 Integracion de imagenes de vehiculos (septiembre 2024)

1. **Paquete de imagenes**
   - Se importo la biblioteca completa de fotograficas de modelos BMW y MINI usadas en el selector del formulario. Todos los archivos residen en `imagenes/` y mantienen el formato `marca-serie-modelo-tipo.png` (minusculas, guiones y sin espacios).
   - Se reintrodujo `imagenes/MEMBRETE_HEADER.png` para que el formulario de registro muestre nuevamente el membrete corporativo en el encabezado.

2. **Heuristica de busqueda en la consulta**
   - `demo app/script.js` ahora genera candidatos de nombre a partir de los valores de la columna "Serie del vehiculo" eliminando tildes, simbolos de separacion (`|`, `;`) y mayusculas antes de intentar cargar la miniatura.
   - La busqueda prueba variaciones con guiones, guiones bajos y versiones ASCII, por lo que una entrada como `BMW | Serie i (electrico) | I3 - hatchback` termina revisando rutas tales como `imagenes/bmw-serie-i-(electricos)-i3-hatchback.png` y `imagenes/bmw-serie-i-electricos-i3-hatchback.png`.
   - Si no existe un archivo coincidente no se muestra tarjeta de medios; tan pronto se agrega la imagen correcta (nombre limpio en minusculas) se renderiza de forma automatica al consultar el cliente.

3. **Ajustes visuales**
   - Se actualizo `.brand-banner` en `css/components.css` para que el membrete ocupe el 100% del ancho de la tarjeta (`display: block`, `width: 100%`, sin `max-width`). Esto asegura que `imagenes/MEMBRETE_HEADER.png` se vea de borde a borde.
 - El area de medios (`clientMedia`) se limpia y oculta entre consultas para evitar que aparezcan imagenes residuales cuando se realiza una nueva busqueda.

4. **Verificacion sugerida**
 - Servir el proyecto con `python3 -m http.server 8000`, abrir `http://localhost:8000/consulta-clientes.html`, buscar un cliente real y confirmar la aparicion de las miniaturas cargadas desde `imagenes/`.
 - Al agregar nuevos modelos al Google Sheet, replicar el nombre normalizado del valor en el archivo de imagen correspondiente. En caso de duda, convertir el texto a minusculas, reemplazar espacios por guiones y eliminar tildes.

### 8.7 Observaciones #2 (enero 2025)

1. **Objetivo**
   - Permitir que los asesores registren nuevos avances desde la consulta sin duplicar filas ni perder el historial de comentarios.

2. **Cambios clave**
   - `Code.gs` amplía `HEADERS` con `Observaciones #2` y la función `handleObservationUpdate_` localiza la fila por teléfono, agrega la nota con `[YYYY-MM-DD HH:MM]` y devuelve la ficha completa.
   - `consulta-clientes.html` incorpora el formulario accesible bajo “Nueva búsqueda”; `demo app/script.js` captura el envío, usa `fetch` en modo `cors` y refresca la tarjeta con el registro actualizado.
   - El backend Node (`backend/src/server.js`) y el Apps Script de demo (`demo app/Code.gs`) también incluyen la nueva columna para mantener compatibilidad.

3. **Validación sugerida**
   1. Consultar un número existente y confirmar que la sección “📝 Seguimiento” liste las observaciones previas (respetando saltos de línea).
   2. Escribir una nueva nota en “Observaciones #2” y enviarla; el formulario muestra mensaje de éxito y se limpia.
   3. Revisar la tarjeta actualizada y la hoja `Registros` para comprobar que la columna `Observaciones #2` tenga la nueva línea con sello de tiempo.
   4. Presionar “Nueva búsqueda” para limpiar la ficha antes de consultar otro número.

## 9. Catálogo BMW Motorrad (scraping)

### 9.1 Objetivo y resumen

Se creó el script `scripts/scrape_bmw_motorrad.py` para automatizar la extracción de referencias BMW Motorrad desde la “Guía de Valores” de Fasecolda. El script:

- Lee el catálogo local definido en `Registro-clientes-87.html` (sección BMW Motorrad) respetando el orden de visualización.
- Autentica contra el mismo API público que usa la web oficial, normaliza las referencias y descarga la primera imagen disponible por modelo.
- Genera tres artefactos: la carpeta `imagenes_motos/`, `bmw_motorrad_referencias.csv` y `bmw_motorrad_referencias.json`.

En la última corrida se obtuvieron 50 coincidencias (49 con imagen y 1 sin foto publicada). Además, el script lista 84 referencias del catálogo interno que Fasecolda no expone en su API para revisión manual.

### 9.2 Requisitos

- Python 3.8 o superior.
- Biblioteca `requests` (`pip install requests` si no está disponible en el entorno).
- Conexión a internet (el script descarga token, datos y fotografías).
- Espacio en disco para ~50 imágenes JPEG (poco más de 6 MB en total).

> **Nota sobre timeouts:** La CLI de Codex limita cada comando a ~10 s. Por ello el script permite ejecutar el scraping en lotes controlados con `--chunk-size` y `--chunk-index`.

### 9.3 Ejecución recomendada

1. Situarse en la raíz del proyecto (`/home/danielromero/Datos/registro_clientes_87`).
2. Ejecutar el scraping por lotes (17 referencias por lote funciona bien):

   ```bash
   for idx in $(seq 0 7); do
     python3 scripts/scrape_bmw_motorrad.py --chunk-size 17 --chunk-index $idx
   done
   ```

   Ajustar `--chunk-size` y `--chunk-index` si se quiere reintentar únicamente un tramo concreto (por ejemplo, el lote que reportó fallas).

3. Si solo se desean regenerar los CSV/JSON sin volver a bajar imágenes, añadir `--skip-download`:

   ```bash
   python3 scripts/scrape_bmw_motorrad.py --skip-download
   ```

### 9.4 Estructura de salida

- `imagenes_motos/slug.ext`: fotografía de la referencia con nombre normalizado (sin prefijos numéricos) y con la extensión real detectada (`.jpg`, `.png`, `.webp`). El script sobreescribe el archivo si detecta una versión más reciente.
- `bmw_motorrad_referencias.csv`: tabla con los campos `order`, `catalog_label`, `codigo`, `tipologia`, `image_filename`, `image_url`, `image_downloaded` y otros metadatos.
- `bmw_motorrad_referencias.json`: mismo contenido en formato JSON para integraciones posteriores.

La columna `image_downloaded` se marca como `False` cuando el API no expone fotografía. Actualmente solo ocurre con `BMW R [K51] 1250 GS ADVENTURE R MT 1250CC ABS`.

### 9.5 Diagnóstico de coincidencias

Al final de cada ejecución se imprimen dos listados importantes:

- **Referencias sin coincidencia en el API:** catálogo interno que Fasecolda no publica. Útil para decidir si se sustituyen por imágenes propias o se ocultan del selector.
- **Referencias sin imagen descargable:** coincidencias que existían en la API pero cuyo primer recurso falló. El script vuelve a marcarlas en cada corrida hasta que la descarga sea exitosa.

Para revisar qué registros carecen de imagen basta con ejecutar:

```bash
python3 - <<'PY'
import csv
records = list(csv.DictReader(open('bmw_motorrad_referencias.csv', encoding='utf-8')))
missing = [r['catalog_label'] for r in records if r['image_downloaded'] == 'False']
print(missing or 'Todas las coincidencias tienen imagen')
PY
```

### 9.6 Mantenimiento

- **Cambios en credenciales del API:** Fasecolda publica las credenciales en su bundle JS. Si dejan de funcionar, actualiza `FASECOLDA_API_USERNAME` y `FASECOLDA_API_PASSWORD` (o pasa nuevos valores mediante `--api-username/--api-password` al ejecutar los scripts).
- **Nuevos modelos en el catálogo local:** al añadir modelos a `Registro-clientes-87.html`, reejecutar el scraping para sincronizar fotos y metadatos.
- **Respaldo:** conservar `imagenes_motos/` junto con los CSV/JSON en control de versiones o en un almacenamiento seguro para mantener trazabilidad.
- **Registro de errores:** los warnings se muestran en consola (por ejemplo, cuando una descarga de imagen falla). Conviene guardarlos en el flujo de despliegue para saber qué modelo requiere intervención manual.
- **Normalización de activos existentes:** ejecutar `python3 scripts/normalize_moto_assets.py` cuando haya cambios manuales en las imágenes para alinear nombres de archivo, extensiones y metadatos antes de versionar.

### 9.7 Normalización y fallback (2025-10-01)

**Objetivo:** garantizar que cada modelo y serie de BMW Motorrad cuente con un slug consistente y que la consulta muestre al menos una imagen representativa.

1. **Renombrado de assets**
   - Se eliminaron los prefijos numéricos (`NNN_`), se normalizaron los slugs y se detectó automáticamente la extensión correcta de cada archivo (`bmw-f-900-gs-mt-900cc-abs.jpg`, `bmw-f-900-xr-dynamic-mt-900cc-abs.png`).
   - Se crearon archivos de serie (`bmw-motorrad-serie-*.jpg`). Si existe una foto real (>5 KB) se reutiliza; en caso contrario se coloca un marcador de 1×1 px listo para ser reemplazado.
   - El script auxiliar generó `motos_missing.json` con los modelos que aún necesitan fotografía oficial.

2. **Heurística en `demo app/script.js`**
   - `findVehicleImage` intenta primero el slug de la serie y después las variantes del modelo, recorriendo `imagenes/` y `imagenes_motos/` en ese orden.
   - Se añadieron utilidades comunes (`collapseSpaces`, `slugifyValue`, `extractSeriesSlug`, etc.) para que la normalización coincida con los valores de Sheets y con las rutas de los archivos.

3. **Buenas prácticas**
   - Reemplazar cuanto antes los marcadores de serie manteniendo el nombre del archivo (peso ~329 bytes identifica a los placeholders).
   - Tras sustituir una imagen, refrescar `consulta-clientes.html` y confirmar que la tarjeta del cliente muestra la miniatura deseada.
   - Si se reejecuta el scraper, respaldar previamente las imágenes curadas para restaurarlas en caso de que el proceso automatizado las sobrescriba.

## 10. Problemas conocidos y soluciones

### 10.1 Bloqueo `net::ERR_BLOCKED_BY_ORB` en Google Chrome

- **Síntoma:** al consultar un cliente, la consola muestra `No se pudo cargar el recurso JSONP` y la petición `exec?...callback=clienteCallback...` aparece bloqueada.
- **Causa:** Chrome impide que un `<script>` obtenga JSON (Optimized Response Blocking). El modo JSONP usado como fallback activaba el bloqueo.
- **Solución aplicada:**
  1. La consulta detecta automáticamente hosts de Google Apps Script o fallos de CORS y activa el fallback JSONP sin requerir cambios manuales en `app-config.js`.
  2. `buildServerApiUrl` usa la ubicación actual como base incluso bajo `file://`, evitando excepciones al abrir el HTML directamente en Chrome.
  3. Si `serverApiUrl` apunta a un backend con CORS habilitado, la ruta REST sigue siendo prioritaria; en caso contrario la experiencia permanece en modo JSONP.
- **Verificación:** en DevTools → Network puede aparecer un intento REST bloqueado, pero la solicitud `<script ... callback=clienteCallback>` concluye en 200 y la tarjeta del cliente se renderiza sin errores `ORB`.
