# Formulario de Registro de Clientes

## 1. Introducción

Esta herramienta se desarrolla con el fin de poder llevar el control de los clientes que llegan a la vitrina. El objetivo principal es capturar todos los datos del formulario que se diligencia y almacenarlos en una base de datos de Google Sheets. Esta es la primera fase del desarrollo de la herramienta.

## 2. ¿Cómo Funciona?

El sistema se compone de tres partes principales que trabajan en conjunto:

### Paso 1: El Usuario Abre el Formulario

*   Un usuario accede a una URL proporcionada por Google Apps Script.
*   El script de Google (`Code.gs`) ejecuta la función `doGet(e)`, que muestra el formulario de registro (`Registro-clientes-87.html`).

### Paso 2: El Usuario Rellena y Envía el Formulario

*   El usuario introduce los datos del cliente en el formulario.
*   La hoja de estilos (`style.css`) asegura que el formulario sea visualmente atractivo y fácil de usar.
*   Al hacer clic en "Enviar", los datos se envían al script de Google.

### Paso 3: Los Datos se Guardan en Google Sheets

*   El script de Google (`Code.gs`) recibe los datos a través de la función `doPost(e)`.
*   Esta función procesa los datos y los añade como una nueva fila en una hoja de cálculo de Google Sheets, que actúa como nuestra base de datos.

## 3. Planes a Futuro

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

## 4. Plan de Desarrollo (Detallado)

Este documento detalla los pasos para la creación del formulario de registro de clientes y su integración con Google Apps Script.

*   [X] **Paso 1: Documentación Inicial**: Crear el archivo `DOCUMENTACION.md` y registrar el plan completo.
*   [X] **Paso 2: Estructura HTML (`Registro-clientes-87.html`)**: Crear el archivo HTML con todos los campos del formulario, la fuente Poppins y la configuración del método `POST`.
*   [X] **Paso 3: Estilos CSS (`style.css`)**: Crear la hoja de estilos para dar un diseño atractivo al formulario utilizando la paleta de colores definida.
*   [X] **Paso 4: Google Apps Script (`Code.gs`) - Parte 1: Función `doGet`**: Crear el script inicial y la función `doGet(e)` que servirá el archivo HTML como una página web.
*   [X] **Paso 5: Google Apps Script (`Code.gs`) - Parte 2: Función `doPost`**: Implementar la función `doPost(e)` para recibir los datos enviados desde el formulario.
*   [X] **Paso 6: Instrucciones Finales**: Proveer un resumen y los pasos para desplegar el proyecto en Google Apps Script.
