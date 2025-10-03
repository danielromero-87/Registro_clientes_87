/**
 * script.js
 * Permite buscar clientes usando un backend REST o, en su defecto, el WebApp JSONP de Google Apps Script.
 */
const CONFIG = window.APP_CONFIG || {};
const SERVER_API_URL = (CONFIG.serverApiUrl || '').trim();
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
  'Serie del vehículo',
  'Serie del vehículo 2',
  'Serie del vehículo 3',
  'Presupuesto',
  'Siguiente paso',
  'Observaciones'
];

const FASECOLDA_DATASET_PATH = 'bmw_fasecolda_values.json';
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
      { key: 'Serie del vehículo', label: 'Serie(s)', transform: formatSeries }
    ]
  },
  {
    title: '💰 Detalles Financieros',
    fields: [
      { key: 'Presupuesto', label: 'Presupuesto', transform: formatPresupuesto },
      { key: 'Observaciones', label: 'Observaciones' }
    ]
  }
];

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
      showFeedback('❌ Configura APP_CONFIG.webAppUrl o APP_CONFIG.serverApiUrl antes de buscar.', 'error');
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
    });
  }
} else {
  console.error('No se pudieron inicializar los elementos requeridos de la interfaz.');
}

function normalizeTelefono(value) {
  return String(value || '').replace(/\D/g, '');
}

async function fetchCliente(telefono) {
  setLoading(true);
  hideClientCard();
  let restError;
  let record;
  try {
    if (canUseServerApi) {
      try {
        record = await fetchClienteRest(telefono);
      } catch (error) {
        restError = error;
        if (!shouldFallbackToJsonp(error)) {
          throw error;
        }
        console.warn('Fallo la consulta REST; se intentará con JSONP.', error);
      }
    }

    if (!record) {
      if (!hasJsonpEndpoint) {
        throw restError || new Error('No se pudo conectar con el endpoint configurado.');
      }
      record = await fetchClienteJsonp(telefono);
    }

    renderClientDetails(record);
    showFeedback('✅ Cliente encontrado exitosamente', 'success');
  } catch (error) {
    console.error(error);
    const message = (error && error.message) ? error.message : 'Error al conectar con el servidor.';
    if (/No se encontró/.test(message)) {
      showFeedback('❌ No se encontraron registros para este número', 'error');
    } else {
      showFeedback(`❌ ${message}`, 'error');
    }
  } finally {
    setLoading(false);
  }
}

async function fetchClienteRest(telefono) {
  const url = buildServerApiUrl(telefono);

  const response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    credentials: 'omit',
    headers: {
      Accept: 'application/json'
    }
  });

  const body = await safeParseJson(response);

  if (!response.ok) {
    const message = (body && body.error) ? body.error : `Error ${response.status}`;
    throw new Error(message);
  }

  return extractRecordOrThrow(body);
}

function buildServerApiUrl(telefono) {
  if (!SERVER_API_URL) {
    throw new Error('SERVER_API_URL no está configurada.');
  }

  try {
    const base = resolveBaseUrl();
    const url = new URL(SERVER_API_URL, base);
    url.searchParams.set('telefono', telefono);
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
        resolve(record);
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

function renderClientDetails(record) {
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
  renderVehicleMedia(record, currentRenderId).catch(error => {
    console.error('Error al cargar la imagen del vehículo', error);
  });

  clientCard.classList.remove('hidden');
  requestAnimationFrame(() => clientCard.classList.add('is-visible'));
}

async function renderVehicleMedia(record, requestId) {
  if (!clientMedia) {
    return;
  }

  clientMedia.classList.add('hidden');
  clientMedia.innerHTML = '';

  const labels = getVehicleReferenceLabels(record);
  if (!labels.length) {
    return;
  }

  let fasecoldaIndex;
  try {
    fasecoldaIndex = await fasecoldaIndexPromise;
  } catch (error) {
    console.error('No se pudo cargar el dataset de Fasecolda.', error);
    return;
  }

  if (!fasecoldaIndex || requestId !== mediaRenderId) {
    return;
  }

  const { map: fasecoldaMap, entries: fasecoldaEntries } = fasecoldaIndex;
  if (!fasecoldaMap || !fasecoldaEntries) {
    return;
  }

  const seenCodes = new Set();
  const rawMatches = [];

  labels.forEach(label => {
    const normalizedLabel = normalizeFasecoldaKey(label);
    if (!normalizedLabel) {
      return;
    }
    const prefixes = buildFasecoldaReferencePrefixes(label);
    const appendMatch = entry => {
      if (!entry) {
        return;
      }
      if (!entryMatchesPrefixes(entry, prefixes)) {
        return;
      }
      const uniqueId = entry.codigo || `${entry.key}-${entry.referencia}`;
      if (seenCodes.has(uniqueId)) {
        return;
      }
      seenCodes.add(uniqueId);
      rawMatches.push({ originalLabel: label, entry });
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
    return;
  }

  const enrichedMatches = rawMatches.map(({ originalLabel, entry }) => {
    const { sortedValues, hasValues } = buildFasecoldaYearOptions(entry.valores);
    return {
      originalLabel,
      entry,
      sortedValues,
      hasValues
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

  labelOrder.forEach(originalLabel => {
    const group = labelGroups.get(originalLabel);
    if (!group) {
      return;
    }
    const preferred = group.withValues.shift() || group.withoutValues.shift();
    if (preferred && !references.includes(preferred)) {
      references.push(preferred);
    }
  });

  labelGroups.forEach(group => {
    [...group.withValues, ...group.withoutValues].forEach(match => {
      if (!references.includes(match)) {
        references.push(match);
      }
    });
  });

  if (!references.length || requestId !== mediaRenderId) {
    return;
  }

  const titleEl = document.createElement('h3');
  titleEl.className = 'client-section__title';
  titleEl.textContent = references.length > 1
    ? '📊 Valores sugeridos Fasecolda'
    : '📊 Valor sugerido Fasecolda';
  clientMedia.appendChild(titleEl);

  let activeIndex = 0;

  const renderContainer = document.createElement('div');

  const renderReferenceSection = index => {
    if (requestId !== mediaRenderId) {
      return;
    }
    renderContainer.innerHTML = '';
    const match = references[index];
    if (!match) {
      return;
    }

    const { originalLabel, entry, sortedValues, hasValues } = match;

    const sectionEl = document.createElement('section');
    sectionEl.className = 'client-section';

    const headingEl = document.createElement('h4');
    headingEl.className = 'client-section__title';
    headingEl.textContent = entry.referencia || singularizeDescapotables(originalLabel);
    sectionEl.appendChild(headingEl);

    const metaList = document.createElement('div');
    metaList.className = 'client-section__list client-section__list--meta';
    metaList.appendChild(createClientFieldItem('Código Fasecolda', entry.codigo || 'Sin información'));
    if (entry.serie && normalizeFasecoldaKey(entry.serie) !== normalizeFasecoldaKey(entry.referencia)) {
      metaList.appendChild(createClientFieldItem('Serie Fasecolda', entry.serie));
    }
    if (normalizeFasecoldaKey(originalLabel) !== normalizeFasecoldaKey(entry.referencia)) {
      metaList.appendChild(createClientFieldItem('Selección formulario', singularizeDescapotables(originalLabel)));
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

    if (!hasValues || !sortedValues.length) {
      valuesList.appendChild(createClientFieldItem('2010-2026', 'Sin valores disponibles en el rango.'));
    } else {
      const selectItem = document.createElement('div');
      selectItem.className = 'client-section__item';

      const selectLabel = document.createElement('span');
      selectLabel.className = 'client-section__label';
      selectLabel.textContent = 'Año';
      selectItem.appendChild(selectLabel);

      const select = document.createElement('select');
      select.className = 'client-select';

      sortedValues.forEach(({ year, value }) => {
        const option = document.createElement('option');
        option.value = String(year);
        option.textContent = year;
        option.dataset.valor = value;
        select.appendChild(option);
      });

      selectItem.appendChild(select);
      valuesList.appendChild(selectItem);

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
      if (select.options.length) {
        select.selectedIndex = select.options.length - 1;
      }
      updateDisplay();

      valuesList.appendChild(valueItem);
    }

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
      option.textContent = match.entry.referencia || singularizeDescapotables(match.originalLabel);
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

  if (requestId === mediaRenderId) {
    clientMedia.classList.remove('hidden');
  }
}

function getVehicleReferenceLabels(record) {
  const fields = [
    'Serie del vehículo',
    'Serie del vehículo 2',
    'Serie del vehículo 3'
  ];

  const labels = new Set();

  fields.forEach(key => {
    const rawValue = record[key];
    if (!rawValue) {
      return;
    }
    const segments = String(rawValue)
      .split(';')
      .map(value => formatGenericValue(value))
      .filter(Boolean);

    segments.forEach(value => {
      expandCatalogLabel(value).forEach(variant => {
        if (isMeaningfulFasecoldaLabel(variant)) {
          labels.add(variant);
        }
      });
    });
  });

  return Array.from(labels);
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
  try {
    const response = await fetch(FASECOLDA_DATASET_PATH, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const dataset = await response.json();

    const index = new Map();
    const entries = [];

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

    return { map: index, entries };
  } catch (error) {
    console.warn('No se pudieron cargar los valores de Fasecolda.', error);
    return { map: new Map(), entries: [] };
  }
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
  tokensSet.delete('BMW');
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

function buildFasecoldaReferencePrefixes(label) {
  const variants = expandCatalogLabel(label);
  const prefixes = new Set();

  variants.forEach(variant => {
    const sanitized = stripDiacritics(formatGenericValue(variant)).toUpperCase();
    if (!sanitized.includes('BMW')) {
      return;
    }

    const tokens = sanitized
      .replace(/[^A-Z0-9]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    let brandIndex = tokens.indexOf('BMW');
    if (brandIndex === -1) {
      tokens.unshift('BMW');
      brandIndex = 0;
    }

    const coreTokens = [];
    for (let i = brandIndex + 1; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token) {
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
        if (!nextToken || !/[0-9]/.test(nextToken)) {
          continue;
        }
      }
      if (shouldStopPrefixToken(token, coreTokens.length)) {
        break;
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
      const prefix = ['BMW', ...coreTokens.slice(0, length)].join(' ');
      prefixes.add(prefix);
    }
  });

  return Array.from(prefixes);
}

function entryMatchesPrefixes(entry, prefixes) {
  if (!prefixes || !prefixes.length) {
    return true;
  }
  const reference = stripDiacritics(formatGenericValue(entry && entry.referencia)).toUpperCase();
  return prefixes.some(prefix => reference.startsWith(prefix));
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
