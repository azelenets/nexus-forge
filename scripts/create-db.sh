#!/usr/bin/env bash
set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_NAME="${DB_NAME:-nexus_forge}"

echo "Creating database '$DB_NAME' on $DB_HOST:$DB_PORT..."

PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" \
  | grep -q 1 \
  || PGPASSWORD="$DB_PASSWORD" psql \
       -h "$DB_HOST" \
       -p "$DB_PORT" \
       -U "$DB_USER" \
       -c "CREATE DATABASE $DB_NAME;"

echo "Done. Database '$DB_NAME' is ready."
