#!/usr/bin/env python3
"""
Importa leads desde un TXT estructurado y los envía a la API de clientes.

Uso rápido:
  python3 scripts/import_leads_txt_to_sheet.py --dry-run
  python3 scripts/import_leads_txt_to_sheet.py --apply --check-existing
"""

from __future__ import annotations

import argparse
import json
import re
import socket
import sys
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

CAR_ADVISORS = [
    "Jhon Rodriguez",
    "Juan Diego Duarte",
    "Martín Santamaría",
    "Johan Calderon",
    "Juan Pablo Martinez",
    "Juan Esteban Vargas",
]

MOTO_ADVISORS = [
    "Marco Loaiza",
    "Juan Sebastián Ortega",
    "Duber Bernal",
]

# Casos ambiguos donde forzamos asesor según criterio de negocio.
MODEL_ADVISOR_OVERRIDES = {
    "serie 4 420i sportline 2020": "Marco",
}

CAR_PATTERN = re.compile(
    r"¿Estas buscando un BMW o MINI COOPER\?:\s*(?P<q1>.*?)\s*"
    r"¿Para cuando tienes proyectada tu compra\?:\s*(?P<q2>.*?)\s*"
    r"¿Qué modelo y serie buscas\?:\s*(?P<q3>.*?)\s*"
    r"Email:\s*(?P<email>.*?)\s*"
    r"Full name:\s*(?P<name>.*?)\s*"
    r"Phone number:\s*(?P<phone>.*?)\s*"
    r"(?:City:\s*(?P<city>.*)\s*)?$",
    flags=re.IGNORECASE,
)

MOTO_PATTERN = re.compile(
    r"¿Estas buscando moto de alto cilindraje\?:\s*(?P<q1>.*?)\s*"
    r"¿Para cuando tienes proyectada la compra\?:\s*(?P<q2>.*?)\s*"
    r"¿Qué modelo y series buscas\?:\s*(?P<q3>.*?)\s*"
    r"Email:\s*(?P<email>.*?)\s*"
    r"Full name:\s*(?P<name>.*?)\s*"
    r"Phone number:\s*(?P<phone>.*?)\s*"
    r"(?:City:\s*(?P<city>.*)\s*)?$",
    flags=re.IGNORECASE,
)

LEAD_SPLIT_PATTERN = re.compile(r"\bLead\s+\d+\s+", flags=re.IGNORECASE)
SEP_PATTERN = re.compile(r"[—-]{5,}")


@dataclass
class ParsedLead:
    segmento: str
    respuesta_1: str
    ventana_compra: str
    modelo_serie: str
    email: str
    nombre: str
    telefono: str
    ciudad: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Importador de leads TXT -> API clientes")
    parser.add_argument(
        "--input",
        default="Leads_Estructurados_12-02-2026.txt",
        help="Ruta del TXT con leads estructurados",
    )
    parser.add_argument(
        "--base-url",
        default="",
        help="Base URL del backend (ej. https://backend-registro87.onrender.com)",
    )
    parser.add_argument(
        "--api-key",
        default="",
        help="API key para header api-key/api_key (opcional si backend no la exige)",
    )
    parser.add_argument(
        "--source-label",
        default="Redes Sociales",
        help="Texto para la columna Fuente",
    )
    parser.add_argument(
        "--asesor",
        default="",
        help="Valor para Nombre Asesor",
    )
    parser.add_argument(
        "--assign-advisors",
        action="store_true",
        help="Asigna asesores de forma cíclica por segmento (carros/motos)",
    )
    parser.add_argument(
        "--assign-advisors-from-mercado",
        action="store_true",
        help='Asigna asesor por mejor match contra carpetas en "Mercado libre/<asesor>/<vehiculo>"',
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Solo muestra payloads, no inserta",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Ejecuta inserción real en API",
    )
    parser.add_argument(
        "--check-existing",
        action="store_true",
        help="Consulta por teléfono antes de insertar para evitar duplicados",
    )
    parser.add_argument(
        "--output-json",
        default="",
        help="Ruta opcional para guardar payloads generados",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=20,
        help="Timeout HTTP en segundos",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Procesa solo los primeros N leads (0 = todos)",
    )
    return parser.parse_args()


def load_app_config_defaults() -> tuple[str, str]:
    app_config = Path("app-config.js")
    if not app_config.exists():
        return "", ""
    content = app_config.read_text(encoding="utf-8", errors="ignore")
    base_match = re.search(r"BASE_URL:\s*'([^']+)'", content)
    key_match = re.search(r"API_KEY:\s*'([^']+)'", content)
    base = base_match.group(1).strip() if base_match else ""
    api_key = key_match.group(1).strip() if key_match else ""
    return base, api_key


def normalize_text(raw: str) -> str:
    clean_lines = [line.strip() for line in raw.replace("\ufeff", "").splitlines() if line.strip()]
    return " ".join(clean_lines)


def split_leads(normalized_text: str) -> list[str]:
    chunks = LEAD_SPLIT_PATTERN.split(normalized_text)
    result: list[str] = []
    for chunk in chunks[1:]:
        compact = SEP_PATTERN.split(chunk, maxsplit=1)[0].strip()
        if compact:
            result.append(compact)
    return result


def clean_phone(phone_raw: str) -> str:
    return re.sub(r"\D", "", phone_raw or "")


def normalize_target_phone(phone_raw: str) -> str:
    """
    Quita prefijo país 57 cuando venga al inicio.
    """
    digits = clean_phone(phone_raw)
    if digits.startswith("57") and len(digits) > 10:
        return digits[2:]
    return digits


def normalize_for_match(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value or "")
    without_accents = "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")
    lowered = without_accents.lower()
    cleaned = re.sub(r"[^a-z0-9]+", " ", lowered)
    return " ".join(cleaned.split())


def extract_match_tokens(model_text: str) -> list[str]:
    stop = {
        "de",
        "la",
        "el",
        "del",
        "y",
        "version",
        "paquete",
        "paq",
        "at",
        "linea",
        "modelo",
        "edition",
        "hibrido",
        "hibrida",
        "enchufable",
    }
    raw_tokens = [
        token
        for token in normalize_for_match(model_text).split()
        if len(token) >= 2 and token not in stop
    ]
    filtered: list[str] = []
    for token in raw_tokens:
        # Evita ruido de tokens solo numéricos cortos (ej. "20" de "2.0")
        if token.isdigit() and len(token) < 3:
            continue
        filtered.append(token)
    return filtered


def load_mercado_vehicle_dirs(base_path: Path) -> list[tuple[str, str]]:
    entries: list[tuple[str, str]] = []
    if not base_path.exists():
        return entries
    for advisor_dir in sorted(base_path.iterdir()):
        if not advisor_dir.is_dir():
            continue
        for vehicle_dir in sorted(advisor_dir.iterdir()):
            if vehicle_dir.is_dir():
                entries.append((advisor_dir.name, vehicle_dir.name))
    return entries


def choose_advisor_from_mercado(lead: ParsedLead, market_entries: list[tuple[str, str]]) -> str:
    if not market_entries:
        return ""

    model = lead.modelo_serie
    model_key = normalize_for_match(model)
    if model_key in MODEL_ADVISOR_OVERRIDES:
        return MODEL_ADVISOR_OVERRIDES[model_key]
    year_match = re.findall(r"\b(19\d{2}|20\d{2})\b", model)
    year = year_match[-1] if year_match else ""
    tokens = extract_match_tokens(model)
    lead_yearless_model = re.sub(r"\b(19\d{2}|20\d{2})\b", "", model)
    lead_yearless_model = " ".join(lead_yearless_model.split())
    lead_brand = normalize_brand(lead.respuesta_1, lead_yearless_model)
    lead_brand_token = normalize_for_match(lead_brand)

    best_score = -999
    best_hits = -1
    best_advisor = ""

    for advisor, vehicle_name in market_entries:
        normalized_vehicle = normalize_for_match(vehicle_name)
        vehicle_words = set(normalized_vehicle.split())
        vehicle_years = re.findall(r"\b(19\d{2}|20\d{2})\b", normalized_vehicle)

        score = 0
        hits = 0

        if year and year in normalized_vehicle:
            score += 8
        elif year and vehicle_years:
            score -= 2

        if lead_brand_token and lead_brand_token in normalized_vehicle:
            score += 4

        for token in tokens:
            is_code_token = (
                len(token) >= 3
                and re.search(r"[a-z]", token) is not None
                and re.search(r"\d", token) is not None
            )
            exact_weight = 5 if is_code_token else 3
            partial_weight = 2 if is_code_token else 1
            if token in vehicle_words:
                score += exact_weight
                hits += 1
            elif len(token) >= 4 and token in normalized_vehicle:
                score += partial_weight
                hits += 1

        if score > best_score or (score == best_score and hits > best_hits):
            best_score = score
            best_hits = hits
            best_advisor = advisor

    # Umbral mínimo para evitar asignaciones sin relación.
    if best_score < 8:
        return ""
    return best_advisor


def parse_chunk(chunk: str) -> ParsedLead:
    car = CAR_PATTERN.match(chunk)
    if car:
        data = car.groupdict()
        return ParsedLead(
            segmento="Carros",
            respuesta_1=data["q1"].strip(),
            ventana_compra=data["q2"].strip(),
            modelo_serie=data["q3"].strip(),
            email=data["email"].strip(),
            nombre=data["name"].strip(),
            telefono=clean_phone(data["phone"]),
            ciudad=(data.get("city") or "").strip(),
        )

    moto = MOTO_PATTERN.match(chunk)
    if moto:
        data = moto.groupdict()
        return ParsedLead(
            segmento="Motos",
            respuesta_1=data["q1"].strip(),
            ventana_compra=data["q2"].strip(),
            modelo_serie=data["q3"].strip(),
            email=data["email"].strip(),
            nombre=data["name"].strip(),
            telefono=clean_phone(data["phone"]),
            ciudad=(data.get("city") or "").strip(),
        )

    raise ValueError(f"No se pudo interpretar lead: {chunk[:160]}...")


def extract_year_and_model(modelo_serie: str) -> tuple[str, str]:
    cleaned = " ".join((modelo_serie or "").split())
    years = re.findall(r"\b(19\d{2}|20\d{2})\b", cleaned)
    year = years[-1] if years else ""
    model_without_year = re.sub(r"\b(19\d{2}|20\d{2})\b", "", cleaned)
    model_without_year = " ".join(model_without_year.split()).strip(" -|")
    return year, model_without_year


def normalize_brand(raw_brand: str, model_without_year: str) -> str:
    candidate = (raw_brand or "").strip()
    if not candidate or candidate.lower() in {"si", "sí", "yes"}:
        first_token = (model_without_year.split(" ", 1)[0] if model_without_year else "").strip()
        candidate = first_token

    normalized = candidate.upper().replace(".", "").replace("_", " ").strip()
    mapping = {
        "BMW": "BMW",
        "MINI": "MINI",
        "MINI COOPER": "MINI",
        "MERCEDES BENZ": "Mercedes-Benz",
        "MERCEDES-BENZ": "Mercedes-Benz",
        "DUCATI": "Ducati",
        "HONDA": "Honda",
        "SUZUKI": "Suzuki",
    }
    if normalized in mapping:
        return mapping[normalized]

    if "-" in candidate:
        parts = [p.capitalize() for p in candidate.split("-") if p]
        return "-".join(parts)
    return candidate.title() if candidate else "Marca no definida"


def bmw_series_label(model_without_year: str) -> str:
    upper = model_without_year.upper()
    if re.match(r"^X\d", upper):
        return "Serie X (SUVs)"
    if upper.startswith("SERIE"):
        match = re.match(r"^SERIE\s*([A-Z0-9]+)", upper)
        if match:
            return f"Serie {match.group(1)}"
    if re.match(r"^I\d", upper) or upper.startswith("IX"):
        return "Serie i (Eléctricos)"
    if re.match(r"^M\d", upper):
        return "Serie M (Performance)"
    return "Serie BMW"


def generic_series_label(brand: str, model_without_year: str, segmento: str) -> str:
    model = model_without_year.strip()
    if not model:
        return "Serie"

    if brand == "BMW":
        return bmw_series_label(model)
    if brand == "MINI":
        return "Serie Cooper" if "cooper" in model.lower() else "Serie MINI"
    if brand == "Mercedes-Benz":
        m = re.match(r"^(Clase\s*[A-Z0-9]+)", model, flags=re.IGNORECASE)
        return f"Serie {m.group(1)}" if m else "Serie Mercedes-Benz"

    if segmento == "Motos":
        clean = model
        if clean.lower().startswith(brand.lower() + " "):
            clean = clean[len(brand) + 1 :].strip()
        if clean.lower().startswith("africa twin"):
            return "Línea Africa Twin"
        token = clean.split(" ", 1)[0] if clean else "Motos"
        return f"Línea {token}"

    if model.lower().startswith("clase "):
        return f"Serie {' '.join(model.split()[:2])}"
    return f"Serie {model.split(' ', 1)[0]}"


def format_vehicle_series(brand: str, series_label: str, model_without_year: str) -> str:
    model_part = model_without_year or "Modelo no especificado"
    return f"{brand} | {series_label} | {model_part}"


def short_interest_observation(brand: str, model_without_year: str, year: str) -> str:
    vehicle = model_without_year
    if vehicle and not vehicle.lower().startswith(brand.lower()):
        vehicle = f"{brand} {vehicle}"
    elif not vehicle:
        vehicle = brand
    if year:
        return f"Interesado en {vehicle} modelo {year}."
    return f"Interesado en {vehicle}."


def build_payload(lead: ParsedLead, source_label: str, asesor: str) -> dict[str, Any]:
    is_car = lead.segmento == "Carros"
    sede_fija = "San patricio" if is_car else "Santa barbara"
    tipo = "carro" if is_car else "moto"
    year, model_without_year = extract_year_and_model(lead.modelo_serie)
    brand = normalize_brand(lead.respuesta_1, model_without_year)
    series_label = generic_series_label(brand, model_without_year, lead.segmento)
    formatted_series = format_vehicle_series(brand, series_label, model_without_year)
    observation = short_interest_observation(brand, model_without_year, year)

    return {
        "fechaHora": "",
        "sede": sede_fija,
        "asesor": asesor,
        "fuente": source_label,
        "clienteNombre": lead.nombre,
        "clienteTelefono": normalize_target_phone(lead.telefono),
        "clienteCedula": "",
        "necesidad": "Interesado",
        "tipoVehiculo": tipo,
        "anioModeloVehiculo": year,
        "serieVehiculo": formatted_series,
        "presupuesto": "",
        "siguientePaso": "Interesado",
        "observaciones": observation,
        "observaciones2": "",
    }


def choose_advisor(lead: ParsedLead, counters: dict[str, int]) -> str:
    if lead.segmento == "Carros":
        idx = counters["carros"] % len(CAR_ADVISORS)
        counters["carros"] += 1
        return CAR_ADVISORS[idx]
    idx = counters["motos"] % len(MOTO_ADVISORS)
    counters["motos"] += 1
    return MOTO_ADVISORS[idx]


def to_json_bytes(data: dict[str, Any]) -> bytes:
    return json.dumps(data, ensure_ascii=False).encode("utf-8")


def request_json(
    method: str,
    url: str,
    timeout: int,
    *,
    headers: dict[str, str] | None = None,
    payload: dict[str, Any] | None = None,
) -> tuple[int, dict[str, Any] | str]:
    req_headers = headers.copy() if headers else {}
    body = None
    if payload is not None:
        body = to_json_bytes(payload)
        req_headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url=url, method=method, headers=req_headers, data=body)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            raw = response.read().decode("utf-8", errors="ignore")
            status = int(response.status)
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="ignore")
        status = int(exc.code)
    except (urllib.error.URLError, TimeoutError, socket.timeout) as exc:
        return 0, {"error": f"Network error: {exc}"}
    try:
        return status, json.loads(raw)
    except json.JSONDecodeError:
        return status, raw


def is_google_script_url(base_url: str) -> bool:
    normalized = base_url.strip().lower()
    return "script.google.com/macros/" in normalized and normalized.endswith("/exec")


def has_existing_record(
    base_url: str,
    phone: str,
    api_key: str,
    timeout: int,
) -> bool:
    if not phone:
        return False

    if is_google_script_url(base_url):
        query_url = f"{base_url.rstrip('/')}?{urllib.parse.urlencode({'telefono': phone})}"
    else:
        query_url = f"{base_url.rstrip('/')}/api/v1/clientes?{urllib.parse.urlencode({'telefono': phone})}"

    headers = {}
    if api_key:
        headers["api_key"] = api_key
        headers["api-key"] = api_key
    status, payload = request_json("GET", query_url, timeout, headers=headers)
    if status != 200 or not isinstance(payload, dict):
        return False
    if payload.get("success") is False:
        return False
    if payload.get("data"):
        return True
    expected_key = "Número telefónico"
    return expected_key in payload


def main() -> int:
    args = parse_args()
    if args.apply and args.dry_run:
        print("No combines --apply y --dry-run.", file=sys.stderr)
        return 2
    if not args.apply and not args.dry_run:
        args.dry_run = True

    base_default, key_default = load_app_config_defaults()
    base_url = args.base_url.strip() or base_default
    api_key = args.api_key.strip() or key_default

    if args.apply and not base_url:
        print("Falta base URL. Usa --base-url o define APP_CONFIG.BASE_URL.", file=sys.stderr)
        return 2

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"No existe el archivo: {input_path}", file=sys.stderr)
        return 2

    normalized = normalize_text(input_path.read_text(encoding="utf-8", errors="ignore"))
    chunks = split_leads(normalized)
    parsed_leads: list[ParsedLead] = []
    errors: list[str] = []

    for idx, chunk in enumerate(chunks, start=1):
        try:
            parsed_leads.append(parse_chunk(chunk))
        except ValueError as exc:
            errors.append(f"Lead {idx}: {exc}")

    if errors:
        print("Errores de parseo:", file=sys.stderr)
        for err in errors:
            print(f"- {err}", file=sys.stderr)
        return 1

    counters = {"carros": 0, "motos": 0}
    mercado_entries = []
    if args.assign_advisors_from_mercado:
        mercado_entries = load_mercado_vehicle_dirs(Path("Mercado libre"))
        if not mercado_entries:
            print('No se encontraron carpetas de vehículos en "Mercado libre".')
    payloads = []
    for lead in parsed_leads:
        if args.assign_advisors_from_mercado:
            assigned = choose_advisor_from_mercado(lead, mercado_entries)
        elif args.assign_advisors:
            assigned = choose_advisor(lead, counters)
        else:
            assigned = args.asesor
        payloads.append(build_payload(lead, args.source_label, assigned))
    if args.limit and args.limit > 0:
        payloads = payloads[: args.limit]

    seen_phones: set[str] = set()
    duplicate_phones: set[str] = set()
    for payload in payloads:
        phone = payload["clienteTelefono"]
        if phone in seen_phones:
            duplicate_phones.add(phone)
        seen_phones.add(phone)

    print(f"Leads parseados: {len(parsed_leads)}")
    print(f"Teléfonos únicos: {len(seen_phones)}")
    if duplicate_phones:
        print(f"Teléfonos duplicados en archivo: {sorted(duplicate_phones)}")

    if args.output_json:
        out_path = Path(args.output_json)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(payloads, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Payloads guardados en: {out_path}")

    if args.dry_run:
        preview_count = min(3, len(payloads))
        print(f"Modo simulación. Muestra de {preview_count} payloads:")
        print(json.dumps(payloads[:preview_count], ensure_ascii=False, indent=2))
        return 0

    headers = {}
    if api_key:
        headers["api-key"] = api_key
        headers["api_key"] = api_key

    if is_google_script_url(base_url):
        endpoint = base_url.rstrip("/")
    else:
        endpoint = f"{base_url.rstrip('/')}/api/v1/clientes"
    inserted = 0
    skipped = 0
    failed: list[dict[str, Any]] = []

    for idx, payload in enumerate(payloads, start=1):
        phone = payload.get("clienteTelefono", "")
        if args.check_existing and has_existing_record(base_url, phone, api_key, args.timeout):
            skipped += 1
            print(f"[{idx}/{len(payloads)}] SKIP teléfono existente: {phone}")
            continue

        status, response_payload = request_json(
            "POST",
            endpoint,
            args.timeout,
            headers=headers,
            payload=payload,
        )

        if status in (200, 201):
            inserted += 1
            print(f"[{idx}/{len(payloads)}] OK {phone}")
        else:
            failed.append(
                {
                    "index": idx,
                    "phone": phone,
                    "status": status,
                    "response": response_payload,
                    "payload": payload,
                }
            )
            print(f"[{idx}/{len(payloads)}] FAIL {phone} status={status}")

    print("")
    print("Resumen importación")
    print(f"- Insertados: {inserted}")
    print(f"- Omitidos (existentes): {skipped}")
    print(f"- Fallidos: {len(failed)}")

    if failed:
        fail_path = Path("tmp/import_leads_failures.json")
        fail_path.parent.mkdir(parents=True, exist_ok=True)
        fail_path.write_text(json.dumps(failed, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"- Detalle de fallos: {fail_path}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
