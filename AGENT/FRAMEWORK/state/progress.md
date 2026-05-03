# FRAMEWORK Progress (newest on top)

## 2026-05-03 — Dashboard v1.0.0 (manifest bumped 0.1.0 → 0.2.0)
- Branch: `dashboard`. Static admin site generator trong `cveval/dashboard/`.
- Stack: Jinja2 templates → static HTML, no server runtime (GitHub Pages compatible).
- Builder reads registries (auto-discovery), `AGENT/*/outputs/manifest.md`, `results/*/predictions.parquet`.
- 8 pages: overview, datasets, models, tasks, metrics, runs, run_detail, manifests + JSON exports.
- CLI: `cveval dashboard build --out site/`.
- Deploy: `scripts/publish_dashboard.sh` push lên orphan branch `gh-pages` (override `--branch dashboard` được).
- Vì `.gitignore` bỏ `AGENT/`, `results/` → builder phải chạy local; CI workflow không khả thi.
- Tests: `tests/test_dashboard_builder.py` (synthetic + empty-state).
- Smoke OK trên working tree thật: 1 run, 1 model, 1 dataset, 1 task discovered.

## 2026-05-03 — Skeleton scaffold v0.1.0
- Bootstrapped full FRAMEWORK skeleton:
  - `cveval/__init__.py`, `cli.py`, `config.py` (Pydantic v2 RunConfig hierarchy)
  - `cveval/data/{base,registry}.py` — `BaseDataset`, `DatasetSample`, `DATASET_REGISTRY`
  - `cveval/models/{base,registry}.py` — `BaseVLM`, `ChatMessage`, `GenerateResult`, `MODEL_REGISTRY`
  - `cveval/tasks/{base,registry}.py` — `BaseTask`, `TASK_REGISTRY`
  - `cveval/utils/{device,image_io,parsers,cache,hashing}.py`
  - `cveval/runner/{local_runner,parquet_writer}.py` — sync orchestrator + canonical schema
  - `cveval/metrics/__init__.py` — function-style registry
  - `cveval/reporting/leaderboard.py` — accuracy table stub
- `pyproject.toml`, `.env.example`, `.gitignore` ở root.
- Tests: `tests/test_framework_{device,parsers,registries,config,runner}.py` + `conftest.py` với fake adapter triple cho contract test.
- Manifest bumped 0.0.0 → 1.0.0 (initial pin).
- 3 [PROPOSED] decisions trong manifest cần user confirm trước khi DATASET/VLM agent build adapter.
- Next: chờ user confirm decisions → ping DATASET (build ConSynth-X Kaggle v6 adapter + condition_cls task) và VLM (Qwen2.5-VL adapter).

## 2026-05-03 — Agent bootstrapped
- AGENT.md, code_map.md, architecture.md created.
- Open questions chưa quyết: runner concurrency model, caching key cho prompt
  template động, reporting layer thuộc FRAMEWORK hay agent riêng.
- Trạng thái core: chưa có code (xem `docs/context/06_roadmap.md` v0.1).
- Next: định nghĩa `BaseDataset`, `BaseVLM`, `BaseTask` ABC + registry decorator
  trước khi DATASET/VLM agent có thể implement adapter.
