FROM node:22-alpine AS builder

WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./

# Устанавливаем зависимости монорепы (workspaces)
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

