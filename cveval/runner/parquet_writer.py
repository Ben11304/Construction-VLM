"""Canonical parquet schema writer. See docs/context/01_architecture.md §Result schema."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

CANONICAL_COLUMNS: list[str] = [
    "model",
    "dataset",
    "condition",
    "severity",
    "image_id",
    "task",
    "prompt_version",
    "raw_output",
    "parsed",
    "gt",
    "score",
    "latency_ms",
    "tokens_in",
    "tokens_out",
    "cost_usd",
    "error",
    "run_id",
]

REQUIRED_COLUMNS: set[str] = {
    "model", "dataset", "condition", "image_id", "task",
    "prompt_version", "raw_output", "parsed", "gt", "score",
    "latency_ms", "run_id",
}


def _jsonify(v: Any) -> str | None:
    if v is None:
        return None
    if isinstance(v, str):
        return v
    return json.dumps(v, ensure_ascii=False, default=str)


def write_predictions(rows: list[dict[str, Any]], path: str | Path) -> Path:
    """Validate columns, JSON-encode dict cols, write parquet."""
    if not rows:
        raise ValueError("No rows to write")
    missing = REQUIRED_COLUMNS - set(rows[0].keys())
    if missing:
        raise ValueError(f"Row missing required columns: {sorted(missing)}")

    df = pd.DataFrame(rows)
    for col in ("parsed", "gt", "score"):
        df[col] = df[col].map(_jsonify)
    for col in CANONICAL_COLUMNS:
        if col not in df.columns:
            df[col] = None
    df = df[CANONICAL_COLUMNS]

    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(out, index=False)
    return out
