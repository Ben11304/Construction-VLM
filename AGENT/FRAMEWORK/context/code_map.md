# FRAMEWORK Code Map

Path mà FRAMEWORK agent được phép đọc/sửa. Cập nhật mỗi khi cấu trúc thay đổi.

## Core contracts (FRAMEWORK sở hữu)

| Path | Purpose | Note |
|---|---|---|
| `cveval/__init__.py` | Public API surface | Re-export ABCs + registries |
| `cveval/cli.py` | Entry `cveval run …` | Click/Typer, đọc YAML → RunConfig |
| `cveval/config.py` | Pydantic v2 configs | RunConfig / ModelConfig / DataConfig / TaskConfig / RunnerConfig |
| `cveval/utils/device.py` | `select_device()` | cuda → mps → cpu, log warn nếu fallback |
| `cveval/utils/image_io.py` | Image load helpers | bytes → PIL → tensor |
| `cveval/utils/parsers.py` | Robust label extraction | JSON/regex fallback chain |
| `cveval/utils/cache.py` | SQLite response cache | key = (model, img_hash, prompt_hash, prompt_version) |
| `cveval/data/base.py` | `BaseDataset` ABC | `iter() -> (image_bytes, gt, image_id, condition)` |
| `cveval/data/registry.py` | `DATASET_REGISTRY` + `register_dataset` | — |
| `cveval/models/base.py` | `BaseVLM` ABC | `generate(messages, **kw) -> str` |
| `cveval/models/registry.py` | `MODEL_REGISTRY` + `register_model` | — |
| `cveval/tasks/base.py` | `BaseTask` ABC | `build_prompt + parse_output + score` |
| `cveval/tasks/registry.py` | `TASK_REGISTRY` + `register_task` | — |
| `cveval/runner/` | Orchestrator | dataset.iter → task.build_prompt → model.generate → task.parse → task.score → parquet writer |
| `cveval/reporting/` | Leaderboard, robustness matrix | đọc parquet, render md/png |
| `cveval/metrics/__init__.py` | Function-style metric registry | adapter cụ thể thuộc DATASET |

## Test scope
- `tests/conftest.py` — fixture chung.
- `tests/test_framework_*` — ABC contract test với fake adapter.

## OUT of FRAMEWORK scope
Adapter cụ thể (`cveval/data/<name>.py`, `cveval/models/<name>.py`,
`cveval/tasks/<name>.py`) thuộc DATASET / VLM agent.
