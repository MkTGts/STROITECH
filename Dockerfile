FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY shared/package.json shared/package.json

# Устанавливаем зависимости монорепы (включая devDependencies, чтобы был prisma/tsx и т.д.)
RUN npm install

COPY . .

# Генерация Prisma и сборка всех пакетов
RUN npm run db:generate && npm run build


FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app ./

# entrypoint для миграций и старта (создание/обновление БД)
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# По умолчанию Next.js слушает порт 3000, Fastify — 4000.
# App Platform будет проксировать только порт 3000.
EXPOSE 3000

CMD ["./docker-entrypoint.sh"]

