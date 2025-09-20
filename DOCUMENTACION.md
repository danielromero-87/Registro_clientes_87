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

### Frontend (Navegador del Usuario)

1.  **Apertura del Formulario:** El usuario abre el archivo `Registro-clientes-87.html` en su navegador.
2.  **Relleno de Datos:** El usuario completa los campos del formulario, ahora con los campos de contacto (Nombre, Número telefónico y Cédula) en disposición vertical.
3.  **Envío de Datos:** Al hacer clic en "Enviar Registro", el código JavaScript intercepta el envío.
4.  **Construcción y Envío de la Petición:**
    *   JavaScript recopila todos los datos del formulario en un objeto.
    *   Utiliza la función `fetch` para enviar estos datos a la URL del Web App de Google Apps Script mediante una petición `POST`.
    *   **Nota importante:** Se utiliza `mode: 'no-cors'` en la petición `fetch`. Esto permite que el formulario envíe datos desde cualquier origen (por ejemplo, un archivo local) al script de Google sin ser bloqueado por las políticas de seguridad del navegador (CORS). La desventaja es que el código JavaScript no puede leer la respuesta del servidor para saber si el registro fue 100% exitoso, por lo que asume el éxito si el envío se completa sin errores de red.
5.  **Feedback al Usuario:** El formulario despliega un modal accesible con el mensaje "Registro enviado" y se resetea, listo para un nuevo ingreso.

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
*   [X] **Paso 3: Estilos CSS (`style.css`)**: Crear la hoja de estilos para dar un diseño atractivo al formulario utilizando la paleta de colores definida.
*   [X] **Paso 4: Google Apps Script (`Code.gs`) - Parte 1: Función `doGet`**: Crear el script inicial y la función `doGet(e)` que servirá el archivo HTML como una página web.
*   [X] **Paso 5: Google Apps Script (`Code.gs`) - Parte 2: Función `doPost`**: Implementar la función `doPost(e)` para recibir los datos enviados desde el formulario.
*   [X] **Paso 6: Instrucciones Finales**: Proveer un resumen y los pasos para desplegar el proyecto en Google Apps Script.
