#!/usr/bin/env python3
"""Scrape BMW Motorrad references from Fasecolda and download images.

Steps carried out:
1. Parse `Registro-clientes-87.html` to read the BMW Motorrad catalog in the order
   used by the registration form.
2. Authenticate against the public API used by fasecolda.com in order to obtain
   detailed records for motorcycle references.
3. For each catalog reference, match it with the API result (when available),
   capture metadata, and download the first available image to `imagenes_motos/`
   preserving the catalog order.
4. Generate `bmw_motorrad_referencias.csv` and `bmw_motorrad_referencias.json`
   with the structured data of the successfully matched references.

The script logs any catalog references that could not be matched or did not have
images in the API so the user can review potential gaps.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Sequence

import requests

# Constants for local project structure
ROOT_DIR = Path(__file__).resolve().parent.parent
HTML_CATALOG = ROOT_DIR / "Registro-clientes-87.html"
IMAGES_DIR = ROOT_DIR / "imagenes_motos"
CSV_OUTPUT = ROOT_DIR / "bmw_motorrad_referencias.csv"
JSON_OUTPUT = ROOT_DIR / "bmw_motorrad_referencias.json"

# API endpoints and configuration
TOKEN_URL = "https://guiadevalores.fasecolda.com/apifasecolda/token"
API_BASE_URL = "https://guiadevalores.fasecolda.com/apifasecolda/api"
PHOTO_BASE_URL = "https://guiadevalores.fasecolda.com/ConsultaFotos/"
TIPOLOGIA_IDS = list(range(16, 24))  # Tipologías asociadas a la categoría Motos

# Credentials are exposed in the public bundle served by fasecolda.com.
API_USERNAME = "cristian.vasquez@quantil.com.co"
API_PASSWORD = "eBGT6$tYU"


@dataclass
class CatalogEntry:
    order: int
    label: str

    @property
    def normalized(self) -> str:
        return normalize_label(self.label)


@dataclass
class ApiEntry:
    label: str
    data: dict

    @property
    def codigo(self) -> str:
        return self.data.get("codigo")

    @property
    def categoria(self) -> str:
        return self.data.get("categoria", "")

    @property
    def marca(self) -> str:
        return self.data.get("marca", "")

    @property
    def tipologia(self) -> str:
        return self.data.get("tipologia", "")

    @property
    def foto_nombre(self) -> str | None:
        fotos = self.data.get("codigoFoto") or []
        if not fotos:
            return None
        return fotos[0].get("nombre")

    def to_record(
        self,
        order: int,
        slug: str,
        photo_path: Path | None,
        downloaded: bool,
        image_url: str | None,
    ) -> dict:
        referencia_uno = self.data.get("referenciaUno", "")
        referencia_dos = self.data.get("referenciaDos", "")
        referencia_tres = self.data.get("referenciaTres", "")
        return {
            "order": order,
            "catalog_label": self.label,
            "marca": self.marca,
            "categoria": self.categoria,
            "tipologia": self.tipologia,
            "codigo": self.codigo,
            "referencia_uno": referencia_uno,
            "referencia_dos": referencia_dos,
            "referencia_tres": referencia_tres,
            "image_filename": photo_path.name if photo_path else "",
            "image_path": str(photo_path) if photo_path else "",
            "image_slug": slug,
            "image_url": image_url or "",
            "image_downloaded": downloaded,
        }


def read_catalog_models(html_path: Path) -> List[CatalogEntry]:
    """Extract BMW Motorrad models preserving the order defined in the catalog."""
    content = html_path.read_text(encoding="utf-8")
    key = "bmwMotorrad:"
    try:
        start = content.index(key)
    except ValueError as exc:  # pragma: no cover - defensive guard
        raise RuntimeError("No se encontró el bloque bmwMotorrad en el HTML") from exc

    # Locate the full object scope by matching braces
    brace_start = content.index("{", start)
    depth = 1
    pos = brace_start + 1
    while depth > 0 and pos < len(content):
        char = content[pos]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
        pos += 1
    block = content[brace_start:pos]

    entries: List[CatalogEntry] = []
    idx = 0
    order = 1
    while True:
        modelos_idx = block.find("modelos:", idx)
        if modelos_idx == -1:
            break
        idx = block.find("[", modelos_idx)
        if idx == -1:
            break
        idx += 1
        depth = 1
        inside_string = False
        current = []
        while idx < len(block) and depth > 0:
            ch = block[idx]
            if inside_string:
                if ch == "'":
                    inside_string = False
                    label = "".join(current).strip()
                    if label:
                        entries.append(CatalogEntry(order=order, label=label))
                        order += 1
                    current = []
                else:
                    current.append(ch)
            else:
                if ch == "'":
                    inside_string = True
                elif ch == "[":
                    depth += 1
                elif ch == "]":
                    depth -= 1
            idx += 1
        # continue searching from current position
    return entries


def slugify(value: str, max_len: int = 80) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = value.strip("-")
    if max_len and len(value) > max_len:
        value = value[:max_len].rstrip("-")
    return value or "reference"


def normalize_label(value: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", value.upper())


def get_api_token(session: requests.Session) -> str:
    payload = {
        "grant_type": "password",
        "username": API_USERNAME,
        "password": API_PASSWORD,
    }
    response = session.post(TOKEN_URL, data=payload, timeout=30)
    response.raise_for_status()
    return response.json()["access_token"]


def fetch_bmw_api_entries(session: requests.Session, token: str) -> Dict[str, ApiEntry]:
    headers = {"Authorization": f"Bearer {token}"}
    entries: Dict[str, ApiEntry] = {}
    for tipologia_id in TIPOLOGIA_IDS:
        params = {
            "CategoriaId": 3,
            "EstadoId": 1,
            "PageSize": 500,
            "TipologiaId": tipologia_id,
        }
        response = session.get(
            f"{API_BASE_URL}/avanzada/getbusquedaavanzada/",
            params=params,
            headers=headers,
            timeout=60,
        )
        response.raise_for_status()
        items = response.json().get("items", [])
        for item in items:
            if item.get("marca") != "BMW":
                continue
            label_parts = [
                item.get("marca"),
                item.get("referenciaUno"),
                item.get("referenciaDos"),
                item.get("referenciaTres"),
            ]
            label = " ".join(part.strip() for part in label_parts if part and part.strip())
            normalized = normalize_label(label)
            # Avoid overwriting existing entries when duplicates appear; keep the first occurrence
            entries.setdefault(normalized, ApiEntry(label=label, data=item))
    return entries


def download_image(session: requests.Session, filename: str, target_path: Path) -> None:
    url = f"{PHOTO_BASE_URL}{filename}"
    response = session.get(url, timeout=60)
    response.raise_for_status()
    target_path.write_bytes(response.content)


def write_outputs(records: Sequence[dict]) -> None:
    # CSV output
    with CSV_OUTPUT.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=list(records[0].keys()))
        writer.writeheader()
        writer.writerows(records)
    # JSON output
    JSON_OUTPUT.write_text(json.dumps(records, indent=2, ensure_ascii=False), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Descarga metadatos e imágenes de la línea BMW Motorrad desde fasecolda.com"
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=None,
        help=(
            "Cantidad de referencias por lote de descarga. Si se omite, se intenta descargar todo en una sola ejecución."
        ),
    )
    parser.add_argument(
        "--chunk-index",
        type=int,
        default=0,
        help="Índice (basado en cero) del lote a descargar cuando se usa --chunk-size.",
    )
    parser.add_argument(
        "--skip-download",
        action="store_true",
        help="Genera los archivos de metadatos sin descargar imágenes.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.chunk_size is not None and args.chunk_size <= 0:
        raise SystemExit("--chunk-size debe ser un entero positivo")
    if args.chunk_index < 0:
        raise SystemExit("--chunk-index no puede ser negativo")

    catalog_entries = read_catalog_models(HTML_CATALOG)
    print(f"Referencias catalogadas: {len(catalog_entries)}")

    chunk_start = None
    chunk_end = None
    if args.chunk_size is not None:
        chunk_start = args.chunk_size * args.chunk_index
        chunk_end = chunk_start + args.chunk_size
        print(
            f"Descargando lote {args.chunk_index} (índices {chunk_start + 1} a {min(chunk_end, len(catalog_entries))})"
        )

    with requests.Session() as session:
        token = get_api_token(session)
        api_entries = fetch_bmw_api_entries(session, token)
        print(f"Registros BMW obtenidos del API: {len(api_entries)}")

        IMAGES_DIR.mkdir(exist_ok=True)

        records: List[dict] = []
        missing: List[CatalogEntry] = []
        without_image: List[CatalogEntry] = []
        download_jobs: List[tuple[str, Path, CatalogEntry]] = []
        record_by_path: Dict[Path, dict] = {}
        pending_downloads: List[CatalogEntry] = []

        for entry in catalog_entries:
            api_entry = api_entries.get(entry.normalized)
            if not api_entry:
                missing.append(entry)
                continue
            foto_nombre = api_entry.foto_nombre
            slug = slugify(entry.label)
            photo_path = None
            if foto_nombre:
                photo_filename = f"{entry.order:03d}_{slug}.jpg"
                photo_path = IMAGES_DIR / photo_filename
                already_downloaded = photo_path.exists()
                image_url = f"{PHOTO_BASE_URL}{foto_nombre}"
                should_download = (
                    not args.skip_download
                    and not already_downloaded
                    and (chunk_start is None or chunk_start <= entry.order - 1 < chunk_end)
                )
                if should_download:
                    download_jobs.append((foto_nombre, photo_path, entry))
                elif not already_downloaded and not args.skip_download:
                    pending_downloads.append(entry)
            else:
                without_image.append(entry)
                image_url = ""
                already_downloaded = False
            record = api_entry.to_record(
                entry.order,
                slug,
                photo_path,
                downloaded=photo_path.exists() if photo_path else False,
                image_url=image_url,
            )
            if photo_path is not None:
                record_by_path[photo_path] = record
            records.append(record)

        failed_downloads: List[tuple[CatalogEntry, Exception]] = []
        if download_jobs:
            with ThreadPoolExecutor(max_workers=8) as executor:
                futures = {
                    executor.submit(download_image, session, filename, path): (filename, path, entry)
                    for filename, path, entry in download_jobs
                }
                for future in as_completed(futures):
                    filename, path, entry = futures[future]
                    try:
                        future.result()
                        record = record_by_path.get(path)
                        if record:
                            record["image_downloaded"] = True
                    except Exception as exc:  # pragma: no cover - log and continue
                        failed_downloads.append((entry, exc))
                        without_image.append(entry)
                        record = record_by_path.get(path)
                        if record:
                            record["image_filename"] = ""
                            record["image_path"] = ""
                            record["image_downloaded"] = False
                        print(f"[WARN] Falló la descarga de {filename} ({entry.label}): {exc}")

        if pending_downloads:
            print(
                f"Pendientes por descargar en otras ejecuciones ({len(pending_downloads)}). Usa más lotes para completarlas."
            )

        if records:
            write_outputs(records)
            print(
                f"Se guardaron {len(records)} registros con datos en {CSV_OUTPUT.name} y {JSON_OUTPUT.name}."
            )
        else:
            print("No se generaron registros; verifica el catálogo o el API.")

        if missing:
            print(f"Referencias sin coincidencia en el API ({len(missing)}):")
            for entry in missing:
                print(f"  - {entry.order:03d}: {entry.label}")
        if without_image:
            print(f"Referencias sin imagen descargable ({len(without_image)}).")


if __name__ == "__main__":
    main()
