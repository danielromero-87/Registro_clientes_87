/**
 * PARTE 1: FUNCIÓN doGet
 * Esta función se ejecuta cuando un usuario visita la URL de la aplicación web.
 * Su propósito es tomar el archivo 'index.html' y mostrarlo en el navegador.
 */
function doGet(e) {
  // Crea una plantilla HTML a partir del archivo 'index.html'. 
  // En el entorno de Google Apps Script, puedes referenciar archivos por su nombre sin la extensión.
  var template = HtmlService.createTemplateFromFile('index');

  // Para incluir el CSS, creamos una función especial.
  // Esto es necesario porque Apps Script no permite etiquetas <link rel="stylesheet"> directamente.
  template.include = function(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  };

  // Evalúa la plantilla para procesar cualquier scriptlet (aunque no usamos en este paso)
  var htmlOutput = template.evaluate()
    .setTitle('Formulario de Registro de Clientes')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');

  return htmlOutput;
}

/**
 * PARTE 2: FUNCIÓN doPost (Implementación Completa)
 * Esta función se ejecuta cuando el formulario es enviado (POST).
 * Recibe los datos, los procesa y los guarda en una Hoja de Cálculo de Google.
 */
function doPost(e) {
  // Bloquea el script para evitar que múltiples envíos simultáneos causen conflictos
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    // --- CONFIGURACIÓN ---
    // IMPORTANTE: El nombre de tu archivo de Google Sheets.
    var SPREADSHEET_NAME = "Registro_clientes_87"; 
    // IMPORTANTE: El nombre de la pestaña (hoja) dentro de ese archivo.
    var SHEET_NAME = "Registros";

    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheetByName(SHEET_NAME);

    // Si la hoja "Registros" no existe, la crea y le añade los encabezados
    if (!sheet) {
      sheet = doc.insertSheet(SHEET_NAME);
      var headers = [
        "Timestamp", "Fecha y Hora", "Sede", "Nombre Asesor", "Fuente", 
        "Nombre Cliente", "Cédula Cliente", "Necesidad Principal", "Busca / Vende",
        "Serie del vehículo", "Presupuesto", "Siguiente paso", "Observaciones"
      ];
      sheet.appendRow(headers);
    }

    // Obtiene los datos enviados desde el formulario
    var data = e.parameter;

    // Crea la fila con los datos en el orden de los encabezados
    var newRow = [
      new Date(), // Añade un timestamp automático
      data.fechaHora, data.sede, data.asesor, data.fuente,
      data.clienteNombre, data.clienteCedula, data.necesidad,
      data.tipoVehiculo, data.serieVehiculo, data.presupuesto,
      data.siguientePaso, data.observaciones
    ];

    // Añade la nueva fila al final de la hoja
    sheet.appendRow(newRow);

    // Devuelve una respuesta de éxito al navegador
    return ContentService.createTextOutput("¡Registro guardado exitosamente!");

  } catch (error) {
    // En caso de error, lo registra y devuelve un mensaje de error
    return ContentService.createTextOutput("Ocurrió un error al guardar: " + error.message);

  } finally {
    // Libera el bloqueo para que otros puedan ejecutar el script
    lock.releaseLock();
  }
}
