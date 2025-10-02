// Configuración compartida para los frontends de registro y consulta.
// Actualiza las URLs según el despliegue vigente del backend.
window.APP_CONFIG = Object.assign(
  {
    serverApiUrl: 'https://script.google.com/macros/s/AKfycbwci1hkECHbSqYnISV9LEcmNL2wtvm-K7QrAaMJb-1BpPxnV4bBUGpZCWUt27HnNMoFsw/exec',
    webAppUrl: 'https://script.google.com/macros/s/AKfycbwci1hkECHbSqYnISV9LEcmNL2wtvm-K7QrAaMJb-1BpPxnV4bBUGpZCWUt27HnNMoFsw/exec'
  },
  window.APP_CONFIG || {}
);
