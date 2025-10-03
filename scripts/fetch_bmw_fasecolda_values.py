#!/usr/bin/env python3
"""Fetch suggested Fasecolda values for BMW vehicles (cars and motorcycles).

The script performs the following workflow:
1. Uses the public `busqueda` endpoint (no auth) to collect all codes that
   mention the requested search term (defaults to "BMW").
2. Authenticates against the protected Fasecolda API to obtain a bearer token.
3. Retrieves the detailed metadata and valuation history for the collected
   codes in batches, minimizing HTTP round-trips.
4. Normalises el histórico, conservando únicamente valores "USADO" dentro del
   rango de años solicitado (2010-2026 por defecto).
5. Writes two artefacts at the project root level:
   * `bmw_fasecolda_values.csv`: one row per reference, suitable for spreadsheets.
   * `bmw_fasecolda_values.json`: grouped by series for easier programmatic use.

Notes
-----
* Proporciona las credenciales del API mediante variables de entorno o
  argumentos CLI. Fasecolda expone credenciales en su bundle público y puede
  rotarlas sin aviso, así que maneja autentificación fallida con gracia.
* Monetary values are returned by the API in millions of COP (as per the public
  site). The script keeps the numeric values exactly as delivered in the API.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Sequence

import requests

# Project paths
ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_JSON_OUTPUT = ROOT_DIR / "bmw_fasecolda_values.json"
DEFAULT_CSV_OUTPUT = ROOT_DIR / "bmw_fasecolda_values.csv"

# API endpoints and credentials
BUSQUEDA_URL = "https://fasecoldaback.quantil.co/api/busqueda/{term}"
TOKEN_URL = "https://guiadevalores.fasecolda.com/apifasecolda/token"
DETAIL_URL = "https://guiadevalores.fasecolda.com/apifasecolda/api/listacodigosid/consultabycodigo/{codes}"

ENV_API_USERNAME = "FASECOLDA_API_USERNAME"
ENV_API_PASSWORD = "FASECOLDA_API_PASSWORD"

YEARS_RANGE_DEFAULT = "2010-2026"
MAX_CODES_PER_REQUEST = 20  # conservative chunk size used by the public webapp


@dataclass(frozen=True)
class ReferenceRecord:
    serie_label: str
    serie_key: str
    categoria: str
    tipologia: str
    clase: str
    codigo: str
    referencia: str
    valores: Dict[str, float | None]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--term",
        default="BMW",
        help="Termino a buscar en el endpoint publico de Fasecolda (por defecto BMW)",
    )
    parser.add_argument(
        "--years",
        default=YEARS_RANGE_DEFAULT,
        help="Rango de años a incluir en el reporte, en formato AAAA-AAAA (ej. 2010-2026)",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=MAX_CODES_PER_REQUEST,
        help="Cantidad de codigos solicitados por llamada al detalle (maximo recomendado 22)",
    )
    parser.add_argument(
        "--json-output",
        type=Path,
        default=DEFAULT_JSON_OUTPUT,
        help="Ruta del archivo JSON de salida",
    )
    parser.add_argument(
        "--csv-output",
        type=Path,
        default=DEFAULT_CSV_OUTPUT,
        help="Ruta del archivo CSV de salida",
    )
    parser.add_argument(
        "--api-username",
        help=(
            "Usuario del API de Fasecolda. Si se omite, se usa la variable de entorno "
            f"{ENV_API_USERNAME}."
        ),
    )
    parser.add_argument(
        "--api-password",
        help=(
            "Contraseña del API de Fasecolda. Si se omite, se usa la variable de entorno "
            f"{ENV_API_PASSWORD}."
        ),
    )
    return parser.parse_args()


def parse_years(year_range: str) -> List[str]:
    try:
        start_str, end_str = year_range.split("-")
        start = int(start_str)
        end = int(end_str)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(
            f"Formato invalido para --years: '{year_range}'. Use AAAA-AAAA"
        ) from exc
    if start > end:
        raise argparse.ArgumentTypeError("El año inicial debe ser menor o igual al final")
    return [str(year) for year in range(start, end + 1)]


def fetch_codes(session: requests.Session, term: str) -> List[str]:
    """Return the list of unique codes matched by the search term."""
    url = BUSQUEDA_URL.format(term=term)
    response = session.get(url, timeout=30)
    response.raise_for_status()
    payload = response.json()
    codes = payload.get("codigos", [])
    unique_codes = sorted(set(code for code in codes if code))
    if not unique_codes:
        raise RuntimeError(f"No se encontraron códigos para el término '{term}'.")
    return unique_codes


def get_api_token(session: requests.Session, username: str, password: str) -> str:
    payload = {
        "grant_type": "password",
        "username": username,
        "password": password,
    }
    response = session.post(TOKEN_URL, data=payload, timeout=30)
    response.raise_for_status()
    data = response.json()
    token = data.get("access_token")
    if not token:
        raise RuntimeError("No se pudo obtener el token de acceso de Fasecolda")
    return token


def chunked(sequence: Sequence[str], size: int) -> Iterable[Sequence[str]]:
    if size <= 0:
        raise ValueError("chunk size must be positive")
    for index in range(0, len(sequence), size):
        yield sequence[index : index + size]


def normalize_label(value: str) -> str:
    return "".join(char for char in value.upper() if char.isalnum())


def build_labels(item: dict) -> tuple[str, str]:
    marca = item.get("marca", "").strip()
    ref1 = item.get("referenciaUno", "").strip()
    ref2 = item.get("referenciaDos", "").strip()
    ref3 = item.get("referenciaTres", "").strip()
    serie_parts = [marca, ref1, ref2]
    serie_label = " ".join(part for part in serie_parts if part)
    full_parts = [marca, ref1, ref2, ref3]
    full_label = " ".join(part for part in full_parts if part).strip()
    if not serie_label:
        serie_label = full_label or marca or "BMW"
    return serie_label, full_label


def collect_reference_records(
    session: requests.Session,
    codes: List[str],
    token: str,
    years: List[str],
    chunk_size: int,
) -> List[ReferenceRecord]:
    headers = {"Authorization": f"Bearer {token}"}
    records: List[ReferenceRecord] = []
    missing_codes: List[str] = []

    for batch in chunked(codes, chunk_size):
        url = DETAIL_URL.format(codes=",".join(batch))
        response = session.get(url, headers=headers, timeout=60)
        if response.status_code == 401:
            raise RuntimeError("El token expiró durante la descarga; reintente la ejecución")
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, list):
            continue
        returned_codes = {item.get("codigo") for item in payload if item.get("codigo")}
        batch_missing = [code for code in batch if code not in returned_codes]
        missing_codes.extend(batch_missing)

        for item in payload:
            codigo = item.get("codigo")
            if not codigo:
                continue
            categoria = item.get("categoria", "")
            tipologia = item.get("tipologia", "")
            clase = item.get("clase", "")
            serie_label, full_label = build_labels(item)
            serie_key = normalize_label(f"{categoria} {serie_label}")

            valores = {year: None for year in years}
            for entry in item.get("valorModelo", []) or []:
                modelo = entry.get("modelo")
                estado = entry.get("estado", "").upper()
                if not modelo or estado != "USADO":
                    continue
                if modelo in valores:
                    valor = entry.get("valor")
                    if isinstance(valor, (int, float)) and not math.isnan(valor):
                        valores[modelo] = float(valor)
            records.append(
                ReferenceRecord(
                    serie_label=serie_label,
                    serie_key=serie_key,
                    categoria=categoria,
                    tipologia=tipologia,
                    clase=clase,
                    codigo=codigo,
                    referencia=full_label,
                    valores=valores,
                )
            )

        # be nice with the API
        time.sleep(0.2)

    if missing_codes:
        print(
            f"[WARN] {len(missing_codes)} códigos no devolvieron información: {', '.join(missing_codes[:10])}",
            file=sys.stderr,
        )
    return records


def build_series_structure(records: Iterable[ReferenceRecord]) -> List[dict]:
    series_map: Dict[str, dict] = {}
    for record in records:
        serie_entry = series_map.get(record.serie_key)
        if not serie_entry:
            serie_entry = {
                "serie": record.serie_label,
                "categoria": record.categoria,
                "tipologias": set(),
                "clases": set(),
                "referencias": [],
            }
            series_map[record.serie_key] = serie_entry
        serie_entry["tipologias"].add(record.tipologia)
        serie_entry["clases"].add(record.clase)
        serie_entry["referencias"].append(
            {
                "codigo": record.codigo,
                "referencia": record.referencia,
                "tipologia": record.tipologia,
                "clase": record.clase,
                "valores": record.valores,
            }
        )

    series_list = []
    for entry in series_map.values():
        series_list.append(
            {
                "serie": entry["serie"],
                "categoria": entry["categoria"],
                "tipologias": sorted(t for t in entry["tipologias"] if t),
                "clases": sorted(c for c in entry["clases"] if c),
                "referencias": sorted(
                    entry["referencias"], key=lambda ref: (ref["tipologia"], ref["referencia"])
                ),
            }
        )
    return sorted(series_list, key=lambda item: (item["categoria"], item["serie"].upper()))


def write_csv(records: Sequence[ReferenceRecord], years: Sequence[str], target: Path) -> None:
    fieldnames = [
        "serie",
        "categoria",
        "tipologia",
        "clase",
        "codigo",
        "referencia",
        *years,
    ]
    with target.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for record in sorted(
            records, key=lambda r: (r.categoria, r.serie_label.upper(), r.referencia.upper())
        ):
            row = {
                "serie": record.serie_label,
                "categoria": record.categoria,
                "tipologia": record.tipologia,
                "clase": record.clase,
                "codigo": record.codigo,
                "referencia": record.referencia,
            }
            for year in years:
                value = record.valores.get(year)
                row[year] = f"{value:.1f}" if isinstance(value, float) else ""
            writer.writerow(row)


def write_json(series: Sequence[dict], target: Path) -> None:
    serialisable = []
    for entry in series:
        serialisable.append(
            {
                "serie": entry["serie"],
                "categoria": entry["categoria"],
                "tipologias": entry["tipologias"],
                "clases": entry["clases"],
                "referencias": [
                    {
                        "codigo": ref["codigo"],
                        "referencia": ref["referencia"],
                        "tipologia": ref["tipologia"],
                        "clase": ref["clase"],
                        "valores": ref["valores"],
                    }
                    for ref in entry["referencias"]
                ],
            }
        )
    target.write_text(json.dumps(serialisable, indent=2, ensure_ascii=False), encoding="utf-8")


def main() -> None:
    args = parse_args()
    years = parse_years(args.years)
    chunk_size = args.chunk_size or MAX_CODES_PER_REQUEST
    chunk_size = min(max(chunk_size, 1), MAX_CODES_PER_REQUEST)

    api_username = args.api_username or os.environ.get(ENV_API_USERNAME)
    api_password = args.api_password or os.environ.get(ENV_API_PASSWORD)
    if not api_username or not api_password:
        raise SystemExit(
            "Credenciales del API faltantes. Define --api-username/--api-password o "
            f"las variables de entorno {ENV_API_USERNAME}/{ENV_API_PASSWORD}."
        )

    with requests.Session() as session:
        codes = fetch_codes(session, args.term)
        print(f"Códigos encontrados para '{args.term}': {len(codes)}")
        token = get_api_token(session, api_username, api_password)
        records = collect_reference_records(session, codes, token, years, chunk_size)
    print(f"Registros descargados: {len(records)}")

    if not records:
        raise SystemExit("No se obtuvieron registros; verifique el término buscado")

    series = build_series_structure(records)
    write_csv(records, years, args.csv_output)
    write_json(series, args.json_output)

    def to_relative(path: Path) -> str:
        try:
            return str(path.relative_to(ROOT_DIR))
        except ValueError:
            return str(path)

    print(f"CSV guardado en: {to_relative(args.csv_output)}")
    print(f"JSON guardado en: {to_relative(args.json_output)}")


if __name__ == "__main__":
    main()
