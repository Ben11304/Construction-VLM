# Manifest — FRAMEWORK → DATASET, VLM, AUDIT

## Version
0.1.0

Bump rule (theo `shared/handoff_schema.md`):
- ABC signature đổi → major.
- Thêm registry / utility / new contract giữ schema cũ → minor.
- Doc / metadata → patch.

## Last updated
2026-05-03 by FRAMEWORK skeleton scaffold

## Artifacts

### BaseDataset
- **Path**: `cveval/data/base.py`
- **Format**: py-module (ABC + Pydantic `DatasetSample`)
- **Schema**: `__iter__() -> Iterator[DatasetSample]`, `__len__()`, `conditions: list[str]`
- **Version**: 1.0.0
- **Source**: `cveval/data/base.py`
- **Status**: ready
- **Notes**: `DatasetSample` fields: `image_bytes, gt, image_id, condition, severity?, extra`. Adapter set `severity=None` nếu không có.

### BaseVLM
- **Path**: `cveval/models/base.py`
- **Format**: py-module (ABC + Pydantic `ChatMessage`, `ChatContent`, `GenerateResult`)
- **Schema**: `__init__(config: ModelConfig)`, `generate(messages: list[ChatMessage], *, max_new_tokens, temperature, **kw) -> GenerateResult`
- **Version**: 1.0.0
- **Source**: `cveval/models/base.py`
- **Status**: ready
- **Notes**: `ChatContent.image_bytes` raw bytes — adapter tự convert; KHÔNG hard-code device, dùng `cveval.utils.device.select_device`.

### BaseTask
- **Path**: `cveval/tasks/base.py`
- **Format**: py-module (ABC)
- **Schema**: `build_prompt(sample) -> list[ChatMessage]`, `parse_output(raw) -> dict`, `score(parsed, gt) -> dict`
- **Version**: 1.0.0
- **Source**: `cveval/tasks/base.py`
- **Status**: ready
- **Notes**: `parse_output` MUST NOT raise — return `{"...": "unknown"}` sentinel.

### Registries (DATASET / MODEL / TASK)
- **Path**: `cveval/{data,models,tasks}/registry.py`
- **Format**: py-module
- **Schema**: `register_<kind>(name)` decorator; `<KIND>_REGISTRY: dict[str, type]`
- **Version**: 1.0.0
- **Notes**: Duplicate name raises `ValueError`. Registry key conventions: see `shared/glossary.md` §Naming.

### RunConfig (Pydantic v2)
- **Path**: `cveval/config.py`
- **Format**: py-module (Pydantic v2 models)
- **Schema**: `RunConfig{run_id, model: ModelConfig, data: DataConfig, task: TaskConfig, runner: RunnerConfig}`; `extra="forbid"`
- **Version**: 1.0.0
- **Source**: `cveval/config.py`
- **Status**: ready

### Result schema (canonical parquet)
- **Path**: `cveval/runner/parquet_writer.py`
- **Format**: parquet
- **Schema**: cols = `model, dataset, condition, severity, image_id, task, prompt_version, raw_output, parsed, gt, score, latency_ms, tokens_in, tokens_out, cost_usd, error, run_id`
- **Version**: 1.0.0
- **Notes**: Authoritative spec ở `docs/context/01_architecture.md` §Result schema. Bump major nếu đổi cột.

### LocalRunner
- **Path**: `cveval/runner/local_runner.py`
- **Format**: py-module
- **Schema**: `LocalRunner(config).run() -> Path` (predictions.parquet)
- **Version**: 1.0.0
- **Status**: ready
- **Notes**: Sync sequential. Cache key = `(model, image_hash, prompt_hash, prompt_version, task)`. AsyncRunner cho API adapter sẽ thêm sau.

### Utils
- `cveval/utils/device.py` — `select_device(prefer)` v1.0.0
- `cveval/utils/parsers.py` — `try_json`, `match_label` v1.0.0
- `cveval/utils/cache.py` — `ResponseCache` v1.0.0
- `cveval/utils/hashing.py` — `sha1_bytes`, `sha1_text` v1.0.0
- `cveval/utils/image_io.py` — `bytes_to_pil`, `path_to_bytes` v1.0.0

### CLI
- **Path**: `cveval/cli.py`
- **Format**: Typer entry (`cveval run`, `cveval list <kind>`)
- **Version**: 1.0.0

### Reporting
- **Path**: `cveval/reporting/leaderboard.py`
- **Schema**: `render_leaderboard(parquet_path, out_path) -> Path`
- **Version**: 0.1.0 (stub — chỉ accuracy table)

## [PROPOSED] Decisions cần user xác nhận

1. **Runner concurrency v0.1**: sync sequential (`LocalRunner`). AsyncRunner thêm khi VLM cần API adapter.
2. **Cache key**: `(model, image_hash, prompt_hash, prompt_version, task)` — thêm `task` để chống collision.
3. **Reporting**: nằm trong FRAMEWORK (`cveval/reporting/`) vì chỉ đọc parquet.

User xác nhận → chuyển sang `Decisions` chính thức ở `shared/scope_decisions.md`.

## Removed/Deprecated

(none)
