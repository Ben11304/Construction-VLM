# Model Zoo — VLM đã evaluate / shortlist

Mỗi VLM phải có 1 entry trước khi adapter được implement. KHÔNG implement
adapter cho model không có entry. Trạng thái:

- `planned` — đang xem xét, chưa shortlist.
- `shortlisted` — đã verify license + backend khả thi, chờ implement.
- `implemented` — adapter đã có, smoke test xanh.
- `failed` — đã thử, không đạt; ghi rõ lý do.

## Open-source (HuggingFace)

| Model | HF ID | Params | License | Backend | Image format | Status | Notes |
|---|---|---|---|---|---|---|---|
| SmolVLM-256M | `HuggingFaceTB/SmolVLM-256M-Instruct` | 0.256B (SigLIP 93M + SmolLM2-135M) | Apache-2.0 | HF transformers (`AutoModelForVision2Seq` + `AutoProcessor`) | chat template chuẩn HF, 64 visual tokens / 512×512 patch, BF16 | shortlisted (smoke-test v0.1) | Verified 2026-05-03 model card. Dùng để smoke-test pipeline trước khi chạy Qwen 7B |
| Qwen2.5-VL-7B | `Qwen/Qwen2.5-VL-7B-Instruct` `[VERIFY]` | 7B | `[VERIFY]` | HF transformers | chat template + vision | planned (v0.1 main) | dtype auto, device qua `select_device()` |
| InternVL family | `[VERIFY]` | — | — | — | — | planned | Phase 1 sau Qwen |
| LLaVA family | `[VERIFY]` | — | — | — | — | planned | Phase 1 sau Qwen |

## Closed-source (API)

| Model | Provider | Endpoint | Auth | Cost (1k tok in/out) | Status | Notes |
|---|---|---|---|---|---|---|
| GPT-4o | OpenAI | `[VERIFY]` | `OPENAI_API_KEY` | `[VERIFY]` | Phase 2 | rate-limit cần handle |
| Claude (Sonnet 4.x) | Anthropic | `[VERIFY]` | `ANTHROPIC_API_KEY` | `[VERIFY]` | Phase 2 | hỗ trợ vision |
| Gemini 1.5/2 | Google | `[VERIFY]` | `GOOGLE_API_KEY` | `[VERIFY]` | Phase 2 | — |

## Discovery checklist (trước khi shortlist 1 model mới)

1. License cho phép research / redistribution kết quả? → nếu không → loại.
2. Có hỗ trợ multi-image input không? (một số task sau v0.1 cần.)
3. Backend khả thi với GPU hiện có? (VRAM, dtype, flash-attn optional?)
4. Chat template có chuẩn HuggingFace không, hay custom format?
5. Đã có ai eval trên benchmark tương tự (Construction / Adverse weather)?
   Cite.
