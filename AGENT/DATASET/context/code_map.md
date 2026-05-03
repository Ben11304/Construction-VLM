# DATASET Code Map

## DATASET sở hữu

| Path | Purpose |
|---|---|
| `cveval/data/<dataset>.py` | Adapter cụ thể, subclass `BaseDataset` |
| `cveval/tasks/<task>.py` | Task spec, subclass `BaseTask` |
| `cveval/metrics/<metric>.py` | Function `(parquet) -> dict` |
| `configs/data/<dataset>.yaml` | Data config (paths, filters, sample size) |
| `configs/tasks/<task>.yaml` | Task config (label set, severity axis) |
| `configs/prompts/<task>_<version>.yaml` | Prompt template, immutable per version |
| `taxonomy/` (nếu có) | Condition labels, severity mapping authoritative |

## v0.1 vertical slice — IMPLEMENTED 2026-05-03

- `cveval/data/consynthx.py` — registry key `consynthx`. Per-condition **parquet**
  adapter for ConSynth-X release-v1 layout
  (`/fs/scratch/PGS0407/binben14/ConSynth-X-release-v1/<root>/parquet/<release_condition>/`).
  Glossary→release alias (`rain → rain_light`); `clean` not shipped in release-v1
  → reported via `.missing_conditions`. Upstream GT preserved in `extra.upstream_gt`
  (objects, image_attributes, rule_violations, pipeline, quality_scores, …).
- `cveval/tasks/condition_cls.py` — 7-class single-label, prompt v1_definitions,
  3-gate parser (JSON → longest-match substring → "unknown" sentinel).
- `cveval/metrics/classification.py` — accuracy + macro-F1 + per-condition P/R/F1
  + confusion matrix (incl. `unknown` column).
- `cveval/prompts/condition_cls/v1_definitions.yaml` — immutable prompt template.
- Configs: `configs/data/consynthx_{all,<condition>}.yaml` (per-condition slicing),
  `configs/tasks/condition_cls.yaml`, `configs/runs/consynthx_condition_cls_{smoke,full}.yaml`.
- Tests: `tests/test_data_consynthx.py`, `tests/test_tasks_condition_cls.py`,
  `tests/test_metrics_classification.py` (27 passing).

## OUT of scope
ABC `base.py`, `registry.py` của bất kỳ layer nào → FRAMEWORK.
Adapter VLM, runner, results → VLM agent.
