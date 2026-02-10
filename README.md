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

1. **Publica y valida el WebApp o backend:**
   - Si usas Apps Script, despliega el WebApp como `Cualquiera con el enlace` y comprueba en incógnito que devuelva `prueba({...})` con la URL `https://.../exec?telefono=NUMERO&callback=prueba`.
   - Si prefieres la API Node, completa `backend/.env`, ejecuta `npm install` y `npm run dev` para exponer `http://localhost:8080/api/clientes`.
2. **Configura `app-config.js`:** define `webAppUrl` con la URL `/exec` vigente (Apps Script) y, si aplica, `serverApiUrl` para el backend Node. Ambas interfaces consumen estos valores.
3. **Sirve el frontend:** desde la raíz ejecuta `python3 -m http.server 8000` (u otro servidor estático) y abre `http://localhost:8000/Registro-clientes-87.html` para registrar o `http://localhost:8000/consulta-clientes.html` para consultar.

```bash
python3 -m http.server 8000
```
4. **Prueba una búsqueda real:** ingresa un teléfono existente; en DevTools → Network confirma que `exec?...callback=clienteCallback_...` responde `200` (Apps Script) o que `GET /api/clientes` devuelve JSON (backend Node).
5. **Repite tras cada despliegue:** si redeployas Apps Script o cambias credenciales, vuelve a validar el callback y actualiza la constante correspondiente antes de continuar.

### Frontend (Navegador del Usuario)

1.  **Apertura del Formulario:** El usuario abre el archivo `Registro-clientes-87.html` en su navegador.
2.  **Relleno de Datos:** El usuario completa los campos del formulario, con los datos de contacto (Nombre y Número telefónico) en disposición vertical.
3.  **Envío de Datos:** Al hacer clic en "Enviar Registro", el código JavaScript intercepta el envío.
4.  **Construcción y Envío de la Petición:**
    *   JavaScript recopila todos los datos del formulario en un objeto.
    *   Utiliza la función `fetch` para enviar estos datos a la URL del Web App de Google Apps Script mediante una petición `POST`.
    *   **Nota importante:** Se utiliza `mode: 'no-cors'` en la petición `fetch`. Esto permite que el formulario envíe datos desde cualquier origen (por ejemplo, un archivo local) al script de Google sin ser bloqueado por las políticas de seguridad del navegador (CORS). La desventaja es que el código JavaScript no puede leer la respuesta del servidor para saber si el registro fue 100% exitoso, por lo que asume el éxito si el envío se completa sin errores de red.
5.  **Feedback al Usuario:** El formulario muestra un cuadro emergente de confirmación accesible con el mensaje "Registro enviado" y se resetea, listo para un nuevo ingreso.
6.  **Acceso rápido a consultas:** El botón "Buscar cliente" abre `consulta-clientes.html` para revisar registros sin salir del flujo.

### Backend (Google Apps Script)

1.  **Recepción de la Petición:** El Web App de Google Apps Script detecta una petición `POST` y ejecuta automáticamente la función `doPost(e)`.
2.  **Bloqueo para Evitar Conflictos:** Se utiliza `LockService.getScriptLock()` para asegurar que solo una ejecución del script pueda escribir en la hoja de cálculo a la vez. Esto previene que los datos de dos usuarios que envían el formulario simultáneamente se mezclen o corrompan.
3.  **Acceso a la Hoja de Cálculo:**
    *   El script se conecta a la hoja de cálculo activa de Google Sheets.
    *   Busca una hoja llamada "Registros".
    *   Si la hoja no existe, la crea y le añade una fila de encabezados con los nombres de cada campo.
    *   Si la hoja ya existe, asegura que los encabezados incluyan las columnas esperadas (incluye "Cédula" por compatibilidad histórica) y añade columnas faltantes si es necesario.
4.  **Procesamiento de Datos:** El script extrae los datos JSON que vienen en la petición (`e.postData.contents`) y los convierte en un objeto de JavaScript.
5.  **Escritura en la Hoja:** Los datos se ordenan en un array (`newRow`) y se añaden como una nueva fila al final de la hoja "Registros" usando `sheet.appendRow(newRow)`.
6.  **Liberación del Bloqueo:** Finalmente, `lock.releaseLock()` libera el bloqueo, permitiendo que otras peticiones puedan ser procesadas.

## 4. Historial de Cambios

### v1.1

#### Resumen
En esta actualización se realizaron las siguientes modificaciones clave:

- **Cambio de Campo Principal:** Se reemplazó el campo "Cédula Cliente" por "Número telefónico" para alinearse mejor con las necesidades de contacto del negocio.
- **Ajuste de Estilos:** Se modificó el tamaño de la imagen del encabezado para que se ajuste correctamente al ancho del formulario, asegurando una apariencia simétrica y profesional.
- **Corrección de Backend:** Se ajustó la lógica en `Code.gs` para asegurar que los datos enviados desde el formulario (específicamente en formato JSON) sean leídos y procesados correctamente por el script.

#### Detalles Técnicos

1.  **Formulario (`Registro-clientes-87.html`):**
    *   Se actualizó la etiqueta (`label`) y el campo de entrada (`input`) de `clienteCedula` a `clienteTelefono`.

2.  **Hoja de Estilos (legacy `style.css`):**
    *   Se cambió la propiedad `max-width` de la clase `.header-image` a `100%` para garantizar que la imagen sea responsiva y no exceda el contenedor del formulario.

3.  **Script de Google (`Code.gs`):**
    *   En la función `doPost`, se actualizó la lista de `headers` para incluir "Número telefónico" en lugar de "Cédula Cliente".
    *   Se corrigió la forma en que se leen los datos, cambiando de `e.parameter` a `JSON.parse(e.postData.contents)`. Este fue un cambio crucial para interpretar correctamente los datos enviados por el `fetch` del formulario.
    *   Se actualizó la creación de la nueva fila (`newRow`) para usar `data.clienteTelefono`.

### v1.2

#### Resumen
En esta versión se introdujeron ajustes para mejorar la captura de datos y la experiencia del usuario:

- **Nuevo campo obligatorio:** Se añadió la sección "Cédula" con su respectivo input debajo de "Número telefónico".
- **Lista de asesores ampliada:** Se incorporaron las opciones "Jhon Rodriguez", "Jorge Rodriguez", "Juan Manuel Rodriguez" y "Juan Pablo Martinez" en el selector de asesores.
- **Confirmación visual:** Se reemplazó el mensaje plano por un modal accesible que confirma el envío exitoso.
- **Sincronización con Sheets:** El script ahora garantiza que la hoja incluya la columna "Cédula" antes de registrar cada envío.

#### Detalles Técnicos

1.  **Formulario (`Registro-clientes-87.html`):**
    *   Se reorganizó la sección de datos del cliente para mostrar los campos en disposición vertical y se añadió el input `clienteCedula`.
    *   Se agregó un modal de éxito con controles de teclado y clic para cerrarlo.
    *   Se actualizaron las opciones del selector `asesor` con los nuevos nombres.

2.  **Hoja de Estilos (legacy `style.css`):**
    *   Se ajustó el espaciado de `.form-group` para la nueva disposición.
    *   Se añadieron estilos para el modal (`.modal-overlay`, `.modal-content`, `modal-close-button`).

3.  **Script de Google (`Code.gs`):**
    *   Se creó la función `ensureRegistrosHeaders` para asegurar que la hoja "Registros" tenga todas las columnas esperadas, incluyendo "Cédula".
    *   Se incluyó el valor `data.clienteCedula` al construir la nueva fila que se inserta en la hoja.

### v1.3

#### Resumen
Se fortaleció el registro de vehículos para conservar el orden cuando el usuario agrega varias series en el formulario.

- **Columnas independientes:** El Apps Script ahora distribuye hasta tres selecciones de serie en las columnas `Serie del vehículo`, `Serie del vehículo 2` y `Serie del vehículo 3` en Google Sheets.
- **Limpieza de datos:** Se normalizan y separan los valores enviados en `serieVehiculo` antes de guardarlos.

#### Detalles Técnicos

1.  **Script de Google (`Code.gs`):**
    *   La función `doPost` transforma el campo oculto `serieVehiculo` en una lista (`seriesList`) y asigna cada elemento a columnas individuales.
    *   Se elimina la concatenación previa que guardaba todas las series en una única celda.
    *   En caso de recibir un solo valor, se mantiene en la columna principal sin afectar las columnas 2 y 3.

2.  **Hoja de cálculo (`Registros`):**
    *   La función `ensureRegistrosHeaders` sigue garantizando la existencia de las columnas utilizadas, por lo que no se requieren pasos adicionales en la hoja.

### v2.0

#### Resumen
Implementación del sistema de diseño corporativo modular y alineación visual entre los módulos de registro y consulta.

#### Detalles Técnicos

1.  **Sistema de estilos (`css/base.css`, `css/components.css`, `css/layout.css`, `css/theme.css`):**
    *   Tokens de color, tipografía y espaciado acordes a la guía de 87 Autos.
    *   Componentes BEM (botones, formularios, tarjetas, feedback, badges) con estados accesibles y variantes responsive.
2.  **Formulario (`Registro-clientes-87.html`):**
    *   Nueva maquetación centrada (`app-body`, `card`) con botones `button--accent` y controles `form-control`.
    *   Modal de confirmación reforzado y resumen de vehículos con chips interactivos.
3.  **Consulta (`consulta-clientes.html` y `demo app/index.html`):**
    *   Tarjetas contrastadas, feedback contextual (`feedback--success`, `feedback--error`) y navegación coherente hacia el registro.
    *   `demo app/script.js` ajusta los estados para reutilizar el mismo sistema de diseño.

### v2.1

#### Resumen
Integración de la biblioteca de imágenes de vehículos y ajustes visuales del membrete corporativo.

#### Detalles Técnicos

1.  **Catálogo de imágenes (`imagenes/`):**
    *   Se incorporó el paquete completo de fotografías de BMW/MINI utilizado por el selector del formulario.
    *   Cada archivo sigue el patrón `marca-serie-modelo-tipo.png` en minúsculas, con guiones en lugar de espacios y sin tildes.
    *   El membrete `MEMBRETE_HEADER.png` se restauró en la carpeta para que el formulario muestre el encabezado corporativo.
2.  **Heurística de búsqueda (`demo app/script.js`):**
    *   La función `buildImageNameCandidates` normaliza los valores de Sheets (quita pipes `|`, tildes y símbolos) y genera variaciones con guiones, guiones bajos y versiones ASCII.
    *   `findVehicleImage` recorre esas variantes y detecta la primera miniatura disponible, habilitando la sección multimedia en la tarjeta del cliente.
3.  **Estilos (`css/components.css`):**
    *   `.brand-banner` ahora es un bloque al 100 % del ancho disponible (`display: block`, `width: 100%`, `max-width: none`).
    *   El banner ocupa todo el encabezado de la tarjeta, mostrando `imagenes/MEMBRETE_HEADER.png` sin márgenes laterales.
4.  **Recomendaciones operativas:**
    *   Servir el proyecto con `python3 -m http.server 8000`, consultar un cliente existente y confirmar la visualización de las miniaturas.
    *   Cuando se añadan nuevos modelos en Sheets, crear la imagen correspondiente normalizando el nombre (minúsculas, guiones, sin acentos) para que la heurística la resuelva automáticamente.

#### Scraper BMW Motorrad (2025-09)

Se añadió el script `scripts/scrape_bmw_motorrad.py` para sincronizar el catálogo BMW Motorrad con la “Guía de Valores” de Fasecolda.

1. **Qué hace:**
   - Lee el listado BMW Motorrad ya definido en `Registro-clientes-87.html` conservando el orden del formulario.
   - Autentica contra el API público de Fasecolda (las credenciales están embedidas en su bundle) y busca coincidencias exactas.
   - Descarga la primera imagen disponible de cada referencia y la guarda en `imagenes_motos/slug.ext`, eliminando prefijos numéricos y respetando la extensión real (`jpg`, `png`, `webp`).
   - Genera `bmw_motorrad_referencias.csv` y `bmw_motorrad_referencias.json` con código, categoría, tipología, URL original y bandera `image_downloaded`.

2. **Cómo ejecutarlo:**
   - Desde la raíz, correr por lotes para evitar el timeout de la CLI (ejemplo con lotes de 17):

     ```bash
     for idx in $(seq 0 7); do
       python3 scripts/scrape_bmw_motorrad.py --chunk-size 17 --chunk-index $idx
     done
     ```

   - Si solo necesitas regenerar los metadatos sin bajar fotografías, añade `--skip-download`.

3. **Estado actual:** se obtuvieron 50 coincidencias (49 con imagen, 1 sin foto en el API). El script reporta también 84 referencias del catálogo interno que no se encuentran en la plataforma oficial para que se revisen manualmente.

4. **Mantenimiento:** define las credenciales mediante las variables de entorno
   `FASECOLDA_API_USERNAME` y `FASECOLDA_API_PASSWORD` (o pásalas con
   `--api-username/--api-password` al ejecutar los scripts). Si Fasecolda rota
   el usuario o contraseña, actualiza esos valores antes de reejecutar. Puedes
   crear un archivo `.env` basado en `.env.example` (no se versiona) y cargarlo
   con `export $(grep -v '^#' .env | xargs)` antes de ejecutar los scripts.

### Limpieza de secretos publicados

1. **Revoca** cualquier token o credencial expuesta en el panel del proveedor.
2. **Reescribe** el historial para borrar la cadena comprometida. Ejemplo con
   `git-filter-repo`:

   ```bash
   pip install git-filter-repo
   printf "cristian.vasquez@quantil.com.co==>REDACTED\neBGT6$tYU==>REDACTED\n" > cleanup.txt
   git filter-repo --replace-text cleanup.txt
   ```

   Agrega todas las cadenas sensibles que debes purgar al archivo
   `cleanup.txt`.
3. **Fuerza el push** para actualizar el remoto tras limpiar la historia:

   ```bash
   git push origin main --force-with-lease
   ```

4. **Genera nuevas credenciales** y actualiza tu `.env` local antes de volver a
   ejecutar los scripts.
   - Ante desajustes entre nombres de archivo y metadatos, corre `python3 scripts/normalize_moto_assets.py` para alinear las extensiones y rutas antes de publicar cambios.

### v2.2

#### Resumen
Normalización del catálogo BMW Motorrad, fallback visual por serie y solución al bloqueo `net::ERR_BLOCKED_BY_ORB` en Google Chrome durante las consultas.

#### Detalles Técnicos

1. **Renombrado de imágenes (`imagenes_motos/`):**
   * Se eliminó el prefijo numérico y se homogenizó el slug de cada modelo (`bmw-k-1300s-mt-1300cc.jpg`).
   * Se añadieron miniaturas de serie (`bmw-motorrad-serie-k.jpg`, `bmw-motorrad-serie-r.jpg`, etc.) reutilizando fotos existentes o creando marcadores ligeros (1×1 px) cuando falta material gráfico.
   * Se generó `motos_missing.json` para listar los modelos sin imagen real y facilitar su priorización.

2. **Heurística de búsqueda (`demo app/script.js`):**
   * El buscador revisa tanto `imagenes/` como `imagenes_motos/`, intentando primero el slug de la serie y luego las variantes del modelo.
   * Se centralizaron utilidades de normalización (`collapseSpaces`, `slugifyValue`, `extractSeriesSlug`, etc.) para garantizar que el nombre del archivo coincida con la cadena almacenada en Sheets.

3. **Compatibilidad con Chrome:**
   * La búsqueda detecta automáticamente endpoints de Google Apps Script o errores de CORS y activa JSONP como fallback, evitando `net::ERR_BLOCKED_BY_ORB` sin tocar la configuración.
   * `buildServerApiUrl` ahora calcula la URL base también bajo `file://`, por lo que la consulta funciona en Chrome aun cuando se abre directamente desde el sistema de archivos.

#### Recomendaciones Operativas

* Sustituir cada marcador de serie por la fotografía oficial correspondiente apenas esté disponible (manteniendo el mismo nombre de archivo).
* Tras actualizar imágenes, servir `consulta-clientes.html` y verificar que la tarjeta muestra la miniatura esperada tanto para autos como para motos.
* Después de redeployar Apps Script, comprobar en DevTools → Network que `GET https://script.google.com/.../exec?telefono=...` responde 200 sin errores ORB antes de liberar la actualización al equipo.

### v2.3

#### Resumen
Seguimiento comercial desde la consulta mediante “Observaciones #2”, sin duplicar filas en la hoja de cálculo.

#### Detalles Técnicos

1. **Script de Google (`Code.gs`):**
   * `HEADERS` añade la columna `Observaciones #2`; `ensureHeaders_` la crea automáticamente.
   * `doPost` enruta las peticiones con `action: "observaciones2"` hacia `handleObservationUpdate_`, que busca la fila por teléfono, agrega la nota con sello de tiempo y devuelve la ficha actualizada.

2. **Consulta (`consulta-clientes.html`, `demo app/script.js`):**
   * Se incorporó el formulario accesible bajo “Nueva búsqueda” para capturar notas de seguimiento.
   * `sendFollowupObservation` usa `fetch` en modo `cors`, recarga la tarjeta con la respuesta y muestra las líneas en la nueva sección “📝 Seguimiento”.

3. **Backends alternos (`backend/src/server.js`, `demo app/Code.gs`):**
   * Se sincronizaron encabezados y rangos para que la API Node y el Apps Script de demo expongan la nueva columna sin ajustes manuales.

### v2.4

#### Resumen
Ajustes de formulario y asesores para simplificar el registro de clientes.

#### Detalles Técnicos

1. **Formulario (`Registro-clientes-87.html`):**
   * Se retiró el campo **Cédula** del formulario de registro.
2. **Selector de asesores:**
   * Se agregó `Johan Calderon`, se retiraron `Yulieth Serrano` y `Juan Esteban Rodriguez`, y se ordenó el listado alfabéticamente.
3. **Compatibilidad con datos históricos:**
   * El backend mantiene la columna "Cédula" en Google Sheets para no afectar registros existentes.

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
*   [X] **Paso 3: Sistema de estilos (`css/*.css`)**: Definir el diseño corporativo modular (base, components, layout, theme) siguiendo Atomic Design.
*   [X] **Paso 4: Google Apps Script (`Code.gs`) - Parte 1: Función `doGet`**: Crear el script inicial y la función `doGet(e)` que servirá el archivo HTML como una página web.
*   [X] **Paso 5: Google Apps Script (`Code.gs`) - Parte 2: Función `doPost`**: Implementar la función `doPost(e)` para recibir los datos enviados desde el formulario.
*   [X] **Paso 6: Instrucciones Finales**: Proveer un resumen y los pasos para desplegar el proyecto en Google Apps Script.

## 8. Fase 2 – Consulta y depuración de clientes

Esta fase documenta el trabajo para que la **demo app** consulte la información de un cliente desde Google Sheets mediante Google Apps Script y JSONP. Se registran los problemas detectados, las soluciones aplicadas y los comandos ejecutados localmente.

### 8.1 Alcance

- Actualización de `demo app/Code.gs` para parametrizar el ID de la hoja (`SHEET_ID`) y tolerar nombres de pestañas distintos a `Registros`.
- Ajustes en `demo app/script.js` para apuntar a la nueva URL del WebApp JSONP.
- Eliminación de cabeceras CORS desde Apps Script (no compatibles con `ContentService`).
- Verificación del flujo completo sirviendo la carpeta `demo app` con `python3 -m http.server`.

### 8.2 Problemas encontrados

| Error | Causa detectada | Solución |
| ----- | ---------------- | -------- |
| `Error: No se pudo cargar el recurso JSONP.` | La WebApp redirigía a login (`302`), provocando `net::ERR_BLOCKED_BY_ORB` en Chrome. | Se redeployó la WebApp como `Cualquiera con el enlace`, se verificó manualmente el callback JSONP y se actualizó `WEBAPP_URL` en `demo app/script.js`. |

#### 8.2.1 Guía para recuperar el JSONP bloqueado

1. **Detectar el síntoma:** El navegador muestra `Error: No se pudo cargar el recurso JSONP.` en `demo app/script.js:183` y la pestaña Network reporta `302` seguido de `net::ERR_BLOCKED_BY_ORB` para `exec?...callback=clienteCallback_...`.
2. **Confirmar la causa:** Abrir una ventana de incógnito y visitar directamente la URL del WebApp (`https://.../exec?telefono=NUMERO&callback=prueba`). Si aparece la pantalla de login o no se devuelve `prueba({...})`, el despliegue no es público.
3. **Redplegar el WebApp:** En Apps Script → `Desplegar > Gestionar implementaciones` → `Nueva implementación`. Configurar **Ejecutar como:** tu cuenta y **Quién tiene acceso:** `Cualquiera con el enlace`. Guardar y copiar la nueva URL `/exec`.
4. **Verificar el callback manualmente:** Antes de volver al frontend, repetir la prueba en incógnito. Debe mostrarse texto plano similar a `prueba({...})`, confirmando que ya no hay redirección.
5. **Actualizar el frontend:** Sustituir la constante `WEBAPP_URL` en `demo app/script.js:6` con la URL recién generada. Guardar los cambios y recargar la app desde `http://localhost:8000/index.html` con hard reload (Ctrl+Shift+R) para que el navegador tome la nueva URL.
6. **Validar en la app:** Repetir la búsqueda del teléfono. La petición `exec?...callback=clienteCallback_...` debe responder `200` con contenido `clienteCallback_...({...})` y la tarjeta se renderiza sin errores.
| `TypeError: output.setHeader is not a function` | `ContentService.createTextOutput` no soporta `setHeader`. | Se retiraron las llamadas a `setHeader` y se mantuvo únicamente `setMimeType`. |
| `Error interno: No se encontró la hoja "Registros".` | La hoja objetivo tenía un nombre distinto. | Se añadió `SHEET_ID` y, si no existe la pestaña, se usa la primera hoja disponible. |
| `No se encontró información para este número` | El número no estaba en la columna exacta. | Se verificó el valor en Google Sheets y se probó con registros existentes. |

### 8.3 Comandos ejecutados

```bash
cd /home/danielromero/Datos/registro_clientes_87
python3 -m http.server 8000 -d "demo app"  # detener con Ctrl+C
```

> Si ya estás dentro de `demo app`, ejecuta `python3 -m http.server 8000` sin la opción `-d`.

### 8.4 Pasos de verificación

1. Obtener la URL del WebApp (`/exec`) tras publicar Apps Script.
2. Probar en incógnito: `https://.../exec?telefono=NUMERO&callback=prueba` y comprobar que responde `prueba({...})`.
3. Confirmar que `demo app/script.js` contiene la URL vigente en `WEBAPP_URL`.
4. Levantar el servidor local y abrir `http://localhost:8000/index.html`.
5. Buscar el número telefónico y validar que los datos correspondan a la hoja.
6. Registrar una nota en “Observaciones #2”, esperar el mensaje de éxito y confirmar en Google Sheets que la nueva línea quedó guardada en la columna correspondiente.

### 8.5 Notas adicionales

- El backend Node.js (`backend/`) continúa disponible como alternativa cuando la organización no permita WebApps públicas.
- `demo app/Code.gs` ahora inicia con un bloque que indica copiar y pegar todo el archivo en Apps Script antes de desplegar.
