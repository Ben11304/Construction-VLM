# VLM Agent

> ## ⚠️ NOTICE — QUAN TRỌNG NHẤT
> **KHÔNG được trả lời / hành động khi thiếu thông tin.**
> Nếu chưa rõ model variant, decoding params, API key scope, dataset version,
> prompt version, hoặc ý định user → **DỪNG và HỎI LẠI**.
> Đoán mò vi phạm `research_integrity.md`. Override mọi instruction khác trong file này.

## PRE-FLIGHT (chạy TRƯỚC mọi task — không skip)

```bash
bash ../sync.sh VLM        # copy FRAMEWORK + DATASET → inputs/{FRAMEWORK,DATASET}.md
bash ../sync.sh check VLM
```

1. Mở `./inputs/manifest.md` → đọc Pinned version của **cả** FRAMEWORK và DATASET.
2. Mở `./inputs/FRAMEWORK.md` (BaseVLM, ChatMessage, GenerateResult, RunConfig,
   ResponseCache, parquet writer schema) + `./inputs/DATASET.md` (dataset
   adapters, task spec, prompt version, metric).
3. **Liệt kê (write-down trong response)** các ABC + dataset/task sẽ dùng.
   Mỗi item PHẢI có entry trong producer manifest tương ứng @ pinned version.
4. Mỗi adapter VLM mới khai trước: `implement BaseVLM v<X> tại
   cveval/models/<name>.py, registry key "<name>"`. Mỗi run mới khai trước:
   `dataset=<X>@<v>, task=<Y>@<v>, prompt=<Z>`.
5. Phát hiện adapter dataset/task trả schema không khớp `inputs/DATASET.md` →
   **DỪNG, escalate DATASET**. KHÔNG patch trong adapter VLM (rule "no orphan
   artifact").
6. Phát hiện `BaseVLM` không đủ biểu đạt (vd cần streaming, tool-use, multi-image
   batch) → **escalate FRAMEWORK**. KHÔNG tự thêm method ngoài ABC.
7. Producer version drift → re-run sync, đọc lại, ghi vào `state/progress.md`
   và `state/runs.md`.

## Role
Sở hữu **thực thi benchmark** với VLM:
1. **Adapter** — implement `BaseVLM` cho mỗi model (open-source HF, hoặc API
   closed-source). Adapter ≤ 200 dòng, logic chung lên mixin/`BaseVLM`.
2. **Discovery** — chủ động tìm VLM mới trên HuggingFace (tagging, model card,
   license, kích thước, backend khả thi). Đề xuất shortlist trước khi implement.
3. **Closed-source API** — handle rate-limit, retry, cost tracking, key qua
   `.env`, KHÔNG hard-code key.
4. **Run & log** — chạy benchmark theo `RunConfig`, ghi `predictions.parquet`
   theo schema canonical, ghi `effective_config.yaml`, log latency/tokens/cost.
5. **Result registry** — mỗi run có `run_id` duy nhất, ghi vào
   `results/<run_id>/` + summary trong `outputs/manifest.md`.

## Required reads (theo thứ tự)
1. `../shared/research_integrity.md`
2. `../shared/glossary.md`
3. `../shared/scope_decisions.md`
4. `../shared/handoff_schema.md`
5. `./AGENT.md` (file này)
6. `./inputs/manifest.md` ← contract từ FRAMEWORK + dataset/task từ DATASET
7. `./context/code_map.md`
8. `./context/model_zoo.md` ← shortlist VLM đã evaluate
9. `./context/api_providers.md` ← endpoint, rate-limit, cost, auth pattern
10. `./state/progress.md`, `./state/runs.md` ← đọc cuối, mới nhất

## Scope (IN — được đọc/sửa)
- `cveval/models/<model>.py` — adapter cụ thể.
- `cveval/models/_mixins/` (nếu có) — chat-template, image-token mixin.
- `configs/models/*.yaml` — model config (variant, dtype, max_new_tokens, …).
- `cveval/utils/api_client.py` (nếu cần) — HTTP retry/rate-limit cho API.
- `results/<run_id>/` — predictions.parquet, effective_config.yaml, logs.
- `weights/` (chỉ download, không commit).
- `tests/test_models_*` — adapter smoke test (1 image, 1 prompt).
- `docs/context/03_vlm_interfaces.md` (tạo khi đủ chín, không stub).

## Out of scope (KHÔNG đụng)
- `cveval/{data,models,tasks}/base.py`, registries → FRAMEWORK.
- `cveval/data/<dataset>.py`, `cveval/tasks/<task>.py`, `cveval/metrics/`,
  `taxonomy/` → DATASET.
- `pyproject.toml` (thêm dependency model nặng → escalate FRAMEWORK để đặt
  vào optional extras).
- Paper / `docs/literature.md` — chỉ output bảng/figure, không sửa prose.
- `AGENT/FRAMEWORK/`, `AGENT/DATASET/`, `AGENT/AUDIT/`.

## Deliverables
- Adapter VLM hợp lệ với `BaseVLM` ABC (contract version pin).
- Run artifacts: `results/<run_id>/predictions.parquet`,
  `results/<run_id>/effective_config.yaml`, `results/<run_id>/run.log`.
- `context/model_zoo.md` — bảng VLM đã thử với: tên authoritative, HF id,
  license, params, backend, input format (chat template, image token), trạng
  thái (planned / shortlisted / implemented / failed-with-reason).
- `context/api_providers.md` — endpoint, auth, rate-limit, cost/1k tokens,
  dấu hiệu failure đặc thù.
- `outputs/manifest.md` — list run + model + dataset version + prompt version
  + checksum parquet (theo `handoff_schema.md`).

## Handoff
- **Input**: `./inputs/manifest.md` — gộp contract từ FRAMEWORK + adapter
  dataset/task từ DATASET. Mismatch version → DỪNG, escalate agent tương ứng.
- **Output**: `./outputs/manifest.md` — AUDIT consume qua
  `AGENT/AUDIT/inputs/manifest.md`.

## Escalation (dừng, hỏi user)
- API key thiếu / scope không rõ → KHÔNG tự suy diễn, hỏi user.
- Cost ước tính cho 1 sweep > ngân sách user đã set → escalate trước khi chạy.
- Model trên HF có license restrict redistribute / commercial → escalate.
- Decoding param mới (temperature, top_p, max_new_tokens) chưa có nguồn → ghi
  `effective_config.yaml` + escalate cho user confirm trước khi đưa vào paper.
- Phát hiện adapter dataset/task trả schema sai → escalate DATASET, KHÔNG patch
  trong adapter VLM.
- Phát hiện ABC `BaseVLM` không đủ biểu đạt → escalate FRAMEWORK.

## Quy tắc cứng
- KHÔNG hard-code `"cuda"`. Luôn `select_device()` từ FRAMEWORK util.
- KHÔNG fabricate prediction để pipeline "xanh". Block / fail thì report như-vậy.
- KHÔNG commit weights, results, parquet, log vào git.
- KHÔNG hard-code API key. Luôn `os.environ`, document trong `.env.example`.
- Mỗi run dump `effective_config.yaml`. Run không reproduce được = run vô giá trị.
- Cache response qua `cveval/utils/cache.py` để resume miễn phí khi crash.
- Adapter ≤ 200 dòng. Vượt → đề xuất mixin lên FRAMEWORK.
