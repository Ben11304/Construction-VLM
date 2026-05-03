# DATASET Progress (newest on top)

## 2026-05-03 — `clean` shipped on cs10k (manifest 1.2.0 → 1.2.1)
- Upstream added `cs10k/parquet/original/original.parquet` (3,004 rows,
  same harmonized release-v1 schema).
- Adapter alias mở rộng: `_ALIAS["clean"] = "original"`. `_NOT_IN_RELEASE`
  rỗng — tất cả 7 glossary condition reachable trên cs10k.
- `consynthx_condition_cls_full.yaml` (n_per_condition=500, sample_seed=42)
  giờ yield **7 × 500 = 3,500 samples** thay vì 6 × 500 = 3,000.
- Test `test_clean_is_dropped_with_explanation` thay bằng
  `test_clean_is_now_available_via_original_alias`. Test
  `test_iterate_first_sample_per_glossary_condition` assert đầy đủ 7 condition.
  **18/18 data tests pass**.

## 2026-05-03 — Reproducible random sampling (manifest 1.1.1 → 1.2.0)
- Adapter thêm `extra.sample_seed: int` → reproducible random subset per
  condition khi `n_per_condition < total`. Per-condition seed
  `= base_seed * 1_000_003 + sum(ord(c))` để các condition có permutation độc
  lập nhưng toàn run vẫn fully reproducible.
- Không seed → head-cap (legacy, backward-compat).
- `configs/runs/consynthx_condition_cls_full.yaml`:
  `n_per_condition=500`, `extra.sample_seed=42`,
  `run_id=consynthx_condcls_v1_balanced500_seed42` — verified yields
  exactly 500/cond × 6 conditions = **3,000 samples**, reproducible across
  invocations.
- 4 test mới: reproducibility, independence per-condition, exact-count, n>total
  fallback. **18/18 data tests pass** (35 tổng).

## 2026-05-03 — Fix adapter `__init__(cfg)` contract (manifest 1.1.0 → 1.1.1)
- **Bug**: `ConSynthXDataset.__init__` dùng kwargs-only signature; LocalRunner
  gọi `self._dataset_cls(cfg.data)` positional → crash. Job 47271527 trên
  pitzer fail 8s trước khi VLM được gọi.
  Bug tương tự: `ConditionClsTask.__init__(prompt_version: str)`.
- **Fix**: Refactor cả hai về BaseDataset/BaseTask v1.0.0 ABC contract:
  - `ConSynthXDataset.__init__(self, cfg: DataConfig)`: đọc `cfg.split`,
    `cfg.conditions`, `cfg.n_per_condition` trực tiếp; `extra["root"]`
    (default `cs10k`) và `extra["data_root"]` từ `cfg.extra`.
  - `ConditionClsTask.__init__(self, cfg=None)`: nhận TaskConfig (runner path),
    str (legacy), hoặc None (default v1_definitions).
- **Verified**: chạy `LocalRunner`-style smoke (instantiate adapter+task qua
  `cfg.data` / `cfg.task` positional, iterate 3 samples, build_prompt) — pass.
  Tests update sang `DataConfig`/`TaskConfig` positional. **34/34 pass**
  (thêm 1 test guard `test_init_takes_dataconfig_positional`).
- **Manifest**: 1.1.0 → 1.1.1 (patch — constructor signature là internal contract,
  DatasetSample schema không đổi). Task `condition_cls` 1.0.0 → 1.0.1.
- **Note cho VLM agent**: bug này KHÔNG do VLM/SmolVLM — bug ở DATASET layer
  trước khi runner kịp gọi `model.generate()`. Sau patch, VLM adapter có thể
  resume Job 47271527-style smoke với cùng config YAML.

## 2026-05-03 — Switch adapter target → release-v1 parquet on /fs/scratch (manifest 1.0.0 → 1.1.0)
- Authoritative data source: `/fs/scratch/PGS0407/binben14/ConSynth-X-release-v1/`
  (35 harmonized parquet shards, schema verified against fog_heavy/night/rain_heavy).
- `cveval/data/consynthx.py` rewritten:
  - Reads parquet (was Arrow IPC).
  - Auto-discovers shards under `<data_root>/<root>/parquet/<release_condition>/`.
  - Split-aware: filters by `train__`/`test__` filename prefix; unprefixed shards
    load for either split.
  - Roots supported: `cs10k` (default), `soda_voc`, `soda_ktsh`.
  - Glossary→release alias `rain → rain_light` applied invisibly; adapter tags
    every sample with the **glossary** condition so metric vocab stays
    consistent.
  - `clean` declared `_NOT_IN_RELEASE` (cs10k upstream CC-BY-NC-4.0 is not
    redistributed in release-v1) → dropped at construction time, reported via
    `.missing_conditions`.
  - Extended release vocab opt-in: `rain_light, fog_light, fog_medium,
    rain_night, snow_night, small` (severity entries added).
- All configs `configs/data/consynthx_*.yaml` + smoke/full run YAMLs pin
  `data_root: /fs/scratch/PGS0407/binben14/ConSynth-X-release-v1` and `root: cs10k`.
- Tests rewritten to assert release-v1 invariants. **33/33 pass** under
  python/3.12, including 9 REQUIRES_DATA tests against real scratch shards
  (verifies parquet schema, split filtering, glossary alias, soda_voc root,
  extended-vocab fog_medium, clean missing-condition reporting).
- Output manifest 1.0.0 → 1.1.0 (DatasetSample contract unchanged → minor bump).
- Open `[VERIFY]`: HF dataset card v1 license (CC0 vs upstream CC-BY-NC-4.0)
  still pending. Adapter behavior already enforces "no clean redistribution"
  by virtue of upstream not shipping it.

## 2026-05-03 — v0.1 vertical slice shipped (consynthx + condition_cls)
- Sync `inputs/manifest.md` 0.0.0 → 1.0.0 against FRAMEWORK 0.1.0.
- New artifacts (output manifest bumped 0.0.0 → 1.0.0):
  - `cveval/data/consynthx.py` — per-condition Arrow shard adapter for ConSynth-X
    construction_site root. Conditions tagged authoritatively from `_SHARD_MAP`,
    not derived. Upstream GT preserved in `extra.upstream_gt` for future tasks
    (description_gen / safety_vqa / vlm_detection).
  - `cveval/tasks/condition_cls.py` — 7-class single-label classification
    (vocab from glossary). 3-gate parser: JSON → longest-match substring →
    "unknown" sentinel. Never raises.
  - `cveval/metrics/classification.py` — pure-stdlib + pyarrow aggregator
    (accuracy, macro-F1, per-condition P/R/F1, confusion matrix incl. `unknown`).
  - `cveval/prompts/condition_cls/v1_definitions.yaml` — immutable prompt with
    inline taxonomy definitions.
  - `configs/data/consynthx_{all,clean,rain,rain_heavy,snow_light,snow_heavy,fog_heavy,night}.yaml`,
    `configs/tasks/condition_cls.yaml`,
    `configs/runs/consynthx_condition_cls_{smoke,full}.yaml`.
  - Tests: `tests/test_data_consynthx.py` (7), `tests/test_tasks_condition_cls.py` (17),
    `tests/test_metrics_classification.py` (3) — **27 / 27 pass** under python/3.12.
    (Pre-existing 4 framework device tests fail because torch not installed in
    user env — out of DATASET scope, FRAMEWORK to investigate.)
- **Design choice — "tách biệt condition"**: separation lives at config layer
  (one YAML per condition) + adapter tags `condition` per sample from shard
  mapping. Single adapter, deterministic per-condition slicing via
  `DataConfig.conditions=[<one>]`. Composite run (`consynthx_all.yaml`) yields
  all 7 in one stream and the metric does the per-condition breakdown
  automatically.
- Open `[VERIFY]`: HF dataset card v1 license (CC0 vs upstream CC-BY-NC-4.0)
  still pending — escalated 2026-05-03.

## 2026-05-03 — Upstream chain documented + post-v0.1 task roadmap
- Verified ConSynth-X = augmentation của (ConstructionSite 10k + SODA-VOC + SODA-KTSH)
  qua `../ConSynth-X/docs/data_sources.md` §1–2.
- `context/datasources.md`: thêm sub-section "Upstream sources" với ConstructionSite 10k
  (Chen & Zou 2025, arXiv:2508.11011, CC-BY-NC-4.0), SODA-VOC (Duan 2022,
  AutCon 142:104499), SODA-KTSH (Deng 2025, Buildings 15(6):959). Resolve license
  từ `[VERIFY]` → CC-BY-NC-4.0 (upstream); flag conflict với HF dataset card v1
  ghi CC0-1.0.
- `context/benchmarks.md`: thêm roadmap port 3 task của Chen & Zou
  (description_gen / safety_vqa / vlm_detection) + 2 task USP của cveval
  (paired_delta / robustness_auc) — tất cả đánh "planned (post-v0.1)".
- Reference evaluator impl: `../ConstructionSite-10k-Implementation/Evaluations/`
  reusable post-v0.1 (mask-IoU100, 2-stage VQA, 5×5 prompt-seed robustness).
- Memory cross-session: cập nhật `reference_hf_dataset_consynthx.md` +
  `project_constructionvlm_eval.md` với chain upstream + evaluator design patterns.

## 2026-05-03 — Agent bootstrapped
- AGENT.md, code_map.md, datasources.md, benchmarks.md created.
- ConSynth-X v1 entry chứa nhiều `[VERIFY]` (license, BibTeX, Kaggle URL).
  → escalate user trước khi adapter consume citation.
- Chờ FRAMEWORK pin `BaseDataset` + `BaseTask` v1.0.0 → DATASET sẽ implement
  `consynthx_kaggle_v6.py` + `condition_cls.py` cho v0.1.
- Next blocker: schema GT của Kaggle sample v6 cần map sang
  `(image_bytes, gt, image_id, condition)` — đợi user xác nhận structure.
