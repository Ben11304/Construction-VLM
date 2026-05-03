# Benchmark Methods — Task ↔ Dataset ↔ Metric

Mỗi cặp task↔dataset trong benchmark này phải có 1 entry. Trước khi VLM agent
chạy run, entry tương ứng phải ở trạng thái `ready` (prompt version pinned,
metric implemented, schema GT verified).

## v0.1 — vertical slice

| Task | Dataset | Prompt version | Metric | Status |
|---|---|---|---|---|
| `condition_cls` | `consynthx` (root=construction_site, sample bundle = Kaggle v6) | `v1_definitions` | accuracy + macro_f1 + per_condition + confusion_matrix | **ready** (1.0.0) |

### `condition_cls`

- **Label set** (7 lớp, xem `glossary.md`):
  `clean, rain, rain_heavy, snow_light, snow_heavy, fog_heavy, night`.
- **Prompt v1_definitions**: yêu cầu VLM chọn 1 trong 7 nhãn dựa trên
  taxonomy definition gắn kèm. Output expect: JSON `{"condition": "<label>"}`.
- **Parser**: robust JSON extract → fallback regex match label name (case-insensitive).
- **Score**: exact match. Nếu parse fail → `score = {"correct": null, "parse_error": true}`.
- **Aggregation**: accuracy macro/micro, macro-F1, confusion matrix, per-condition recall/precision.

## Roadmap — port từ ConstructionSite-10k-Implementation (post-v0.1)

ConSynth-X kế thừa upstream GT từ ConstructionSite 10k → 3 task của Chen & Zou
(2025) reusable nguyên trên clean-side và mở rộng tự nhiên cho paired clean↔aug
eval. Reference impl: `../ConstructionSite-10k-Implementation/Evaluations/`.

| Task `cveval` | Source task (Chen&Zou) | Datasets supported | Metric | Status |
|---|---|---|---|---|
| `description_gen` | description_generation | ConSynth-X clean (construction_site root) + aug variants | BLEU + ROUGE-L + METEOR + SPICE + CIDEr + BERTScore + CLIPScore + word_count; XPOS-filtered diagnostic | planned (post-v0.1) |
| `safety_vqa` | safety_violation_vqa | ConSynth-X clean (construction_site root) + aug variants | 2-stage: 5-class multilabel P/R/F1 (rule_0..rule_4) → mask-IoU100 chỉ trên correctly-classified | planned (post-v0.1) |
| `vlm_detection` | object_detection | ConSynth-X clean (construction_site: excavator/rebar/worker-white-hat) + aug | mask-IoU100 macro + micro, positive_only, normalized_scale flag | planned (post-v0.1) |
| `paired_delta` | (USP `cveval`, không có upstream) | ConSynth-X paired clean↔aug | Δ accuracy / Δ IoU per condition × severity | planned (post-v0.1) |
| `robustness_auc` | (USP `cveval`) | ConSynth-X severity sweep | AUC under accuracy×severity curve | planned (post-v0.1) |

Notes:
- 3 task port phải reuse robust parsing của upstream evaluator (3-gate VQA
  parser, regex bbox extract, negative-keyword filter, Grounding DINO
  `[cx,cy,w,h] → [xmin,ymin,xmax,ymax]` converter).
- Mask-IoU100 (rasterize bbox lên grid 100×100) thay COCO mAP — phù hợp VLM
  1-shot detection không có confidence score.
- Robustness setup gốc: 5 prompts × 5 seeds, average qua seed, giữ trục prompt.
  `cveval` áp dụng tương tự cho mọi task có prompt template.

## (Template cho task thêm sau)

```
### <task_id>
- Label / output spec:
- Prompt version:
- Parser strategy:
- Score function:
- Aggregation:
- Datasets supported:
```
