# Audit Report — 2026-05-03

**Auditor**: AUDIT agent (read-only)
**Type**: Targeted — (a) result sanity smoke run, (b) manifest drift across 3 agents
**Pre-flight**: `bash AGENT/sync.sh AUDIT && bash AGENT/sync.sh check AUDIT` → OK (no version mismatch detected by the script).

## Scope reviewed

| Producer | Pinned version | Source |
|---|---|---|
| FRAMEWORK | 0.2.0 | `AGENT/AUDIT/inputs/FRAMEWORK.md` |
| DATASET | 1.1.1 | `AGENT/AUDIT/inputs/DATASET.md` |
| VLM | 0.1.0 | `AGENT/AUDIT/inputs/VLM.md` |
| Run audited | `smoke_smolvlm_condcls_v1` | `results/smoke_smolvlm_condcls_v1/{predictions.parquet, effective_config.yaml, summary.json}` |

## Findings

| id | severity | area | owner | evidence | recommendation |
|---|---|---|---|---|---|
| F-2026-05-03-01 | **error** | Reproducibility (C) | VLM + DATASET | `configs/runs/consynthx_condition_cls_smoke.yaml:2` declares `run_id: smoke_consynthx_condcls_v1` and `model.name: qwen2.5-vl-7b`; but the only existing run is `results/smoke_smolvlm_condcls_v1/` whose `effective_config.yaml:1` has `run_id: smoke_smolvlm_condcls_v1` and `model.name: smolvlm-256m`. VLM manifest pins the smolvlm run as the canonical smoke run. | Either (i) split into two committed configs (`..._smoke_smolvlm.yaml` + `..._smoke_qwen.yaml`) and have VLM manifest cite the smolvlm one, or (ii) update `consynthx_condition_cls_smoke.yaml` so replay reproduces `smoke_smolvlm_condcls_v1`. As-is, no committed config replays the run VLM declares "ready". |
| F-2026-05-03-02 | **error** | Manifest hygiene (E) / Result sanity (G) | VLM | VLM manifest `inputs/VLM.md:30` claims `parse_error_rate=0.033 (1/30)`. Actual parquet has 6/30 = 0.200 (`parsed.parse_error == True` for 6 rows; `parsed.source == "fallback"` for the same 6; `pred == "unknown"` for the same 6 — all three signals agree). | VLM update manifest telemetry (`parse_error_rate=0.200`) or correct the metric definition if the 0.033 referred to something different (e.g., generation-side error). Misreporting parse_error_rate by 6× is downstream-misleading. |
| F-2026-05-03-03 | **warn** | Result sanity (G) | VLM | Per-condition accuracy: `{snow_light: 1.0, rain: 0.4, night: 0.2, fog_heavy: 0.0, rain_heavy: 0.0, snow_heavy: 0.0}`. Three of six conditions are 100% miss. Confusion-matrix red flags: (a) all 5 `snow_heavy` rows predicted `snow_light`; (b) 4/5 `rain_heavy` rows predicted `rain`. Both look like the model is collapsing the *_heavy intensity tier into the lighter sibling rather than random failure. VLM manifest already disclaims smoke metrics ("AUDIT KHÔNG dùng số này làm baseline"). | Not a finding against the run itself (n=5, 256M model, smoke). But: when scaling to full eval, monitor whether intensity collapse persists — if yes, prompt v1_definitions may underspecify the heavy/light boundary. Suggest sensitivity check on prompt before paper-grade run. *Recommendation only — not a gate.* |
| F-2026-05-03-04 | **info** | Manifest hygiene (E) | VLM | VLM manifest fields verified against artifact: row count (30 = 30 ✓), sha256 (`5fe8fe…7868` matches re-computed digest ✓), latency p50 (574 ms = df.median ✓), tokens_out total (219 = df.sum ✓). | None — record positive verification. |
| F-2026-05-03-05 | **info** | Manifest drift (E) | — | `sync.sh check AUDIT`: producer == consumer for all 3 agents. No major/minor drift detected at this snapshot. | None. |
| F-2026-05-03-06 | **info** | Schema compliance (B) | VLM | `predictions.parquet` shape (30, 17). All 17 canonical columns present in correct order. `parsed`, `gt`, `score` are valid JSON strings. `prompt_version == "v1_definitions"` matches DATASET pin. `error` column 100% null (no generation errors). | None. |

## Summary

- **Critical**: 0
- **Error**: 2 (F-01 reproducibility drift, F-02 telemetry mismatch)
- **Warn**: 1 (F-03 intensity-tier collapse — flagged for follow-up, not a gate)
- **Info**: 3 (F-04/05/06 positive verifications)

No critical / research-integrity / secret-leak findings. Two `error`-level items both owned by VLM (one shared with DATASET on the config split). Both are paperwork-class — they do not impair pipeline correctness, but they break the reproducibility contract ("replay the committed config to reproduce the manifested run") and the telemetry-truth contract.

## Trend vs previous report

First audit pass — no baseline. Future reports: compare error count delta and check whether F-01/F-02 are closed.

## Observation vs interpretation

- **Observation**: 6/30 rows have `parsed.source == "fallback"` and `pred == "unknown"`; manifest reports `parse_error_rate=0.033`.
- **Interpretation**: the manifest figure is likely a typo or a different metric definition. AUDIT does not assert which.
- **Observation**: snow_heavy → snow_light = 5/5; rain_heavy → rain = 4/5.
- **Interpretation**: *might* indicate prompt under-specifies intensity. Not asserted as a defect of v1_definitions; needs n>5 to confirm.

## Escalation

None requiring immediate user intervention. F-01 and F-02 are normal owner-agent fixes; AUDIT will re-verify on next pass after VLM/DATASET update their manifests / configs.
