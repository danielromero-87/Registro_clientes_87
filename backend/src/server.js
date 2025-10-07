import 'dotenv/config';
import express from 'express';
import { google } from 'googleapis';

const REQUIRED_ENV = ['SPREADSHEET_ID', 'SHEET_NAME'];
const missingEnv = REQUIRED_ENV.filter(name => !process.env[name] || !process.env[name].trim());
if (missingEnv.length) {
  console.error(`Faltan variables de entorno obligatorias: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const PORT = Number.parseInt(process.env.PORT || '8080', 10);
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME;
const CACHE_TTL_MS = Number.parseInt(process.env.CACHE_TTL_MS || '60000', 10);

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
  'Observaciones'
];

const PHONE_HEADER = 'Número telefónico';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_APPLICATION_CREDENTIALS.trim();

if (keyFile) {
  console.log(`Usando credenciales de servicio desde ${keyFile}`);
} else {
  console.log('Usando credenciales predeterminadas de Google (gcloud auth application-default login).');
}

const auth = new google.auth.GoogleAuth({
  scopes: SCOPES,
  ...(keyFile ? { keyFile } : {})
});

const sheets = google.sheets({ version: 'v4', auth });

const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const cache = {
  expiresAt: 0,
  headerRow: [],
  dataRows: [],
  indexMap: new Map(),
  phoneIndex: -1
};

async function loadSheetData() {
  const now = Date.now();
  if (cache.expiresAt > now && cache.headerRow.length) {
    return cache;
  }

  const range = `"${SHEET_NAME}"!A1:Q`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range
  });

  const rows = response?.data?.values || [];
  if (!rows.length) {
    cache.expiresAt = now + CACHE_TTL_MS;
    cache.headerRow = [];
    cache.dataRows = [];
    cache.indexMap = new Map();
    cache.phoneIndex = -1;
    return cache;
  }

  const [headerRow, ...dataRows] = rows;
  const indexMap = buildIndexMap(headerRow);
  const phoneIndex = indexMap.get(PHONE_HEADER) ?? -1;

  cache.expiresAt = now + CACHE_TTL_MS;
  cache.headerRow = headerRow;
  cache.dataRows = dataRows;
  cache.indexMap = indexMap;
  cache.phoneIndex = phoneIndex;

  return cache;
}

function buildIndexMap(headerRow) {
  const map = new Map();
  HEADERS.forEach(expectedHeader => {
    const normalizedExpected = normalizeHeader(expectedHeader);
    const idx = headerRow.findIndex(cell => normalizeHeader(cell) === normalizedExpected);
    map.set(expectedHeader, idx);
  });
  return map;
}

function normalizeHeader(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeTelefono(value) {
  return String(value || '').replace(/\D/g, '');
}

function buildRecord(row, indexMap) {
  const record = {};

  HEADERS.forEach(header => {
    const idx = indexMap.get(header);
    record[header] = idx !== undefined && idx >= 0 ? (row[idx] ?? '') : '';
  });

  return record;
}

app.get('/api/clientes', async (req, res) => {
  const rawTelefono = req.query.telefono;

  if (!rawTelefono) {
    res.status(400).json({ error: 'Falta el parámetro telefono.' });
    return;
  }

  const telefono = normalizeTelefono(rawTelefono);

  if (!telefono) {
    res.status(400).json({ error: 'El parámetro telefono debe contener solo dígitos.' });
    return;
  }

  try {
    const sheetData = await loadSheetData();

    if (!sheetData.headerRow.length) {
      res.status(500).json({ error: 'No se encontraron datos en la hoja.' });
      return;
    }

    if (sheetData.phoneIndex < 0) {
      res.status(500).json({ error: 'La hoja no contiene la columna "Número telefónico".' });
      return;
    }

    const match = sheetData.dataRows.find(row => normalizeTelefono(row[sheetData.phoneIndex]) === telefono);

    if (!match) {
      res.status(404).json({ error: 'No se encontró un cliente con ese número telefónico.' });
      return;
    }

    const record = buildRecord(match, sheetData.indexMap);

    res.json({
      telefono,
      data: record
    });
  } catch (error) {
    console.error('Error consultando Google Sheets', error);
    res.status(502).json({ error: 'Error consultando la hoja de cálculo.' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
