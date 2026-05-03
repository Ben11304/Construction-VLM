# ConstructionVLM-Eval — Plan

Framework đánh giá VLM/CV models trên ConSynth-X. Lấy cảm hứng kiến trúc từ
VLMEvalKit nhưng chuyên hoá cho construction-site robustness benchmarking
(condition severity, paired clean↔augmented, taxonomy-aware prompting).

## Nguyên tắc

1. **Open-source trước, closed-source sau.** Phase 1 chạy được trên Qwen2.5-VL,
   InternVL, LLaVA local; API adapter (GPT-4o, Claude, Gemini) thêm ở phase 2.
2. **GPU fallback chain:** `cuda → mps → cpu (cảnh báo)`. Mọi model loader đi
   qua một util `select_device()` chung. Không hard-code `cuda`.
3. **Build dần, vertical slice.** Tuần 1 = 1 model × 1 task × 1 dataset adapter
   chạy end-to-end. Mở rộng sau khi slice đầu xanh.
4. **Custom theo ConSynth-X là first-class:** condition severity axis, paired
   eval (clean↔aug), robustness AUC, taxonomy-aware prompts. Không phải
   afterthought.
5. **Mỗi model adapter ≤ 200 dòng.** Logic chung gom vào `BaseVLM` / mixin.
6. **Result schema thống nhất** (parquet) — slice ra leaderboard / robustness
   matrix / cost report đều từ 1 bảng.

## Phạm vi v0.1 (Phase 1)

- **Task:** `condition_classification` (7 lớp: clean, rain, rain_heavy,
  snow_light, snow_heavy, fog_heavy, night).
- **Models:** 1 open-source VLM trước (Qwen2.5-VL-7B), backend HF transformers
  với device fallback. vLLM optional sau.
- **Data:** Kaggle sample v6 (300/condition) — adapter đọc Arrow/JPEG bytes.
- **Metric:** accuracy + macro-F1 + per-condition breakdown + confusion matrix.
- **Output:** `results/<run_id>/predictions.parquet` + `metrics.json` +
  `leaderboard.md`.

## Cấu trúc thư mục

```
ConstructionVLM-Eval/
├── README.md
├── CLAUDE.md
├── pyproject.toml
├── .env.example
├── docs/
│   ├── PLAN.md                  # ← file này
│   ├── architecture.md          # (sau)
│   └── add_new_model.md         # (sau)
├── cveval/
│   ├── __init__.py
│   ├── cli.py                   # entry: `cveval run ...`
│   ├── config.py                # Pydantic Run/Model/Data/Task config
│   ├── utils/
│   │   ├── device.py            # select_device() cuda→mps→cpu
│   │   ├── image_io.py
│   │   ├── parsers.py           # robust label extraction
│   │   └── cache.py             # SQLite (model, img_hash, prompt_hash) → resp
│   ├── data/
│   │   ├── base.py              # ConSynthDataset ABC
│   │   ├── registry.py
│   │   └── kaggle_sample.py     # v6 adapter
│   ├── models/
│   │   ├── base.py              # BaseVLM ABC
│   │   ├── registry.py
│   │   └── opensource/
│   │       └── qwen_vl.py       # Qwen2-VL / Qwen2.5-VL via HF
│   ├── tasks/
│   │   ├── base.py              # BaseTask ABC
│   │   ├── registry.py
│   │   └── condition_cls.py
│   ├── metrics/
│   │   └── classification.py
│   ├── runners/
│   │   └── local_runner.py      # batched inference, resume từ cache
│   ├── prompts/
│   │   └── condition_cls/
│   │       ├── v1_simple.yaml
│   │       └── v2_definitions.yaml
│   └── reporting/
│       ├── leaderboard.py
│       └── confusion_matrix.py
├── configs/
│   ├── models/
│   │   └── qwen2_5_vl_7b.yaml
│   └── runs/
│       └── smoke_qwen.yaml
├── tests/
│   ├── test_device.py
│   ├── test_kaggle_loader.py
│   ├── test_parser.py
│   └── test_e2e_smoke.py
├── examples/
│   └── quickstart.md
└── results/                     # gitignored
```

## Roadmap

### Tuần 1 — Vertical slice (open-source, condition_cls)

| Day | Task |
|-----|------|
| 1 | Repo skeleton + `pyproject.toml` + `utils/device.py` + tests cho device fallback |
| 2 | `data/kaggle_sample.py` — load v6, iterate `(image, gt_condition, image_id)` |
| 3 | `BaseVLM` + `BaseTask` ABC; `tasks/condition_cls.py` + parser + 2 prompt YAML |
| 4 | `models/opensource/qwen_vl.py` — HF transformers loader với device fallback |
| 5 | `runners/local_runner.py` + CLI; smoke run 10 ảnh/cond × 1 model E2E |

**Deliverable cuối tuần 1:**

```bash
cveval run \
  --model qwen2.5-vl-7b \
  --task condition_cls \
  --data kaggle_v6 \
  --n-per-condition 10 \
  --prompt v2_definitions \
  --out results/smoke_001/
```

→ `predictions.parquet` (70 rows) + `metrics.json` + `leaderboard.md`.

### Tuần 2 — Mở rộng + reporting

- Thêm 1-2 open-source VLM nữa (InternVL3 hoặc LLaVA-OneVision)
- `reporting/`: confusion matrix PNG, per-condition heatmap markdown
- Prompt v1 vs v2 ablation (100/cond)
- Cache layer (SQLite) — resume miễn phí khi crash
- Documentation: `add_new_model.md`

### Tuần 3+ — Phase 2 (sau khi v0.1 ổn)

- Closed-source API adapters (OpenAI / Anthropic / Gemini / Qwen-VL-Max)
- Paired eval (clean ↔ augmented) → ΔAcc, ΔmAP
- Detection task (bbox + mAP) cho YOLO baseline so sánh với VLM grounding
- Robustness AUC over severity axis
- HF Space demo

## Decisions

| # | Quyết định | Giá trị |
|---|------------|---------|
| 1 | Vị trí repo | `./ConstructionVLM-Eval/` (sibling của ConSynth-X) |
| 2 | Phase 1 ưu tiên | open-source VLM, condition classification |
| 3 | Device strategy | `cuda → mps → cpu` (cảnh báo + giảm batch) |
| 4 | Backend open-source | HF transformers (v0.1); vLLM optional sau |
| 5 | Storage | Parquet + DuckDB query, không cần DB server |
| 6 | Prompt format | YAML + Jinja2 (cho A/B test versions) |
| 7 | License | Apache 2.0 |
| 8 | CLI | `cveval` |

## Risks

| Risk | Mitigation |
|------|------------|
| Không GPU → Qwen2.5-VL-7B chạy MPS/CPU rất chậm | Fallback chain + batch=1 + chỉ smoke 10/cond ở Day 5; full run khi có GPU |
| VLM output JSON bẩn → parser crash | Robust parser: JSON → markdown fence strip → regex → fallback `unknown` |
| Kaggle sample format thay đổi | Adapter version-pin theo Kaggle revision (v6); test_kaggle_loader assert schema |
| Scope creep sang detection / VLM jury / API trước khi v0.1 ổn | Tuân thủ roadmap, mọi feature mới phải sau khi vertical slice xanh |

## Definition of Done — v0.1

- [ ] `pip install -e .` thành công trên môi trường Huy
- [ ] `pytest` pass (device, loader, parser, e2e smoke)
- [ ] Chạy được smoke command ở mục Tuần 1 → ra parquet + metrics
- [ ] `docs/add_new_model.md` viết bằng cách thêm model thứ 2 thật
- [ ] README có 3 commands chính + cost/latency note
