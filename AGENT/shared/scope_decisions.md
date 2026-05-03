# Scope Decisions (shared, frozen)

Các quyết định scope đã đóng. Subagent KHÔNG được tự lật. Lật → escalate user.

## 2026-05-03 — Khởi tạo agent system cho ConstructionVLM-Eval
- Tách 4 agent: **FRAMEWORK**, **DATASET**, **VLM**, **AUDIT**.
- Mỗi agent là context boundary tự đủ. Giao tiếp duy nhất qua manifest
  (`AGENT/<producer>/outputs/manifest.md` ↔ `AGENT/<consumer>/inputs/manifest.md`).
- KHÔNG đọc internals của nhau. Phát hiện vấn đề ngoài scope → escalate.

## Vertical slice ưu tiên (lock cho v0.1)
- 1 model open-source (Qwen2.5-VL-7B) × 1 task (`condition_classification`) ×
  1 dataset adapter (ConSynth-X Kaggle sample v6) chạy E2E.
- Lật scope (thêm closed-source, thêm task) chỉ sau khi slice xanh.

## Boundaries giữa các agent
- **FRAMEWORK** sản xuất ABCs, registry, runner, schema, config. KHÔNG implement
  adapter cụ thể (model/dataset/task) — chỉ định nghĩa contract.
- **DATASET** implement dataset adapter + benchmark task + citation/source mapping.
  KHÔNG sửa core framework. KHÔNG chạy model.
- **VLM** implement VLM adapter (HF + API), chạy benchmark, ghi results parquet.
  KHÔNG sửa core framework. KHÔNG sửa dataset adapter.
- **AUDIT** chỉ đọc (read-only audit). Phát hiện lỗi → ghi report + escalate
  cho agent chủ sở hữu, KHÔNG tự fix.

## Authoritative names
Xem `glossary.md`. Tránh nhầm tên dataset/model/task.

## Frozen rules (không lật không escalate)
1. Không hard-code `"cuda"` — luôn `cveval.utils.device.select_device()`.
2. Không mock dataset / fabricate predictions để "pipeline chạy được".
3. Không push `results/`, `weights/`, `*.arrow` vào git.
4. Không thêm dependency nặng (vLLM, flash-attn, bitsandbytes) vào core —
   phải là optional extras trong `pyproject.toml`.
5. Mọi run sinh `predictions.parquet` theo schema canonical
   (`docs/context/01_architecture.md`).
6. **No orphan artifact**: agent KHÔNG được tạo file code / spec / config mới
   nếu ABC / contract tương ứng chưa được pin trong `inputs/manifest.md` của
   chính agent đó. Task yêu cầu ABC chưa có (vd `BaseTask` v1 không đủ cho
   VQA 2-stage hay detection mask-IoU) → escalate **producer agent** (thường
   là FRAMEWORK) trước, KHÔNG patch tại agent của mình. Đây là rule chống
   "tự đẻ folder ngoài khung".
7. **Pre-flight sync bắt buộc**: mỗi session, agent consumer phải chạy
   pre-flight (xem block PRE-FLIGHT ở đầu `AGENT.md` của mỗi agent) để verify
   `inputs/manifest.md` version khớp với producer trước khi action. Mismatch →
   sync hoặc escalate, KHÔNG bypass.
