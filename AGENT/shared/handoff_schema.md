# Handoff Schema — Manifest format

Manifest là **contract** giữa các agent. Mọi artifact đi qua manifest, không
agent nào được đọc internals của agent khác.

## File location
- Producer: `AGENT/<PRODUCER>/outputs/manifest.md`
- Consumer: copy/symlink/đọc qua `AGENT/<CONSUMER>/inputs/manifest.md`

## Topology hiện tại

```
FRAMEWORK ──contract──▶ DATASET ──adapter+benchmark──▶ VLM ──results──▶ AUDIT
     │                     │                            │                  ▲
     └──────────contract───┴────────────────────────────┘                  │
                                                                           │
   AUDIT đọc manifest của cả 3 agent trên (read-only) ──────────────────┘
```

- FRAMEWORK xuất *contracts* (ABCs, registry interface, config schema, result
  schema) — DATASET và VLM đều consume.
- DATASET xuất *dataset adapter + benchmark task spec + citation pack* — VLM
  consume.
- VLM xuất *results parquet + run logs + leaderboard slice* — AUDIT consume.
- AUDIT xuất *audit report* — read-only consumer; chỉ ghi report, không sửa
  code agent khác.

## Format

```markdown
# Manifest — <PRODUCER> → <CONSUMER>

## Version
<semver>  e.g. 1.0.0
Bump rule: schema/contract change → major; new artifact same schema → minor;
metadata-only → patch.

## Last updated
YYYY-MM-DD by <agent/run-id>

## Artifacts

### <artifact-name>
- **Path**: absolute or repo-relative
- **Format**: py-module | parquet | json | yaml | csv | md | ...
- **Schema**: link tới ABC / pydantic model / parquet schema
- **Version**: semver của artifact (nếu khác manifest version)
- **Source**: file:line nơi định nghĩa
- **Status**: ready | partial | deprecated
- **Notes**: edge case, [VERIFY] nếu chưa kiểm

## Removed/Deprecated
- <artifact-name> @ <version> — lý do
```

## Quy tắc

1. **Append-only thực tế**: artifact bỏ → chuyển section "Removed/Deprecated"
   thay vì xoá entry.
2. **Bump version mỗi commit có thay đổi contract**. Consumer kiểm version
   trước khi chạy.
3. **Schema/contract mismatch** → consumer DỪNG, escalate producer. KHÔNG tự
   fix downstream.
4. Manifest CHỈ trỏ đường, KHÔNG copy data/code.
5. Khi bump major version → ping user để consumer được trigger sync.
