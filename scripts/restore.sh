#!/usr/bin/env bash
# =============================================================================
# restore.sh — Restore from a pg_dump SQL backup
# Usage: ./scripts/restore.sh <backup_file.sql.gz>
#
# IMPORTANT: This will DROP and RECREATE all tables in the database.
# Always run a fresh backup before restoring.
# =============================================================================
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  echo ""
  echo "Available backups:"
  ls -lh "${BACKUP_DIR:-/home/runner/workspace/data/backups/sql}/"*.sql.gz 2>/dev/null || echo "  (none found)"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: File not found: ${BACKUP_FILE}" >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

echo "============================================================"
echo "  RESTORE DATABASE"
echo "  Source : ${BACKUP_FILE}"
echo "  Target : ${DATABASE_URL//:\/\/*:*@/:\/\/USER:PASS@}"
echo "============================================================"
echo ""
echo "WARNING: This will overwrite all current data!"
read -p "Type 'yes' to confirm: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo "[Restore] Creating safety snapshot before restore..."
SAFETY_DIR="${BACKUP_DIR:-/home/runner/workspace/data/backups/sql}"
mkdir -p "$SAFETY_DIR"
SAFETY_FILE="${SAFETY_DIR}/pre_restore_$(date +%Y-%m-%dT%H-%M-%S).sql.gz"
pg_dump --no-password --format=plain --clean --if-exists "$DATABASE_URL" | gzip > "$SAFETY_FILE"
echo "[Restore] Safety backup → ${SAFETY_FILE}"

echo "[Restore] Restoring from ${BACKUP_FILE}..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" | psql --no-password "$DATABASE_URL"
else
  psql --no-password "$DATABASE_URL" < "$BACKUP_FILE"
fi

echo "[Restore] Restore complete ✓"
echo ""
echo "If something went wrong, rollback with:"
echo "  ./scripts/restore.sh ${SAFETY_FILE}"
