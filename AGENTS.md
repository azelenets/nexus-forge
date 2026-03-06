# AGENTS.md

## Scope
Rules for coding agents working in `nexus-forge`.

## Project Profile (Current Stack)
- Runtime/framework: NestJS 11 (`apps/api`)
- Language/tooling: TypeScript (`strict: true`), ESLint, Jest
- Data: PostgreSQL + TypeORM
- Async: BullMQ (Redis)
- Messaging: NATS (`@nestjs/microservices`) with outbox + DLQ pattern
- Auth: JWT + Passport + RBAC guard/decorator
- API docs: Swagger at `/api/docs`
- App prefix + validation: global `/api` prefix and strict `ValidationPipe`

## Architecture Standards

### Module and Layer Boundaries
Use feature-first modules under `apps/api/src/modules/*`.

Inside each module, follow this dependency direction:
- `interface` (controllers/dto) -> `application` (commands/queries/services) -> `domain` (aggregate/entities/rules/ports)
- `infrastructure` implements domain/application ports (TypeORM repos, external clients, queue adapters)

Practical mapping in this repo:
- Existing `projects` module already contains `domain`, `commands`, `queries`, `infra`, `outbox`.
- For new modules, prefer explicit `application/` + `interface/` folders, but preserve existing local style if refactoring is out of scope.

Non-negotiables:
- No business rules in controllers.
- No NestJS/TypeORM dependencies inside domain objects.
- No cross-module deep imports into another module's `infra`.
- Share only stable contracts/types via `libs/contracts` and generic helpers via `libs/shared`.

### DI and Provider Contracts
- Depend on tokens/interfaces from domain/application layers (e.g., `PROJECT_REPOSITORY` pattern).
- Register concrete adapters in module providers.
- Avoid `@Global()` modules except true cross-cutting infrastructure (current `MessagingModule` is an accepted exception).

### Configuration
- Use `ConfigService`; avoid raw `process.env` outside bootstrap/infrastructure wiring.
- Validate env on startup (introduce schema validation when touching config).
- Keep production-safe defaults conservative; never default secrets to unsafe values beyond local dev.

## CQRS Standards

### When to Apply
- Default for non-trivial business flows in this repo.
- Simple CRUD may stay simple if CQRS adds no clarity.

### Commands
- One command = one business intent and one handler.
- Command handlers orchestrate use cases; domain enforces invariants.
- Commands should return minimal write results (`id`, status), not read-model payloads.
- Write flows that persist state + emit events must be atomic (single transaction boundary).

### Queries
- Must be side-effect free.
- Query handlers may use read-optimized queries/projections.
- Return response DTOs, not ORM entities.

### Domain and Integration Events
- Emit domain events for meaningful state transitions.
- Publish integration events through outbox after commit, not inline before transaction success.
- Keep event names and payloads versionable and backward compatible.

### Outbox + DLQ (Repository-Specific)
When changing event publication behavior:
- Preserve `FOR UPDATE SKIP LOCKED` style safe concurrent polling.
- Keep retry limits and dead-letter transition behavior intact.
- Ensure replay paths are idempotent and auditable.
- Avoid long-running external calls inside open DB transactions unless explicitly justified.

## API and Transport Standards
- Controllers are thin adapters: validate/map request -> dispatch command/query -> map response.
- Use `class-validator` DTOs for all external inputs.
- Keep global validation guarantees (`whitelist`, `forbidNonWhitelisted`, `transform`).
- Keep Swagger decorators/docs updated for new endpoints.
- Normalize error mapping (domain/app errors -> HTTP exceptions) consistently.

## Persistence and Data Modeling
- Repositories are ports in domain/application, adapters in `infra`.
- Do not leak TypeORM entities outside infrastructure boundaries.
- Use explicit migrations for schema evolution; do not rely on `synchronize` for production rollout.
- Enforce critical invariants at both domain and database levels (constraints/indexes).

## Messaging, Queues, and Jobs
- Use NATS for integration events; keep subject naming consistent and domain-oriented.
- Use BullMQ for background work, retries, and delayed processing.
- Handlers/consumers must be idempotent (at-least-once semantics).
- Include retry/backoff and poison-message handling strategy for new consumers.

## Security Standards
- Protect privileged endpoints with JWT auth + RBAC roles.
- Do not log secrets, tokens, raw credentials, or sensitive payload fields.
- Use least-privilege credentials for DB/Redis/NATS.

## Testing Standards

### Unit
- Test aggregates/domain services for invariants and edge cases.
- Test command/query handlers with mocked ports.

### Integration
- Test TypeORM repositories, outbox repository, and messaging adapters.
- Cover transactional behavior where command + outbox writes must be atomic.

### E2E
- Cover critical API flows via `apps/api/test`.
- Include validation failures, auth/RBAC, and happy-path CQRS flows.

Minimum expectation for behavior changes:
- Add or update tests at the closest meaningful level.
- Do not merge significant behavior changes with zero automated coverage.

## Observability and Reliability
- Use structured logs with context (module, command/query, aggregate id/event id).
- Add metrics/tracing for command latency, query latency, outbox backlog, publish failures, DLQ size.
- Add health checks for Postgres, Redis, and NATS when touching ops surfaces.

## Code Quality and Delivery
- Keep public method return types explicit.
- Prefer small, cohesive files; split large handlers/services.
- Preserve backward compatibility for external APIs/events unless versioned change is intentional.
- Required local verification for meaningful changes:
  - `npm run lint`
  - `npm test`
  - `npm run test:e2e` (when endpoint or module wiring changes)

## Module Template (CQRS Vertical Slice)
Use this scaffold for new non-trivial modules under `apps/api/src/modules/<feature>`.

```text
apps/api/src/modules/<feature>/
  <feature>.module.ts
  interface/
    <feature>.controller.ts
    dto/
      create-<feature>.dto.ts
      <feature>-response.dto.ts
  application/
    commands/
      create-<feature>.command.ts
      create-<feature>.handler.ts
    queries/
      get-<feature>-by-id.query.ts
      get-<feature>-by-id.handler.ts
    <feature>-write.service.ts
  domain/
    <feature>.aggregate.ts
    <feature>.repository.ts
    events/
      <feature>-created.event.ts
      <feature>-created.handler.ts
  infrastructure/
    persistence/
      <feature>.entity.ts
      typeorm-<feature>.repository.ts
    messaging/
      outbox.repository.ts
      outbox.publisher.ts
```

Template notes:
- Keep controller methods as transport adapters only.
- Put invariants in aggregate/domain services, not handlers.
- Use repository token pattern in `domain/<feature>.repository.ts` and bind in `<feature>.module.ts`.
- Use transaction boundary in write service for `state change + outbox enqueue`.
- For very small modules, `application/` and `interface/` can be flattened temporarily, but preserve dependency direction.

## Module Template (Simple CRUD, Non-CQRS)
Use this only when logic is straightforward (basic CRUD, no complex invariants/workflows, no event choreography required).

```text
apps/api/src/modules/<feature>/
  <feature>.module.ts
  <feature>.controller.ts
  <feature>.service.ts
  dto/
    create-<feature>.dto.ts
    update-<feature>.dto.ts
    <feature>-response.dto.ts
  infra/
    <feature>.entity.ts
    typeorm-<feature>.repository.ts
```

Decision rules:
- Choose simple CRUD template when:
  - Writes are direct and low-risk.
  - Read model is nearly identical to write model.
  - No async/event-driven integration is needed.
- Choose CQRS template when:
  - Write invariants or workflows are growing.
  - Read and write models diverge.
  - You need outbox/integration events, retries, or background orchestration.

Simple CRUD guardrails:
- Controllers remain thin; service contains application logic.
- Keep DTO validation and explicit response mapping.
- Do not leak TypeORM entities directly from controllers.
- If complexity increases, migrate incrementally toward CQRS instead of piling logic into one service.

## Agent Workflow (Do This Order)
1. Identify affected module boundary and use case.
2. Define/adjust command-query contracts and domain rules.
3. Implement application logic and infrastructure adapters.
4. Wire module providers/controllers.
5. Add/update tests.
6. Run validation commands.
7. Summarize tradeoffs and any remaining risks.

## Anti-Patterns to Reject
- Fat controllers or handlers containing domain logic and persistence details together.
- Returning TypeORM entities directly from controllers.
- Publishing integration events before durable commit.
- Adding cross-module imports into another module's infrastructure internals.
- Introducing CQRS ceremony for trivial endpoints without clear benefit.
