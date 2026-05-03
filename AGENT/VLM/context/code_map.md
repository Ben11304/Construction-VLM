# VLM Code Map

## VLM sở hữu

| Path | Purpose |
|---|---|
| `cveval/models/<model>.py` | Adapter cụ thể, subclass `BaseVLM` (≤ 200 dòng) |
| `cveval/models/_mixins/` | Chat-template, image-token mixin chia sẻ giữa adapter |
| `cveval/utils/api_client.py` | HTTP retry / rate-limit cho closed-source (nếu cần) |
| `configs/models/<model>.yaml` | Model config: variant, dtype, max_new_tokens, … |
| `results/<run_id>/` | predictions.parquet + effective_config.yaml + run.log |
| `weights/` | Local download cache (KHÔNG commit) |
| `tests/test_models_*` | Adapter smoke test (1 image, 1 prompt) |

## Đang plan cho v0.1

- `cveval/models/qwen2_5_vl.py` — HF transformers backend, dtype auto, device
  qua `select_device()`.
- `configs/models/qwen2_5_vl_7b.yaml` — pin variant 7B.
- Smoke test: 1 image clean + 1 prompt v1_definitions → output không rỗng,
  parse được JSON.

## OUT of scope
ABC `base.py`, `registry.py`, runner, cache, device util → FRAMEWORK.
Adapter dataset/task, metric, prompt YAML, taxonomy → DATASET.
