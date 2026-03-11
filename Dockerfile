FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Устанавливаем зависимости
COPY package.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY shared/package.json shared/

RUN npm install

# Копируем остальной код и собираем монорепу
COPY . .

RUN npm run build


FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

# Копируем node_modules и собранный код
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend ./frontend
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/package.json ./

# entrypoint для миграций и старта
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Порты: 3000 – Next.js, 3333 – backend (предположение)
EXPOSE 3000
EXPOSE 3333

CMD ["./docker-entrypoint.sh"]

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

# По умолчанию Next.js слушает порт 3000, Fastify — 4000.
# App Platform будет проксировать только порт 3000.
EXPOSE 3000

CMD ["npm", "run", "start"]

