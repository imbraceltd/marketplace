# Marketplace

The apps / templates / integrations management hub of the Imbrace platform — where users
publish, discover, install and manage extensions for their organizations.

> This is a backend API (Express + TypeScript); it has no UI of its own. It is one of the
> services that make up the open-source Imbrace platform.

## License

This project is dual-licensed:

- Files **without** `.ee.` in their path are covered by the Imbrace Sustainable Use License — see [LICENSE.md](./LICENSE.md).
- Files **with** `.ee.` in their path are covered by the Imbrace Enterprise License — see [LICENSE_EE.md](./LICENSE_EE.md).

---

## Quick Start (5 minutes)

```bash
# 1. Install pnpm (if not already)
npm i -g pnpm

# 2. Install dependencies
pnpm install

# 3. Copy env file
cp .env.example .env
```

Edit the `.env` file — minimum required values:

```env
DB_TYPE=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=marketplaces
POSTGRES_HOST=localhost

# Backend / gateway stubs (leave as localhost if no real services)
BACKEND_HOST=http://localhost:6040
CHANNEL_SERVICE_URL=http://localhost:4100
AI_SERVICE=http://localhost:7100
REDIS_HOST=localhost
```

```bash
# 4. Start PostgreSQL + Redis (Docker)
docker run -d --name marketplaces-pg ^
  -e POSTGRES_USER=postgres ^
  -e POSTGRES_PASSWORD=postgres ^
  -e POSTGRES_DB=marketplaces ^
  -p 5432:5432 postgres:16-alpine

docker run -d --name marketplaces-redis -p 6379:6379 redis:7-alpine

# 5. Run database migrations
pnpm db:migrate

# 6. Start dev server
pnpm dev
```

```bash
# 7. Verify
curl http://localhost:9982/v1/health
# Expected: {"name":"Marketplace APIs","version":"1.0.0","env":"development"}
```

---

## Dev Guide

### Tech Stack
- compiler: swc (alternative to babel)
- package manager: pnpm (alternative to npm)
- framework: express
- database: PostgreSQL
- cache: redis
- orm: Drizzle ORM
- logger: morgan
- test: jest
- container: docker

### ENV

Copy the example env file and fill in the values for your setup:

```bash
    cp .env.example .env
```

### DEV setup
- install pnpm
```bash
    npm i -g pnpm
```

- install dependencies
```bash
    pnpm install
```

- create the env file (sets the PostgreSQL connection vars)
```bash
    cp .env.example .env
```

- apply database migrations
```bash
    pnpm db:migrate
```

- start dev
```bash
    pnpm dev
```

---

## System Requirements

| Component | Required? | Notes |
|-----------|-----------|-------|
| Node.js >= 18 (20+ recommended) | Yes | |
| pnpm | Yes | `npm i -g pnpm` |
| PostgreSQL 14+ | Yes | Primary database |
| Redis | Yes | Used for caching |
| Docker | No (recommended) | To run databases locally |
| AWS credentials | No (optional) | Required for S3 |
| Kafka | No (optional) | Required for event bus |

---

## Directory Structure

```
marketplace/
├── src/
│   ├── index.ts                  # Entry point
│   ├── config/                   # Environment configuration
│   ├── server/
│   │   ├── routers/              # API routes (v1, v2, v3, webhook, proxy)
│   │   ├── middleware/           # Middleware (authorize, parseUserContext...)
│   │   └── DTO/                  # Data Transfer Objects
│   ├── application/
│   │   ├── usecases/             # Business logic / use cases
│   │   └── interfaces/           # Interfaces / contracts
│   ├── core/
│   │   ├── services/             # Core services (seeding, etc.)
│   │   ├── repositories/        # Repository interfaces
│   │   └── domains/              # Domain models
│   ├── domain/
│   │   └── entities/             # Domain entities
│   ├── infrastructure/
│   │   ├── database/             # PostgreSQL connection setup
│   │   └── repositories/        # Repository implementations
│   ├── kafka/                    # Kafka producer / consumer
│   ├── aws_s3/                   # S3 upload helpers
│   └── utils/                    # Utilities (logger, error, query, id)
├── scripts/                      # Template creation / install scripts
├── drizzle/                      # Drizzle migrations
├── docker/                       # Docker Compose (local dependencies)
├── index.d.ts                    # Type declarations
└── .env.example                  # Example env file
```

---

## Database: PostgreSQL

Set `DB_TYPE=postgres` and the connection vars:

| Required ENV vars |
|-------------------|
| `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` |

### Database scripts

```bash
pnpm db:generate     # Generate a Drizzle migration from schema.ts changes
pnpm db:migrate      # Apply pending migrations for current DB_TYPE
pnpm db:studio       # Open Drizzle Studio (GUI)
```

---

## Notes & Limitations

- **PostgreSQL is the supported backend.** Set `DB_TYPE=postgres` plus the `POSTGRES_*` vars.
- **Required cross-service config.** Migrations and template flows need
  `BACKEND_HOST` and `CHANNEL_SERVICE_URL` set in `.env`, or `pnpm db:migrate`
  and parts of the API will fail.
- **Redis is required** for caching.
- **Workflow integration is optional and degrades gracefully.** If
  the AP workflow service isn't configured or reachable (no `http://` host,
  `ECONNREFUSED`, DNS/timeout), template building continues with **no workflows**
  instead of erroring. Templates with no attached workflow (empty `workflow_id`)
  are handled the same way. Set `AP_WORKFLOW_HOST` to a running Workflow
  instance to enable real workflow resolution.
- **API-only service** — there is no UI; it is consumed by the app-gateway and
  frontend.

---

## API Overview

| Group | Endpoint | Description |
|-------|----------|-------------|
| Health | `GET /v1/health` | Service health check |
| Apps | `GET /v1/apps` | List all apps |
| | `POST /v1/apps` | Create a new app |
| | `GET /v1/apps/:id` | Get app details |
| | `PATCH /v1/apps/:id` | Update an app |
| | `DELETE /v1/apps/:id` | Delete an app |
| | `POST /v1/apps/:id/publish` | Publish an app |
| | `POST /v1/apps/:id/un-publish` | Unpublish an app |
| Market Places | `GET /v1/market-places` | List marketplaces |
| | `POST /v1/market-places` | Create a marketplace |
| | `GET /v1/market-places/:id` | Get marketplace details |
| | `PATCH /v1/market-places/:id` | Update a marketplace |
| | `DELETE /v1/market-places/:id` | Delete a marketplace |
| Installations | `POST /v1/market-places/installations/:id` | Install a product in an organization |
| Webhooks | `POST /v1/app/:appId/:webhookId` | Call a webhook API |

> API version 3 (`/v3`) uses PostgreSQL. The `/v3` routes are also mounted at `/v1` and `/v2`.

---

## Architecture & Dependencies

```
marketplace (:9982)
    │
    ├── Platform / Gateway (:6040)  — auth, org, user (BACKEND_HOST / PLATFORM_HOST)
    ├── Channel Service    (:4100)  — communication channels (Facebook, Zalo...)
    ├── AI Service         (:7100)  — AI agent backend
    ├── Data Board         (:8081)  — CRM board / knowledge hub (KNOWLEDGE_HUB)
    ├── Workflow       (:5678)  — workflow engine (optional)
    ├── PostgreSQL         (:5432)  — primary database
    ├── Redis              (:6379)  — cache
    └── Kafka              (:9092)  — event bus (optional)
```

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `BACKEND_HOST` | Backend / gateway URL | `http://localhost:6040` |
| `CHANNEL_SERVICE_URL` | Channel service URL | `http://localhost:4100` |

### Database (PostgreSQL)

```env
DB_TYPE=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=marketplaces
```

### Optional

```env
# Redis cache
REDIS_HOST=localhost

# AI Service
AI_SERVICE=http://localhost:7100

# AWS S3 (for file uploads)
AWS_S3_BUCKET=my-bucket
AWS_S3_REGION=ap-east-1
AWS_S3_ACCESS_KEY_ID=xxx
AWS_S3_SECRET_ACCESS_KEY=xxx

# Kafka (for event bus)
KAFKA_ENDPOINT=localhost:9092
KAFKA_CLIENT_ID=marketplace-local

# Facebook webhook verify token
FACEBOOK_VERIFY_TOKEN=your-verify-token
```

---

## Common Commands

```bash
pnpm dev              # Start dev (swc watch + nodemon)
pnpm build            # Build (swc compile to dist/)
pnpm start            # Run production (node dist/index.js)
pnpm lint             # Run ESLint
pnpm lint:fix         # Run ESLint with auto-fix
pnpm test             # Run tests
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| `EADDRINUSE :::9982` | Port already in use | `netstat -ano | findstr :9982`, kill the old process |
| `ECONNREFUSED :::5432` | PostgreSQL not running | `docker start marketplaces-pg` |
| `Missing required env: BACKEND_HOST` | Missing environment variables | Copy `.env.example` to `.env` and fill in required values |
| `connect ECONNREFUSED :::6379` | Redis not running | `docker start marketplaces-redis` |