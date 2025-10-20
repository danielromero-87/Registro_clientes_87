import puppeteer from 'puppeteer';

const FASECOLDA_URL = process.env.FASECOLDA_URL?.trim() || 'https://www.fasecolda.com/guia-de-valores/';
const CACHE_TTL_MS = Number.parseInt(process.env.FASECOLDA_CACHE_TTL_MS || '', 10) || 1000 * 60 * 60 * 6; // 6 horas
const PUPPETEER_LAUNCH_ARGS = process.env.PUPPETEER_LAUNCH_ARGS?.split(/\s+/).filter(Boolean) || [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-gpu'
];

const BRAND_ALIASES = new Map([
  ['BMW', 'BMW'],
  ['BMWMOTORRAD', 'BMW'],
  ['BMW MOTORRAD', 'BMW'],
  ['BMW - MOTORRAD', 'BMW'],
  ['MINI', 'MINI'],
  ['MINI COOPER', 'MINI'],
  ['MINI/BMW', 'MINI'],
  ['BMW GROUP', 'BMW'],
  ['ROLLS ROYCE', 'ROLLS ROYCE'],
]);

const MIN_SUPPORTED_YEAR = 2000;

const cacheState = {
  expiresAt: 0,
  index: null,
};

let loadingPromise = null;
let browserPromise = null;

function stripDiacritics(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeWhitespace(value) {
  return value
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePlainText(value) {
  if (!value) {
    return '';
  }
  return normalizeWhitespace(stripDiacritics(String(value).trim()))
    .replace(/[^A-Za-z0-9]/g, ' ')
    .replace(/\s+/g, ' ') // collapse repeated spaces introduced by symbol removal
    .trim();
}

function normalizeBrandKey(value) {
  const plain = normalizePlainText(value).toUpperCase();
  if (!plain) {
    return '';
  }
  return BRAND_ALIASES.get(plain) || plain;
}

function normalizeReference(value, brandKey) {
  if (!value) {
    return '';
  }
  let normalized = normalizePlainText(value).toUpperCase();
  if (brandKey) {
    const brandTokens = normalizePlainText(brandKey).toUpperCase().split(' ').filter(Boolean);
    brandTokens.forEach(token => {
      const regex = new RegExp(`(^|\s)${token}(?=\s|$)`, 'g');
      normalized = normalized.replace(regex, ' ');
    });
    normalized = normalized.replace(/\s+/g, ' ').trim();
  }
  return normalized;
}

function tokenizeReference(normalizedReference) {
  if (!normalizedReference) {
    return [];
  }
  return normalizedReference.split(' ').filter(Boolean);
}

function normalizeYear(value) {
  const match = String(value || '')
    .trim()
    .match(/(19|20)\d{2}/);
  return match ? match[0] : '';
}

function parseMoney(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const raw = String(value).trim();
  if (!raw) {
    return null;
  }
  // Remove currency symbols and spaces
  let cleaned = raw.replace(/[^0-9,.-]/g, '');
  // Remove thousand separators (.) when there is more than one
  cleaned = cleaned.replace(/\.(?=.*\.)/g, '');
  // Replace decimal comma with dot
  cleaned = cleaned.replace(/,/g, '.');
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: 'new',
      args: PUPPETEER_LAUNCH_ARGS
    });
  }
  return browserPromise;
}

async function closeBrowser() {
  if (!browserPromise) {
    return;
  }
  try {
    const browser = await browserPromise;
    await browser.close();
  } catch (error) {
    console.warn('Fasecolda scraper: error cerrando Puppeteer', error);
  } finally {
    browserPromise = null;
  }
}

async function ensureUsedVehiclesTab(page) {
  // Try multiple strategies to focus the "Vehículos usados" section.
  const switched = await page.evaluate(() => {
    const normalize = value => {
      if (!value) {
        return '';
      }
      return value
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    };

    const targets = ['vehiculos usados', 'vehículo usados', 'vehiculos - usados'];

    const clickableElements = Array.from(document.querySelectorAll('a, button, [role="tab"], li, span, div'));
    for (const element of clickableElements) {
      const text = normalize(element.textContent);
      if (!text) {
        continue;
      }
      if (targets.some(target => text.includes(target))) {
        element.click();
        return true;
      }
    }
    return false;
  }).catch(() => false);

  if (switched) {
    await page.waitForTimeout(1500);
  }
}

async function waitForUsedVehiclesTable(page) {
  const TIMEOUT_MS = Number.parseInt(process.env.FASECOLDA_WAIT_TIMEOUT_MS || '', 10) || 45000;
  try {
    await page.waitForFunction(() => {
      const normalize = value => {
        if (!value) {
          return '';
        }
        return value
          .toString()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();
      };

      const headers = Array.from(document.querySelectorAll('table th'));
      return headers.some(th => {
        const text = normalize(th.textContent);
        return text.includes('marca') || text.includes('referencia') || text.includes('valor sugerido');
      });
    }, { timeout: TIMEOUT_MS });
  } catch (error) {
    // Intentionally swallow timeout errors; downstream routines will attempt alternative frames.
  }
}

async function extractRowsFromContext(executionContext) {
  return executionContext.evaluate(() => {
    const normalize = value => {
      if (!value) {
        return '';
      }
      return value
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const normalizeLower = value => normalize(value).toLowerCase();

    const describeTable = table => {
      const headerCells = Array.from(table.querySelectorAll('thead tr th'));
      const fallbackHeaders = headerCells.length
        ? headerCells
        : Array.from((table.querySelector('tr') || {}).children || []);

      const headers = fallbackHeaders.map(cell => normalizeLower(cell.textContent));
      const headerIndex = headerName => {
        const normalized = headerName.toLowerCase();
        let idx = headers.findIndex(text => text === normalized);
        if (idx >= 0) {
          return idx;
        }
        idx = headers.findIndex(text => text.includes(normalized));
        return idx;
      };

      const colMarca = headerIndex('marca');
      const colReferencia = headerIndex('referencia');
      const colAnio = headerIndex('ano'); // 'año' becomes 'ano' after strip
      const colValor = headerIndex('valor sugerido');

      if (colMarca === -1 || colReferencia === -1 || colAnio === -1 || colValor === -1) {
        return null;
      }

      const bodyRows = table.querySelectorAll('tbody tr');
      const rowsSource = bodyRows.length ? Array.from(bodyRows) : Array.from(table.querySelectorAll('tr')).slice(1);

      const rows = rowsSource.map(tr => {
        const cells = Array.from(tr.querySelectorAll('td'));
        if (!cells.length) {
          return null;
        }
        const valueFor = index => {
          const cell = cells[index];
          return cell ? normalize(cell.textContent) : '';
        };
        return {
          marca: valueFor(colMarca),
          referencia: valueFor(colReferencia),
          anio: valueFor(colAnio),
          valor: valueFor(colValor)
        };
      }).filter(Boolean);

      return { headers, rows };
    };

    const tables = Array.from(document.querySelectorAll('table'));
    for (const table of tables) {
      const descriptor = describeTable(table);
      if (descriptor && descriptor.rows.length) {
        return {
          rows: descriptor.rows,
          headers: descriptor.headers,
          context: 'main'
        };
      }
    }

    return { rows: [], headers: [], context: 'not-found' };
  });
}

async function extractUsedVehiclesRows(page) {
  const contexts = [page.mainFrame(), ...page.frames()];
  for (const frame of contexts) {
    try {
      const result = await extractRowsFromContext(frame);
      if (Array.isArray(result?.rows) && result.rows.length) {
        return result.rows;
      }
    } catch (error) {
      // Ignore cross-origin frame evaluation errors.
    }
  }
  return [];
}

function buildIndex(rows) {
  const byBrand = new Map();

  rows.forEach(row => {
    const brandKey = normalizeBrandKey(row.marca);
    const yearKey = normalizeYear(row.anio);
    const yearNumber = Number.parseInt(yearKey, 10);
    const value = parseMoney(row.valor);
    if (!brandKey || !row.referencia || !yearKey || (yearNumber && yearNumber < MIN_SUPPORTED_YEAR)) {
      return;
    }

    const referenceNormalized = normalizeReference(row.referencia, brandKey);
    if (!referenceNormalized) {
      return;
    }

    let brandBucket = byBrand.get(brandKey);
    if (!brandBucket) {
      brandBucket = {
        brandKey,
        labels: new Set(),
        entries: [],
        byReference: new Map()
      };
      byBrand.set(brandKey, brandBucket);
    }
    brandBucket.labels.add(normalizeWhitespace(row.marca));

    let entry = brandBucket.byReference.get(referenceNormalized);
    if (!entry) {
      entry = {
        brandKey,
        originalBrandLabels: new Set([normalizeWhitespace(row.marca)]),
        preferredBrandLabel: normalizeWhitespace(row.marca),
        referenceLabel: normalizeWhitespace(row.referencia),
        normalizedReference: referenceNormalized,
        tokens: new Set(tokenizeReference(referenceNormalized)),
        values: new Map(),
        rawValues: new Map()
      };
      brandBucket.byReference.set(referenceNormalized, entry);
      brandBucket.entries.push(entry);
    } else {
      entry.originalBrandLabels.add(normalizeWhitespace(row.marca));
      if (entry.referenceLabel.length < normalizeWhitespace(row.referencia).length) {
        entry.referenceLabel = normalizeWhitespace(row.referencia);
      }
    }

    entry.rawValues.set(yearKey, row.valor ?? '');
    if (value !== null) {
      entry.values.set(yearKey, value);
    }
  });

  byBrand.forEach(bucket => {
    const [preferred] = Array.from(bucket.labels).sort((a, b) => a.length - b.length);
    bucket.preferredBrandLabel = preferred || bucket.brandKey;
    bucket.entries.forEach(entry => {
      if (!entry.referenceLabel) {
        entry.referenceLabel = entry.normalizedReference;
      }
      if (!entry.preferredBrandLabel) {
        entry.preferredBrandLabel = bucket.preferredBrandLabel;
      }
    });
  });

  return {
    createdAt: new Date(),
    rowCount: rows.length,
    byBrand
  };
}

function scoreFuzzyMatch(entry, normalizedReference, tokens) {
  if (!entry || !entry.normalizedReference) {
    return -Infinity;
  }
  if (entry.normalizedReference === normalizedReference) {
    return Number.POSITIVE_INFINITY;
  }

  let score = 0;

  if (normalizedReference && entry.normalizedReference.includes(normalizedReference)) {
    score += 50;
  }

  const entryTokens = entry.tokens || new Set();
  let sharedTokens = 0;
  tokens.forEach(token => {
    if (entryTokens.has(token)) {
      sharedTokens += 1;
      score += 10;
    } else if (token && entry.normalizedReference.startsWith(token)) {
      score += 3;
    } else if (token && entry.normalizedReference.includes(token)) {
      score += 1;
    }
  });

  if (sharedTokens === tokens.length && tokens.length > 0) {
    score += 5;
  }

  // Prefer entries with the same number of tokens to avoid overly generic matches.
  const tokenDelta = Math.abs((entryTokens.size || 0) - tokens.length);
  score -= tokenDelta;

  return score;
}

function rankEntries(entries, normalizedReference) {
  if (!entries || !entries.length) {
    return [];
  }
  const tokens = tokenizeReference(normalizedReference);
  return entries
    .map(entry => ({ entry, score: scoreFuzzyMatch(entry, normalizedReference, tokens) }))
    .filter(({ score }) => score > -Infinity)
    .sort((a, b) => b.score - a.score)
    .map(item => item.entry);
}

function mapToSortedObject(map, transformValue = value => value) {
  if (!map || typeof map.entries !== 'function') {
    return {};
  }
  const entries = Array.from(map.entries());
  entries.sort((a, b) => Number.parseInt(a[0], 10) - Number.parseInt(b[0], 10));
  const result = {};
  entries.forEach(([key, value]) => {
    result[key] = transformValue(value);
  });
  return result;
}

async function loadFasecoldaIndex() {
  if (cacheState.index && cacheState.expiresAt > Date.now()) {
    return cacheState.index;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.goto(FASECOLDA_URL, {
        waitUntil: 'networkidle2',
        timeout: Number.parseInt(process.env.FASECOLDA_NAVIGATION_TIMEOUT_MS || '', 10) || 60000
      });

      await ensureUsedVehiclesTab(page);
      await waitForUsedVehiclesTable(page);
      const rows = await extractUsedVehiclesRows(page);

      if (!rows.length) {
        throw new Error('No se pudieron extraer filas de la pestaña "Vehículos usados".');
      }

      const index = buildIndex(rows);
      cacheState.index = index;
      cacheState.expiresAt = Date.now() + CACHE_TTL_MS;
      return index;
    } finally {
      await page.close();
      loadingPromise = null;
    }
  })().catch(error => {
    loadingPromise = null;
    throw error;
  });

  return loadingPromise;
}

export async function getFasecoldaValue(marca, referencia, anio) {
  const brandKeyInput = normalizeBrandKey(marca);
  const normalizedYear = normalizeYear(anio);
  const yearNumber = Number.parseInt(normalizedYear, 10);
  const normalizedReferenceInput = normalizeReference(referencia, brandKeyInput);

  if (
    !brandKeyInput ||
    !normalizedYear ||
    !normalizedReferenceInput ||
    (yearNumber && yearNumber < MIN_SUPPORTED_YEAR)
  ) {
    return null;
  }

  let index;
  try {
    index = await loadFasecoldaIndex();
  } catch (error) {
    console.error('Fasecolda scraper: error cargando el índice', error);
    return null;
  }

  const brandBucket = index.byBrand.get(brandKeyInput);
  if (!brandBucket) {
    return null;
  }

  const rankedEntries = rankEntries(brandBucket.entries, normalizedReferenceInput);
  if (!rankedEntries.length) {
    return null;
  }

  const directEntry = brandBucket.byReference.get(normalizedReferenceInput);
  const bestEntry = directEntry || rankedEntries[0];
  const value = bestEntry.values.get(normalizedYear) ?? null;
  const rawValue = bestEntry.rawValues.get(normalizedYear) ?? null;

  const coincidencias = rankedEntries.map(entry => ({
    referencia: entry.referenceLabel,
    referenciaNormalizada: entry.normalizedReference,
    marca: entry.preferredBrandLabel || brandBucket.preferredBrandLabel || marca,
    tokens: Array.from(entry.tokens || []),
    valorSolicitado: entry.values.get(normalizedYear) ?? null,
    valorSolicitadoRaw: entry.rawValues.get(normalizedYear) ?? null,
    valores: mapToSortedObject(entry.values, Number),
    valoresRaw: mapToSortedObject(entry.rawValues, value => (value === undefined ? '' : value))
  }));

  const baseResponse = {
    marca: bestEntry.preferredBrandLabel || brandBucket.preferredBrandLabel || marca,
    referenciaBuscada: referencia,
    referenciaNormalizada: normalizedReferenceInput,
    anioSolicitado: normalizedYear,
    valorSugerido: value,
    valorSugeridoRaw: rawValue,
    coincidencias,
    totalCoincidencias: coincidencias.length,
    actualizado: index.createdAt.toISOString(),
    fuente: 'Fasecolda (Vehículos usados)'
  };

  if (value === null) {
    return {
      ...baseResponse,
      observaciones: 'Sin valor sugerido disponible para el año solicitado.'
    };
  }

  return baseResponse;
}

export function resetFasecoldaCache() {
  cacheState.index = null;
  cacheState.expiresAt = 0;
}

export async function shutdownFasecoldaScraper() {
  resetFasecoldaCache();
  await closeBrowser();
}

process.once('exit', () => {
  closeBrowser().catch(() => undefined);
});
process.once('SIGINT', () => {
  closeBrowser().catch(() => undefined);
});
process.once('SIGTERM', () => {
  closeBrowser().catch(() => undefined);
});
