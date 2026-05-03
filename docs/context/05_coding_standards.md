# 05 — Coding Standards

## Python

- **Version:** Python 3.10+ (cú pháp `match`, `X | Y` union, `list[T]` generic).
- **Type hints:** bắt buộc cho mọi public API (class, function tham số + return).
  Private helper có thể bỏ qua nếu hiển nhiên.
- **Pydantic v2** cho mọi config + output schema. Không dùng dataclass cho user-
  facing config (mất validation).
- **Format:** ruff (line length 100). Import order: stdlib → 3rd-party → local.
- **Logging:** `logging` module (không `print` trong library code). CLI có thể
  dùng `rich` cho output đẹp.

## File & module

- Mỗi **model adapter ≤ 200 dòng**. Logic chung gom vào `BaseVLM` mixin.
- Mỗi **task ≤ 250 dòng**. Tách prompt template ra YAML, không nhúng string dài
  trong .py.
- Một class / một concept per file. Không gom 5 model vào `models.py`.

## Comments

- **Default: không comment.** Tên hàm/biến tự giải thích WHAT.
- **Chỉ comment WHY** khi non-obvious: invariant ẩn, workaround cho bug cụ thể,
  ràng buộc từ external API.
- Không docstring kiểu "this function does X" lặp lại signature. Docstring chỉ
  viết khi có behavior không suy được từ signature.
- Không comment kiểu `# added for issue #123`, `# used by foo.py` — rot nhanh.

## Error handling

- **Validate ở boundary:** user input (CLI args, YAML), external API response.
- **Trust internal:** không try/except quanh code mình kiểm soát.
- Parser của task **phải robust** — VLM output bẩn là norm, không phải edge
  case. Fallback chain: structured JSON → markdown fence strip → regex → label
  `unknown` + log raw vào parquet `error` column.
- Không bao giờ swallow exception lặng lẽ. Re-raise hoặc log ở mức ERROR.

## Dependencies

`pyproject.toml` chia rõ:

```toml
[project]
dependencies = [
    "pydantic>=2",
    "pyyaml",
    "pandas",
    "pyarrow",
    "Pillow",
    "torch",          # core
    "transformers",   # core
    "rich",
    "typer",
]

[project.optional-dependencies]
vllm = ["vllm"]
api = ["openai", "anthropic", "google-generativeai"]
viz = ["matplotlib", "seaborn"]
dev = ["pytest", "pytest-asyncio", "ruff", "mypy"]
```

- **Cấm** thêm vào `dependencies` core: `vllm`, `flash-attn`, `bitsandbytes`,
  bất kỳ API SDK nào.
- Mỗi adapter import dependency riêng **bên trong** `__init__` hoặc `generate`,
  không top-level — để repo install được khi chưa có dep đó.

## Testing

- `pytest` ở `tests/`. Mỗi PR phải có test cho code mới.
- Smoke test E2E phải dùng **fixture ảnh thật** (1-2 ảnh trong `tests/fixtures/`),
  không generate dummy tensor.
- Test parser: ≥ 10 mẫu output bẩn (markdown fences, partial JSON, extra
  commentary, sai label).
- Test device fallback: mock `torch.cuda.is_available()` + `torch.backends.mps.is_available()`.

## Naming

- Module: `snake_case`. Class: `PascalCase`. Constant: `UPPER_SNAKE`.
- Model adapter class kết thúc bằng `VLM` (e.g. `QwenVL`, `InternVLM`).
- Task class kết thúc bằng `Task` (e.g. `ConditionClassificationTask`).
- Registry key: lowercase với dấu `-` hoặc `.`, version-aware
  (`qwen2.5-vl-7b`, `gpt-4o`, `claude-opus-4-7`).

## Cấm cụ thể

- `cuda` literal trong code (chỉ cho phép trong `select_device()` impl).
- `os.path` — dùng `pathlib.Path`.
- Tuyệt đối path trong code/config (luôn relative-to-repo hoặc env var).
- Mock dataset / fabricate predictions để pipeline pass.
- Emoji trong code, log, output (trừ khi user yêu cầu).
- Comment `# TODO` không có context — thay bằng issue trên repo hoặc xoá.

## Reproducibility

- Mọi run dump `effective_config.yaml` + `git_sha.txt` vào `out_dir/`.
- Seed mặc định = 42, cho phép override qua config.
- Pin model revision (HF SHA) trong `configs/models/<name>.yaml`, không lấy
  `main` branch.
