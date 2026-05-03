# Manifest — VLM → AUDIT

## Version
0.1.0

Bump rule:
- Result schema parquet đổi → major.
- Thêm run / model adapter giữ schema cũ → minor.
- Metadata (tag, description) → patch.

## Last updated
2026-05-03 by VLM — first successful run (smoke_smolvlm_condcls_v1)

## Artifacts

### run:smoke_smolvlm_condcls_v1
- Path: `results/smoke_smolvlm_condcls_v1/predictions.parquet`
- Format: parquet (canonical schema — model, dataset, condition, severity,
  image_id, task, prompt_version, raw_output, parsed, gt, score, latency_ms,
  tokens_in, tokens_out, cost_usd, error, run_id)
- Model: `smolvlm-256m` (HuggingFaceTB/SmolVLM-256M-Instruct, BF16, do_sample=False, max_new_tokens=64)
- Dataset: `consynthx` @ DATASET v1.1.1 (root=cs10k, split=test, n_per_condition=5, 6 glossary conditions; clean dropped per release-v1)
- Task: `condition_cls` @ prompt `v1_definitions`
- Row count: 30 (5 × {rain, rain_heavy, snow_light, snow_heavy, fog_heavy, night})
- Checksum (sha256): `5fe8fea923eb46c97d70aa2d53dc447d8ed759d9409a9eba0b024325ff977868`
- Effective config: `results/smoke_smolvlm_condcls_v1/effective_config.yaml`
- Run log: `jobs/logs/cveval-smolvlm-smoke-47271560.{out,err}`
- Cluster job: `pitzer:47271560` (gpu-exp, p0311 / Tesla V100S-32G, elapsed 00:00:51)
- Status: ready
- Telemetry: latency p50=574ms / p95≈1109ms; tokens_out total=219; parse_error_rate=0.033 (1/30); cost_usd=0 (open-source)
- Smoke metrics (NOT for paper — n=5/cond, accuracy chỉ để sanity-check
  pipeline): overall acc=0.267; per_condition={rain:0.4, rain_heavy:0.0,
  snow_light:1.0, snow_heavy:0.0, fog_heavy:0.0, night:0.2}.
- Notes: Pipeline E2E xanh — load weight, generate, parse, score, parquet
  ghi đúng schema canonical. Acc thấp là kỳ vọng cho 256M model + smoke n;
  AUDIT KHÔNG dùng số này làm baseline.

Template:

```
### run:<run_id>
- Path: results/<run_id>/predictions.parquet
- Format: parquet (canonical schema, xem docs/context/01_architecture.md)
- Model: qwen2.5-vl-7b
- Dataset: consynthx_kaggle_v6 @ DATASET v1.0.0
- Task: condition_cls @ prompt v1_definitions
- Row count:
- Checksum (sha256):
- Effective config: results/<run_id>/effective_config.yaml
- Run log: results/<run_id>/run.log
- Status: ready
- Notes:
```

## Removed/Deprecated

(none)
