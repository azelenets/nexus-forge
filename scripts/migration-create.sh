#!/usr/bin/env bash
set -euo pipefail

NAME="${1:-}"

if [ -z "$NAME" ]; then
  echo "Usage: npm run db:migration:create -- <MigrationName>"
  exit 1
fi

npx typeorm migration:create "apps/api/src/infrastructure/database/migrations/${NAME}"
