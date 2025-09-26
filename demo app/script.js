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


const hasServerApi = Boolean(SERVER_API_URL);
const form = document.getElementById('searchForm');
const telefonoInput = document.getElementById('telefono');
const searchButton = document.getElementById('searchButton');
const feedback = document.getElementById('feedback');
const clientCard = document.getElementById('clientCard');
const clientDetails = document.getElementById('clientDetails');
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

    if (!hasServerApi && !WEBAPP_URL) {
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
  try {
    const record = hasServerApi
      ? await fetchClienteRest(telefono)
      : await fetchClienteJsonp(telefono);

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
    const url = new URL(SERVER_API_URL, window.location.origin);
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

  clientCard.classList.remove('hidden');
  requestAnimationFrame(() => clientCard.classList.add('is-visible'));
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
    .map(value => formatGenericValue(value))
    .filter(Boolean);
  return filtered.length ? filtered.join(', ') : 'Sin información';
}

function formatGenericValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
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
  };

  if (clientCard.classList.contains('hidden')) {
    finalize();
  } else {
    window.setTimeout(finalize, 250);
  }
}
