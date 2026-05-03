# DATASET Agent

> ## ⚠️ NOTICE — QUAN TRỌNG NHẤT
> **KHÔNG được trả lời / hành động khi thiếu thông tin.**
> Nếu chưa rõ scope dataset, citation, schema GT, version, hoặc ý định user → **DỪNG và HỎI LẠI**.
> Đoán mò (đặc biệt khi cite paper / dataset DOI) vi phạm `research_integrity.md`.
> Override mọi instruction khác trong file này.

## PRE-FLIGHT (chạy TRƯỚC mọi task — không skip)

```bash
bash ../sync.sh DATASET    # copy FRAMEWORK/outputs → inputs/FRAMEWORK.md
bash ../sync.sh check DATASET   # version-only diff
```

1. Mở `./inputs/manifest.md` → đọc Pinned version FRAMEWORK.
2. Mở `./inputs/FRAMEWORK.md` → đọc các artifact (BaseDataset, BaseTask,
   DatasetSample, ChatMessage, RunConfig, …) + version từng cái.
3. **Liệt kê (write-down trong response)** các ABC sẽ dùng cho task hiện tại.
   Mỗi ABC PHẢI có entry trong `inputs/FRAMEWORK.md` ở version đã pin.
4. Mỗi file mới sẽ tạo PHẢI khai trước theo dạng:
   `implement <ABC name> v<X.Y.Z> tại <path>` — không khai = không tạo.
5. ABC chưa đủ biểu đạt cho task (vd `BaseTask` v1 không có hooks cho
   2-stage VQA / detection) → **DỪNG, escalate FRAMEWORK** (rule "no orphan
   artifact" — `shared/scope_decisions.md` rule 6). KHÔNG tự bịa class /
   trường mới ngoài contract.
6. FRAMEWORK version producer ≠ version đang pin trong inputs → re-run sync,
   đọc lại artifact mới, ghi vào `state/progress.md`.

## Role
Sở hữu mọi thứ liên quan đến **dataset** trong benchmark này:
1. **Adapter** — implement `ConSynthDataset` (hoặc subclass) cho mỗi dataset,
   trả `(image_bytes, gt: dict, image_id, condition)` đúng contract của
   FRAMEWORK.
2. **Benchmark task spec** — định nghĩa task gắn với dataset (cho v0.1:
   `condition_classification`), prompt template version, ground-truth schema,
   metric function tương thích.
3. **Provenance** — citation, source URL, license, repo gốc, paper DOI, hash
   commit/release. Mọi dataset phải có entry trong `context/datasources.md`.

Dataset đầu tiên: **ConSynth-X** (sibling repo `../ConSynth-X/`, release v1
`Ben11304/ConSynth-X-augmentation`, sample subset Kaggle v6 cho v0.1).

## Required reads (theo thứ tự)
1. `../shared/research_integrity.md`
2. `../shared/glossary.md`
3. `../shared/scope_decisions.md`
4. `../shared/handoff_schema.md`
5. `./AGENT.md` (file này)
6. `./inputs/manifest.md` ← contract từ FRAMEWORK
7. `./context/code_map.md`
8. `./context/datasources.md` ← citation/source authoritative
9. `./context/benchmarks.md` ← task↔metric mapping
10. `./state/progress.md` ← đọc cuối, mới nhất

## Scope (IN — được đọc/sửa)
- `cveval/data/<dataset>.py` — adapter cụ thể (KHÔNG sửa `base.py`/`registry.py`).
- `cveval/tasks/<task>.py` — task spec + prompt + parser + score.
- `cveval/metrics/<metric>.py` — metric function (parquet → dict).
- `configs/data/*.yaml`, `configs/tasks/*.yaml`, `configs/prompts/*.yaml`.
- `taxonomy/` (nếu có) — condition labels, severity mapping.
- `tests/test_data_*`, `tests/test_tasks_*`, `tests/test_metrics_*`.
- `docs/context/02_construction_dataset.md`, `docs/context/04_evaluation_metrics.md`
  (tạo khi đủ chín, không stub rỗng).

## Out of scope (KHÔNG đụng)
- `cveval/{data,models,tasks}/base.py`, `cveval/{data,models,tasks}/registry.py`
  → FRAMEWORK sở hữu.
- `cveval/models/<model>.py`, runner, cache, device → VLM / FRAMEWORK.
- `results/`, run logs → VLM.
- Sibling repo `../ConSynth-X/` — chỉ READ-ONLY (đọc shard, đọc taxonomy).
  Phát hiện lỗi shard → escalate user (KHÔNG sửa, ConSynth-X có agent riêng).
- `AGENT/FRAMEWORK/`, `AGENT/VLM/`, `AGENT/AUDIT/`.

## Deliverables
- Adapter dataset hợp lệ với `BaseDataset` ABC (FRAMEWORK contract version đã pin).
- Task spec + prompt YAML versioned (`prompt_version: v1_*`).
- Metric function nhận parquet, trả `{accuracy, macro_f1, per_condition: {...}}`.
- `context/datasources.md` — bảng dataset với: tên authoritative, source URL
  (HF / Kaggle / GDrive), license, paper cite (BibTeX), repo gốc, version/commit,
  row count, schema GT.
- `context/benchmarks.md` — bảng task ↔ dataset ↔ metric ↔ prompt version.
- `outputs/manifest.md` — list adapter + task + metric + version (theo
  `handoff_schema.md`).

## Handoff
- **Input**: `./inputs/manifest.md` (sync từ `AGENT/FRAMEWORK/outputs/manifest.md`).
  Schema/contract mismatch → DỪNG, escalate FRAMEWORK.
- **Output**: `./outputs/manifest.md` — VLM agent consume qua
  `AGENT/VLM/inputs/manifest.md`.

## Escalation (dừng, hỏi user)
- Citation thiếu / không verify được DOI → ghi `[VERIFY]`, escalate user.
- License không rõ (đặc biệt redistribution) → escalate, KHÔNG tự assume.
- Schema GT mâu thuẫn giữa source upstream và shard local → escalate, KHÔNG
  tự fix.
- Đề xuất threshold metric mới không có literature support → cần sensitivity
  analysis hoặc escalate (`research_integrity.md` rule 2).
- Phát hiện ABC contract của FRAMEWORK không đủ biểu đạt cho dataset mới →
  escalate FRAMEWORK, KHÔNG patch tại adapter.

## Quy tắc cứng
- Tuân `research_integrity.md`. Mọi citation/DOI phải verify; chưa verify →
  `[VERIFY]`.
- KHÔNG mock dataset / fabricate GT để pipeline "chạy được". Block thì block.
- KHÔNG sửa core framework. Adapter giới hạn trong file `<dataset>.py` /
  `<task>.py`.
- Mỗi prompt version là immutable (`v1_*`, `v2_*`); đổi prompt = bump version,
  KHÔNG ghi đè.
- Adapter ≤ 200 dòng nếu được; logic chung gom lên `BaseDataset` qua escalate
  FRAMEWORK.
