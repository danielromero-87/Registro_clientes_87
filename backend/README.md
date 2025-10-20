# Backend Node.js – Consulta de clientes

Este backend actúa como un adaptador entre la hoja de cálculo de Google Sheets y el frontend existente (`demo app`). Expone un endpoint REST `/api/clientes` que recibe un número telefónico y devuelve la ficha correspondiente con cabeceras CORS listas para consumir desde cualquier origen.

## Flujo propuesto

1. El frontend envía una petición `GET /api/clientes?telefono=3001234567`.
2. El servidor normaliza el número, valida que no esté vacío y llama a la API de Google Sheets usando una cuenta de servicio.
3. Se localiza la fila cuyo campo `Número telefónico` coincida exactamente (solo dígitos).
4. Se construye una respuesta JSON con los mismos encabezados que usa el frontend actual.
5. El resultado regresa al navegador con `Access-Control-Allow-Origin: *` para evitar problemas de CORS.

> Puedes mantener Google Sheets como fuente de verdad, sin tener que migrar a otra base de datos en esta fase.

## Requisitos

- Node.js 18 o superior.
- Credenciales para llamar a la API de Google Sheets. Puedes usar **una cuenta de servicio** (con la hoja compartida) o las credenciales predeterminadas de Google (`gcloud auth application-default login`).
- Si tu organización bloquea la descarga de claves de servicio, inicia sesión con `gcloud auth application-default login` y comparte la hoja con tu usuario. El backend detecta automáticamente este modo.

## Variables de entorno

Crea un archivo `.env` en la carpeta `backend` con el siguiente contenido:

```
PORT=8080
SPREADSHEET_ID=TU_ID_DE_SHEET
SHEET_NAME=Registros
# GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/archivo/credenciales.json  # Opcional si usas credenciales predeterminadas
# FASECOLDA_CACHE_TTL_MS=21600000                                 # Opcional: refresco de datos (milisegundos)
# FASECOLDA_LOOKUP_TIMEOUT_MS=12000                               # Opcional: tope por consulta (milisegundos)
# FASECOLDA_URL=https://www.fasecolda.com/guia-de-valores/        # Opcional: URL base a scrapear
```

> El `SPREADSHEET_ID` es el identificador que aparece en la URL de la hoja: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`.

## Instalación

```bash
cd backend
npm install
```

Esto descargará las dependencias declaradas en `package.json` (Express y Google APIs). Si usas credenciales predeterminadas, ejecuta antes `gcloud auth application-default login` y sigue el flujo del navegador con la cuenta que tiene acceso a la hoja.

## Ejecución local

```bash
npm run dev
```

El servidor queda escuchando en `http://localhost:8080`. Para probarlo manualmente:

```bash
curl "http://localhost:8080/api/clientes?telefono=3001234567"
```

## Integración con el frontend

1. Arranca el backend (`npm run dev`).
2. En `demo app/script.js`, reemplaza la lógica de JSONP por una llamada `fetch` a `http://localhost:8080/api/clientes?telefono=...`.
3. El backend responde con JSON estándar; no se requiere JSONP y no se afectan políticas de ORB.

> Si ves `Error: No se pudo cargar el recurso JSONP.` en el frontend, puedes seguir la guía de `demo app/DOCUMENTACION.md` para redeployar el WebApp o, como alternativa inmediata, apuntar `SERVER_API_URL` en `demo app/script.js` a este backend para evitar el flujo JSONP bloqueado.

## Integración con Fasecolda

- En cada consulta exitosa se inicia un navegador headless (Puppeteer) que carga la pestaña **Vehículos usados** y normaliza la información de marca, referencia y año.
- El resultado se expone en la respuesta JSON bajo la clave `fasecolda` con la estructura:

```json
{
  "marca": "BMW",
  "anio": "2022",
  "fuente": "Fasecolda (Vehículos usados)",
  "actualizado": "2025-10-20T15:00:00.000Z",
  "series": [
    {
      "serie": "Serie 3",
      "error": null,
      "resultado": {
        "referenciaBuscada": "Serie 3",
        "valorSugerido": 143800.0,
        "coincidencias": [
          {
            "referencia": "BMW 320i Sedan",
            "valorSolicitado": 143800.0,
            "valores": { "2020": 120000.0, "2021": 135000.0, "2022": 143800.0 }
          }
        ]
      }
    }
  ]
}
```

- Cada elemento de `series` corresponde a las columnas `Serie del vehículo`, `Serie del vehículo 2` y `Serie del vehículo 3` presentes en la fila del cliente.
- Dentro de `resultado.coincidencias` se listan **todas** las referencias Fasecolda encontradas para el término consultado (incluye valores numéricos y texto por año modelo).
- Los datos extraídos se cachean en memoria durante el tiempo configurado en `FASECOLDA_CACHE_TTL_MS` (6 horas por defecto) para reducir el número de scraping.
- Ajusta `FASECOLDA_LOOKUP_TIMEOUT_MS` si necesitas acotar el tiempo de espera por consulta individual (12 segundos por defecto).
- `FASECOLDA_URL` te permite cambiar la URL objetivo en caso de que Fasecolda modifique su ruta pública.
- Solo se consideran valores de Fasecolda con año modelo **a partir de 2000**; solicitudes con años previos devolverán `valorSugerido: null` y `coincidencias` vacías.

## Próximos pasos

- Añadir caché en memoria (TTL) si la hoja es grande.
- Registrar métricas básicas y logs para diagnósticos.
- Migrar a Supabase u otra base de datos si necesitas filtros más complejos o mayor volumen.
