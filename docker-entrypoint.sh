#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy --schema=backend/prisma/schema.prisma

echo "Seeding database (if seed script exists)..."
npm run db:seed || true

echo "Starting backend and frontend..."
npm run start

