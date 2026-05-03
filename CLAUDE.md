# ConstructionVLM-Eval — Agent Instructions

Framework đánh giá VLM / CV models trên dataset **ConSynth-X** (sibling repo
`../ConSynth-X/`). Kiến trúc kiểu VLMEvalKit nhưng chuyên hoá cho **condition
severity, paired clean↔augmented eval, taxonomy-aware prompting, robustness
AUC** — đây là USP, không được coi nhẹ.

## Triết lý cốt lõi

1. **Modular & Scalable** — thêm model/dataset/task mới = 1 file mới + 1 entry
   registry. Không sửa core.
2. **Type-Safe** — Python 3.10+, type hints bắt buộc cho public API, Pydantic v2
   cho mọi config / output schema.
3. **Reproducible** — mọi run sinh parquet theo schema canonical + log config
   đầy đủ; có thể replay bằng cùng config.
4. **ConSynth-X-first** — condition severity, paired eval, taxonomy prompts là
   first-class, không phải afterthought.
5. **Vertical slice trước, mở rộng sau** — open-source × condition_cls × Kaggle
   v6 chạy E2E rồi mới mở rộng. Không tham lam.

## Bản đồ tri thức (đọc trước khi viết code)

| Khi làm việc với... | Đọc trước |
|---------------------|-----------|
| Layer boundaries, result schema, data flow | [docs/context/01_architecture.md](docs/context/01_architecture.md) |
| ConSynth-X taxonomy, Kaggle v6 schema, condition labels | [docs/context/02_construction_dataset.md](docs/context/02_construction_dataset.md) |
| Thêm model mới, BaseVLM ABC, device fallback | [docs/context/03_vlm_interfaces.md](docs/context/03_vlm_interfaces.md) |
| Metric: classification, robustness AUC, paired Δ | [docs/context/04_evaluation_metrics.md](docs/context/04_evaluation_metrics.md) |
| Code style, naming, comment policy, dependency rules | [docs/context/05_coding_standards.md](docs/context/05_coding_standards.md) |
| Đang ở Day nào, làm gì tiếp theo | [docs/context/06_roadmap.md](docs/context/06_roadmap.md) |

> v0.1 chỉ có 3 file thực sự (`01`, `05`, `06`); `02–04` sẽ tạo khi nội dung đủ
> chín — không tạo stub rỗng.

## Cấm

- Hard-code `"cuda"` — luôn dùng `cveval.utils.device.select_device()`
  (`cuda → mps → cpu` + cảnh báo).
- Implement closed-source API adapter trước khi open-source slice xanh.
- Mock dataset / fabricate predictions để pipeline "chạy được". Block thì block,
  không bypass.
- Push `results/`, `weights/`, `*.arrow` vào git.
- Tạo `*.md` planning/summary docs trừ khi user yêu cầu.
- Thêm dependency nặng (vLLM, flash-attn, bitsandbytes) vào core — phải là
  optional extras trong `pyproject.toml`.

## Workflow

1. Đọc [docs/context/06_roadmap.md](docs/context/06_roadmap.md) → xác định Day
   hiện tại.
2. Đọc file context tương ứng với layer đang chạm vào.
3. Làm đúng 1 mục, viết test, chạy `pytest`.
4. Update `06_roadmap.md` checkbox / Decisions nếu có thay đổi thiết kế.
5. Không nhảy Day nếu Day hiện tại chưa xanh.
