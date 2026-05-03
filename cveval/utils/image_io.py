"""Image bytes → PIL helpers. Adapters consume bytes; loaders convert as needed."""

from __future__ import annotations

import io
from pathlib import Path

from PIL import Image


def bytes_to_pil(data: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(data))
    img.load()
    return img.convert("RGB")


def path_to_bytes(path: str | Path) -> bytes:
    return Path(path).read_bytes()
