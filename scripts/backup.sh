#!/usr/bin/env sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/tg-content-distributor-$STAMP.sql.gz"
find "$BACKUP_DIR" -name "tg-content-distributor-*.sql.gz" -mtime "+$RETENTION_DAYS" -delete
