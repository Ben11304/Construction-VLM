#!/usr/bin/env bash
# AGENT/sync.sh — pre-flight manifest sync helper.
# Usage:
#   bash AGENT/sync.sh DATASET   # sync FRAMEWORK/outputs → DATASET/inputs
#   bash AGENT/sync.sh VLM       # sync FRAMEWORK + DATASET → VLM/inputs
#   bash AGENT/sync.sh AUDIT     # sync FRAMEWORK + DATASET + VLM → AUDIT/inputs
#   bash AGENT/sync.sh check <NAME>   # version-only check, no copy
#
# KHÔNG sửa file producer. Chỉ copy producer manifest vào consumer/inputs/<producer>.md
# + ghi tóm tắt version vào consumer/inputs/manifest.md.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

producers_for() {
  case "$1" in
    DATASET) echo "FRAMEWORK" ;;
    VLM)     echo "FRAMEWORK DATASET" ;;
    AUDIT)   echo "FRAMEWORK DATASET VLM" ;;
    *) echo "ERROR: unknown agent '$1' (valid: DATASET / VLM / AUDIT)" >&2; exit 2 ;;
  esac
}

read_version() {
  # Extract first non-empty line under "## Version" header.
  awk '
    /^## Version/ { in_v=1; next }
    in_v && NF { print; exit }
  ' "$1" 2>/dev/null || echo "MISSING"
}

cmd="${1:-}"
if [ "$cmd" = "check" ]; then
  shift
  agent="${1:-}"
  [ -n "$agent" ] || { echo "Usage: bash AGENT/sync.sh check <NAME>"; exit 2; }
  echo "## Manifest version drift check — $agent"
  for p in $(producers_for "$agent"); do
    pv=$(read_version "$ROOT/$p/outputs/manifest.md")
    cv=$(awk -v tag="$p:" '$0 ~ "^- " tag { print; exit }' "$ROOT/$agent/inputs/manifest.md" 2>/dev/null || echo "")
    echo "  producer $p: $pv  |  consumer pin: ${cv:-<unset>}"
  done
  exit 0
fi

agent="${1:-}"
[ -n "$agent" ] || { echo "Usage: bash AGENT/sync.sh <DATASET|VLM|AUDIT> | check <NAME>"; exit 2; }
producers=$(producers_for "$agent")

mkdir -p "$ROOT/$agent/inputs"
summary="$ROOT/$agent/inputs/manifest.md"
date_iso=$(date -u +%Y-%m-%d)

{
  echo "# Manifest — input for $agent"
  echo
  echo "Auto-synced by \`AGENT/sync.sh $agent\` on $date_iso (UTC)."
  echo "Producer manifest copies live next to this file as \`<PRODUCER>.md\`."
  echo
  echo "## Pinned versions"
  for p in $producers; do
    src="$ROOT/$p/outputs/manifest.md"
    dst="$ROOT/$agent/inputs/$p.md"
    if [ -f "$src" ]; then
      cp "$src" "$dst"
      pv=$(read_version "$src")
      echo "- $p: $pv  (copied → inputs/$p.md)"
    else
      echo "- $p: MISSING ($src not found)"
    fi
  done
  echo
  echo "## Last sync"
  echo "$date_iso by AGENT/sync.sh"
  echo
  echo "## Notes"
  echo "- Consumer agent PHẢI đọc \`inputs/<PRODUCER>.md\` cho contract chi tiết."
  echo "- Mismatch giữa version ở đây và version producer hiện tại → re-run sync."
} > "$summary"

echo "[sync] wrote $summary"
ls -1 "$ROOT/$agent/inputs/"
