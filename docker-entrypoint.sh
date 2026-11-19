#!/bin/sh
set -e

# Run Prisma schema push if DATABASE_URL is set and not explicitly disabled
if [ -n "$DATABASE_URL" ] && [ "$SKIP_DB_PUSH" != "true" ]; then
  echo "=> Syncing database schema with Prisma..."
  if [ -f "./node_modules/prisma/build/index.js" ]; then
    node ./node_modules/prisma/build/index.js db push --skip-generate || {
      echo "Warning: Prisma db push failed. Proceeding with startup..."
    }
  else
    npx prisma db push --skip-generate || {
      echo "Warning: Prisma db push failed. Proceeding with startup..."
    }
  fi
fi

# Optional seed if AUTO_SEED is enabled
if [ "$AUTO_SEED" = "true" ] && [ -n "$OWNER_BOOTSTRAP_EMAILS" ]; then
  echo "=> Running bootstrap seed..."
  node seed-init.js || {
    echo "Warning: seed-init.js failed. Proceeding with startup..."
  }
fi

echo "=> Starting application on port ${PORT:-3000}..."
exec "$@"
