# NEXUS-FORGE

NestJS CQRS starter kit designed as a clean base for command/query-driven services with event-oriented integrations.

## Included Foundations

- NestJS monorepo with `apps/api` entrypoint
- CQRS with sample aggregate, command, query, and event handlers
- JWT auth endpoints (`/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`) with RBAC guard/decorator
- TypeORM configured for PostgreSQL
- BullMQ configured for Redis
- Dedicated BullMQ queue module and worker processor for project lifecycle jobs
- NATS client configured for event transport (JetStream-ready)
- Transactional outbox publisher with retry policy, DLQ storage, and admin replay endpoints
- TypeORM migration tooling and seed script for repeatable local setup
- Docker Compose for API + Swagger + infra services
- Swagger docs at `/api/docs`

## Structure

```
apps/
  api/
    src/
      modules/
        auth/
        health/
        projects/
libs/
  contracts/
  shared/
```

## Quick Start

```bash
cp .env.example .env
npm install
docker compose up -d   # starts PostgreSQL, Redis, NATS
npm run db:create      # creates the nexus_forge database (skip if using Docker Compose Postgres — it creates it automatically)
npm run db:seed
npm run start:dev
```

## How To Run

### Run locally (development)

```bash
cp .env.example .env
npm install
docker compose up -d
npm run db:seed
npm run start:dev
```

The API runs pending TypeORM migrations automatically at startup when `DB_MIGRATIONS_RUN=true` (default).

API base URL: `http://localhost:3000/api`  
Swagger: `http://localhost:3000/api/docs`

### Run with Docker Compose (API + Swagger + infra)

```bash
docker compose up -d --build
```

Services:
- API: `http://localhost:3000/api`
- Built-in Swagger UI (from API): `http://localhost:3000/api/docs`
- Swagger UI container: `http://localhost:8080` (loads spec from `http://localhost:3000/api/docs-json`)

### Run compiled app (production-like)

```bash
npm run build
npm run start:prod
```

### Useful commands

```bash
# lint
npm run lint

# tests
npm test -- --watchman=false
npm run test:e2e
```

Health check:

```bash
curl http://localhost:3000/api/health
```

Swagger UI: `http://localhost:3000/api/docs`

### Database script

`scripts/create-db.sh` creates the `nexus_forge` database if it does not already exist. Accepts env overrides:

```bash
DB_HOST=localhost DB_PORT=5432 DB_USER=postgres DB_PASSWORD=postgres DB_NAME=nexus_forge npm run db:create
```

Default values match the Docker Compose Postgres service.

### Migrations

```bash
npm run db:migration:run
npm run db:migration:revert
npm run db:migration:show
npm run db:migration:create -- AddUsersTable
npm run db:migration:generate -- SyncProjectIndexes
```

### Seed data

```bash
npm run db:seed
```

Optional overrides:

```bash
SEED_PROJECT_ID=00000000-0000-0000-0000-000000000002 \\
SEED_PROJECT_NAME=\"Sandbox Project\" \\
SEED_PROJECT_DESCRIPTION=\"Local seed data\" \\
npm run db:seed
```

Default seeded auth user:

- email: `admin@nexus.local`
- password: `ChangeMe123!`

### Auth endpoints

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@nexus.local","password":"ChangeMe123!"}'

# Refresh
curl -X POST http://localhost:3000/api/auth/refresh \\
  -H "Content-Type: application/json" \\
  -d '{"refreshToken":"<refresh-token>"}'

# Logout (revoke refresh token)
curl -X POST http://localhost:3000/api/auth/logout \\
  -H "Content-Type: application/json" \\
  -d '{"refreshToken":"<refresh-token>"}'

# Current user
curl http://localhost:3000/api/auth/me \\
  -H "Authorization: Bearer <access-token>"
```

## CQRS Vertical Slice Example

`projects` module demonstrates:

- `CreateProjectCommand` + handler
- `GetProjectByIdQuery` + handler
- `ProjectCreatedEvent` + event handler
- Aggregate root (`ProjectAggregate`)
- Repository port (`ProjectRepository`) with TypeORM adapter
