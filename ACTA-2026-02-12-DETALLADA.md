# Acta de Entrega Detallada - Integración de Leads y Asignación por Inventario (12/02/2026)

## Metadatos de la tarea

| Campo | Valor |
|---|---|
| `task_id` | `RC87-LEADS-PIPELINE-20260212` |
| `completed_at` | `2026-02-12 15:39:04 -0500` |
| `executor` | `Codex (asistente técnico)` |
| `status` | `completed` |
| `version` | `2.0 (Detailed)` |

## Objetivo de la sesión

Estandarizar la carga de leads hacia Apps Script/Google Sheets, incorporando reglas de calidad de datos, formato de vehículo, asignación de sedes, y asignación de asesor basada en evidencia de carpetas de inventario en `Mercado libre`.

## Descubrimientos críticos

1. Persistencia actual en Apps Script:
- El endpoint disponible trabaja en modo append (inserta nuevas filas).
- No existe acción de actualización directa de `Nombre Asesor` por fila existente.
- Implicación: para corregir datos, se debe insertar una nueva tanda con el formato actualizado.

2. Fuentes de leads procesadas:
- `Leads/Leads_Estructurados_12-02-2026.txt`
- `Leads/Leads_WhatsApp_Estructurados.txt`
- En WhatsApp se detectaron teléfonos repetidos (caso `3197429847` en 3 leads distintos).

3. Reglas de normalización aplicadas:
- `Número telefónico`: eliminación de prefijo país `57` cuando aplica.
- `Sede`: `San patricio` para carros, `Santa barbara` para motos.
- `Fuente`: `Redes Sociales`.
- `Necesidad Principal` y `Siguiente paso`: `Interesado`.
- `Busca / Vende`: `carro` o `moto` según segmento.

4. Enriquecimiento de vehículo:
- Extracción de `Año modelo del vehículo` desde el texto del modelo.
- Formato estándar de `Serie del vehículo`: `Marca | Serie/Línea | Modelo`.
- `Observaciones`: texto corto de interés comercial (ej. “Interesado en ... modelo ...”).

5. Asignación de asesores:
- Modo cíclico por segmento (carros/motos) implementado para lotes generales.
- Modo por evidencia de inventario implementado (`Mercado libre/<asesor>/<vehiculo>`), con scoring por marca/modelo/año.
- Se añadieron overrides puntuales para casos ambiguos.

## Artefactos técnicos creados/actualizados

### Script principal
- `scripts/import_leads_txt_to_sheet.py`

### Capacidades incorporadas al script
- Parseo de múltiples formatos de TXT (con y sin ciudad).
- `--dry-run`, `--apply`, `--check-existing`, `--limit`.
- Carga a backend (`/api/v1/clientes`) o directo a Apps Script (`.../exec`).
- Asignación de asesor:
  - `--assign-advisors` (cíclica).
  - `--assign-advisors-from-mercado` (matching contra carpetas de inventario).

### Salidas de validación generadas
- `tmp/leads_payloads_2026-02-12.json`
- `tmp/leads_whatsapp_payloads.json`
- `tmp/leads_whatsapp_payloads_with_advisor.json`
- `tmp/import_leads_failures.json` (cuando hubo pruebas con fallo de red o DNS).

## Ejecuciones y cargas realizadas

1. Carga base de leads estructurados:
- Inserción de 26 leads del archivo estructurado.

2. Re-carga con reglas de normalización solicitadas:
- Inserción de 25 leads + 1 inserción manual para completar 26 con formato corregido.

3. Carga con distribución de asesores por segmento:
- Inserción de 26 leads con asesor cíclico.

4. Carga de leads WhatsApp con formato enriquecido (sin asesor):
- Inserción de 14 leads.

5. Carga de leads WhatsApp con asesor asignado desde `Mercado libre`:
- Inserción de 14 leads.

## Alertas operativas

- Dado que la API actual inserta filas nuevas, existen tandas históricas con versiones distintas del mismo teléfono.
- Para depuración definitiva (sin duplicados) se recomienda incorporar acción de actualización por teléfono + timestamp o llaves técnicas en Apps Script.

## Firma

Firmado por: `Codex (asistente técnico)`  
Proyecto: `Registro_clientes_87`  
Rama: `main`

