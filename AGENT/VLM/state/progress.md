# VLM Progress (newest on top)

## 2026-05-03 — Job 47271560 COMPLETED — first end-to-end run xanh
- Pulled DATASET 1.1.1 (init signature fix), VLM `inputs/manifest.md` re-synced.
- Resubmitted: pitzer:47271560 / gpu-exp / p0311 (V100S-32G), elapsed 51s.
- Artifacts: `results/smoke_smolvlm_condcls_v1/{predictions.parquet (12K, 30
  rows, sha256 5fe8fe…7868), effective_config.yaml, summary.json}`.
- Pipeline xanh: parse_error 1/30, latency p50=574ms / p95=1109ms, tokens_out
  total=219.
- Smoke metrics (sanity, KHÔNG dùng cho paper, n=5/cond): overall acc=0.267;
  rain=0.4, snow_light=1.0, rain_heavy/snow_heavy/fog_heavy=0.0, night=0.2.
  Kỳ vọng cho 256M model — quyết định không tune prompt cho SmolVLM, chỉ là
  smoke. Khi Qwen-7B online sẽ replicate setup này.
- `outputs/manifest.md` 0.0.0 → 0.1.0, thêm entry `run:smoke_smolvlm_condcls_v1`.

## 2026-05-03 — Job 47271527 FAILED → escalate DATASET (init signature)
- Job 47271459 FAILED 6s: `module load cuda` no version + adapter chưa import
  → fixed bằng `module load pytorch/2.8.0` + import data/task adapter trong
  entry shim.
- Job 47271527 FAILED 8s: torch 2.8 + cuda OK (V100S-32G), nhưng:
  `TypeError: ConSynthXDataset.__init__() takes 1 positional argument but 2 were given`.
  Adapter dùng kwargs-only thay vì nhận `DataConfig` như BaseDataset ABC.
- Escalation viết tại
  `AGENT/VLM/tasks/escalate_dataset_init_signature.md` (option A: DATASET fix
  adapter để khớp ABC). VLM KHÔNG resubmit job + KHÔNG patch dataset → đúng
  scope rule.
- outputs/manifest.md vẫn 0.0.0 (chưa có run hợp lệ).

## 2026-05-03 — Submitted SmolVLM smoke run on Pitzer gpu-exp
- DATASET đã pin v1.1.0 (consynthx + condition_cls + classification metric, 9/9
  REQUIRES_DATA tests pass) — unblock end-to-end run.
- New: `configs/runs/consynthx_condition_cls_smolvlm_smoke.yaml` (5×6 = 30 rows,
  cs10k root, /fs/scratch/PGS0407/binben14/ConSynth-X-release-v1).
- New: `jobs/run_with_models.py` — entry pre-imports `cveval.models.smolvlm`
  rồi forward sang `cveval.cli` (FRAMEWORK chưa auto-load adapter; KHÔNG sửa
  framework, dùng entry shim).
- New: `jobs/smolvlm_condcls_smoke.sbatch` — pitzer gpu-exp, 1 GPU, 32G,
  45min, account=pgs0407, HF cache → /fs/scratch.
- Submitted: **job 47271459** on cluster pitzer (PENDING).

## 2026-05-03 — SmolVLM adapter implemented + tests xanh
- `cveval/models/smolvlm.py` (≤120 dòng): `@register_model("smolvlm-256m")`,
  HF transformers (`AutoProcessor` + `AutoModelForVision2Seq`), device qua
  `select_device()`, dtype từ `ModelConfig.dtype`, telemetry (latency_ms,
  tokens_in, tokens_out). Generic — đổi `extra.hf_id` dùng được cho 500M/2.2B.
- `tests/test_models_smolvlm.py`: 3 unit (registry, msg conversion, generate
  với mock transformers) — xanh trên python 3.10. 1 live test (load model thật)
  skip mặc định, mở bằng `CVEVAL_RUN_VLM_DOWNLOAD=1`.
- `configs/models/smolvlm_256m.yaml` chỉnh khớp `cveval.config.ModelConfig`
  (backend=hf, extra.hf_id, extra.device_pref).
- Adapter KHÔNG phụ thuộc DATASET — chấp nhận `list[ChatMessage]` raw, không
  biết task nào gọi. Unblocked, không vi phạm Rule 0.

## 2026-05-03 — SmolVLM-256M shortlisted (smoke-test)
- Verified HF id `HuggingFaceTB/SmolVLM-256M-Instruct`, license Apache-2.0,
  arch Idefics3 (SigLIP-93M + SmolLM2-135M), BF16, chat template chuẩn HF
  qua `processor.apply_chat_template`. Source: HF model card 2026-05-03.
- `context/model_zoo.md`: thêm row SmolVLM-256M (status=shortlisted), bỏ
  `[VERIFY]`. Qwen2.5-VL-7B vẫn `[VERIFY]`.
- `configs/models/smolvlm_256m.yaml` scaffolded — chưa có adapter.
- Adapter `cveval/models/smolvlm.py` vẫn block bởi DATASET 0.0.0 (chưa pin
  `condition_cls` prompt + GT schema).

## 2026-05-03 — Agent bootstrapped
- AGENT.md, code_map.md, model_zoo.md, api_providers.md created.
- Chưa có adapter nào.
- Open-source v0.1: Qwen2.5-VL-7B planned, license + HF id còn `[VERIFY]`.
- Closed-source: Phase 2, tất cả provider entry còn `[VERIFY]`.
- Chờ FRAMEWORK pin `BaseVLM` + runner v1.0.0 và DATASET pin
  `consynthx_kaggle_v6` + `condition_cls` trước khi implement adapter Qwen.
