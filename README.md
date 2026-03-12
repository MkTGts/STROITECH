# Объекты.online

Онлайн‑сервис для строительства: доска объявлений, умный чат и управление строительными объектами.

Разворачивается на **Timeweb App Platform** как **одно Docker‑приложение** (см. `Dockerfile`). Другие варианты деплоя в этом репозитории не поддерживаются и в инструкции не описываются.

## Что внутри

- **Frontend**: Next.js (TypeScript)
- **Backend**: Node.js + Fastify (TypeScript)
- **База данных**: PostgreSQL
- **ORM/миграции**: Prisma

Архитектура в контейнере:

- Next.js слушает **порт 3000** (это единственный порт, который проксирует App Platform)
- Fastify слушает **порт 4000** *внутри контейнера* (используется фронтом через тот же домен, проксирование делается внутри приложения)

## Деплой на Timeweb App Platform (Dockerfile)

### Как запускается контейнер

`Dockerfile` собирает монорепозиторий, а в рантайме запускает `docker-entrypoint.sh`, который:

1) Применяет миграции Prisma  
2) Пытается выполнить seed (ошибка seed **не** валит запуск)  
3) Стартует backend и frontend одной командой

Важно: при первом запуске приложение ожидает, что PostgreSQL уже доступен по `DATABASE_URL`.

### Настройки приложения в панели Timeweb

- **Тип**: Dockerfile (сборка из репозитория/образа)
- **HTTP порт**: `3000`
- **Команда запуска**: не требуется (берётся из `Dockerfile`)

### Переменные окружения

Минимально необходимые для продакшена:

- **DATABASE_URL**: строка подключения к PostgreSQL для Prisma  
  Пример: `postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?schema=public`
- **JWT_SECRET**: секрет для подписи JWT
- **FRONTEND_URL**: публичный URL приложения (например, `https://<app>.timeweb.app`)
- **BACKEND_URL**: базовый URL backend (в конфигурации “один домен” обычно совпадает с `FRONTEND_URL`)

Рекомендуемые/служебные:

- **PORT**: порт backend внутри контейнера (по умолчанию `4000`, см. `backend/.env.example`)
- **HOST**: `0.0.0.0`
- **LOG_LEVEL**: например `info`

Переменные для фронтенда (используются в браузере, поэтому с префиксом `NEXT_PUBLIC_`):

- **NEXT_PUBLIC_API_URL**: публичный URL API, обычно `https://<app>.timeweb.app/api`
- **NEXT_PUBLIC_WS_URL**: публичный URL WebSocket, обычно `wss://<app>.timeweb.app/ws`

## Документация API (Swagger UI)

После запуска приложения документация API доступна по пути:

- `https://<ваш-домен-на-timeweb>/docs`

Пример для вашего домена:

- `https://mktgts-stroitech-8dee.twc1.net/docs`

## Работа с базой данных

### Технология и точка входа

- **СУБД**: PostgreSQL
- **ORM**: Prisma
- **Схема Prisma**: `backend/prisma/schema.prisma`
- **Подключение**: через переменную окружения `DATABASE_URL` (см. `datasource db`)

Инициализация Prisma‑клиента находится в `backend/src/lib/prisma.ts`.

### Миграции в продакшене (Timeweb)

В контейнере миграции запускаются автоматически в `docker-entrypoint.sh`:

- сначала `npm run db:migrate:deploy` (это `prisma migrate deploy`)
- если команда не сработала, выполняется fallback `npm run db:migrate` (это `prisma migrate dev`)

Рекомендация: для продакшена корректный режим — **`migrate deploy`** (он применяет уже созданные миграции и не пытается генерировать новые).

### Seed (начальные данные)

После миграций entrypoint пытается выполнить seed:

- команда: `npm run db:seed`
- реализация: `backend/prisma/seed.ts`
- важное поведение: ошибка seed не прерывает запуск приложения (используется `|| true`)

Если вам не нужен seed в продакшене — убедитесь, что seed‑скрипт идемпотентен (повторный запуск безопасен) или удалите/измените поведение в entrypoint под вашу политику.

### Полезные команды (для обслуживания)

В корне репозитория:

- `npm run db:generate` — генерация Prisma Client
- `npm run db:migrate:deploy` — применить миграции (прод‑режим)
- `npm run db:seed` — выполнить seed
- `npm run db:studio` — Prisma Studio (GUI), требует сетевой доступ к БД по `DATABASE_URL`

### Локальная БД (опционально, для разработки)

В репозитории есть `docker-compose.yml` с PostgreSQL (порт `5432`). Он **не используется** на Timeweb App Platform, но может быть полезен локально для разработки и тестов.
