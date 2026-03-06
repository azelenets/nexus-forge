#!/usr/bin/env bash
set -euo pipefail

NAME="${1:-}"

if [ -z "$NAME" ]; then
  echo "Usage: npm run db:migration:generate -- <MigrationName>"
  exit 1
fi

npx typeorm-ts-node-commonjs \
  -d apps/api/src/infrastructure/database/typeorm.datasource.ts \
  migration:generate "apps/api/src/infrastructure/database/migrations/${NAME}"
