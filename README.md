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

`Dockerfile` собирает монорепозиторий, в рантайме запускается `docker-entrypoint.sh` → сразу стартуют backend и frontend (`npm run start`). Миграции и seed **не выполняются** при деплое.

**Изменения в БД вручную через консоль Timeweb:** открой консоль приложения, перейди в каталог backend и выполни при необходимости:

```bash
cd /app/backend
npx prisma migrate deploy
```

(При первом деплое или после появления новых миграций в репозитории.) Seed при необходимости: `npm run db:seed` из той же папки (`/app/backend`).

Важно: при первом запуске приложение ожидает, что PostgreSQL уже доступен по `DATABASE_URL` и миграции уже применены (см. выше).

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
- **PORT**: 3000
- **BACKEND_PORT**: порт backend внутри контейнера (по умолчанию `4000`, см. `backend/.env.example`)  
  Важно: **не используйте `PORT=4000`** — переменную `PORT` также читает Next.js, и фронт начнёт слушать 4000, что приведёт к конфликту с backend.
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

## Тестовые пользователи (seed)

При запуске контейнера `docker-entrypoint.sh` пытается выполнить seed (`npm run db:seed`). Seed-скрипт находится в `backend/prisma/seed.ts` и (помимо категорий) создаёт демо‑пользователей, если их ещё нет.

- **Пароль для всех демо‑аккаунтов**: `demo123`
- **Аккаунты**:
  - `supplier@demo.ru` (роль `supplier`)
  - `builder@demo.ru` (роль `builder`)
  - `equipment@demo.ru` (роль `equipment`)
  - `client@demo.ru` (роль `client`)

Если демо‑пользователи не появились:

- убедитесь, что seed выполнялся без ошибок в логах запуска
- запустите seed повторно командой `npm run db:seed` (в корне репозитория или в workspace `backend`)

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

## Подключение Timeweb Object Storage (S3)

Файлы (картинки объявлений и т.п.) загружаются через backend‑маршрут `POST /upload/image`. По умолчанию они сохраняются локально в каталог `uploads/` внутри контейнера. Для продакшена на Timeweb рекомендуется подключить Object Storage (S3‑совместимое хранилище).

### Как работает интеграция

- Логика загрузки реализована в `backend/src/routes/upload.ts`.
- Конфигурация S3 вынесена в `backend/src/lib/s3.ts`.
- Если S3‑переменные окружения **заданы корректно**, файлы складываются в бакет S3 (Timeweb Хранилище) в подпапку `listings/`, а в ответе API возвращается публичный URL из Object Storage.
- Если переменные S3 **не заданы**, backend автоматически откатывается к локальному сохранению в `uploads/` (поведение для разработки).

### Переменные окружения для S3 (Timeweb Object Storage)

Добавь эти переменные в настройках приложения на Timeweb App Platform:

- `S3_BUCKET` — имя бакета в Timeweb Object Storage (например, `stroitech-uploads`)
- `S3_ENDPOINT` — endpoint хранилища (например, `https://s3.timeweb.com` или тот, что указан в панели)
- `S3_REGION` — регион (например, `ru-1`, если указан такой в документации Timeweb)
- `S3_ACCESS_KEY_ID` — access key для доступа к бакету
- `S3_SECRET_ACCESS_KEY` — secret key для доступа к бакету
- `S3_PUBLIC_URL` — (рекомендуется) публичный базовый URL бакета, например:
  - `https://s3.timeweb.com/stroitech-uploads`
  - или URL вида, который Timeweb показывает как «Публичный URL» бакета

Если `S3_PUBLIC_URL` не указан, URL формируется как `<S3_ENDPOINT>/<S3_BUCKET>/<key>`, что подходит для большинства конфигураций.

### Настройка бакета в панели Timeweb

1. Создай бакет в разделе Object Storage / Хранилище S3 (например, `stroitech-uploads`).  
2. Включи публичный доступ для чтения объектов (через политику или опцию в интерфейсе).  
3. Сгенерируй Access key / Secret key и пропиши их в переменные окружения (`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`).  
4. Обнови переменные окружения приложения и перезапусти контейнер.

## Чат-бот «Объекты-Ассистент»

Внутри раздела чата доступен закреплённый диалог с чат-ботом **«Объекты-Ассистент»**. Он помогает пользователям разобраться с функциональностью сервиса, подсказывает, как оформлять объявления и объекты, и даёт базовые рекомендации по работе с площадкой.

### Как это устроено

- Бэкенд:
  - Конфигурация промпта: `backend/src/config/chatbotPrompt.ts` (`CHATBOT_SYSTEM_PROMPT`).
  - Обёртка над AI‑API: `backend/src/lib/ai.ts` (функция `callAssistant`).
  - Маршруты чата: `backend/src/routes/chat.ts`:
    - `GET /chat/conversations` — добавляет «виртуальный» диалог с ботом первым в списке (id: `assistant-bot`, имя: `Объекты-Ассистент`, аватарка: `/bot-avatar.svg`).
    - `POST /chat/bot` — проксирует диалог к AI‑модели: в теле можно передать `turns` (до 7 реплик «user»/«assistant» по порядку, последняя — пользователь) либо устаревшее поле `content` без истории.
- Фронтенд:
  - Клиент чата: `frontend/src/app/chat/chat-client.tsx`:
    - Если выбран диалог `assistant-bot`, сообщения не ходят в Prisma, а отправляются на `/chat/bot` и отображаются как диалог с ботом.

### Настройка AI‑агента (Timeweb Cloud AI)

Для интеграции с Timeweb Cloud AI используется endpoint `https://agent.timeweb.cloud` и вызов метода `POST /api/v1/cloud-ai/agents/{agent_access_id}/call` (см. [документацию Timeweb Cloud AI](https://agent.timeweb.cloud/docs?roistat_visit=9409636)).

В backend‑сервисе нужно задать следующие переменные окружения:

- `AI_API_URL` — базовый URL Cloud AI (по умолчанию используется `https://agent.timeweb.cloud`).
- `AI_AGENT_ID` — `agent_access_id` вашего агента в Timeweb Cloud AI.
- `AI_API_KEY` — API‑ключ (Bearer‑токен) для авторизации.

Backend будет отправлять запросы вида:

- `POST {AI_API_URL}/api/v1/cloud-ai/agents/{AI_AGENT_ID}/call`  
  с заголовками:
  - `Authorization: Bearer <AI_API_KEY>`
  - `x-proxy-source: stroitech-backend`
  - `Content-Type: application/json`
  и телом:
  - `{ "message": "<системный промпт + до 7 последних реплик диалога + инструкция ответить с учётом контекста>" }`

После изменения переменных окружения перезапусти приложение, чтобы чат-бот начал использовать сконфигурированный агент Timeweb Cloud AI.
