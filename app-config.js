// Configuración compartida para los frontends de registro y consulta.
// Actualiza las URLs según el despliegue vigente del backend.
window.APP_CONFIG = Object.assign(
  {
    serverApiUrl: '',
    webAppUrl: 'https://script.google.com/macros/s/AKfycbwuWV-cdLHOOhO_px8EC_xzANj7dzSmJv1jix4CA0c657MoiNR4GJquvlitBGOdXKq_Dg/exec'
  },
  window.APP_CONFIG || {}
);
