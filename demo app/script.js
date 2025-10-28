/**
 * script.js
 * Permite buscar clientes usando un backend REST o, en su defecto, el WebApp JSONP de Google Apps Script.
 */
const { BASE_URL, API_KEY } = window.APP_CONFIG;
const CONFIG = window.APP_CONFIG || {};
const SERVER_API_URL = (CONFIG.serverApiUrl || BASE_URL || '').trim();
const WEBAPP_URL = (CONFIG.webAppUrl || '').trim();

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

const FASECOLDA_BRANDS = ['BMW', 'MINI'];
const DEFAULT_FASECOLDA_DATASET_PATHS = ['bmw_fasecolda_values.json'];
const ABSOLUTE_URL_PATTERN = /^[a-z]+:\/\//i;
const FASECOLDA_DATASET_PATHS = (() => {
  const configuredPaths = Array.isArray(CONFIG.fasecoldaDatasetPaths)
    ? CONFIG.fasecoldaDatasetPaths
    : (CONFIG.fasecoldaDatasetPath ? [CONFIG.fasecoldaDatasetPath] : []);

  const fallbackBasesInput = Array.isArray(CONFIG.fasecoldaDatasetFallbackBases)
    ? CONFIG.fasecoldaDatasetFallbackBases
    : (CONFIG.fasecoldaDatasetFallbackBase ? [CONFIG.fasecoldaDatasetFallbackBase] : []);

  const fallbackBases = [];
  fallbackBasesInput.forEach(baseValue => {
    const trimmedBase = String(baseValue || '').trim();
    if (!trimmedBase) {
      return;
    }
    const normalizedBase = trimmedBase.endsWith('/') ? trimmedBase : `${trimmedBase}/`;
    if (!fallbackBases.includes(normalizedBase)) {
      fallbackBases.push(normalizedBase);
    }
  });

  const basePaths = [];
  [...configuredPaths, ...DEFAULT_FASECOLDA_DATASET_PATHS].forEach(pathValue => {
    const trimmedPath = String(pathValue || '').trim();
    if (!trimmedPath || basePaths.includes(trimmedPath)) {
      return;
    }
    basePaths.push(trimmedPath);
  });

  const resolvedGroups = [];

  basePaths.forEach(pathValue => {
    const variants = [];

    if (pathValue && !variants.includes(pathValue)) {
      variants.push(pathValue);
    }

    if (!ABSOLUTE_URL_PATTERN.test(pathValue) && fallbackBases.length) {
      fallbackBases.forEach(base => {
        try {
          const absoluteUrl = new URL(pathValue, base).toString();
          if (!variants.includes(absoluteUrl)) {
            variants.push(absoluteUrl);
          }
        } catch (error) {
          // Ignore invalid base URLs silently to avoid breaking the UI.
        }
      });
    }

    if (variants.length) {
      resolvedGroups.push(variants);
    }
  });

  return resolvedGroups;
})();
const FASECOLDA_BREAK_TOKENS = new Set([
  'MT',
  'AT',
  'TP',
  'CT',
  'TD',
  'TC',
  'ABS',
  'CVT',
  'CV',
  'KW',
  'MHEV',
  'PHEV',
  'HEV',
  'HYBRID',
  'HIBRIDO',
  'ELECTRICO',
  'ELECTRIC',
  'PLUG',
  'ELECTRIFIED',
  '4X4',
  '4X2'
]);
const FASECOLDA_SKIP_TOKENS = new Set([
  'SERIE',
  'SERIES',
  'MOTORRAD',
  'SUVS',
  'THE',
  'UTILITARIO',
  'DEPORTIVO',
  'HATCHBACK',
  'SEDAN',
  'CABRIOLET',
  'CONVERTIBLE',
  'PICKUP',
  'CAMIONETA',
  'VAN',
  'WAGON',
  'NAKED',
  'CUSTOM',
  'SCOOTER',
  'ROADSTER',
  'ADVENTURE',
  'TOURING',
  'URBAN',
  'PREMIUM',
  'EDICION',
  'EDITION',
  'COMFORT',
  'ESSENTIAL',
  'DYNAMIC',
  'SPORT',
  'SPORTLINE',
  'LUXURY',
  'HIGHLINE',
  'BASIC',
  'PLUS',
  'PRO',
  'COMPETITION',
  'ACCESS',
  'AVANTGARDE',
  'XDRIVE',
  'SDRIVE'
]);
const FASECOLDA_ALLOWED_SINGLE_TOKENS = new Set([
  'C',
  'F',
  'G',
  'K',
  'M',
  'R',
  'S'
]);
const DESCAPOTABLES_PATTERN = /\bDESCAPOTABLES\b/gi;
const fasecoldaIndexPromise = loadFasecoldaDataset();
let mediaRenderId = 0;

const serverApiDetails = tryParseUrl(SERVER_API_URL);
const webAppDetails = tryParseUrl(WEBAPP_URL);
const serverApiIsAppsScript = Boolean(serverApiDetails && isGoogleAppsScriptHost(serverApiDetails.hostname));
const serverAndWebAppAreSame = Boolean(
  serverApiDetails && webAppDetails && serverApiDetails.href === webAppDetails.href
);
const canUseServerApi = Boolean(SERVER_API_URL) && !serverApiIsAppsScript && !serverAndWebAppAreSame;
const hasJsonpEndpoint = Boolean(WEBAPP_URL);



const OBSERVACIONES_FOLLOWUP_FIELD = 'Observaciones #2';

const CLIENT_SECTIONS = [
  {
    title: '🧍 Información Personal',
    fields: [
      { key: 'Nombre Cliente', label: 'Nombre' },
      { key: 'Número telefónico', label: 'Número telefónico', transform: formatTelefonoDisplay },
      { key: 'Cédula', label: 'Cédula' }
    ]
  },
  {
    title: '📍 Detalles Comerciales',
    fields: [
      { key: 'Fecha y Hora', label: 'Fecha y hora' },
      { key: 'Sede', label: 'Sede' },
      { key: 'Nombre Asesor', label: 'Asesor' },
      { key: 'Fuente', label: 'Fuente' },
      { key: 'Siguiente paso', label: 'Siguiente paso' }
    ]
  },
  {
    title: '🚘 Vehículo(s)',
    fields: [
      { key: 'Necesidad Principal', label: 'Necesidad' },
      { key: 'Busca / Vende', label: 'Tipo' },
      { key: 'Año modelo del vehículo', label: 'Año modelo' },
      { key: 'Serie del vehículo', label: 'Serie(s)', transform: formatSeries }
    ]
  },
  {
    title: '💰 Detalles Financieros',
    fields: [
      { key: 'Presupuesto', label: 'Presupuesto', transform: formatPresupuesto }
    ]
  },
  {
    title: '📝 Seguimiento',
    fields: [
      { key: 'Observaciones', label: 'Observaciones' },
      { key: OBSERVACIONES_FOLLOWUP_FIELD, label: 'Observaciones #2', transform: formatFollowupNotes }
    ]
  }
];

let lastClientRecord = null;
let lastFasecoldaData = null;
let lastClientTelefono = '';

function isMeaningfulFasecoldaLabel(label) {
  if (!label) {
    return false;
  }
  const sanitized = stripDiacritics(formatGenericValue(label)).toUpperCase();
  const tokens = sanitized
    .replace(/[^A-Z0-9]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return tokens.length > 1;
}

const form = document.getElementById('searchForm');
const telefonoInput = document.getElementById('telefono');
const searchButton = document.getElementById('searchButton');
const feedback = document.getElementById('feedback');
const clientCard = document.getElementById('clientCard');
const clientDetails = document.getElementById('clientDetails');
const clientMedia = document.getElementById('clientMedia');
const newSearchButton = document.getElementById('newSearchButton');
const clientFollowup = document.getElementById('clientFollowup');
const followupForm = document.getElementById('followupForm');
const followupTelefonoInput = document.getElementById('followupTelefono');
const followupObservacionInput = document.getElementById('followupObservacion');
const followupFeedback = document.getElementById('followupFeedback');
const followupSubmit = document.getElementById('followupSubmit');
const followupSubmitInitialLabel = followupSubmit ? followupSubmit.textContent : 'Guardar observación';

if (form && telefonoInput && searchButton && feedback && clientCard && clientDetails) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    clearFeedback();

    const rawTelefono = telefonoInput.value.trim();
    if (!rawTelefono) {
      showFeedback('❌ Ingresa un número telefónico antes de buscar.', 'error');
      hideClientCard();
      telefonoInput.focus();
      return;
    }

    const normalizedTelefono = normalizeTelefono(rawTelefono);
    if (!normalizedTelefono) {
      showFeedback('❌ El número telefónico solo puede contener dígitos.', 'error');
      hideClientCard();
      telefonoInput.focus();
      return;
    }

    if (!canUseServerApi && !hasJsonpEndpoint) {
      showFeedback('❌ Configura APP_CONFIG.serverApiUrl antes de buscar.', 'error');
      return;
    }


    await fetchCliente(normalizedTelefono);
  });

  if (newSearchButton) {
    newSearchButton.addEventListener('click', () => {
      hideClientCard();
      clearFeedback();
      telefonoInput.value = '';
      telefonoInput.focus();
      hideFollowupSection();
    });
  }
} else {
  console.error('No se pudieron inicializar los elementos requeridos de la interfaz.');
}

if (followupForm && followupObservacionInput && followupSubmit) {
  followupForm.addEventListener('submit', async event => {
    event.preventDefault();
    clearFollowupFeedback();

    const telefono = lastClientTelefono || normalizeTelefono(followupTelefonoInput ? followupTelefonoInput.value : '') || '';
    if (!telefono) {
      showFollowupFeedback('❌ Busca un cliente antes de registrar observaciones.', 'error');
      return;
    }

    const nota = formatGenericValue(followupObservacionInput.value);
    if (!nota) {
      showFollowupFeedback('❌ Escribe la observación antes de enviarla.', 'error');
      followupObservacionInput.focus();
      return;
    }

    if (!SERVER_API_URL) {
      showFollowupFeedback('❌ Configura APP_CONFIG.serverApiUrl para enviar observaciones.', 'error');
      return;
    }

    setFollowupLoading(true);

    try {
      const responseBody = await sendFollowupObservation(telefono, nota);
      const updatedRecord = extractRecordOrThrow(responseBody);
      lastClientRecord = updatedRecord;
      lastClientTelefono = telefono;
      renderClientDetails(lastClientRecord, lastFasecoldaData);
      showFollowupFeedback('✅ Observación registrada correctamente.', 'success');
      followupObservacionInput.value = '';
      showFollowupSection();
    } catch (error) {
      const message = error && error.message ? error.message : 'No se pudo registrar la observación.';
      showFollowupFeedback(`❌ ${message}`, 'error');
      console.error(error);
    } finally {
      setFollowupLoading(false);
    }
  });
}

function normalizeTelefono(value) {
  return String(value || '').replace(/\D/g, '');
}

async function fetchCliente(telefono) {
  setLoading(true);
  hideClientCard();
  hideFollowupSection();
  lastClientRecord = null;
  lastFasecoldaData = null;
  lastClientTelefono = '';
  let restError;
  let payload;
  try {
    if (canUseServerApi) {
      try {
        payload = await fetchClienteRest(telefono);
      } catch (error) {
        restError = error;
        if (!shouldFallbackToJsonp(error)) {
          throw error;
        }
        console.warn('Fallo la consulta REST; se intentará con JSONP.', error);
      }
    }

    if (!payload) {
      if (!hasJsonpEndpoint) {
        throw restError || new Error('No se pudo conectar con el endpoint configurado.');
      }
      payload = await fetchClienteJsonp(telefono);
    }

    if (!payload || !payload.record) {
      throw new Error('Respuesta del servidor incompleta.');
    }

    lastClientRecord = payload.record;
    lastFasecoldaData = payload.fasecolda || null;
    lastClientTelefono = telefono;

    renderClientDetails(lastClientRecord, lastFasecoldaData);
    clearFollowupFeedback();
    showFollowupSection();
    showFeedback('✅ Cliente encontrado exitosamente', 'success');
  } catch (error) {
    console.error(error);
    const message = (error && error.message) ? error.message : 'Error al conectar con el servidor.';
    if (/No se encontró/.test(message)) {
      showFeedback('❌ No se encontraron registros para este número', 'error');
    } else {
      showFeedback(`❌ ${message}`, 'error');
    }
    hideFollowupSection();
  } finally {
    setLoading(false);
  }
}

async function fetchClienteRest(telefono) {
  const url = buildServerApiUrl(telefono);

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'api-key': API_KEY,
    api_key: 'c591836278a4cb59f5b92a4aee61827662abc5b3060753e1fce08c503a1ace7b'
  };
  console.log('[API] Enviando petición con headers:', headers);

  const response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    credentials: 'omit',
    headers
  });

  let body;
  try {
    body = await response.clone().json();
  } catch (_error) {
    body = undefined;
  }
  console.log('[API] Respuesta:', response.status, body);

  if (body === undefined) {
    body = await safeParseJson(response);
  }

  if (!response.ok) {
    const message = (body && (body.detail || body.error || body.message)) ? (body.detail || body.error || body.message) : `Error ${response.status}`;
    throw new Error(message);
  }

  console.log('[Consulta Backend]', body);

  const record = extractRecordOrThrow(body);

  return {
    record,
    fasecolda: body && Object.prototype.hasOwnProperty.call(body, 'fasecolda') ? body.fasecolda : null,
    telefono: body && Object.prototype.hasOwnProperty.call(body, 'telefono') ? body.telefono : undefined
  };
}

function buildServerApiUrl(telefono) {
  if (!SERVER_API_URL) {
    throw new Error('SERVER_API_URL no está configurada.');
  }

  try {
    const base = resolveBaseUrl();
    const url = new URL(SERVER_API_URL, base);
    if (telefono) {
      url.searchParams.set('telefono', telefono);
    }
    return url.toString();
  } catch (_error) {
    throw new Error('SERVER_API_URL no es una URL válida.');
  }
}

async function safeParseJson(response) {
  try {
    return await response.json();
  } catch (_error) {
    return undefined;
  }
}

function shouldFallbackToJsonp(error) {
  if (!hasJsonpEndpoint) {
    return false;
  }
  if (!error) {
    return false;
  }
  if (typeof error.code === 'number' && error.code === 18) {
    return true;
  }
  const name = typeof error.name === 'string' ? error.name : '';
  if (name === 'TypeError') {
    return true;
  }
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return (
    message.includes('failed to fetch') ||
    message.includes('cors') ||
    message.includes('network')
  );
}

function resolveBaseUrl() {
  const { origin, href } = window.location;
  if (origin && origin !== 'null') {
    return origin;
  }
  if (href && href.startsWith('file://')) {
    return href;
  }
  return href || 'http://localhost';
}

function tryParseUrl(value) {
  if (!value) {
    return null;
  }
  try {
    return new URL(value, resolveBaseUrl());
  } catch (_error) {
    return null;
  }
}

function isGoogleAppsScriptHost(hostname) {
  if (!hostname) {
    return false;
  }
  return /(?:^|\.)script\.google(?:usercontent)?\.com$/i.test(hostname);
}

function fetchClienteJsonp(telefono) {
  return new Promise((resolve, reject) => {
    const callbackName = `clienteCallback_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const params = new URLSearchParams({ telefono, callback: callbackName });
    const script = document.createElement('script');
    script.src = `${WEBAPP_URL}?${params.toString()}`;
    script.async = true;

    let timeoutId;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      delete window[callbackName];
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('Tiempo de espera agotado.'));
    }, 10000);

    window[callbackName] = payload => {
      cleanup();
      try {
        const record = extractRecordOrThrow(payload);
        resolve({
          record,
          fasecolda: payload && Object.prototype.hasOwnProperty.call(payload, 'fasecolda') ? payload.fasecolda : null,
          telefono: payload && Object.prototype.hasOwnProperty.call(payload, 'telefono') ? payload.telefono : undefined
        });
      } catch (error) {
        reject(error);
      }
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('No se pudo cargar el recurso JSONP.'));
    };

    document.body.appendChild(script);
  });
}

async function sendFollowupObservation(telefono, observacion) {
  if (!SERVER_API_URL) {
    throw new Error('APP_CONFIG.serverApiUrl no está configurada.');
  }

  const payload = {
    action: 'observaciones2',
    telefono,
    clienteTelefono: telefono,
    observaciones2: observacion
  };

  const headers = {
    'Content-Type': 'application/json',
    'api-key': API_KEY
  };
  console.log('[API] Enviando petición con headers:', headers);

  const response = await fetch(SERVER_API_URL, {
    method: 'POST',
    mode: 'cors',
    credentials: 'omit',
    headers,
    body: JSON.stringify(payload)
  });

  let body;
  try {
    body = await response.clone().json();
  } catch (_error) {
    body = undefined;
  }
  console.log('[API] Respuesta:', response.status, body);

  if (body === undefined) {
    body = await safeParseJson(response);
  }

  if (!response.ok) {
    const message = (body && (body.detail || body.error || body.message)) ? (body.detail || body.error || body.message) : `Error ${response.status}`;
    throw new Error(message);
  }

  return body;
}

function extractRecordOrThrow(payload) {
  if (!payload) {
    throw new Error('No se recibió información del servidor.');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'success')) {
    if (!payload.success) {
      throw new Error(payload.error || 'Solicitud rechazada por el servidor.');
    }

    if (!payload.data) {
      throw new Error('No se encontró información para este número.');
    }

    return payload.data;
  }

  if ('data' in payload && payload.data) {
    return payload.data;
  }

  return payload;
}

function renderClientDetails(record, fasecoldaData) {
  if (!record || typeof record !== 'object') {
    throw new Error('Respuesta sin datos de cliente.');
  }

  clientDetails.innerHTML = '';
  if (clientMedia) {
    clientMedia.classList.add('hidden');
    clientMedia.innerHTML = '';
  }

  clientCard.classList.remove('is-visible');
  clientCard.classList.remove('hidden');

  CLIENT_SECTIONS.forEach(section => {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'client-section';

    const titleEl = document.createElement('h3');
    titleEl.className = 'client-section__title';
    titleEl.textContent = section.title;
    sectionEl.appendChild(titleEl);

    const listEl = document.createElement('div');
    listEl.className = 'client-section__list';

    section.fields.forEach(field => {
      const rawValue = record[field.key];
      const formatted = field.transform ? field.transform(record, rawValue) : formatGenericValue(rawValue);
      const displayValue = formatted || 'Sin información';

      const itemEl = document.createElement('div');
      itemEl.className = 'client-section__item';

      const labelEl = document.createElement('span');
      labelEl.className = 'client-section__label';
      labelEl.textContent = field.label;

      const valueEl = document.createElement('span');
      valueEl.className = 'client-section__value';
      valueEl.textContent = displayValue;

      itemEl.append(labelEl, valueEl);
      listEl.appendChild(itemEl);
    });

    sectionEl.appendChild(listEl);
    clientDetails.appendChild(sectionEl);
  });

  const currentRenderId = ++mediaRenderId;
  renderVehicleMedia(record, fasecoldaData, currentRenderId).catch(error => {
    console.error('Error al cargar la imagen del vehículo', error);
  });

  clientCard.classList.remove('hidden');
  requestAnimationFrame(() => clientCard.classList.add('is-visible'));
}

async function renderVehicleMedia(record, fasecoldaData, requestId) {
  if (!clientMedia) {
    return;
  }

  clientMedia.classList.add('hidden');
  clientMedia.innerHTML = '';

  const referenceCandidates = getVehicleReferenceLabels(record);
  const selectionOrder = [];
  const selectionSet = new Set();
  const variantMap = new Map();
  const variantLabels = new Set();

  referenceCandidates.forEach(({ selection, variants }) => {
    if (!selectionSet.has(selection)) {
      selectionSet.add(selection);
      selectionOrder.push(selection);
    }
    variants.forEach(variant => {
      const normalizedVariant = formatGenericValue(variant);
      if (!normalizedVariant || !isMeaningfulFasecoldaLabel(normalizedVariant)) {
        return;
      }
      variantLabels.add(normalizedVariant);
      if (!variantMap.has(normalizedVariant)) {
        variantMap.set(normalizedVariant, new Set());
      }
      variantMap.get(normalizedVariant).add(selection);
    });
  });

  const preferredYear = extractPreferredYear(record);

  if (renderFasecoldaFromApi(record, fasecoldaData, requestId, selectionOrder, preferredYear)) {
    return;
  }

  const renderFallbackSelections = (targets, options = {}) => {
    const fallbackTargets = Array.isArray(targets) && targets.length ? targets : selectionOrder;
    if (!fallbackTargets.length) {
      return;
    }
    renderSelectionFallbackSections(clientMedia, fallbackTargets, {
      titleText: options.titleText || (fallbackTargets.length > 1
        ? '🚘 Selecciones del formulario'
        : '🚘 Selección del formulario'),
      description: options.description || 'Sin coincidencias disponibles en Fasecolda.',
      clear: options.clear ?? clientMedia.childElementCount === 0
    });
  };

  if (!variantLabels.size) {
    renderFallbackSelections(selectionOrder, { clear: true });
    return;
  }

  let fasecoldaIndex;
  try {
    fasecoldaIndex = await fasecoldaIndexPromise;
  } catch (error) {
    console.error('No se pudo cargar el dataset de Fasecolda.', error);
    renderFallbackSelections(selectionOrder, { clear: true });
    return;
  }

  if (!fasecoldaIndex || requestId !== mediaRenderId) {
    return;
  }

  const { map: fasecoldaMap, entries: fasecoldaEntries } = fasecoldaIndex;
  if (!fasecoldaMap || !fasecoldaEntries) {
    renderFallbackSelections(selectionOrder, { clear: true });
    return;
  }

  const seenCodes = new Set();
  const rawMatches = [];
  const matchedSelections = new Set();

  Array.from(variantLabels).forEach(label => {
    const normalizedLabel = normalizeFasecoldaKey(label);
    if (!normalizedLabel) {
      return;
    }
    const brand = detectFasecoldaBrand(label);
    const prefixes = buildFasecoldaReferencePrefixes(label);
    const owningSelections = variantMap.get(label) || new Set();

    const appendMatch = entry => {
      if (!entry) {
        return;
      }
      if (brand && !referenceStartsWithBrand(entry, brand)) {
        return;
      }
      if (!entryMatchesPrefixes(entry, prefixes)) {
        return;
      }
      const uniqueId = getFasecoldaEntryId(entry);
      if (seenCodes.has(uniqueId)) {
        return;
      }
      seenCodes.add(uniqueId);
      owningSelections.forEach(sel => matchedSelections.add(sel));
      rawMatches.push({
        originalLabel: label,
        entry,
        owningSelections: Array.from(owningSelections)
      });
    };

    const directMatch = fasecoldaMap.get(normalizedLabel);
    if (directMatch) {
      appendMatch(directMatch);
      return;
    }

    const fallbackMatches = findFasecoldaByTokens(label, fasecoldaEntries, 3);
    fallbackMatches.forEach(appendMatch);
  });

  if (!rawMatches.length || requestId !== mediaRenderId) {
    if (requestId === mediaRenderId) {
      const missingSelections = selectionOrder.filter(selection => !matchedSelections.has(selection));
      renderFallbackSelections(missingSelections.length ? missingSelections : selectionOrder, { clear: true });
    }
    return;
  }

  const enrichedMatches = rawMatches.map(({ originalLabel, entry, owningSelections }) => {
    const { sortedValues, hasValues } = buildFasecoldaYearOptions(entry.valores);
    const rangeLabel = sortedValues.length
      ? `${sortedValues[0].year}-${sortedValues[sortedValues.length - 1].year}`
      : '2000-2026';
    return {
      originalLabel,
      entry,
      sortedValues,
      hasValues,
      owningSelections,
      rangeLabel,
      preferredYear
    };
  });

  const labelOrder = [];
  const labelGroups = new Map();

  enrichedMatches.forEach(match => {
    const { originalLabel, hasValues } = match;
    if (!labelGroups.has(originalLabel)) {
      labelGroups.set(originalLabel, { withValues: [], withoutValues: [] });
      labelOrder.push(originalLabel);
    }
    const group = labelGroups.get(originalLabel);
    if (hasValues) {
      group.withValues.push(match);
    } else {
      group.withoutValues.push(match);
    }
  });

  const references = [];
  const referenceIds = new Set();

  const pushReference = match => {
    if (!match || !match.entry) {
      return;
    }
    const refId = getFasecoldaEntryId(match.entry);
    if (refId && referenceIds.has(refId)) {
      return;
    }
    if (refId) {
      referenceIds.add(refId);
    }
    references.push(match);
  };

  labelOrder.forEach(originalLabel => {
    const group = labelGroups.get(originalLabel);
    if (!group) {
      return;
    }
    const preferred = group.withValues.shift() || group.withoutValues.shift();
    pushReference(preferred);
  });

  labelGroups.forEach(group => {
    [...group.withValues, ...group.withoutValues].forEach(pushReference);
  });

  if (!references.length || requestId !== mediaRenderId) {
    renderFallbackSelections(selectionOrder, { clear: true });
    return;
  }

  const matchedSelectionsFinal = new Set();
  references.forEach(match => {
    (match.owningSelections || []).forEach(selection => matchedSelectionsFinal.add(selection));
  });

  const titleEl = document.createElement('h3');
  titleEl.className = 'client-section__title';
  titleEl.textContent = references.length > 1
    ? '📊 Valores sugeridos Fasecolda'
    : '📊 Valor sugerido Fasecolda';
  clientMedia.appendChild(titleEl);

  let activeIndex = 0;

  const renderContainer = document.createElement('div');
  renderContainer.className = 'client-media__container';

  const renderReferenceSection = index => {
    if (requestId !== mediaRenderId) {
      return;
    }
    renderContainer.innerHTML = '';
    const match = references[index];
    if (!match) {
      return;
    }

    const {
      originalLabel,
      entry,
      sortedValues,
      owningSelections,
      rangeLabel: referenceRange,
      preferredYear: referencePreferredYear
    } = match;
    const selectionLabel = owningSelections && owningSelections.length ? owningSelections[0] : originalLabel;
    const displaySelection = singularizeDescapotables(selectionLabel);
    const normalizedSelectionKey = normalizeFasecoldaKey(selectionLabel);
    const normalizedReferenceKey = normalizeFasecoldaKey(entry.referencia);

    const sectionEl = document.createElement('section');
    sectionEl.className = 'client-section';

    const headingEl = document.createElement('h4');
    headingEl.className = 'client-section__title';
    headingEl.textContent = displaySelection || singularizeDescapotables(originalLabel);
    sectionEl.appendChild(headingEl);

    const metaList = document.createElement('div');
    metaList.className = 'client-section__list client-section__list--meta';
    metaList.appendChild(createClientFieldItem('Código Fasecolda', entry.codigo || 'Sin información'));
    if (entry.serie && normalizeFasecoldaKey(entry.serie) !== normalizedReferenceKey) {
      metaList.appendChild(createClientFieldItem('Serie Fasecolda', entry.serie));
    }
    if (entry.referencia) {
      metaList.appendChild(createClientFieldItem('Referencia Fasecolda', entry.referencia));
    }
    if (displaySelection && (!entry.referencia || normalizedSelectionKey !== normalizedReferenceKey)) {
      metaList.appendChild(createClientFieldItem('Selección formulario', displaySelection));
    }
    if (entry.tipologia) {
      metaList.appendChild(createClientFieldItem('Tipología', entry.tipologia));
    }
    if (entry.categoria) {
      metaList.appendChild(createClientFieldItem('Categoría', entry.categoria));
    }
    sectionEl.appendChild(metaList);

    const valuesList = document.createElement('div');
    valuesList.className = 'client-section__list client-section__list--fasecolda-values';

    appendFasecoldaYearSelector(valuesList, sortedValues, {
      preferredYear: referencePreferredYear,
      rangeLabel: referenceRange,
      emptyMessage: 'Sin valores disponibles en el rango consultado.'
    });

    sectionEl.appendChild(valuesList);
    renderContainer.appendChild(sectionEl);
  };

  if (references.length > 1) {
    const selectorSection = document.createElement('section');
    selectorSection.className = 'client-section';
    const selectorList = document.createElement('div');
    selectorList.className = 'client-section__list client-section__list--meta';
    const selectorItem = document.createElement('div');
    selectorItem.className = 'client-section__item';

    const selectorLabel = document.createElement('span');
    selectorLabel.className = 'client-section__label';
    selectorLabel.textContent = 'Referencia';
    selectorItem.appendChild(selectorLabel);

    const selectorSelect = document.createElement('select');
    selectorSelect.className = 'client-select';

    references.forEach((match, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      const selectionLabel = match.owningSelections && match.owningSelections.length
        ? match.owningSelections[0]
        : match.originalLabel;
      const displaySelection = singularizeDescapotables(selectionLabel);
      option.textContent = displaySelection || match.entry.referencia || singularizeDescapotables(match.originalLabel);
      selectorSelect.appendChild(option);
    });

    selectorSelect.value = String(activeIndex);

    selectorSelect.addEventListener('change', () => {
      activeIndex = Number(selectorSelect.value) || 0;
      renderReferenceSection(activeIndex);
    });

    selectorItem.appendChild(selectorSelect);
    selectorList.appendChild(selectorItem);
    selectorSection.appendChild(selectorList);
    clientMedia.appendChild(selectorSection);
  }

  clientMedia.appendChild(renderContainer);
  renderReferenceSection(activeIndex);

  const unmatchedSelections = selectionOrder.filter(selection => !matchedSelectionsFinal.has(selection));
  if (unmatchedSelections.length) {
    renderSelectionFallbackSections(clientMedia, unmatchedSelections, {
      titleText: unmatchedSelections.length > 1
        ? '🚘 Selecciones sin valoración'
        : '🚘 Selección sin valoración',
      description: 'Sin coincidencias disponibles en Fasecolda.'
    });
  }

  if (requestId === mediaRenderId) {
    clientMedia.classList.remove('hidden');
  }
}

function renderFasecoldaFromApi(record, fasecoldaData, requestId, selectionOrder, preferredYear) {
  if (!fasecoldaData || typeof fasecoldaData !== 'object') {
    return false;
  }

  const seriesList = Array.isArray(fasecoldaData.series) ? fasecoldaData.series.filter(Boolean) : [];
  if (!seriesList.length) {
    return false;
  }

  if (requestId !== mediaRenderId) {
    return true;
  }

  const coveredSelections = new Set();

  const titleEl = document.createElement('h3');
  titleEl.className = 'client-section__title';
  titleEl.textContent = seriesList.length > 1
    ? '📊 Valores sugeridos Fasecolda'
    : '📊 Valor sugerido Fasecolda';
  clientMedia.appendChild(titleEl);

  seriesList.forEach((seriesItem, index) => {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'client-section';

    const serieLabelRaw = seriesItem && seriesItem.serie ? seriesItem.serie : selectionOrder[index] || 'Serie del formulario';
    const serieLabel = singularizeDescapotables(formatGenericValue(serieLabelRaw)) || 'Serie del formulario';
    const normalizedSerieKey = normalizeFasecoldaKey(serieLabelRaw);
    if (normalizedSerieKey) {
      coveredSelections.add(normalizedSerieKey);
    }

    const headingEl = document.createElement('h4');
    headingEl.className = 'client-section__title';
    headingEl.textContent = serieLabel;
    sectionEl.appendChild(headingEl);

    const metaList = document.createElement('div');
    metaList.className = 'client-section__list client-section__list--meta';
    metaList.appendChild(createClientFieldItem('Serie consultada', serieLabel));

    if (fasecoldaData.marca) {
      metaList.appendChild(createClientFieldItem('Marca (formulario)', formatGenericValue(fasecoldaData.marca)));
    }

    const resultado = seriesItem && seriesItem.resultado;

    if (resultado && resultado.marca) {
      metaList.appendChild(createClientFieldItem('Marca Fasecolda', formatGenericValue(resultado.marca)));
    }

    const consultaYear = resultado && resultado.anioSolicitado ? resultado.anioSolicitado : preferredYear;
    if (consultaYear) {
      metaList.appendChild(createClientFieldItem('Año consultado', consultaYear));
    }

    if (resultado && Number.isFinite(resultado.valorSugerido)) {
      metaList.appendChild(createClientFieldItem('Valor sugerido', formatFasecoldaCurrency(resultado.valorSugerido)));
    } else if (resultado && resultado.valorSugerido === null && resultado.observaciones) {
      metaList.appendChild(createClientFieldItem('Valor sugerido', resultado.observaciones));
    }

    if (resultado && typeof resultado.totalCoincidencias === 'number') {
      metaList.appendChild(createClientFieldItem('Coincidencias encontradas', resultado.totalCoincidencias));
    }

    const updatedAt = resultado && resultado.actualizado ? resultado.actualizado : fasecoldaData.actualizado;
    const formattedTimestamp = formatFasecoldaTimestamp(updatedAt);
    if (formattedTimestamp) {
      metaList.appendChild(createClientFieldItem('Actualización', formattedTimestamp));
    }

    if (seriesItem && seriesItem.error) {
      metaList.appendChild(createClientFieldItem('Estado', `Error: ${seriesItem.error}`));
    } else if (resultado && resultado.observaciones) {
      metaList.appendChild(createClientFieldItem('Observaciones', resultado.observaciones));
    }

    sectionEl.appendChild(metaList);

    const coincidencias = Array.isArray(resultado && resultado.coincidencias) ? resultado.coincidencias : [];

    if (seriesItem && seriesItem.error) {
      const valuesList = document.createElement('div');
      valuesList.className = 'client-section__list client-section__list--fasecolda-values';
      valuesList.appendChild(createClientFieldItem('2000-2026', 'No se pudo consultar valores para esta serie.'));
      sectionEl.appendChild(valuesList);
    } else if (!coincidencias.length) {
      const valuesList = document.createElement('div');
      valuesList.className = 'client-section__list client-section__list--fasecolda-values';
      const emptyMessage = resultado && resultado.observaciones
        ? resultado.observaciones
        : 'Sin coincidencias disponibles en Fasecolda.';
      appendFasecoldaYearSelector(valuesList, [], {
        rangeLabel: '2000-2026',
        emptyMessage
      });
      sectionEl.appendChild(valuesList);
    } else {
      coincidencias.forEach((coincidencia, idx) => {
        const valuesList = document.createElement('div');
        valuesList.className = 'client-section__list client-section__list--fasecolda-values';

        const referenceLabel = formatGenericValue(coincidencia && coincidencia.referencia)
          || `Referencia ${idx + 1}`;
        valuesList.appendChild(createClientFieldItem('Referencia', referenceLabel));

        const { sortedValues } = buildFasecoldaYearOptions(coincidencia && coincidencia.valores);
        const rangeLabel = sortedValues.length
          ? `${sortedValues[0].year}-${sortedValues[sortedValues.length - 1].year}`
          : '2000-2026';

        appendFasecoldaYearSelector(valuesList, sortedValues, {
          preferredYear: consultaYear,
          rangeLabel,
          emptyMessage: 'Sin valores disponibles en el rango consultado.'
        });

        sectionEl.appendChild(valuesList);
      });
    }

    clientMedia.appendChild(sectionEl);
  });

  const unmatchedSelections = selectionOrder.filter(selection => {
    const normalizedSelection = normalizeFasecoldaKey(selection);
    return normalizedSelection && !coveredSelections.has(normalizedSelection);
  });

  if (unmatchedSelections.length) {
    renderSelectionFallbackSections(clientMedia, unmatchedSelections, {
      titleText: unmatchedSelections.length > 1
        ? '🚘 Selecciones sin valoración'
        : '🚘 Selección sin valoración',
      description: 'Sin coincidencias disponibles en Fasecolda.'
    });
  }

  if (requestId === mediaRenderId) {
    clientMedia.classList.remove('hidden');
  }

  return true;
}

function renderSelectionFallbackSections(container, selections, options = {}) {
  if (!container || !Array.isArray(selections) || !selections.length) {
    return;
  }

  const { titleText, description, clear = false } = options;

  if (clear) {
    container.innerHTML = '';
  }

  const heading = document.createElement('h3');
  heading.className = 'client-section__title';
  heading.textContent = titleText || '🚘 Selección del formulario';
  container.appendChild(heading);

  selections.forEach(selection => {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'client-section client-section--no-data';

    const titleEl = document.createElement('h4');
    titleEl.className = 'client-section__title';
    titleEl.textContent = singularizeDescapotables(selection);
    sectionEl.appendChild(titleEl);

    const metaList = document.createElement('div');
    metaList.className = 'client-section__list client-section__list--meta';
    metaList.appendChild(
      createClientFieldItem('Valores Fasecolda', description || 'Sin coincidencias disponibles en Fasecolda.')
    );
    sectionEl.appendChild(metaList);

    container.appendChild(sectionEl);
  });

  container.classList.remove('hidden');
}

function extractVehicleSelectionSegments(record) {
  const fields = [
    'Serie del vehículo',
    'Serie del vehículo 2',
    'Serie del vehículo 3'
  ];

  const selections = [];

  fields.forEach(key => {
    const rawValue = record[key];
    if (!rawValue) {
      return;
    }
    const segments = String(rawValue)
      .split(';')
      .map(value => formatGenericValue(value))
      .filter(Boolean);

    segments.forEach(value => selections.push(value));
  });

  return selections;
}

function extractPreferredYear(record) {
  if (!record) {
    return null;
  }
  const rawValue = record['Año modelo del vehículo'] || record['Ano modelo del vehiculo'] || record['anioModelo'];
  if (!rawValue) {
    return null;
  }
  const match = String(rawValue).match(/(19|20)\d{2}/);
  if (!match) {
    return null;
  }
  const year = Number.parseInt(match[0], 10);
  return Number.isFinite(year) ? year : null;
}

function getVehicleReferenceLabels(record) {
  const selections = extractVehicleSelectionSegments(record);
  const results = [];

  selections.forEach(selection => {
    const variantsSet = new Set();
    expandCatalogLabel(selection).forEach(variant => {
      if (isMeaningfulFasecoldaLabel(variant)) {
        variantsSet.add(formatGenericValue(variant));
      }
    });

    if (variantsSet.size) {
      results.push({
        selection,
        variants: Array.from(variantsSet)
      });
    }
  });

  return results;
}

function expandCatalogLabel(value) {
  const variants = new Set();
  const normalized = formatGenericValue(value);
  if (!normalized) {
    return [];
  }

  variants.add(normalized);

  const pipeParts = normalized.split('|').map(part => formatGenericValue(part)).filter(Boolean);
  pipeParts.forEach(part => variants.add(part));

  if (pipeParts.length >= 2) {
    const brand = pipeParts[0];
    const last = pipeParts[pipeParts.length - 1];
    if (brand && last) {
      variants.add(`${brand} ${last}`);
      variants.add(last);
    }
  }

  return Array.from(variants);
}

async function loadFasecoldaDataset() {
  const index = new Map();
  const entries = [];

  for (const group of FASECOLDA_DATASET_PATHS) {
    const variants = Array.isArray(group) ? group : [group];

    for (const candidate of variants) {
      const trimmedPath = typeof candidate === 'string' ? candidate.trim() : '';
      if (!trimmedPath) {
        continue;
      }
      try {
        const cacheBustPath = `${trimmedPath}${trimmedPath.includes('?') ? '&' : '?'}_=${Date.now()}`;
        const response = await fetch(cacheBustPath, { cache: 'no-store' });
        if (!response.ok) {
          console.warn(`No se pudo cargar ${trimmedPath}: HTTP ${response.status}`);
          continue;
        }
        const dataset = await response.json();
        ingestFasecoldaDataset(dataset, index, entries);
        break;
      } catch (error) {
        console.warn(`Error al cargar valores de Fasecolda desde ${trimmedPath}.`, error);
      }
    }
  }

  if (!entries.length) {
    console.warn('No se pudieron cargar los valores de Fasecolda. Verifica las rutas configuradas.');
  }

  return { map: index, entries };
}

function ingestFasecoldaDataset(dataset, index, entries) {
  if (!Array.isArray(dataset)) {
    return;
  }

  dataset.forEach(serie => {
    const serieName = formatGenericValue(serie && serie.serie);
    const categoria = formatGenericValue(serie && serie.categoria);

    const referencias = Array.isArray(serie && serie.referencias) ? serie.referencias : [];
    referencias.forEach(ref => {
      const referenciaLabel = formatGenericValue(ref && ref.referencia);
      const key = normalizeFasecoldaKey(referenciaLabel);
      if (!key || index.has(key)) {
        return;
      }
      const valores = (ref && ref.valores) || {};
      const entry = {
        key,
        referencia: referenciaLabel,
        serie: serieName,
        categoria,
        tipologia: singularizeDescapotables(formatGenericValue(ref && ref.tipologia)),
        clase: formatGenericValue(ref && ref.clase),
        codigo: formatGenericValue(ref && ref.codigo),
        valores,
        tokens: buildFasecoldaTokensSet(referenciaLabel)
      };
      index.set(key, entry);
      entries.push(entry);
    });
  });
}

function normalizeFasecoldaKey(value) {
  if (!value) {
    return '';
  }
  return stripDiacritics(String(value))
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function findFasecoldaByTokens(label, entries, limit) {
  if (!Array.isArray(entries) || !entries.length) {
    return [];
  }

  const tokensSet = new Set(buildFasecoldaTokens(label));
  FASECOLDA_BRANDS.forEach(brand => tokensSet.delete(brand));
  const tokens = tokensSet.size ? Array.from(tokensSet) : buildFasecoldaTokens(label);

  if (!tokens.length) {
    return [];
  }

  const scored = [];

  entries.forEach(entry => {
    if (!entry || !entry.tokens) {
      return;
    }
    let score = 0;
    let strongMatches = 0;
    tokens.forEach(token => {
      if (entry.tokens.has(token)) {
        const weight = getTokenWeight(token);
        score += weight;
        if (weight >= 2) {
          strongMatches += 1;
        }
      }
    });
    if (score > 0) {
      scored.push({ entry, score, strongMatches });
    }
  });

  scored.sort((a, b) => {
    if (b.strongMatches !== a.strongMatches) {
      return b.strongMatches - a.strongMatches;
    }
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const refA = a.entry && a.entry.referencia ? a.entry.referencia : '';
    const refB = b.entry && b.entry.referencia ? b.entry.referencia : '';
    return refA.localeCompare(refB);
  });

  return scored.slice(0, limit || 3).map(item => item.entry);
}

function buildFasecoldaYearOptions(values) {
  const sortedValues = Object.entries(values || {})
    .map(([year, rawValue]) => {
      const numericYear = Number(year);
      const numericValue = coerceFasecoldaNumericValue(rawValue);
      if (!Number.isFinite(numericYear) || !Number.isFinite(numericValue)) {
        return null;
      }
      return { year: numericYear, value: numericValue };
    })
    .filter(Boolean)
    .sort((a, b) => a.year - b.year);

  return { sortedValues, hasValues: sortedValues.length > 0 };
}

function appendFasecoldaYearSelector(container, sortedValues, options = {}) {
  if (!container) {
    return;
  }

  const { emptyMessage, rangeLabel, preferredYear } = options;
  const hasValues = Array.isArray(sortedValues) && sortedValues.length > 0;

  if (!hasValues) {
    const label = rangeLabel || 'Rango consultado';
    container.appendChild(
      createClientFieldItem(label, emptyMessage || 'Sin valores disponibles en el rango consultado.')
    );
    return;
  }

  const firstYear = sortedValues[0].year;
  const lastYear = sortedValues[sortedValues.length - 1].year;
  const computedRange = rangeLabel || (firstYear === lastYear ? String(firstYear) : `${firstYear}-${lastYear}`);

  const selectItem = document.createElement('div');
  selectItem.className = 'client-section__item';

  const selectLabel = document.createElement('span');
  selectLabel.className = 'client-section__label';
  selectLabel.textContent = computedRange ? `Año (${computedRange})` : 'Año';
  selectItem.appendChild(selectLabel);

  const select = document.createElement('select');
  select.className = 'client-select';

  sortedValues.forEach(({ year, value }) => {
    const option = document.createElement('option');
    option.value = String(year);
    option.textContent = String(year);
    option.dataset.valor = value;
    select.appendChild(option);
  });

  selectItem.appendChild(select);
  container.appendChild(selectItem);

  const valueItem = document.createElement('div');
  valueItem.className = 'client-section__item';

  const valueLabel = document.createElement('span');
  valueLabel.className = 'client-section__label';
  valueLabel.textContent = 'Valor sugerido';
  valueItem.appendChild(valueLabel);

  const valueDisplay = document.createElement('span');
  valueDisplay.className = 'client-section__value';
  valueDisplay.textContent = 'Sin información';
  valueItem.appendChild(valueDisplay);

  const updateDisplay = () => {
    const selectedOption = select.options[select.selectedIndex];
    const rawValue = selectedOption ? Number(selectedOption.dataset.valor) : NaN;
    valueDisplay.textContent = formatFasecoldaCurrency(rawValue) || 'Sin información';
  };

  select.addEventListener('change', updateDisplay);

  let defaultIndex = select.options.length ? select.options.length - 1 : 0;
  if (Number.isFinite(preferredYear)) {
    const foundIndex = sortedValues.findIndex(({ year }) => Number(year) === Number(preferredYear));
    if (foundIndex >= 0) {
      defaultIndex = foundIndex;
    }
  }

  if (select.options.length) {
    select.selectedIndex = defaultIndex;
  }
  updateDisplay();

  container.appendChild(valueItem);
}

function getFasecoldaEntryId(entry) {
  if (!entry) {
    return '';
  }
  if (entry.codigo) {
    return entry.codigo;
  }
  if (entry.key) {
    return entry.key;
  }
  return normalizeFasecoldaKey(entry.referencia || '');
}

function detectFasecoldaBrand(label) {
  const sanitized = stripDiacritics(formatGenericValue(label)).toUpperCase();
  if (!sanitized) {
    return '';
  }
  return FASECOLDA_BRANDS.find(brand => sanitized.includes(brand)) || '';
}

function referenceStartsWithBrand(entry, brand) {
  if (!brand || !entry) {
    return true;
  }
  const reference = stripDiacritics(formatGenericValue(entry.referencia)).toUpperCase();
  return reference.startsWith(brand);
}

function buildFasecoldaReferencePrefixes(label) {
  const variants = expandCatalogLabel(label);
  const prefixes = new Set();

  variants.forEach(variant => {
    const sanitized = stripDiacritics(formatGenericValue(variant)).toUpperCase();
    if (!sanitized) {
      return;
    }

    const brand = FASECOLDA_BRANDS.find(candidate => sanitized.includes(candidate));
    if (!brand) {
      return;
    }

    const tokens = sanitized
      .replace(/[^A-Z0-9]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    let brandIndex = tokens.indexOf(brand);
    if (brandIndex === -1) {
      tokens.unshift(brand);
      brandIndex = 0;
    }

    const coreTokens = [];
    for (let i = brandIndex + 1; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token) {
        continue;
      }
      if (token === brand) {
        continue;
      }
      if (token === 'MOTORRAD' && brand === 'BMW') {
        continue;
      }
      if (FASECOLDA_SKIP_TOKENS.has(token)) {
        continue;
      }
      if (token.length === 1) {
        if (coreTokens.length !== 0 || !FASECOLDA_ALLOWED_SINGLE_TOKENS.has(token)) {
          continue;
        }
        const nextToken = findNextPrefixToken(tokens, i + 1);
        if (!nextToken || !/^[0-9A-Z]+$/.test(nextToken)) {
          continue;
        }
      }
      if (shouldStopPrefixToken(token, coreTokens.length)) {
        break;
      }
      if (coreTokens.length && coreTokens[coreTokens.length - 1] === token) {
        continue;
      }
      coreTokens.push(token);
      if (coreTokens.length >= 3) {
        break;
      }
    }

    if (!coreTokens.length) {
      return;
    }

    const minPrefixLength = coreTokens[0] && coreTokens[0].length === 1 ? 2 : 1;
    for (let length = coreTokens.length; length >= minPrefixLength; length--) {
      const prefix = [brand, ...coreTokens.slice(0, length)].join(' ');
      prefixes.add(prefix);
    }
  });

  return Array.from(prefixes);
}

function entryMatchesPrefixes(entry, prefixes) {
  if (!prefixes || !prefixes.length) {
    return true;
  }
  const normalizedReference = normalizeFasecoldaKey(entry && entry.referencia);
  if (!normalizedReference) {
    return false;
  }
  return prefixes.some(prefix => {
    const normalizedPrefix = normalizeFasecoldaKey(prefix);
    return normalizedPrefix && normalizedReference.startsWith(normalizedPrefix);
  });
}

function shouldStopPrefixToken(token, currentLength) {
  if (FASECOLDA_BREAK_TOKENS.has(token)) {
    return true;
  }
  if (/^[0-9]+CC$/.test(token)) {
    return true;
  }
  return false;
}

function findNextPrefixToken(tokens, startIndex) {
  for (let index = startIndex; index < tokens.length; index++) {
    const candidate = tokens[index];
    if (!candidate) {
      continue;
    }
    if (FASECOLDA_BRANDS.includes(candidate)) {
      continue;
    }
    if (FASECOLDA_SKIP_TOKENS.has(candidate)) {
      continue;
    }
    if (FASECOLDA_BREAK_TOKENS.has(candidate)) {
      return null;
    }
    if (/^[0-9]+CC$/.test(candidate)) {
      return null;
    }
    return candidate;
  }
  return null;
}

function buildFasecoldaTokensSet(value) {
  const tokens = buildFasecoldaTokens(value);
  return new Set(tokens);
}

function buildFasecoldaTokens(value) {
  if (!value) {
    return [];
  }
  const ascii = stripDiacritics(String(value)).toUpperCase();
  return ascii
    .replace(/[^A-Z0-9]+/g, ' ')
    .split(' ')
    .map(token => token.trim())
    .filter(token => token.length >= 2 && token !== 'DE' && token !== 'DEL');
}

function coerceFasecoldaNumericValue(raw) {
  if (raw === null || raw === undefined) {
    return NaN;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) {
      return NaN;
    }
  }
  const numeric = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return NaN;
  }
  return numeric;
}

function formatFasecoldaCurrency(value) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return '';
  }
  const pesos = Math.round(numeric * 1000);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(pesos);
}

function formatFasecoldaTimestamp(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function createClientFieldItem(label, value) {
  const itemEl = document.createElement('div');
  itemEl.className = 'client-section__item';

  const labelEl = document.createElement('span');
  labelEl.className = 'client-section__label';
  labelEl.textContent = label;

  const valueEl = document.createElement('span');
  valueEl.className = 'client-section__value';
  valueEl.textContent = value || 'Sin información';

  itemEl.append(labelEl, valueEl);
  return itemEl;
}

function getTokenWeight(token) {
  if (!token) {
    return 0;
  }
  if (/^[A-Z]+\d/.test(token)) {
    return 3;
  }
  if (/^\d+[A-Z]+/.test(token)) {
    return 2;
  }
  if (/\d/.test(token)) {
    return 1;
  }
  return 1;
}

function stripDiacritics(value) {
  const stringValue = String(value || '');
  if (typeof stringValue.normalize !== 'function') {
    return stringValue;
  }
  return stringValue
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}


function formatTelefonoDisplay(_record, value) {
  const cleaned = formatGenericValue(value).replace(/^'+/, '');
  return cleaned || 'Sin información';
}

function formatSeries(record) {
  const candidates = [
    record['Serie del vehículo'],
    record['Serie del vehículo 2'],
    record['Serie del vehículo 3']
  ];
  const filtered = candidates
    .map(value => singularizeDescapotables(formatGenericValue(value)))
    .filter(Boolean);
  return filtered.length ? filtered.join(', ') : 'Sin información';
}

function formatGenericValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function singularizeDescapotables(value) {
  if (!value) {
    return value;
  }
  return String(value).replace(DESCAPOTABLES_PATTERN, match => match.replace(/s$/i, ''));
}

function formatFollowupNotes(_record, value) {
  const formatted = formatGenericValue(value);
  return formatted || '';
}

function formatPresupuesto(_record, value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const numericValue = typeof value === 'number'
    ? value
    : Number(String(value).replace(/[^0-9,.-]/g, '').replace(/,/g, '.'));

  if (Number.isNaN(numericValue)) {
    return formatGenericValue(value);
  }

  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numericValue);
}

function setLoading(isLoading) {
  if (!searchButton) {
    return;
  }

  searchButton.disabled = isLoading;
  searchButton.textContent = isLoading ? 'Buscando...' : 'Buscar';
}

function showFeedback(message, type) {
  feedback.textContent = message;
  const modifier = type ? `feedback--${type}` : '';
  feedback.className = ['feedback', modifier].filter(Boolean).join(' ');
}

function clearFeedback() {
  feedback.textContent = '';
  feedback.className = 'feedback';
}

function hideClientCard() {
  if (!clientCard) {
    return;
  }

  clientCard.classList.remove('is-visible');
  const finalize = () => {
    clientCard.classList.add('hidden');
    clientDetails.innerHTML = '';
    if (clientMedia) {
      clientMedia.classList.add('hidden');
      clientMedia.innerHTML = '';
    }
  };

  if (clientCard.classList.contains('hidden')) {
    finalize();
  } else {
    window.setTimeout(finalize, 250);
  }
}

function showFollowupSection() {
  if (!clientFollowup) {
    return;
  }

  if (!lastClientTelefono) {
    hideFollowupSection();
    return;
  }

  clientFollowup.classList.remove('hidden');

  if (followupTelefonoInput) {
    followupTelefonoInput.value = lastClientTelefono;
  }
}

function hideFollowupSection() {
  if (clientFollowup) {
    clientFollowup.classList.add('hidden');
  }

  if (followupForm) {
    followupForm.reset();
  } else if (followupObservacionInput) {
    followupObservacionInput.value = '';
  }

  if (followupTelefonoInput) {
    followupTelefonoInput.value = '';
  }

  clearFollowupFeedback();
}

function setFollowupLoading(isLoading) {
  if (!followupSubmit) {
    return;
  }

  followupSubmit.disabled = Boolean(isLoading);
  followupSubmit.textContent = isLoading ? 'Guardando...' : followupSubmitInitialLabel;
}

function showFollowupFeedback(message, type) {
  if (!followupFeedback) {
    if (type === 'error') {
      window.alert(message);
    }
    return;
  }

  const modifier = type ? `feedback--${type}` : '';
  followupFeedback.textContent = message;
  followupFeedback.className = ['feedback', modifier].filter(Boolean).join(' ');
}

function clearFollowupFeedback() {
  if (!followupFeedback) {
    return;
  }
  followupFeedback.textContent = '';
  followupFeedback.className = 'feedback';
}
