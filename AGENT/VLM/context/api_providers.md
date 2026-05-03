# API Providers — Endpoint, auth, rate-limit, cost

Mỗi closed-source provider phải có 1 entry trước khi adapter được implement.
KHÔNG hard-code key; mọi key qua `os.environ` và document trong `.env.example`.

## Template

```
### <Provider>
- Models hỗ trợ:
- Endpoint:
- Auth header / SDK:
- Env var:
- Rate limit (RPM / TPM):
- Cost ($ / 1k tokens, in / out):
- Image input format (base64 / URL / multipart):
- Failure modes đặc thù:
- Retry strategy đề xuất (backoff, max_retries):
- Cost cap đề xuất cho 1 sweep:
```

## Open entries (Phase 2 — chờ user xác nhận trước khi implement)

### OpenAI (GPT-4o)
- Status: `planned`
- Tất cả field: `[VERIFY]` — escalate user trước khi implement.

### Anthropic (Claude)
- Status: `planned`
- Tất cả field: `[VERIFY]`.

### Google (Gemini)
- Status: `planned`
- Tất cả field: `[VERIFY]`.

## Quy tắc cứng

- KHÔNG hard-code API key trong code / config / log.
- Mỗi run với API model PHẢI dump `tokens_in`, `tokens_out`, `cost_usd` vào
  parquet (cột canonical đã có).
- Cost ước tính cho 1 sweep > ngân sách user → escalate trước khi chạy.
