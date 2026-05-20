#!/bin/sh
set -e
cd /app
npx drizzle-kit push
exec node dist/server/entry.mjs
