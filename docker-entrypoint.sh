#!/bin/sh
set -e

echo "Running database migrations..."
npm run db:migrate:deploy || npm run db:migrate

echo "Seeding database (if seed script exists)..."
npm run db:seed || true

echo "Starting backend and frontend..."
npm run start

