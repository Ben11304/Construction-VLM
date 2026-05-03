# 01 — Architecture

## 4 layer tách biệt

Thay 1 layer không phá 3 layer còn lại. Mỗi adapter mới = 1 file mới + 1 entry
registry; **không sửa core**.

| Layer | Module | ABC / contract |
|-------|--------|----------------|
| Data | `cveval/data/` | `ConSynthDataset` — `iter() -> (image_bytes, gt: dict, image_id, condition)` |
| Model | `cveval/models/` | `BaseVLM` — `generate(messages, **kw) -> str` |
| Task | `cveval/tasks/` | `BaseTask` — `build_prompt + parse_output + score` |
| Metric | `cveval/metrics/` | function-style, nhận parquet → dict |

## Data flow

```
ConSynthDataset.iter()
  └─→ Task.build_prompt(row, condition)  [+ prompt YAML template]
        └─→ BaseVLM.generate(messages)   [device-aware loader]
              └─→ Task.parse_output(raw) [robust JSON/regex]
                    └─→ Task.score(parsed, gt)
                          └─→ Runner ghi 1 row vào predictions.parquet
                                └─→ Metric.aggregate(parquet) → metrics.json
                                      └─→ Reporting → leaderboard.md / png
```

## Result schema (canonical, parquet)

Mọi run xuất 1 bảng duy nhất. Slice ra mọi report đều từ đây.

| col | type | bắt buộc | ví dụ |
|-----|------|----------|-------|
| `model` | str | ✓ | `qwen2.5-vl-7b` |
| `dataset` | str | ✓ | `consynthx_kaggle_v6` |
| `condition` | str | ✓ | `rain_heavy` |
| `severity` | str \| null | — | `heavy` |
| `image_id` | str | ✓ | `cs10k_000123` |
| `task` | str | ✓ | `condition_cls` |
| `prompt_version` | str | ✓ | `v2_definitions` |
| `raw_output` | str | ✓ | (full text) |
| `parsed` | json | ✓ | `{"condition":"rain"}` |
| `gt` | json | ✓ | `{"condition":"rain_heavy"}` |
| `score` | json | ✓ | `{"correct":0}` |
| `latency_ms` | int | ✓ | 1834 |
| `tokens_in` / `tokens_out` | int \| null | — | — |
| `cost_usd` | float \| null | — | — |
| `error` | str \| null | — | — |
| `run_id` | str | ✓ | `2026-04-30_smoke_001` |

## Config hierarchy

Pydantic v2 models, YAML files load thành config:

```
RunConfig
├── ModelConfig    (configs/models/<name>.yaml)
├── DataConfig     (configs/data/<name>.yaml hoặc inline)
├── TaskConfig     (task name + prompt_version)
└── RunnerConfig   (batch_size, device, max_samples, cache_dir, out_dir)
```

CLI flags override YAML; YAML override defaults. Mọi run dump `effective_config.yaml`
vào `out_dir/` để reproduce.

## Device strategy

Một util duy nhất, mọi loader đi qua:

```python
# cveval/utils/device.py
def select_device(prefer: str | None = None) -> str:
    """cuda → mps → cpu, cảnh báo nếu fallback xuống cpu."""
```

Nếu fallback xuống `cpu` hoặc `mps`: tự động `batch_size=1`, log warning, vẫn
chạy. Không raise.

## Registry pattern

```python
# cveval/models/registry.py
MODEL_REGISTRY: dict[str, type[BaseVLM]] = {}

def register_model(name: str):
    def deco(cls):
        MODEL_REGISTRY[name] = cls
        return cls
    return deco
```

Mỗi adapter:

```python
@register_model("qwen2.5-vl-7b")
class QwenVL(BaseVLM): ...
```

Tương tự cho `DATASET_REGISTRY`, `TASK_REGISTRY`.

## Caching

SQLite ở `~/.cache/cveval/responses.db`, key = `(model, image_hash, prompt_hash,
prompt_version)`. Trước mỗi `generate()` check cache; có thì skip API/forward
pass. Resume miễn phí khi crash.

## Boundaries

- Data layer **không biết** model nào sẽ chạy.
- Model layer **không biết** task nào sẽ score.
- Task layer **không biết** model nào generate output.
- Metric layer **chỉ** đọc parquet, không gọi model/data.
