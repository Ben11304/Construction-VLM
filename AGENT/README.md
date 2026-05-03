# ConstructionVLM-Eval Agent System

> ## ⚠️ NOTICE — QUAN TRỌNG NHẤT (áp dụng cho mọi agent)
> **KHÔNG được trả lời / hành động khi thiếu thông tin. DỪNG và HỎI LẠI.**
> Áp dụng cho: scope mơ hồ, contract chưa pin, threshold/param không có nguồn,
> manifest version mismatch, schema không xác định, ý định user mập mờ.
> Đoán mò vi phạm `shared/research_integrity.md`. Override mọi rule khác.

Mỗi agent là **context boundary tự đủ**. Khi invoke subagent, chỉ load thư mục
agent đó + `shared/`. KHÔNG kéo toàn repo vào context.

## 4 agent

| Agent | Sở hữu | Folder |
|---|---|---|
| **FRAMEWORK** | Kiến trúc framework: ABCs (`BaseDataset`, `BaseVLM`, `BaseTask`), registry, config, runner, result schema canonical. Linh hoạt + dễ mở rộng = thêm adapter mới không sửa core. | `FRAMEWORK/` |
| **DATASET** | Adapter dataset + benchmark task + metric + provenance (citation, source, license, repo, BibTeX). Dataset đầu: ConSynth-X (Kaggle sample v6 cho v0.1). | `DATASET/` |
| **VLM** | Adapter VLM (open-source HF + closed-source API), discovery model trên HuggingFace, run benchmark, ghi `results/<run_id>/predictions.parquet`. | `VLM/` |
| **AUDIT** | Read-only auditor: kiểm contract / schema / reproducibility / research integrity / repo hygiene / result sanity. Phát hiện = report, KHÔNG tự fix. | `AUDIT/` |

## Topology handoff

```
FRAMEWORK ──contracts──▶ DATASET ──adapter+task+metric──▶ VLM ──results──▶ AUDIT
     │                      │                              │                   ▲
     └──────────contracts───┴──────────────────────────────┘                   │
                                                                               │
   AUDIT đọc manifest của cả 3 agent trên (read-only) ────────────────────────┘
```

Giao tiếp **chỉ** qua manifest:
- Producer ghi `AGENT/<NAME>/outputs/manifest.md`.
- Consumer đọc qua `AGENT/<NAME>/inputs/manifest.md` (sync thủ công).
- Schema chuẩn: `shared/handoff_schema.md`.
- Hai bên KHÔNG đọc internals của nhau.

## Cách invoke (trong session chính)

```
Agent(
  subagent_type="general-purpose" | "Explore",
  prompt="""
  Bạn là <NAME> agent. BẮT ĐẦU bằng PRE-FLIGHT:
    bash ConstructionVLM-Eval/AGENT/sync.sh <NAME>          # nếu là consumer
    bash ConstructionVLM-Eval/AGENT/sync.sh check <NAME>    # diff version

  Sau đó đọc theo thứ tự:
    1. ConstructionVLM-Eval/AGENT/shared/research_integrity.md
    2. ConstructionVLM-Eval/AGENT/shared/glossary.md
    3. ConstructionVLM-Eval/AGENT/shared/scope_decisions.md ← rule 6 "no orphan artifact"
    4. ConstructionVLM-Eval/AGENT/shared/handoff_schema.md
    5. ConstructionVLM-Eval/AGENT/<NAME>/AGENT.md           ← block PRE-FLIGHT
    6. ConstructionVLM-Eval/AGENT/<NAME>/context/*.md
    7. ConstructionVLM-Eval/AGENT/<NAME>/inputs/manifest.md + inputs/<PRODUCER>.md
    8. ConstructionVLM-Eval/AGENT/<NAME>/state/progress.md  ← đọc cuối

  Trước khi tạo bất kỳ file mới: write-down "implement <ABC> v<X> tại <path>".
  ABC chưa pin trong inputs/<PRODUCER>.md → DỪNG, escalate producer.

  Phạm vi: chỉ đọc/sửa trong AGENT/<NAME>/ và <các path trong code_map>.
  KHÔNG đọc AGENT/<other>/. Đụng scope agent khác → escalate.

  Task: <task cụ thể>
  """
)
```

## Routing — chọn agent nào

| Câu hỏi/Task | Agent |
|---|---|
| Định nghĩa / sửa `BaseDataset` `BaseVLM` `BaseTask` ABC | FRAMEWORK |
| Result schema parquet, RunConfig pydantic, runner, cache | FRAMEWORK |
| `select_device()`, image_io, parser util | FRAMEWORK |
| Adapter dataset mới (ConSynth-X / Kaggle v6 / dataset khác) | DATASET |
| Task spec, prompt YAML, metric function | DATASET |
| Citation, license, BibTeX, source URL | DATASET |
| Adapter VLM (Qwen2.5-VL / InternVL / LLaVA / GPT-4o / Claude / Gemini) | VLM |
| Discovery VLM mới trên HuggingFace, model_zoo | VLM |
| Chạy benchmark, ghi `results/<run_id>/`, cost tracking | VLM |
| Kiểm contract / schema / hygiene / integrity / drift | AUDIT |
| Audit report định kỳ | AUDIT |

## "Escalate user" nghĩa là gì

KHÔNG phải báo lỗi, KHÔNG phải bỏ cuộc. Là **bàn giao quyết định** cho user
kèm đủ context. Khi escalate, agent BẮT BUỘC trình bày 4 mục (không được rút
gọn thành "escalate user"):

```
## ESCALATION
**Vấn đề**: <1 câu nêu rõ chỗ vướng>
**Bối cảnh**: <evidence — file:line, output, log, manifest version, …>
**Options**:
  A. <lựa chọn 1 + hệ quả>
  B. <lựa chọn 2 + hệ quả>
  (C. ... nếu có)
**Đề xuất** (nếu agent có cơ sở): <option nào, lý do>
**Chờ user**: <câu hỏi cụ thể cần user trả lời>
```

Chỉ sau khi user trả lời thì agent mới tiếp tục. Trong lúc chờ, agent có thể
chuẩn bị (script, dry-run) nhưng KHÔNG commit thay đổi cuối.

**Khi nào escalate** (tổng hợp):
- Đụng scope agent khác (vd VLM phát hiện adapter dataset trả schema sai).
- Threshold / decoding / prompt param mới không có literature backing.
- Schema / manifest mismatch giữa producer ↔ consumer.
- Citation / DOI / license chưa verify.
- Kết quả bất ngờ, conflict với `scope_decisions.md`.
- Bất kỳ lúc nào áp Rule 0 (thiếu thông tin).

## Quy tắc cứng (mọi agent)

1. Subagent KHÔNG được tự sửa file ngoài scope. Cần đụng → escalate.
2. Mọi thay đổi state ghi vào `state/progress.md` của agent đó.
3. Mọi quyết định research-integrity (cite, threshold, scope) → escalate user.
4. Manifest là contract. Đổi schema → bump version + báo agent đối tác.
5. KHÔNG hard-code `"cuda"` (FRAMEWORK rule, áp dụng mọi adapter).
6. KHÔNG mock dataset / fabricate prediction để "pipeline xanh".
7. KHÔNG commit `results/`, `weights/`, `*.parquet`, `*.arrow`, `.env`.
8. **No orphan artifact** (`shared/scope_decisions.md` rule 6): không tạo file
   code / spec / config nếu ABC tương ứng chưa pin trong `inputs/manifest.md`.
   ABC không đủ → escalate producer agent, không patch tại agent của mình.
9. **Pre-flight sync bắt buộc** (`shared/scope_decisions.md` rule 7): chạy
   `bash AGENT/sync.sh <NAME>` mỗi session trước khi action.
