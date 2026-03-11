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

### Timeweb 1 App Platform (Docker)

Для деплоя монорепозитория через `Dockerfile` на Timeweb 1 App Platform нужно создать приложение с типом **Docker (свой образ)** и указать переменные окружения.

#### Обязательные переменные окружения

- **PORT**
  - **Значение**: `3000`
  - **Описание**: Порт, на котором слушает Next.js (frontend). App Platform будет проксировать HTTP‑трафик на этот порт.

- **BACKEND_PORT**
  - **Значение**: `4000`
  - **Описание**: Порт, на котором слушает Fastify‑backend внутри контейнера.

- **DATABASE_URL**
  - **Значение (пример)**: `postgresql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DB_NAME>?schema=public`
  - **Описание**: Строка подключения Prisma к PostgreSQL. Берётся из настроек PostgreSQL на Timeweb.

- **JWT_SECRET**
  - **Значение**: длинная случайная строка, например сгенерированный ключ.
  - **Описание**: Секрет для подписи JWT‑токенов на backend. Обязательно поменять на боевое значение.

- **FRONTEND_URL**
  - **Значение (пример)**: `https://<your-app>.timeweb.app`
  - **Описание**: Публичный URL frontend‑части (Next.js), используется backend’ом для CORS/redirect’ов.

- **BACKEND_URL**
  - **Значение (пример)**: `https://<your-app>.timeweb.app`
  - **Описание**: Базовый URL backend’а, который будет использоваться фронтом. В варианте с одним Docker‑приложением backend и frontend живут на одном домене, поэтому указываем тот же URL.

- **NEXT_PUBLIC_API_URL**
  - **Значение (пример)**: `https://<your-app>.timeweb.app/api`
  - **Описание**: Публичный URL API для frontend (используется в `frontend/src/lib/api.ts`).

- **NEXT_PUBLIC_WS_URL**
  - **Значение (пример)**: `wss://<your-app>.timeweb.app/ws`
  - **Описание**: Публичный WebSocket‑URL для frontend (используется в `frontend/src/lib/ws.ts`).

- **HOST**
  - **Значение**: `0.0.0.0`
  - **Описание**: Хост, на котором backend слушает внутри контейнера. Уже заложен по умолчанию, но можно задать явно.

- **LOG_LEVEL**
  - **Значение (пример)**: `info`
  - **Описание**: Уровень логирования backend (опционально, по умолчанию `info`).

#### Настройки приложения на Timeweb

- **HTTP порт**: `3000`
- **Стартовая команда**: берётся из `Dockerfile` (`CMD ["./docker-entrypoint.sh"]`), отдельно указывать не нужно.
- **Образ**: собранный и запушенный в Registry образ этого репозитория.

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
