#!/usr/bin/env bash
# =============================================================================
# migrate.sh — Safe schema migration runner
# Usage: ./scripts/migrate.sh [--dry-run]
#
# Applies pending SQL migrations from artifacts/api-server/src/lib/migrations/
# Tracks applied migrations in schema_migrations table.
# Safe to run multiple times (idempotent).
# =============================================================================
set -euo pipefail

MIGRATIONS_DIR="${MIGRATIONS_DIR:-./artifacts/api-server/src/lib/migrations}"
DRY_RUN=false

if [ "${1:-}" = "--dry-run" ]; then
  DRY_RUN=true
  echo "[Migrate] DRY RUN mode — no changes will be applied"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "ERROR: Migrations directory not found: ${MIGRATIONS_DIR}" >&2
  exit 1
fi

# Ensure tracking table exists
psql --no-password "$DATABASE_URL" -q <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  id          SERIAL PRIMARY KEY,
  filename    TEXT NOT NULL UNIQUE,
  applied_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  checksum    TEXT,
  duration_ms INTEGER
);
SQL

echo "[Migrate] Checking for pending migrations in ${MIGRATIONS_DIR}..."

APPLIED=0
PENDING=0
ERRORS=0

for MIGRATION_FILE in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
  FILENAME=$(basename "$MIGRATION_FILE")

  ALREADY_APPLIED=$(psql --no-password "$DATABASE_URL" -tAq \
    -c "SELECT COUNT(*) FROM schema_migrations WHERE filename = '${FILENAME}'" 2>/dev/null || echo "0")

  if [ "$ALREADY_APPLIED" = "1" ]; then
    echo "  [skip] ${FILENAME} (already applied)"
    APPLIED=$((APPLIED + 1))
    continue
  fi

  PENDING=$((PENDING + 1))

  if [ "$DRY_RUN" = true ]; then
    echo "  [would apply] ${FILENAME}"
    continue
  fi

  echo "  [applying] ${FILENAME}..."
  START_MS=$(date +%s%3N)

  CHECKSUM=$(sha256sum "$MIGRATION_FILE" | awk '{print $1}')

  if psql --no-password "$DATABASE_URL" \
      --single-transaction \
      --set ON_ERROR_STOP=1 \
      -f "$MIGRATION_FILE" \
      > /dev/null 2>&1; then

    END_MS=$(date +%s%3N)
    DURATION=$((END_MS - START_MS))

    psql --no-password "$DATABASE_URL" -q \
      -c "INSERT INTO schema_migrations (filename, checksum, duration_ms) VALUES ('${FILENAME}', '${CHECKSUM}', ${DURATION})"

    echo "  [✓ done] ${FILENAME} (${DURATION}ms)"
  else
    echo "  [✗ FAILED] ${FILENAME}" >&2
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
echo "[Migrate] Summary:"
echo "  Already applied : ${APPLIED}"
echo "  Pending applied : ${PENDING}"
if [ $ERRORS -gt 0 ]; then
  echo "  Errors          : ${ERRORS} ← CHECK ABOVE"
  exit 1
fi
echo "[Migrate] All migrations complete ✓"
