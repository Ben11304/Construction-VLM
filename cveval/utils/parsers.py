"""Robust label/JSON extraction from VLM raw outputs.

Fallback chain: structured JSON → markdown fence strip → regex → label 'unknown'.
Tasks own the regex patterns; this module only provides primitives.
"""

from __future__ import annotations

import json
import re
from typing import Any

_FENCE = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL | re.IGNORECASE)
_FIRST_OBJ = re.compile(r"\{.*?\}", re.DOTALL)


def try_json(text: str) -> dict[str, Any] | None:
    """Best-effort JSON parse. Strips markdown fences, then tries first {...} match."""
    if not text:
        return None
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        pass

    m = _FENCE.search(text)
    if m:
        try:
            return json.loads(m.group(1).strip())
        except json.JSONDecodeError:
            pass

    m = _FIRST_OBJ.search(text)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            return None
    return None


def match_label(text: str, vocab: list[str], unknown: str = "unknown") -> str:
    """Lowercase substring match against vocab; first hit wins. `unknown` if no match."""
    lower = text.lower()
    for label in vocab:
        if label.lower() in lower:
            return label
    return unknown
