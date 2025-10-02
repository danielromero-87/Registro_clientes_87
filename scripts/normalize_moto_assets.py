#!/usr/bin/env python3
"""Normalize BMW Motorrad image assets and metadata.

This utility updates `imagenes_motos/` filenames to match their actual
content type, removes legacy numeric prefixes, and refreshes the
`bmw_motorrad_referencias` JSON/CSV records so they point to the
normalized assets.
"""

from __future__ import annotations

import csv
import imghdr
import json
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence

ROOT_DIR = Path(__file__).resolve().parent.parent
IMAGES_DIR = ROOT_DIR / "imagenes_motos"
JSON_PATH = ROOT_DIR / "bmw_motorrad_referencias.json"
CSV_PATH = ROOT_DIR / "bmw_motorrad_referencias.csv"

IMAGE_TYPE_EXT = {
    "jpeg": ".jpg",
    "png": ".png",
    "webp": ".webp",
}

LEGACY_PREFIX_PATTERN = re.compile(r"^(\d{3})[_-]+(.+)$")
ALLOWED_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp")


def slugify(value: str, max_len: int = 120) -> str:
    base = normalize_text(value)
    slug = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
    if max_len and len(slug) > max_len:
        slug = slug[:max_len].rstrip("-")
    return slug or "reference"


def normalize_text(value: str) -> str:
    if not value:
        return ""
    normalized = unicodedata.normalize("NFD", value)
    ascii_chars = [ch for ch in normalized if unicodedata.category(ch) != "Mn"]
    return "".join(ascii_chars).lower()


def normalize_key(value: str) -> str:
    ascii_value = normalize_text(value)
    return re.sub(r"[^a-z0-9]", "", ascii_value)


def detect_extension(path: Path) -> str:
    detected = imghdr.what(path)
    if detected:
        return IMAGE_TYPE_EXT.get(detected, f".{detected}")
    suffix = path.suffix.lower()
    if suffix in ALLOWED_EXTENSIONS:
        return ".jpg" if suffix == ".jpeg" else suffix
    return ".jpg"


def build_asset_index(paths: Iterable[Path]) -> Dict[str, List[Path]]:
    index: Dict[str, List[Path]] = {}
    for path in paths:
        if not path.is_file():
            continue
        stem = path.stem
        legacy_match = LEGACY_PREFIX_PATTERN.match(stem)
        if legacy_match:
            stem = legacy_match.group(2)
        key = normalize_key(stem)
        index.setdefault(key, []).append(path)
    return index


def find_asset_for_record(record: dict, index: Dict[str, List[Path]]) -> Optional[Path]:
    candidates: List[str] = []
    slug = record.get("image_slug")
    if slug:
        candidates.extend([slug, slug.replace("_", "-"), slug.replace("-", "")])
    filename = record.get("image_filename", "")
    if filename:
        stem = Path(filename).stem
        candidates.append(stem)
    catalog_label = record.get("catalog_label")
    if catalog_label:
        candidates.append(catalog_label)
    label_with_spaces = catalog_label.replace("/", " ") if catalog_label else ""
    if label_with_spaces and label_with_spaces not in candidates:
        candidates.append(label_with_spaces)

    composed = " ".join(
        part for part in (
            record.get("marca"),
            record.get("referencia_uno"),
            record.get("referencia_dos"),
            record.get("referencia_tres"),
        )
        if part
    )
    if composed:
        candidates.append(composed)

    # Also consider slugified variations of the composed label
    for value in list(candidates):
        if not value:
            continue
        slug_candidate = slugify(value)
        if slug_candidate and slug_candidate not in candidates:
            candidates.append(slug_candidate)

    seen_keys = set()
    for candidate in candidates:
        if not candidate:
            continue
        key = normalize_key(candidate)
        if not key or key in seen_keys:
            continue
        seen_keys.add(key)
        matches = index.get(key)
        if not matches:
            continue
        if len(matches) == 1:
            return matches[0]
        # Prefer exact stem match when multiple files share the normalized key
        for path in matches:
            if normalize_key(path.stem) == key:
                return path
    return None


def rename_asset(path: Path, desired_stem: str, extension: str) -> Path:
    base_stem = desired_stem or path.stem
    target = IMAGES_DIR / f"{base_stem}{extension}"

    if target.exists() and target != path:
        if target.read_bytes() == path.read_bytes():
            path.unlink(missing_ok=True)
            return target
        counter = 1
        while True:
            candidate = IMAGES_DIR / f"{base_stem}-{counter}{extension}"
            if not candidate.exists():
                target = candidate
                break
            counter += 1

    if target != path:
        target.parent.mkdir(parents=True, exist_ok=True)
        path.rename(target)
        return target

    return path


def normalize_records(records: Sequence[dict]) -> dict:
    assets = list(IMAGES_DIR.glob("*"))
    index = build_asset_index(assets)
    updated_records: List[dict] = []
    renamed_files: List[Path] = []
    extension_updates: List[tuple[Path, str]] = []
    missing_assets: List[dict] = []

    for record in records:
        asset_path = find_asset_for_record(record, index)
        if not asset_path or not asset_path.exists():
            missing_assets.append(record)
            record["image_filename"] = ""
            record["image_path"] = ""
            record["image_downloaded"] = False
            updated_records.append(record)
            continue

        detected_ext = detect_extension(asset_path)
        extension_changed = asset_path.suffix.lower() != detected_ext
        normalized_stem = slugify(asset_path.stem)
        desired_stem = normalized_stem
        legacy_match = LEGACY_PREFIX_PATTERN.match(asset_path.stem)
        if legacy_match:
            desired_stem = slugify(legacy_match.group(2))

        original_key = normalize_key(asset_path.stem)
        if original_key in index:
            index[original_key] = [p for p in index[original_key] if p != asset_path]
            if not index[original_key]:
                index.pop(original_key)

        new_path = rename_asset(asset_path, desired_stem, detected_ext)
        if new_path != asset_path:
            renamed_files.append(new_path)
            if extension_changed:
                extension_updates.append((new_path, detected_ext))

        new_key = normalize_key(new_path.stem)
        index.setdefault(new_key, []).append(new_path)

        try:
            relative_path = new_path.relative_to(ROOT_DIR)
        except ValueError:
            relative_path = new_path

        record["image_filename"] = new_path.name
        record["image_path"] = str(relative_path)
        record["image_slug"] = new_path.stem
        record["image_downloaded"] = new_path.exists()
        updated_records.append(record)

    summary = {
        "renamed_files": renamed_files,
        "extension_updates": extension_updates,
        "missing_records": missing_assets,
        "records": updated_records,
    }
    return summary


def write_outputs(records: Sequence[dict]) -> None:
    if not records:
        return
    JSON_PATH.write_text(json.dumps(records, indent=2, ensure_ascii=False), encoding="utf-8")
    fieldnames = list(records[0].keys())
    with CSV_PATH.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)


def main() -> None:
    if not JSON_PATH.exists():
        raise SystemExit(f"No se encontró {JSON_PATH}")

    records = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    summary = normalize_records(records)
    write_outputs(summary["records"])

    renamed = len(summary["renamed_files"])
    ext_changes = len(summary["extension_updates"])
    missing = len(summary["missing_records"])

    print(f"Registros procesados: {len(records)}")
    print(f"Archivos renombrados: {renamed}")
    print(f"Actualizaciones de extensión: {ext_changes}")
    if missing:
        print(f"Registros sin activo asociado: {missing}")
        for record in summary["missing_records"]:
            print(" -", record.get("catalog_label") or record.get("codigo") or "(desconocido)")


if __name__ == "__main__":
    main()
