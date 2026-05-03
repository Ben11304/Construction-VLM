# AUDIT findings (append-only)

## 2026-05-03 — pass #1 (targeted: result sanity + manifest drift)
Report: `outputs/audit_report_2026-05-03.md`
Manifest versions reviewed: FRAMEWORK 0.2.0 / DATASET 1.1.1 / VLM 0.1.0.

- **F-2026-05-03-01** [error] Reproducibility — committed `configs/runs/consynthx_condition_cls_smoke.yaml` (`run_id=smoke_consynthx_condcls_v1`, model `qwen2.5-vl-7b`) does not replay the only existing run `smoke_smolvlm_condcls_v1` (model `smolvlm-256m`). Owner: VLM + DATASET. Open.
- **F-2026-05-03-02** [error] Manifest telemetry — VLM manifest reports `parse_error_rate=0.033 (1/30)`; actual parquet shows 6/30 (0.200). Owner: VLM. Open.
- **F-2026-05-03-03** [warn] Intensity collapse — snow_heavy→snow_light 5/5, rain_heavy→rain 4/5 in smoke run. Recommendation only (n=5 too small). Owner: VLM (monitor at full eval). Open.
- **F-2026-05-03-04** [info] VLM manifest verified — row count, sha256, latency p50, tokens_out match artifact.
- **F-2026-05-03-05** [info] No version drift across 3 agents at this snapshot.
- **F-2026-05-03-06** [info] predictions.parquet schema fully compliant (17 canonical cols, valid JSON strings, prompt_version pin matches DATASET).
