/**
 * Apps Script unificado para Registro y Consulta de Clientes (Proyecto 87 Autos)
 */

const SHEET_ID = '15sz1P5lmSyYiOgIDotrqZx8NrvCcjlO72SZr2XjyWxY';
const SHEET_NAME = 'Registros';
const HEADERS = [
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
  if (e && e.parameter && e.parameter.telefono) {
    return handleLookup_(e);
  }

  return HtmlService.createHtmlOutput('Backend activo y listo ✅');
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return buildResponse_({ success: false, error: 'Solicitud sin datos' });
    }

    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseError) {
      console.error('No se pudo interpretar el cuerpo JSON', parseError);
      return buildResponse_({ success: false, error: 'Formato JSON inválido' });
    }

    const sheet = getSheet_();
    ensureHeaders_(sheet);

    const series = parseSeries_(payload.serieVehiculo);

    const row = [
      new Date(),
      toSafeString_(payload.fechaHora),
      toSafeString_(payload.sede),
      toSafeString_(payload.asesor),
      toSafeString_(payload.fuente),
      toSafeString_(payload.clienteNombre),
      formatTelefonoForSheet_(payload.clienteTelefono),
      toSafeString_(payload.clienteCedula),
      toSafeString_(payload.necesidad),
      toSafeString_(payload.tipoVehiculo),
      series[0] || '',
      series[1] || '',
      series[2] || '',
      toSafeString_(payload.presupuesto),
      toSafeString_(payload.siguientePaso),
      toSafeString_(payload.observaciones)
    ];

    sheet.appendRow(row);

    return buildResponse_({ success: true, message: 'Registro guardado exitosamente' });
  } catch (error) {
    console.error('Error en doPost', error);
    return buildResponse_({ success: false, error: 'Error interno del servidor' });
  } finally {
    lock.releaseLock();
  }
}

function handleLookup_(e) {
  const telefonoNormalizado = normalizeDigits_(e.parameter.telefono || '');
  const callback = e.parameter.callback;

  if (!telefonoNormalizado) {
    return buildResponse_({ success: false, error: 'Número telefónico no válido' }, callback);
  }

  const sheet = getSheet_();
  if (!sheet) {
    return buildResponse_({ success: false, error: 'Hoja no encontrada' }, callback);
  }

  const values = sheet.getDataRange().getValues();
  if (!values || values.length <= 1) {
    return buildResponse_({ success: false, error: 'Sin registros disponibles' }, callback);
  }

  const headers = values[0];
  const phoneIndex = headers.indexOf('Número telefónico');
  if (phoneIndex === -1) {
    return buildResponse_({ success: false, error: 'La hoja no tiene columna de teléfono' }, callback);
  }

  for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
    const row = values[rowIndex];
    const storedPhone = normalizeDigits_(row[phoneIndex]);
    if (storedPhone === telefonoNormalizado) {
      const record = {};
      HEADERS.forEach((header, idx) => {
        record[header] = row[idx] !== undefined ? row[idx] : '';
      });
      return buildResponse_({ success: true, data: record }, callback);
    }
  }

  return buildResponse_({ success: false, error: 'Cliente no encontrado' }, callback);
}

function buildResponse_(payload, callback) {
  const json = JSON.stringify(payload);
  const output = ContentService.createTextOutput();

  if (callback) {
    output.setMimeType(ContentService.MimeType.JAVASCRIPT);
    output.setContent(`${callback}(${json})`);
  } else {
    output.setMimeType(ContentService.MimeType.JSON);
    output.setContent(json);
  }

  return output;
}

function getSheet_() {
  const spreadsheet = SHEET_ID
    ? SpreadsheetApp.openById(SHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  return sheet;
}

function ensureHeaders_(sheet) {
  const currentLastColumn = sheet.getLastColumn();
  if (currentLastColumn < HEADERS.length) {
    const missing = HEADERS.length - currentLastColumn;
    if (currentLastColumn === 0) {
      sheet.insertColumnsAfter(1, HEADERS.length - 1);
    } else {
      sheet.insertColumnsAfter(currentLastColumn, missing);
    }
  }

  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
}

function parseSeries_(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map(item => toSafeString_(item))
      .filter(Boolean)
      .slice(0, 3);
  }

  return String(value)
    .split(';')
    .map(part => toSafeString_(part))
    .filter(Boolean)
    .slice(0, 3);
}

function normalizeDigits_(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatTelefonoForSheet_(value) {
  const digits = normalizeDigits_(value);
  return digits ? `'${digits}` : toSafeString_(value);
}

function toSafeString_(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}
