#!/usr/bin/env bash
# Type-checks every Edge Function against the shared import map.
# Run via `npm run functions:check`, and in CI (.github/workflows/ci.yml).
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v deno >/dev/null 2>&1; then
  echo "deno is not installed — see https://docs.deno.com/runtime/getting_started/installation/" >&2
  exit 1
fi

status=0
for dir in */; do
  name="${dir%/}"
  [[ "$name" == _shared ]] && continue
  [[ -f "$name/index.ts" ]] || continue

  echo "==> deno check $name"
  if ! deno check --config deno.json "$name/index.ts"; then
    status=1
  fi
done

echo "==> deno check _shared"
deno check --config deno.json _shared/*.ts || status=1

exit "$status"
