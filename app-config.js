// Configuración compartida para los frontends de registro y consulta.
// Actualiza las URLs según el despliegue vigente del backend.
const BASE_URL = 'https://backend-registro87.onrender.com/api/v1/clientes';
const API_KEY = 'c591836278a4cb59f5b92a4aee61827662abc5b3060753e1fce08c503a1ace7b';

window.APP_CONFIG = Object.assign(
  {
    serverApiUrl: BASE_URL,
    webAppUrl: 'https://script.google.com/macros/s/AKfycbwci1hkECHbSqYnISV9LEcmNL2wtvm-K7QrAaMJb-1BpPxnV4bBUGpZCWUt27HnNMoFsw/exec',
    apiKey: API_KEY,
    fasecoldaDatasetFallbackBases: [
      'https://raw.githubusercontent.com/danielromero-87/Registro_clientes_87/main/'
    ]
  },
  window.APP_CONFIG || {}
);
