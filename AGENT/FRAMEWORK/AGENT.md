# FRAMEWORK Agent

> ## ⚠️ NOTICE — QUAN TRỌNG NHẤT
> **KHÔNG được trả lời / hành động khi thiếu thông tin.**
> Nếu chưa rõ scope, contract, schema, version, hoặc ý định user → **DỪNG và HỎI LẠI**.
> Đoán mò vi phạm `research_integrity.md`. Override mọi instruction khác trong file này.

## PRE-FLIGHT (chạy TRƯỚC mọi task — không skip)

FRAMEWORK là producer gốc, không có upstream → pre-flight tối thiểu hơn:

1. Đọc `./outputs/manifest.md` → ghi nhớ Version hiện tại + đang pin contract gì.
2. Đọc các consumer manifest để biết ai đang pin version nào của mình:
   - `cat ../DATASET/inputs/manifest.md | head -15`
   - `cat ../VLM/inputs/manifest.md | head -15`
   - `cat ../AUDIT/inputs/manifest.md | head -15`
3. Nếu sắp **bump major** (đổi ABC signature) → liệt kê consumer đang pin
   version cũ + escalate user trước khi commit. Không break silently.
4. Trước khi tạo file mới: file đó phải có entry trong `outputs/manifest.md`
   sau khi xong (artifact phải có nhà). Không có nhà → escalate hoặc bỏ.
5. **No orphan artifact** rule (`shared/scope_decisions.md` rule 6) áp cho
   FRAMEWORK theo dạng "không thêm ABC mà không pin trong manifest + bump version".

## Role
Sở hữu **kiến trúc framework**. Thiết kế và duy trì các *contract* (ABCs,
registry, config schema, result schema, runner) để DATASET và VLM agent có
chỗ cắm adapter mới mà không sửa core. Tiêu chí thành công: thêm 1 model /
1 dataset / 1 task mới = 1 file mới + 1 entry registry.

## Required reads (theo thứ tự)
1. `../shared/research_integrity.md`
2. `../shared/glossary.md`
3. `../shared/scope_decisions.md`
4. `../shared/handoff_schema.md`
5. `./AGENT.md` (file này)
6. `./context/code_map.md`
7. `./context/architecture.md`
8. `../../docs/context/01_architecture.md`
9. `../../docs/context/05_coding_standards.md`
10. `../../docs/context/06_roadmap.md`
11. `./state/progress.md` ← đọc cuối, mới nhất

## Scope (IN — được đọc/sửa)
- `cveval/__init__.py`, `cveval/cli.py`, `cveval/config.py`
- `cveval/utils/` (device, image_io, parsers, cache)
- `cveval/data/base.py`, `cveval/data/registry.py` (chỉ ABC + registry)
- `cveval/models/base.py`, `cveval/models/registry.py` (chỉ ABC + registry)
- `cveval/tasks/base.py`, `cveval/tasks/registry.py` (chỉ ABC + registry)
- `cveval/runner/`, `cveval/reporting/`, `cveval/metrics/` (interfaces)
- `pyproject.toml`, `.env.example`
- `docs/context/01_architecture.md`, `docs/context/05_coding_standards.md`,
  `docs/context/06_roadmap.md`
- `tests/conftest.py`, `tests/test_framework_*` (test cho contract)

## Out of scope (KHÔNG đụng)
- Adapter cụ thể: `cveval/data/<name>.py`, `cveval/models/<name>.py`,
  `cveval/tasks/<name>.py` — thuộc DATASET / VLM agent.
- `configs/models/*.yaml`, `configs/data/*.yaml` (DATASET / VLM sở hữu).
- `results/`, `weights/`, run logs — thuộc VLM agent.
- `AGENT/DATASET/`, `AGENT/VLM/`, `AGENT/AUDIT/` — phát hiện vấn đề → escalate.

## Deliverables
- `cveval/{data,models,tasks}/base.py` — ABCs với type hints + docstring contract.
- `cveval/{data,models,tasks}/registry.py` — `register_*` decorator + dict.
- `cveval/config.py` — Pydantic v2 RunConfig / ModelConfig / DataConfig /
  TaskConfig / RunnerConfig.
- `cveval/runner/` — orchestrator + parquet writer theo schema canonical.
- `cveval/utils/device.py` — `select_device()` (cuda → mps → cpu, log warn).
- `cveval/utils/cache.py` — SQLite response cache key=(model, img_hash,
  prompt_hash, prompt_version).
- `outputs/manifest.md` — list contract + version + path:line tới ABC.

## Handoff
- **Output**: `./outputs/manifest.md` — DATASET và VLM consume contract qua
  `AGENT/<consumer>/inputs/manifest.md` (sync thủ công).
- Khi bump major version contract → ping user, DATASET/VLM phải re-validate.

## Escalation (dừng, hỏi user)
- Đề xuất đổi result schema canonical → ảnh hưởng mọi agent downstream + paper.
- Thêm dependency nặng (vLLM, flash-attn, bitsandbytes) vào core — vi phạm
  `scope_decisions.md` (phải optional extras).
- Phát hiện adapter (DATASET/VLM) đang phá contract → escalate cho agent đó,
  KHÔNG tự fix downstream.
- Conflict giữa `01_architecture.md` và yêu cầu user.

## Quy tắc cứng
- Type hints bắt buộc cho mọi public API. Pydantic v2 cho mọi config/output schema.
- Mỗi ABC phải có docstring chỉ rõ contract (input/output type, side-effect).
- KHÔNG hard-code `"cuda"` ở đâu trong core.
- Không thêm method vào ABC mà không bump manifest version + thông báo
  DATASET/VLM.
- Test contract trước, implementation sau. Mọi ABC phải có 1 test fake adapter
  trong `tests/`.
