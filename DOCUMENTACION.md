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
6.  **Acceso rápido a consultas:** Desde el mismo formulario se puede abrir `consulta-clientes.html` mediante el botón "Buscar cliente", evitando cambiar manualmente de página.

### Backend (Google Apps Script)

1.  **Recepción de la Petición:** El Web App de Google Apps Script detecta una petición `POST` y ejecuta automáticamente la función `doPost(e)`.
2.  **Bloqueo para Evitar Conflictos:** Se utiliza `LockService.getScriptLock()` para asegurar que solo una ejecución del script pueda escribir en la hoja de cálculo a la vez. Esto previene que los datos de dos usuarios que envían el formulario simultáneamente se mezclen o corrompan.
3.  **Acceso a la Hoja de Cálculo:**
    *   El script se conecta a la hoja de cálculo activa de Google Sheets.
    *   Busca una hoja llamada "Registros".
    *   Si la hoja no existe, la crea y le añade una fila de encabezados con los nombres de cada campo.
    *   Si la hoja ya existe, asegura que la primera fila tenga el encabezado "Cédula" (añade columnas faltantes antes de escribir los datos).
4.  **Procesamiento de Datos:** El script extrae los datos JSON que vienen en la petición (`e.postData.contents`) y los convierte en un objeto de JavaScript.
5.  **Escritura en la Hoja:** Los datos se ordenan en un array (`newRow`) —incluyendo `clienteCedula`— y se añaden como una nueva fila al final de la hoja "Registros" usando `sheet.appendRow(newRow)`. Cuando el campo oculto `serieVehiculo` contiene varias selecciones separadas por punto y coma, el script reparte cada valor en las columnas `Serie del vehículo`, `Serie del vehículo 2` y `Serie del vehículo 3` para mantenerlas individuales.
6.  **Liberación del Bloqueo:** Finalmente, `lock.releaseLock()` libera el bloqueo, permitiendo que otras peticiones puedan ser procesadas.

## 4. Actualizaciones Recientes

*   Se añadió el campo **Cédula** al formulario y se reorganizaron los datos de contacto en filas independientes.
*   Se incorporó un modal de confirmación que aparece tras cada envío exitoso y puede cerrarse con clic o tecla `Escape`.
*   El listado de asesores incluye ahora a **Jorge Rodriguez** y **Juan Manuel Rodriguez**.
*   El script de Google Apps Script introduce la función `ensureRegistrosHeaders` para crear/actualizar la columna "Cédula" antes de registrar datos.
*   Se reorganiza la escritura de series de vehículo para que cada selección se guarde en columnas independientes dentro de Google Sheets.
*   Se creó `app-config.js` para centralizar las URLs del backend y compartir la configuración entre registro y consulta.
*   Se añadió `consulta-clientes.html` como interfaz pública de búsqueda por teléfono y un botón de acceso directo desde el formulario de registro.
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
