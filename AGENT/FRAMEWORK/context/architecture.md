# FRAMEWORK Architecture Notes

Bản tóm tắt cho FRAMEWORK agent. Nguồn gốc canonical:
[`docs/context/01_architecture.md`](../../../docs/context/01_architecture.md).

## Nguyên tắc bất di bất dịch

1. **4 layer tách biệt**: Data / Model / Task / Metric. Thay 1 layer không phá
   3 layer còn lại.
2. **Adapter mới = 1 file mới + 1 entry registry. KHÔNG sửa core.**
3. **Type-safe**: Python 3.10+, type hints public API, Pydantic v2 cho config.
4. **Reproducible**: mọi run dump `effective_config.yaml` + parquet schema canonical.
5. **Boundary**: Data không biết Model. Model không biết Task. Task không biết
   Model. Metric chỉ đọc parquet.

## [PROPOSED] Defaults cho 3 open questions (manifest v0.1.0, 2026-05-03)

1. **Runner concurrency**: sync sequential (`LocalRunner`) cho v0.1. Async cho API adapter ở runner riêng (sau).
2. **Cache key**: `(model, image_hash, prompt_hash, prompt_version, task)` — thêm `task` để tránh collision.
3. **Reporting**: nằm trong FRAMEWORK (`cveval/reporting/`) vì pure-read parquet, không coupling.

Defaults đã code vào skeleton. User confirm → chuyển sang `shared/scope_decisions.md`. Không confirm → escalate.
