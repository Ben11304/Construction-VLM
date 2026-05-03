# Audit Checklist

Mỗi audit pass kiểm các nhóm dưới đây. Finding ghi vào
`outputs/audit_report_<YYYY-MM-DD>.md` + append `state/findings.md`.

## A. Contract compliance

- [ ] Mỗi adapter dataset subclass `BaseDataset` (không lớp lai).
- [ ] Mỗi adapter VLM subclass `BaseVLM`.
- [ ] Mỗi task subclass `BaseTask`, exposed qua `register_task`.
- [ ] Adapter không import private symbol của agent khác.
- [ ] Manifest version 3 agent có khớp nhau (FRAMEWORK major == DATASET/VLM
      major đang pin)?

## B. Schema compliance

- [ ] `predictions.parquet` có đủ cột canonical:
      `model, dataset, condition, severity, image_id, task, prompt_version,
       raw_output, parsed, gt, score, latency_ms, tokens_in, tokens_out,
       cost_usd, error, run_id`.
- [ ] `parsed`, `gt`, `score` là JSON hợp lệ.
- [ ] `prompt_version` khớp với prompt YAML đang pinned.

## C. Reproducibility

- [ ] Mỗi `results/<run_id>/` có `effective_config.yaml`.
- [ ] Replay được từ config (dry-run smoke).
- [ ] `run_id` duy nhất trên toàn `results/`.

## D. Research integrity

- [ ] Mọi citation/DOI có verify; chưa verify → đánh `[VERIFY]`.
- [ ] Threshold/decoding param có nguồn (literature hoặc sensitivity).
- [ ] Không có dấu hiệu fabricate prediction / GT để pipeline xanh.
- [ ] Output không lẫn observation và interpretation (đặc biệt trong
      `*progress.md`, `*report*.md`).

## E. Manifest hygiene

- [ ] Artifact "ready" trong manifest tồn tại thực ở path khai báo.
- [ ] Schema mismatch giữa producer/consumer được ghi nhận, KHÔNG silent fix.
- [ ] Removed/Deprecated section đầy đủ — không xoá entry trực tiếp.

## F. Repo hygiene

- [ ] `.gitignore` chặn `results/`, `weights/`, `*.arrow`, `*.parquet`,
      `__pycache__/`, `.env`.
- [ ] Không có API key hardcode (`grep` cho pattern `sk-`, `AIza`, `xoxb-`, …).
- [ ] Dependency nặng (vLLM, flash-attn, bitsandbytes) ở optional extras
      trong `pyproject.toml`, không nằm core.

## G. Result sanity

- [ ] Accuracy không = 0 hay = 1 ngoài kỳ vọng.
- [ ] `latency_ms >= 0`, `tokens_in/out >= 0` khi không null.
- [ ] Per-condition row count cân đối với DataConfig (sample size khớp).
- [ ] Confusion matrix không có lớp 100% miss (red flag prompt sai).

## H. Severity scale (cho mọi finding)

- `info` — quan sát, không cần action.
- `warn` — drift / không vi phạm trực tiếp nhưng cần theo dõi.
- `error` — vi phạm contract / schema / hygiene; cần fix.
- `critical` — vi phạm research integrity / secret leak / fabrication;
  escalate user **ngay**, không chờ report định kỳ.
