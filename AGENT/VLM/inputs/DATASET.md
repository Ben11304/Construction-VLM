# Manifest — DATASET → VLM

## Version
1.1.1

Bump rule:
- Adapter signature / GT schema đổi → major.
- Thêm dataset / task / metric giữ schema cũ → minor.
- Doc / citation polish → patch.
- 1.0.0 → 1.1.0: adapter target chuyển từ `augmentation_data_sample` (Kaggle v6, Arrow IPC) sang **release-v1 parquet trên scratch**.
- 1.1.0 → 1.1.1: adapter `__init__` refactor sang BaseDataset v1.0.0 contract `(cfg: DataConfig)` — fix runner crash (Job 47271527). Public-facing schema (DatasetSample, conditions list, severity mapping) không đổi → patch bump. Task `condition_cls.__init__` cũng nhận TaskConfig.

## Last updated
2026-05-03 by DATASET — fix `__init__(cfg)` contract

## Artifacts

### dataset:consynthx
- **Path**: `cveval/data/consynthx.py`
- **Format**: py-module (BaseDataset adapter, registry key `consynthx`)
- **Schema yielded**: `DatasetSample(image_bytes, gt={"condition","severity"}, image_id="<glossary_cond>/<id>", condition, severity, extra={"root","shard","upstream_gt": {objects, image_attributes, rule_violations, pipeline, quality_scores, quality_alert, condition_labels, source_id, source_dataset, release_condition}})`
- **Constructor**: `__init__(cfg: DataConfig)` — runner path. Reads `cfg.split`, `cfg.conditions`, `cfg.n_per_condition`; pulls `extra["root"]` (default `cs10k`) and `extra["data_root"]` from `cfg.extra`.
- **Version**: 1.1.1
- **Source layout**: `<data_root>/<root>/parquet/<release_condition>/{train__,test__,}*.parquet` (release-v1 harmonized schema).
- **Default data_root**: `/fs/scratch/PGS0407/binben14/ConSynth-X-release-v1` (override via `DataConfig.extra.data_root` or `$CONSYNTH_DATA_ROOT`).
- **Roots supported**: `cs10k` (default; ConstructionSite 10k upstream), `soda_voc`, `soda_ktsh`.
- **Glossary conditions exposed**: `rain, rain_heavy, snow_light, snow_heavy, fog_heavy, night` (6/7 — `clean` is NOT in release-v1 due to upstream CC-BY-NC-4.0 license; reported via `.missing_conditions`).
- **Extended release conditions**: `rain_light, fog_light, fog_medium, rain_night, snow_night, small` — opt-in by passing `conditions=[…]` explicitly.
- **Glossary→release alias**: `rain → rain_light`. Adapter tags samples with the **glossary** name so metric breakdowns stay in glossary vocab.
- **Split filtering**: files prefixed `train__`/`test__` filter on `split`; unprefixed (e.g. `fog_heavy.parquet`) load for either split.
- **License**: CC-BY-NC-4.0 (kế thừa upstream cs10k). HF dataset card v1 ghi CC0-1.0 — `[VERIFY]` conflict.
- **Status**: ready (verified 2026-05-03 against real shards on /fs/scratch — 9/9 REQUIRES_DATA tests pass).

### task:condition_cls
- **Path**: `cveval/tasks/condition_cls.py`
- **Schema**: 7-class single-label; output `{"condition": "<label>"}`
- **Constructor**: `__init__(cfg: TaskConfig | str | None)` — accepts TaskConfig (runner path), prompt_version str, or None (default v1_definitions).
- **Prompt**: `cveval/prompts/condition_cls/v1_definitions.yaml` (immutable)
- **Parser**: 3-gate (JSON → longest-match substring → "unknown" sentinel). Never raises.
- **Score**: `{correct: 0|1|None, parse_error: bool, pred, gt}`.
- **Version**: 1.0.1 (constructor signature accepts TaskConfig; behavior unchanged)
- **Note**: vocab still includes `clean` for forward-compatibility. With release-v1 as the only data source, `clean` rows simply don't appear → metric per_condition shows `support=0` for clean.
- **Status**: ready

### metric:classification
- **Path**: `cveval/metrics/classification.py`
- **Schema returned**: `{n, accuracy, macro_f1, parse_error_rate, per_condition: {label: {precision, recall, f1, support}}, confusion_matrix: {rows_gt, cols_pred, matrix}}`
- **Version**: 1.0.0
- **Status**: ready

### prompt:condition_cls/v1_definitions
- **Path**: `cveval/prompts/condition_cls/v1_definitions.yaml`
- **Version**: v1_definitions (immutable)

### configs
- Per-condition data configs (8): `configs/data/consynthx_{all,clean,rain,rain_heavy,snow_light,snow_heavy,fog_heavy,night}.yaml` — all pin `data_root: /fs/scratch/PGS0407/binben14/ConSynth-X-release-v1`.
- Task: `configs/tasks/condition_cls.yaml`.
- Runs: `configs/runs/consynthx_condition_cls_{smoke,full}.yaml`.
- **Status**: ready

## Removed/Deprecated
(none)
