# Glossary — Authoritative Names & Terms

Chống nhầm tên giữa dataset, model, task, metric. Khi viết doc/paper/comment
phải dùng tên ở cột "Authoritative".

## Project taxonomy

| Layer | Tên authoritative | Note |
|---|---|---|
| Framework | **ConstructionVLM-Eval** (`cveval`) | NOT VLMEvalKit (chỉ là cảm hứng kiến trúc) |
| Dataset họ chính | **ConSynth-X** | Sibling repo `../ConSynth-X/`. Có nhiều phiên bản release. |
| Release v1 | `Ben11304/ConSynth-X-augmentation` (HF) | 122,156 rows / 35 shards |
| Sample subset | **Kaggle sample v6** | 300/condition cho smoke test |

## Conditions axis (first-class)

7 lớp dùng cho `condition_classification` v0.1:
`clean`, `rain`, `rain_heavy`, `snow_light`, `snow_heavy`, `fog_heavy`, `night`.

Severity là attribute riêng (`severity ∈ {none, light, heavy}`); không nhập vào
condition string trừ khi schema yêu cầu.

## Tasks (kế hoạch)

| Task | Mã | v0.1 |
|---|---|---|
| Condition classification | `condition_cls` | ✓ vertical slice |
| Paired clean↔aug delta | `paired_delta` | sau v0.1 |
| Object detection eval (VLM-as-detector) | `vlm_detection` | sau v0.1 |
| Robustness AUC across severity | `robustness_auc` | sau v0.1 |

## Models (kế hoạch)

| Family | Trạng thái | Backend |
|---|---|---|
| **Qwen2.5-VL-7B** | v0.1 first | HF transformers |
| InternVL family | sau v0.1 | HF transformers |
| LLaVA family | sau v0.1 | HF transformers |
| GPT-4o, Claude, Gemini | Phase 2 | API (closed-source) |

## Metric names

| Metric | Dùng cho | Module |
|---|---|---|
| Accuracy / Macro-F1 | classification | `cveval/metrics/classification.py` |
| Per-condition breakdown | classification | `cveval/metrics/classification.py` |
| Confusion matrix | classification | `cveval/metrics/classification.py` |
| Robustness AUC | severity sweep | `cveval/metrics/robustness.py` (sau) |
| Paired Δ | clean↔aug | `cveval/metrics/paired.py` (sau) |

## Result schema

Canonical parquet schema: xem `docs/context/01_architecture.md` §Result schema.
Mọi run xuất 1 bảng duy nhất. KHÔNG đặt cột mới mà không bump schema version.
