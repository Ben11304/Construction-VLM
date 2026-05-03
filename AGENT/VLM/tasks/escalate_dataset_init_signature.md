# Task: Escalate ConSynthXDataset.__init__ contract mismatch

## ESCALATION
**Vấn đề**: `cveval.data.consynthx.ConSynthXDataset.__init__` dùng keyword-only
args (`*, data_root, root, conditions, n_per_condition, split`) thay vì nhận
`DataConfig` như FRAMEWORK contract → `LocalRunner` crash khi gọi
`self._dataset_cls(cfg.data)`.

**Bối cảnh**:
- Job `47271527` trên pitzer gpu-exp (host p0311) FAILED sau 8s với:
  `TypeError: ConSynthXDataset.__init__() takes 1 positional argument but 2 were given`
  (log: `jobs/logs/cveval-smolvlm-smoke-47271527.err`).
- FRAMEWORK manifest 0.1.0 ([cveval/data/base.py](../../../cveval/data/base.py))
  pin `BaseDataset.__init__(self, cfg: DataConfig)`; `tests/conftest.py:30`
  fake adapter cũng dùng `def __init__(self, cfg)`.
- LocalRunner ([cveval/runner/local_runner.py:67](../../../cveval/runner/local_runner.py))
  gọi `self._dataset_cls(cfg.data)`.
- ConSynthXDataset hiện ở `cveval/data/consynthx.py:151-159` khai báo
  `def __init__(self, *, data_root=None, root="cs10k", ...)`.
- DATASET manifest tự nhận **status: ready** với 9/9 REQUIRES_DATA tests pass —
  có thể tests build dataset trực tiếp bằng kwargs, không qua runner.

**Options**:
- A. DATASET sửa adapter `__init__(self, cfg: DataConfig)` và đọc
  `cfg.extra["data_root"], cfg.extra["root"], cfg.conditions, cfg.n_per_condition,
  cfg.split`. Tests cập nhật theo. (Đúng contract, ít rủi ro nhất.)
- B. FRAMEWORK đổi runner sang gọi adapter bằng kwargs từ DataConfig — phá vỡ
  BaseDataset ABC, breaking.
- C. VLM viết wrapper trong entry shim `jobs/run_with_models.py` dịch
  `DataConfig → kwargs` rồi monkey-patch. **Vi phạm scope VLM** + giấu lỗi.

**Đề xuất**: **Option A**. DATASET fix adapter để khớp ABC, thêm 1 unit test
`ConSynthXDataset(DataConfig(name="consynthx", extra={"root":"cs10k"}))` build
được mà không cần real shards (mock fs hoặc tmp_path).

**Chờ user**: Confirm escalate sang DATASET (option A)? Trong khi chờ, VLM
KHÔNG resubmit job — sẽ tốn budget gpu-exp vô ích.

## Trạng thái VLM
- Adapter SmolVLM xanh ở unit tests, đã verify load model thật trên V100S
  (job 47271527 đến tận `LocalRunner.run()` mới crash → adapter VLM chưa được
  gọi, bug ở khâu trước).
- Entry shim `jobs/run_with_models.py` import đủ 3 registry (data/model/task).
- Job artifacts: chưa có `results/<run_id>/` nào hợp lệ → outputs/manifest.md
  KHÔNG bump.
