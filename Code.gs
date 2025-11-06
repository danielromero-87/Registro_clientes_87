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
  'Año modelo del vehículo',
  'Serie del vehículo',
  'Serie del vehículo 2',
  'Serie del vehículo 3',
  'Presupuesto',
  'Siguiente paso',
  'Observaciones',
  'Observaciones #2'
];

const PHONE_HEADER = 'Número telefónico';
const OBSERVACIONES_FOLLOWUP_HEADER = 'Observaciones #2';

function doGet(e) {
  if (e && e.parameter) {
    const params = e.parameter;
    const action = toSafeString_(params.action).toLowerCase().replace(/[\s_-]+/g, '');

    if (
      action === 'appendobservacion' ||
      action === 'appendobservation' ||
      action === 'observaciones2' ||
      action === 'observacion2' ||
      action === 'updateobservacion2'
    ) {
      const sheet = getSheet_();
      ensureHeaders_(sheet);
      const payload = {
        telefono: params.telefono,
        clienteTelefono: params.clienteTelefono,
        numero: params.numero,
        numeroTelefonico: params.numeroTelefonico,
        telefonoCliente: params.telefonoCliente,
        observaciones2: params.observaciones2,
        observacion2: params.observacion2,
        observacion: params.observacion,
        nota: params.nota,
        comentario: params.comentario
      };
      return handleObservationUpdate_(sheet, payload, params.callback);
    }

    if (params.telefono) {
      return handleLookup_(e);
    }
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

    const action = toSafeString_(payload.action).toLowerCase();
    const normalizedAction = action.replace(/[\s_-]+/g, '');

    const sheet = getSheet_();
    ensureHeaders_(sheet);

    if (normalizedAction === 'appendobservacion' ||
        normalizedAction === 'appendobservation' ||
        normalizedAction === 'observaciones2' ||
        normalizedAction === 'observacion2' ||
        normalizedAction === 'updateobservacion2') {
      return handleObservationUpdate_(sheet, payload);
    }

    if (normalizedAction === 'actualizarsiguientepaso' ||
        normalizedAction === 'siguientepaso') {
      return handleEstadoUpdate_(sheet, payload);
    }

    const series = parseSeries_(payload.serieVehiculo);
    const telefonoRaw = toSafeString_(payload.clienteTelefono);

    const row = [
      new Date(),
      toSafeString_(payload.fechaHora),
      toSafeString_(payload.sede),
      toSafeString_(payload.asesor),
      toSafeString_(payload.fuente),
      toSafeString_(payload.clienteNombre),
      telefonoRaw,
      toSafeString_(payload.clienteCedula),
      toSafeString_(payload.necesidad),
      toSafeString_(payload.tipoVehiculo),
      toSafeString_(payload.anioModeloVehiculo),
      series[0] || '',
      series[1] || '',
      series[2] || '',
      toSafeString_(payload.presupuesto),
      toSafeString_(payload.siguientePaso),
      toSafeString_(payload.observaciones),
      toSafeString_(payload.observaciones2)
    ];

    sheet.appendRow(row);

    const lastRow = sheet.getLastRow();
    const telefonoColumnIndex = HEADERS.indexOf(PHONE_HEADER) + 1;
    if (lastRow > 1 && telefonoColumnIndex > 0) {
      const phoneRange = sheet.getRange(lastRow, telefonoColumnIndex);
      phoneRange.setNumberFormat('@');
      const sanitizedPhone = telefonoRaw.replace(/^'+/, '');
      if (sanitizedPhone) {
        phoneRange.setValue("'" + sanitizedPhone);
      } else {
        phoneRange.setValue('');
      }
    }

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

  return applyCors_(output);
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
  if (!sheet) {
    return;
  }

  const yearHeader = 'Año modelo del vehículo';
  const buscaHeader = 'Busca / Vende';

  let lastColumn = sheet.getLastColumn();

  if (lastColumn === 0) {
    sheet.insertColumns(1, HEADERS.length);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return;
  }

  const headerValues = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];

  if (headerValues.indexOf(yearHeader) === -1) {
    const buscaIndex = headerValues.indexOf(buscaHeader);
    const insertAfter = buscaIndex >= 0 ? buscaIndex + 1 : lastColumn;
    sheet.insertColumnAfter(insertAfter);
    lastColumn = sheet.getLastColumn();
  }

  if (lastColumn < HEADERS.length) {
    sheet.insertColumnsAfter(lastColumn, HEADERS.length - lastColumn);
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

function toSafeString_(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function applyCors_(output) {
  if (!output) {
    return output;
  }

  const headers = [
    ['Access-Control-Allow-Origin', '*'],
    ['Access-Control-Allow-Methods', 'GET, POST'],
    ['Access-Control-Allow-Headers', 'Content-Type']
  ];

  headers.forEach(function(pair) {
    const key = pair[0];
    const value = pair[1];
    if (typeof output.setHeader === 'function') {
      try {
        output.setHeader(key, value);
      } catch (err) {}
    }
  });

  return output;
}

function handleObservationUpdate_(sheet, payload, callback) {
  if (!sheet) {
    return buildResponse_({ success: false, error: 'Hoja no disponible.' }, callback);
  }

  const telefonoFuente =
    payload.telefono ??
    payload.clienteTelefono ??
    payload.numero ??
    payload.numeroTelefonico ??
    payload.telefonoCliente ??
    '';
  const telefonoNormalizado = normalizeDigits_((telefonoFuente || '').replace(/['"`]/g, ''));

  if (!telefonoNormalizado) {
    return buildResponse_({ success: false, error: 'Número telefónico no válido para actualizar Observaciones #2.' }, callback);
  }

  const observacionFuente =
    payload.observaciones2 ??
    payload.observacion2 ??
    payload.observacion ??
    payload.nota ??
    payload.comentario ??
    '';
  const nuevaObservacion = toSafeString_(observacionFuente);

  if (!nuevaObservacion) {
    return buildResponse_({ success: false, error: 'El campo Observaciones #2 no puede estar vacío.' }, callback);
  }

  const dataRange = sheet.getDataRange();
  if (!dataRange) {
    return buildResponse_({ success: false, error: 'No se pudo leer la hoja de cálculo.' }, callback);
  }

  const values = dataRange.getValues();
  if (!values || values.length <= 1) {
    return buildResponse_({ success: false, error: 'No existen registros disponibles para actualizar.' }, callback);
  }

  const headers = values[0];
  const phoneIndex = headers.indexOf(PHONE_HEADER);
  const observaciones2Index = headers.indexOf(OBSERVACIONES_FOLLOWUP_HEADER);

  if (phoneIndex === -1) {
    return buildResponse_({ success: false, error: 'La hoja no tiene columna de número telefónico.' }, callback);
  }

  if (observaciones2Index === -1) {
    return buildResponse_({ success: false, error: 'La hoja no tiene columna Observaciones #2.' }, callback);
  }

  const timeZone = Session.getScriptTimeZone() || 'America/Bogota';
  const timestamp = Utilities.formatDate(new Date(), timeZone, 'yyyy-MM-dd HH:mm');
  const entradaFormateada = `[${timestamp}] ${nuevaObservacion}`;

  for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
    const row = values[rowIndex];
    const storedPhone = normalizeDigits_(row[phoneIndex]);
    if (storedPhone === telefonoNormalizado) {
      const previousValue = toSafeString_(row[observaciones2Index]);
      const combinedValue = previousValue ? `${previousValue}\n${entradaFormateada}` : entradaFormateada;

      sheet.getRange(rowIndex + 1, observaciones2Index + 1).setValue(combinedValue);
      row[observaciones2Index] = combinedValue;

      const record = {};
      HEADERS.forEach((header, idx) => {
        record[header] = row[idx] !== undefined ? row[idx] : '';
      });

      return buildResponse_({
        success: true,
        message: 'Observación #2 registrada correctamente.',
        data: record
      }, callback);
    }
  }

  return buildResponse_({ success: false, error: 'Cliente no encontrado para actualizar Observaciones #2.' }, callback);
}

function handleEstadoUpdate_(sheet, payload, callback) {
  const telefono = toSafeString_(payload.telefono || payload.clienteTelefono || '');
  const nuevoEstado = toSafeString_(payload.siguientePaso || '');
  if (!telefono || !nuevoEstado) {
    return buildResponse_({ success: false, error: 'Teléfono o estado vacío.' }, callback);
  }
  const telefonoNormalizado = normalizeDigits_(telefono);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const phoneIndex = headers.indexOf(PHONE_HEADER);
  const estadoIndex = headers.indexOf('Siguiente paso');
  if (phoneIndex === -1 || estadoIndex === -1) {
    return buildResponse_({ success: false, error: 'No existe columna de teléfono o Siguiente paso.' }, callback);
  }
  for (let i = 1; i < values.length; i++) {
    const storedPhone = normalizeDigits_(values[i][phoneIndex]);
    if (storedPhone === telefonoNormalizado) {
      sheet.getRange(i + 1, estadoIndex + 1).setValue(nuevoEstado);
      return buildResponse_({ success: true, message: 'Siguiente paso actualizado correctamente.' }, callback);
    }
  }
  return buildResponse_({ success: false, error: 'Cliente no encontrado.' }, callback);
}
