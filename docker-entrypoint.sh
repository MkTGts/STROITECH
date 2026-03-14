#!/bin/sh
set -e

echo "Running database migrations..."
npm run db:migrate:deploy --workspace=backend

echo "Seeding database (if seed script exists)..."
npm run db:seed || true

echo "Starting backend and frontend..."
npm run start

