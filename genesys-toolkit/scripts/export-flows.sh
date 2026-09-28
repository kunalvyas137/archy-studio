#!/usr/bin/env bash
# Exports every Architect flow (optionally filtered by type / name regex) as Archy YAML + flow JSON.
# Usage: export-flows.sh [--org NAME] [--type inboundcall] [--name REGEX] [--out DIR]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
org=""; type=""; name="."; out="$ROOT/out/flows"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --org) org="$2"; shift 2 ;;
    --type) type="$2"; shift 2 ;;
    --name) name="$2"; shift 2 ;;
    --out) out="$2"; shift 2 ;;
    *) echo "unknown arg $1" >&2; exit 2 ;;
  esac
done
orgflag=(); [[ -n "$org" ]] && orgflag=(--org "$org")
params=(--param deleted=false); [[ -n "$type" ]] && params+=(--param "type=$type")
mkdir -p "$out"
"$ROOT/scripts/gcx" call GET /api/v2/flows --paginate "${params[@]}" "${orgflag[@]}" --out "$out/flows.json"
jq -r --arg re "$name" '.[] | select(.name | test($re; "i")) | [.id, .type, .name] | @tsv' "$out/flows.json" |
while IFS=$'\t' read -r id ftype fname; do
  echo "==> $ftype  $fname"
  "$ROOT/scripts/archy-gc" "${orgflag[@]}" export --flowId "$id" --exportType yaml --outputDir "$out/yaml" --force ||
    echo "   (archy export failed for $fname)" >&2
done
