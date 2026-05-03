# AUDIT Progress (newest on top)

## 2026-05-03 — Pass #1 (targeted)
- Scope: (a) result sanity of `smoke_smolvlm_condcls_v1`, (b) manifest drift FRAMEWORK/DATASET/VLM.
- Pre-flight: `sync.sh AUDIT` + `sync.sh check AUDIT` clean.
- Report: `outputs/audit_report_2026-05-03.md` (0 critical, 2 error, 1 warn, 3 info).
- Open errors: F-01 (config↔run reproducibility drift, VLM+DATASET), F-02 (parse_error_rate manifest mismatch, VLM).

## 2026-05-03 — Agent bootstrapped
- AGENT.md, audit_checklist.md, known_pitfalls.md (empty) created.
- Chưa có audit pass nào. Sẽ chạy pass đầu sau khi FRAMEWORK + DATASET + VLM
  có manifest v1.0.0.
- Chuẩn bị: trống `state/findings.md`, trống `outputs/`.
