# Объекты.online

Онлайн-сервис для строительства. Доска объявлений с умным чатом и встроенным сервисом по управлению объектами.

## Стек технологий

- **Frontend**: Next.js 14 (App Router, TypeScript), Tailwind CSS, shadcn/ui — деплой на Vercel
- **Backend**: Node.js + Fastify (TypeScript), Prisma ORM — деплой на Railway
- **Database**: PostgreSQL — Railway

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Запуск PostgreSQL

```bash
docker compose up -d
```

### 3. Настройка переменных окружения

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

### 4. Миграции и seed

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 5. Запуск в dev-режиме

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- API docs: http://localhost:4000/api/health

### Демо-аккаунты

| Email | Пароль | Роль |
|---|---|---|
| supplier@demo.ru | demo123 | Поставщик |
| builder@demo.ru | demo123 | Строитель |
| equipment@demo.ru | demo123 | Техника |
| client@demo.ru | demo123 | Заказчик |

## Скрипты

| Команда | Описание |
|---|---|
| `npm run dev` | Запуск frontend + backend |
| `npm run build` | Сборка проекта |
| `npm run db:migrate` | Миграции БД |
| `npm run db:seed` | Заполнение БД тестовыми данными |
| `npm run db:studio` | Prisma Studio (GUI для БД) |

## Деплой

### Vercel (Frontend)

1. Подключить репозиторий к Vercel
2. Root Directory: `frontend`
3. Env: `NEXT_PUBLIC_API_URL` = URL бэкенда на Railway

### Railway (Backend + DB)

1. Создать PostgreSQL сервис
2. Создать сервис из репозитория (Root: `backend`)
3. Build: `npm run build && npx prisma migrate deploy`
4. Start: `npm start`
5. Env: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`
