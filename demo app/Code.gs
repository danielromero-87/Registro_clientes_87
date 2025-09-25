/*
 * Copia y pega TODO este archivo en el editor de Apps Script vinculado a tu Google Sheet.
 * Completa la constante SHEET_ID con el identificador de la hoja antes de desplegar.
 */
/**
 * WebApp para consultar fichas de clientes por número telefónico.
 * Esta versión incluye soporte JSONP (parámetro callback) para evitar restricciones CORS
 * cuando se consume desde archivos locales.
 */
const DEMO_SHEET_NAME = 'Registros';
const SHEET_ID = '1v8qrn9_XiYQWjcqNClUcHqEdYppwVhIL7YqpvBreLEE';
const DEMO_HEADERS = [
  'Timestamp',
  'Fecha y Hora',
  'Sede',
  'Nombre Asesor',
  'Fuente',
  'Nombre Cliente',
  'Número telefónico',
  'Cédula',
  'Necesidad Principal',
  'Busca / Vende',
  'Serie del vehículo',
  'Serie del vehículo 2',
  'Serie del vehículo 3',
  'Presupuesto',
  'Siguiente paso',
  'Observaciones'
];

function doGet(e) {
  var callbackName = extractCallback_(e);

  try {
    var telefono = extractTelefono_(e);
    if (!telefono) {
      return buildResponse_({ error: 'Debe proporcionar el parámetro "telefono".' }, 400, callbackName);
    }

    var sheet = getDemoSheet_();
    var match = findByTelefono_(sheet, telefono);

    if (!match) {
      return buildResponse_({ error: 'No se encontró información para este número' }, 404, callbackName);
    }

    return buildResponse_(match, 200, callbackName);
  } catch (error) {
    return buildResponse_({ error: 'Error interno: ' + error.message }, 500, callbackName);
  }
}

function doOptions(e) {
  return buildCorsResponse_();
}

function getDemoSheet_() {
  var spreadsheet;
  if (SHEET_ID && SHEET_ID.trim()) {
    spreadsheet = SpreadsheetApp.openById(SHEET_ID.trim());
  } else {
    spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  }

  if (!spreadsheet) {
    throw new Error('No se encontró la hoja de cálculo configurada.');
  }

  var sheet = spreadsheet.getSheetByName(DEMO_SHEET_NAME);
  if (!sheet) {
    var sheets = spreadsheet.getSheets();
    if (!sheets || !sheets.length) {
      throw new Error('No se encontraron hojas en la hoja de cálculo.');
    }
    sheet = sheets[0];
  }

  return sheet;
}

function findByTelefono_(sheet, telefono) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return null;
  }

  var phoneColIndex = DEMO_HEADERS.indexOf('Número telefónico');
  if (phoneColIndex === -1) {
    throw new Error('No existe la columna "Número telefónico".');
  }

  var normalizedTarget = normalizeDigits_(telefono);
  var values = sheet.getRange(2, 1, lastRow - 1, DEMO_HEADERS.length).getValues();

  for (var i = 0; i < values.length; i++) {
    if (normalizeDigits_(values[i][phoneColIndex]) === normalizedTarget) {
      return mapRow_(values[i]);
    }
  }

  return null;
}

function mapRow_(row) {
  var result = {};
  for (var i = 0; i < DEMO_HEADERS.length; i++) {
    result[DEMO_HEADERS[i]] = formatValue_(row[i]);
  }
  return result;
}

function formatValue_(value) {
  if (value === null || value === '') {
    return '';
  }
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return String(value);
}

function extractTelefono_(e) {
  if (e && e.parameter && typeof e.parameter.telefono === 'string') {
    return e.parameter.telefono.trim();
  }
  return '';
}

function extractCallback_(e) {
  if (e && e.parameter && typeof e.parameter.callback === 'string') {
    return e.parameter.callback.trim();
  }
  return '';
}

function normalizeDigits_(value) {
  return String(value || '').replace(/\D/g, '');
}

function buildResponse_(payload, statusCode, callbackName) {
  var json = JSON.stringify(payload);
  var output;

  if (callbackName) {
    output = ContentService.createTextOutput(callbackName + '(' + json + ')');
    output.setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    output = ContentService.createTextOutput(json);
    output.setMimeType(ContentService.MimeType.JSON);
  }

  return output;
}

function buildCorsResponse_() {
  return ContentService.createTextOutput('');
}
