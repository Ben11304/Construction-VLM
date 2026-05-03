"""Leaderboard from predictions.parquet. Pure read; no model/data coupling."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd


def render_leaderboard(parquet_path: str | Path, out_path: str | Path) -> Path:
    df = pd.read_parquet(parquet_path)
    df["score"] = df["score"].map(lambda s: json.loads(s) if isinstance(s, str) else (s or {}))
    df["correct"] = df["score"].map(lambda d: d.get("correct"))

    by_model = (
        df.dropna(subset=["correct"])
          .groupby(["model", "task"])["correct"]
          .agg(["mean", "count"])
          .reset_index()
          .rename(columns={"mean": "accuracy", "count": "n"})
    )

    lines = ["# Leaderboard", "", "| model | task | accuracy | n |", "|---|---|---:|---:|"]
    for _, r in by_model.iterrows():
        lines.append(f"| {r['model']} | {r['task']} | {r['accuracy']:.4f} | {int(r['n'])} |")

    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines))
    return out
