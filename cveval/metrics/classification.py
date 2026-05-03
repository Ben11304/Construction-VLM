"""Classification metrics over a canonical predictions parquet.

Reads the result schema (`cveval/runner/parquet_writer.py` v1.0.0) — relevant
columns: `condition` (gt), `parsed` (dict with at least 'condition'), `score`
(per-sample {'correct': 0|1|None, 'parse_error': bool, ...}).

Returns a dict with overall accuracy, macro-F1, per-condition precision/recall/F1,
parse-error rate, and a labeled confusion matrix. No numpy/sklearn — keeps the
metric module dep-free so AUDIT can import without pulling ML stack.
"""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from collections.abc import Iterable, Sequence
from pathlib import Path
from typing import Any

VOCAB_DEFAULT: list[str] = [
    "clean", "rain", "rain_heavy", "snow_light", "snow_heavy", "fog_heavy", "night",
]


def _coerce_dict(cell: Any) -> dict[str, Any]:
    if isinstance(cell, dict):
        return cell
    if isinstance(cell, str):
        try:
            return json.loads(cell)
        except json.JSONDecodeError:
            return {}
    return {}


def _iter_rows(parquet_path: str | Path) -> Iterable[dict[str, Any]]:
    """Stream rows. pyarrow is the only hard dep (already required by adapter)."""
    import pyarrow.parquet as pq

    table = pq.read_table(str(parquet_path))
    for batch in table.to_batches():
        for row in batch.to_pylist():
            yield row


def _f1(p: float, r: float) -> float:
    return 2 * p * r / (p + r) if (p + r) > 0 else 0.0


def classification_metrics(
    parquet_path: str | Path,
    *,
    vocab: Sequence[str] = VOCAB_DEFAULT,
    pred_field: str = "condition",
) -> dict[str, Any]:
    """Aggregate condition_cls predictions parquet → metric dict.

    Per-condition: precision/recall/F1 against `vocab`. Macro-F1 = mean over
    vocab labels (parse_errors counted as wrong; 'unknown' is NOT in vocab so
    it shows up as false-negative for the gt label and is excluded from
    precision denominators).
    """
    vocab = list(vocab)
    n_total = 0
    n_correct = 0
    n_parse_error = 0
    confusion: dict[str, Counter[str]] = defaultdict(Counter)  # gt → pred → count
    per_label_tp: Counter[str] = Counter()
    per_label_fp: Counter[str] = Counter()
    per_label_fn: Counter[str] = Counter()

    for row in _iter_rows(parquet_path):
        parsed = _coerce_dict(row.get("parsed"))
        score = _coerce_dict(row.get("score"))
        gt_cond = row.get("condition") or _coerce_dict(row.get("gt")).get("condition")
        if gt_cond not in vocab:
            continue
        n_total += 1
        if score.get("parse_error"):
            n_parse_error += 1
        pred = parsed.get(pred_field, "unknown")
        confusion[gt_cond][pred] += 1
        if pred == gt_cond:
            n_correct += 1
            per_label_tp[gt_cond] += 1
        else:
            per_label_fn[gt_cond] += 1
            if pred in vocab:
                per_label_fp[pred] += 1

    accuracy = n_correct / n_total if n_total else 0.0
    parse_error_rate = n_parse_error / n_total if n_total else 0.0

    per_condition: dict[str, dict[str, float | int]] = {}
    f1_list: list[float] = []
    for label in vocab:
        tp = per_label_tp[label]
        fp = per_label_fp[label]
        fn = per_label_fn[label]
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = _f1(precision, recall)
        per_condition[label] = {
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "support": tp + fn,
        }
        f1_list.append(f1)

    macro_f1 = sum(f1_list) / len(f1_list) if f1_list else 0.0

    # Symmetric confusion matrix (rows = gt, cols = pred). Include 'unknown' col
    # if any sample landed there, so users see parse failures explicitly.
    pred_labels = list(vocab)
    if any("unknown" in c for c in confusion.values()):
        pred_labels = pred_labels + ["unknown"]
    matrix = [[confusion[gt][pred] for pred in pred_labels] for gt in vocab]

    return {
        "n": n_total,
        "accuracy": accuracy,
        "macro_f1": macro_f1,
        "parse_error_rate": parse_error_rate,
        "per_condition": per_condition,
        "confusion_matrix": {
            "rows_gt": list(vocab),
            "cols_pred": pred_labels,
            "matrix": matrix,
        },
    }
