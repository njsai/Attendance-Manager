#!/usr/bin/env bash
# =============================================================================
# backup.sh — Full pg_dump SQL backup
# Usage: ./scripts/backup.sh [company_id]
#   No args  → full database dump (all tables)
#   company_id → JSON backup for specific company only
# =============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/home/runner/workspace/data/backups/sql}"
KEEP_DAYS="${KEEP_DAYS:-30}"
TIMESTAMP=$(date +"%Y-%m-%dT%H-%M-%S")

mkdir -p "$BACKUP_DIR"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

FILENAME="backup_full_${TIMESTAMP}.sql"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

echo "[Backup] Starting pg_dump → ${FILEPATH}"

pg_dump \
  --no-password \
  --format=plain \
  --encoding=UTF8 \
  --no-privileges \
  --no-owner \
  --if-exists \
  --clean \
  "$DATABASE_URL" \
  > "$FILEPATH"

SIZE=$(du -sh "$FILEPATH" | cut -f1)
echo "[Backup] Done: ${FILENAME} (${SIZE})"

# Compress
gzip -f "$FILEPATH"
echo "[Backup] Compressed: ${FILENAME}.gz"

# Prune old backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +${KEEP_DAYS} -delete 2>/dev/null && echo "[Backup] Old backups pruned (>${KEEP_DAYS} days)"

echo "[Backup] Backup complete ✓"
echo "  File: ${BACKUP_DIR}/${FILENAME}.gz"
