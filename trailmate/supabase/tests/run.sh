#!/usr/bin/env bash
# Resets the local Supabase database and runs the behavioural checks against it.
# Destructive by design — it reapplies every migration and the seed first.
set -euo pipefail

cd "$(dirname "$0")/../.."

if [[ "${SKIP_RESET:-}" != "1" ]]; then
  echo "==> supabase db reset"
  supabase db reset
fi

DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

echo "==> running supabase/tests/schema_checks.sql"
psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f supabase/tests/schema_checks.sql
