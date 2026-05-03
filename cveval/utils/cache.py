"""SQLite response cache. Resume-friendly: re-runs skip cached generate() calls.

Cache key (composite): (model, image_hash, prompt_hash, prompt_version, task).
Task is included to avoid collision when two tasks share an identical prompt.
"""

from __future__ import annotations

import sqlite3
from contextlib import closing
from pathlib import Path

_SCHEMA = """
CREATE TABLE IF NOT EXISTS responses (
    model TEXT NOT NULL,
    image_hash TEXT NOT NULL,
    prompt_hash TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    task TEXT NOT NULL,
    raw_output TEXT NOT NULL,
    latency_ms INTEGER,
    tokens_in INTEGER,
    tokens_out INTEGER,
    cost_usd REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (model, image_hash, prompt_hash, prompt_version, task)
);
"""


class ResponseCache:
    def __init__(self, path: str | Path):
        self.path = Path(path).expanduser()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(self.path)) as conn:
            conn.executescript(_SCHEMA)
            conn.commit()

    def get(
        self,
        model: str,
        image_hash: str,
        prompt_hash: str,
        prompt_version: str,
        task: str,
    ) -> dict | None:
        with closing(sqlite3.connect(self.path)) as conn:
            row = conn.execute(
                "SELECT raw_output, latency_ms, tokens_in, tokens_out, cost_usd FROM responses "
                "WHERE model=? AND image_hash=? AND prompt_hash=? AND prompt_version=? AND task=?",
                (model, image_hash, prompt_hash, prompt_version, task),
            ).fetchone()
        if row is None:
            return None
        return {
            "raw_output": row[0],
            "latency_ms": row[1],
            "tokens_in": row[2],
            "tokens_out": row[3],
            "cost_usd": row[4],
        }

    def put(
        self,
        *,
        model: str,
        image_hash: str,
        prompt_hash: str,
        prompt_version: str,
        task: str,
        raw_output: str,
        latency_ms: int | None = None,
        tokens_in: int | None = None,
        tokens_out: int | None = None,
        cost_usd: float | None = None,
    ) -> None:
        with closing(sqlite3.connect(self.path)) as conn:
            conn.execute(
                "INSERT OR REPLACE INTO responses "
                "(model, image_hash, prompt_hash, prompt_version, task, raw_output, "
                " latency_ms, tokens_in, tokens_out, cost_usd) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    model, image_hash, prompt_hash, prompt_version, task,
                    raw_output, latency_ms, tokens_in, tokens_out, cost_usd,
                ),
            )
            conn.commit()
