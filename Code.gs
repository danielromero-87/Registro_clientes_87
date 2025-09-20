/**
 * PARTE 1: FUNCIÓN doGet
 * Esta función se ejecuta cuando un usuario visita la URL de la aplicación web.
 * Su propósito es tomar el archivo 'index.html' y mostrarlo en el navegador.
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.accion === 'buscarCliente') {
    return handleLookupRequest_(e.parameter);
  }

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
    var SPREADSHEET_NAME = "Registro_clientes_87"; 
    var SHEET_NAME = "Registros";

    var headerRow = ensureRegistrosHeaders();

    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheetByName(SHEET_NAME);

    // **LA CORRECCIÓN CLAVE ESTÁ AQUÍ**
    // Parsea el texto JSON que viene en el cuerpo de la solicitud POST
    var data = JSON.parse(e.postData.contents);

    var serieVehiculoRaw = data.serieVehiculo || '';
    var seriesList;

    if (Array.isArray(serieVehiculoRaw)) {
      seriesList = serieVehiculoRaw;
    } else if (typeof serieVehiculoRaw === 'string') {
      seriesList = serieVehiculoRaw.split(';');
    } else {
      seriesList = [];
    }

    seriesList = seriesList.map(function(item) {
      return item ? String(item).trim() : '';
    }).filter(function(item) {
      return item !== '';
    });

    var serieVehiculo1 = seriesList.length > 0 ? seriesList[0] : '';
    if (!serieVehiculo1 && typeof serieVehiculoRaw === 'string') {
      serieVehiculo1 = serieVehiculoRaw.trim();
    }

    var serieVehiculo2 = seriesList.length > 1 ? seriesList[1] : '';
    var serieVehiculo3 = seriesList.length > 2 ? seriesList[2] : '';

    var newRow = new Array(headerRow.length).fill('');

    var headerIndexMap = buildHeaderIndexMap_(headerRow);

    var setCell = function(headerName, value) {
      var index = headerIndexMap[headerName.trim()];
      if (index !== -1) {
        newRow[index] = value;
      }
    };

    setCell('Timestamp', new Date());
    setCell('Fecha y Hora', data.fechaHora);
    setCell('Sede', data.sede);
    setCell('Nombre Asesor', data.asesor);
    setCell('Fuente', data.fuente);
    setCell('Nombre Cliente', data.clienteNombre);
    setCell('Número telefónico', data.clienteTelefono);
    setCell('Cédula', data.clienteCedula);
    setCell('Necesidad Principal', data.necesidad);
    setCell('Busca / Vende', data.tipoVehiculo);
    setCell('Serie del vehículo', serieVehiculo1);
    setCell('Serie del vehículo 2', serieVehiculo2);
    setCell('Serie del vehículo 3', serieVehiculo3);
    setCell('Presupuesto', data.presupuesto);
    setCell('Siguiente paso', data.siguientePaso);
    setCell('Observaciones', data.observaciones);

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

function ensureRegistrosHeaders() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName('Registros');
  var requiredHeaders = [
    'Timestamp', 'Fecha y Hora', 'Sede', 'Nombre Asesor', 'Fuente',
    'Nombre Cliente', 'Número telefónico', 'Cédula', 'Necesidad Principal', 'Busca / Vende',
    'Serie del vehículo', 'Serie del vehículo 2', 'Serie del vehículo 3', 'Presupuesto', 'Siguiente paso', 'Observaciones'
  ];

  if (!sheet) {
    sheet = doc.insertSheet('Registros');
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    return requiredHeaders.slice();
  }

  var lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    return requiredHeaders.slice();
  }

  var headerRange = sheet.getRange(1, 1, 1, lastColumn);
  var headerRow = headerRange.getValues()[0];

  requiredHeaders.forEach(function(header) {
    var index = findHeaderIndex_(headerRow, header);
    if (index === -1) {
      sheet.insertColumnAfter(sheet.getLastColumn() || 1);
      var newIndex = sheet.getLastColumn();
      sheet.getRange(1, newIndex).setValue(header);
      headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    } else if (!headerRow[index]) {
      sheet.getRange(1, index + 1).setValue(header);
      headerRow[index] = header;
    }
  });

  return headerRow;
}

function findHeaderIndex_(headerRow, headerName) {
  var normalized = headerName.trim();
  for (var i = 0; i < headerRow.length; i++) {
    var cell = headerRow[i];
    if (cell && String(cell).trim() === normalized) {
      return i;
    }
  }
  return -1;
}

function buildHeaderIndexMap_(headerRow) {
  var map = {};
  for (var i = 0; i < headerRow.length; i++) {
    var cell = headerRow[i];
    if (cell) {
      map[String(cell).trim()] = i;
    }
  }
  return map;
}

function handleLookupRequest_(params) {
  var normalizedCedula = normalizeCedula_(params && params.cedula);
  var callbackName = params && params.callback;

  if (!normalizedCedula) {
    return createJsonResponseWithOptionalJsonp_({
      success: false,
      message: 'Debes enviar un número de cédula válido.'
    }, callbackName);
  }

  var rowData = findClientePorCedula_(normalizedCedula);

  if (!rowData) {
    return createJsonResponseWithOptionalJsonp_({
      success: false,
      message: 'No se encontraron registros para la cédula indicada.'
    }, callbackName);
  }

  return createJsonResponseWithOptionalJsonp_({
    success: true,
    data: mapRowToPayload_(rowData)
  }, callbackName);
}

function findClientePorCedula_(cedula) {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName('Registros');

  if (!sheet) {
    return null;
  }

  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();

  if (!values || values.length < 2) {
    return null;
  }

  var headers = values[0];
  var cedulaIndex = headers.indexOf('Cédula');

  if (cedulaIndex === -1) {
    return null;
  }

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var rowCedula = normalizeCedula_(row[cedulaIndex]);

    if (rowCedula && rowCedula === cedula) {
      return mapRowToObject_(headers, row);
    }
  }

  return null;
}

function mapRowToObject_(headers, row) {
  var result = {};
  for (var i = 0; i < headers.length; i++) {
    result[headers[i]] = row[i];
  }
  return result;
}

function mapRowToPayload_(row) {
  return {
    timestamp: toIsoString_(row['Timestamp']),
    fechaHora: toIsoString_(row['Fecha y Hora']) || '',
    sede: sanitizeString_(row['Sede']),
    asesor: sanitizeString_(row['Nombre Asesor']),
    fuente: sanitizeString_(row['Fuente']),
    nombre: sanitizeString_(row['Nombre Cliente']),
    telefono: sanitizeString_(row['Número telefónico']),
    cedula: sanitizeString_(row['Cédula']),
    necesidad: sanitizeString_(row['Necesidad Principal']),
    tipoVehiculo: sanitizeString_(row['Busca / Vende']),
    serieVehiculo: sanitizeString_(row['Serie del vehículo']),
    serieVehiculo2: sanitizeString_(row['Serie del vehículo 2']),
    serieVehiculo3: sanitizeString_(row['Serie del vehículo 3']),
    presupuesto: parseNumber_(row['Presupuesto']),
    siguientePaso: sanitizeString_(row['Siguiente paso']),
    observaciones: sanitizeString_(row['Observaciones'])
  };
}

function createJsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function createJsonResponseWithOptionalJsonp_(payload, callbackName) {
  if (callbackName) {
    return ContentService
      .createTextOutput(callbackName + '(' + JSON.stringify(payload) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return createJsonResponse_(payload);
}

function normalizeCedula_(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(/\D/g, '');
}

function sanitizeString_(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return toIsoString_(value);
  }

  return String(value).trim();
}

function toIsoString_(value) {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  var stringValue = String(value).trim();
  if (!stringValue) {
    return '';
  }

  // Si viene en formato "YYYY-MM-DD HH:mm", conviértelo a ISO válido.
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(stringValue)) {
    stringValue = stringValue.replace(' ', 'T');
  }

  var parsedDate = new Date(stringValue);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString();
  }

  return stringValue;
}

function parseNumber_(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  var numericString = String(value)
    .replace(/[^0-9.,-]/g, '')
    .replace(/,/g, '');

  var parsed = Number(numericString);
  return isNaN(parsed) ? null : parsed;
}
