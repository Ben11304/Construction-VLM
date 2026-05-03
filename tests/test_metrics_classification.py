"""Classification metric tests — write a tiny parquet with known labels and
verify accuracy / macro-F1 / per-condition / confusion matrix.

This tests the AGGREGATOR, not predictions. Synthesizing the parquet is OK
because the rows are scoring records (already-scored samples), not images
or model outputs — research-integrity rule applies to fabricated MODEL
predictions and dataset GT, not to test fixtures of the metric layer itself.
"""

from __future__ import annotations

from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq
import pytest

from cveval.metrics.classification import VOCAB_DEFAULT, classification_metrics


def _write_parquet(rows: list[dict], path: Path) -> None:
    # Stringify dict cols to mimic the runner's parquet schema (parsed/score/gt are str).
    norm = []
    for r in rows:
        norm.append({
            "condition": r["condition"],
            "parsed": __import__("json").dumps(r["parsed"]),
            "score": __import__("json").dumps(r["score"]),
            "gt": __import__("json").dumps({"condition": r["condition"]}),
        })
    table = pa.Table.from_pylist(norm)
    pq.write_table(table, path)


@pytest.fixture
def perfect_parquet(tmp_path) -> Path:
    rows = [
        {"condition": c,
         "parsed": {"condition": c, "parse_error": False},
         "score": {"correct": 1, "parse_error": False}}
        for c in VOCAB_DEFAULT
    ]
    p = tmp_path / "perfect.parquet"
    _write_parquet(rows, p)
    return p


def test_perfect_run(perfect_parquet):
    m = classification_metrics(perfect_parquet)
    assert m["n"] == len(VOCAB_DEFAULT)
    assert m["accuracy"] == 1.0
    assert m["macro_f1"] == 1.0
    assert m["parse_error_rate"] == 0.0
    for label in VOCAB_DEFAULT:
        assert m["per_condition"][label]["f1"] == 1.0
        assert m["per_condition"][label]["support"] == 1


def test_mixed_predictions(tmp_path):
    rows = [
        # 2× rain correctly classified.
        {"condition": "rain",
         "parsed": {"condition": "rain", "parse_error": False},
         "score": {"correct": 1, "parse_error": False}},
        {"condition": "rain",
         "parsed": {"condition": "rain", "parse_error": False},
         "score": {"correct": 1, "parse_error": False}},
        # 1× rain misclassified as rain_heavy.
        {"condition": "rain",
         "parsed": {"condition": "rain_heavy", "parse_error": False},
         "score": {"correct": 0, "parse_error": False}},
        # 1× fog_heavy parse error → unknown.
        {"condition": "fog_heavy",
         "parsed": {"condition": "unknown", "parse_error": True},
         "score": {"correct": 0, "parse_error": True}},
        # 1× night correctly.
        {"condition": "night",
         "parsed": {"condition": "night", "parse_error": False},
         "score": {"correct": 1, "parse_error": False}},
    ]
    p = tmp_path / "mixed.parquet"
    _write_parquet(rows, p)
    m = classification_metrics(p)
    assert m["n"] == 5
    assert m["accuracy"] == 3 / 5
    assert m["parse_error_rate"] == 1 / 5
    # rain: tp=2 fn=1 fp=0 → P=1.0 R=2/3 F1=0.8
    rain = m["per_condition"]["rain"]
    assert rain["precision"] == pytest.approx(1.0)
    assert rain["recall"] == pytest.approx(2 / 3)
    assert rain["f1"] == pytest.approx(0.8, rel=1e-3)
    # fog_heavy: tp=0 fn=1 → R=0
    assert m["per_condition"]["fog_heavy"]["recall"] == 0.0
    # rain_heavy: tp=0 fp=1 fn=0 → P=0 R=0
    assert m["per_condition"]["rain_heavy"]["precision"] == 0.0
    # Confusion matrix shape includes 'unknown' col since parse error happened.
    cm = m["confusion_matrix"]
    assert cm["rows_gt"] == VOCAB_DEFAULT
    assert "unknown" in cm["cols_pred"]


def test_empty_parquet(tmp_path):
    p = tmp_path / "empty.parquet"
    _write_parquet([], p)
    m = classification_metrics(p)
    assert m["n"] == 0
    assert m["accuracy"] == 0.0
    assert m["macro_f1"] == 0.0
