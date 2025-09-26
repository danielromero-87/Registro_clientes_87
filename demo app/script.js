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

const hasServerApi = Boolean(SERVER_API_URL);
const form = document.getElementById('searchForm');
const telefonoInput = document.getElementById('telefono');
const searchButton = document.getElementById('searchButton');
const feedback = document.getElementById('feedback');
const clientCard = document.getElementById('clientCard');
const clientDetails = document.getElementById('clientDetails');

if (form && telefonoInput && searchButton && feedback && clientCard && clientDetails) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    clearFeedback();

    const rawTelefono = telefonoInput.value.trim();
    if (!rawTelefono) {
      showFeedback('Ingresa un número telefónico antes de buscar.', 'error');
      hideClientCard();
      telefonoInput.focus();
      return;
    }

    const normalizedTelefono = normalizeTelefono(rawTelefono);
    if (!normalizedTelefono) {
      showFeedback('El número telefónico solo puede contener dígitos.', 'error');
      hideClientCard();
      telefonoInput.focus();
      return;
    }

    if (!hasServerApi && !WEBAPP_URL) {
      showFeedback('Configura APP_CONFIG.webAppUrl o APP_CONFIG.serverApiUrl antes de buscar.', 'error');
      return;
    }

    await fetchCliente(normalizedTelefono);
  });
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
    showFeedback('Información cargada correctamente.', 'success');
  } catch (error) {
    console.error(error);
    const message = (error && error.message) ? error.message : 'Error al conectar con el servidor.';
    showFeedback(message, 'error');
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

function renderClientDetails(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Respuesta sin datos de cliente.');
  }

  clientDetails.innerHTML = '';

  HEADERS.forEach(header => {
    const rawValue = data[header];
    const value = header === 'Presupuesto' ? formatPresupuesto(rawValue) : formatGenericValue(rawValue);

    const dt = document.createElement('dt');
    dt.textContent = header;

    const dd = document.createElement('dd');
    dd.textContent = value || 'Sin información';

    clientDetails.append(dt, dd);
  });

  clientCard.classList.remove('hidden');
}

function formatGenericValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function formatPresupuesto(value) {
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
  feedback.className = `feedback ${type || ''}`.trim();
}

function clearFeedback() {
  feedback.textContent = '';
  feedback.className = 'feedback';
}

function hideClientCard() {
  clientCard.classList.add('hidden');
  clientDetails.innerHTML = '';
}
