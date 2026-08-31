# Backend migration plan: ASP.NET Core/SQL Server to NestJS/PostgreSQL

## 1. Objective

Replace the ASP.NET Core 8 backend and SQL Server database with a strict-TypeScript NestJS backend on PostgreSQL while preserving the current frontend behavior, all business data, MinIO objects, authorization rules, and real-time event semantics.

The migration must be incremental. The .NET service remains the rollback target until NestJS has passed contract, data, security, and real-time acceptance tests in a production-like environment.

## 2. Target stack

- Runtime: Node.js LTS in production; Bun remains the repository package manager and script runner.
- HTTP framework: NestJS with the Express adapter initially. Better Auth's NestJS integration requires control of raw body parsing and currently treats Fastify support as beta.
- Database access: Drizzle ORM with `node-postgres` (`pg`) and one application-managed connection pool.
- Database migrations: Drizzle Kit with reviewed, committed SQL migrations.
- Authentication: Better Auth email/password with database-backed sessions and secure HTTP-only cookies.
- NestJS integration: `@thallesp/nestjs-better-auth`, isolated behind a local `AuthSessionService` and guards so the application does not depend directly on community-package decorators outside the auth module.
- Authorization: application-owned roles and permissions. Better Auth proves identity and owns sessions; NestJS guards enforce the existing permission vocabulary.
- Real time: NestJS WebSocket Gateway with Socket.IO.
- Object storage: the official AWS SDK v3 S3 client against the existing MinIO service.
- Image inspection/transformation: `sharp`.
- Input validation and API contract: NestJS DTOs with `class-validator`/`class-transformer`, plus generated OpenAPI.
- Tests: unit tests, HTTP integration tests against an isolated PostgreSQL database, Socket.IO integration tests, and old/new contract/data comparison tests.

### Why Socket.IO

The current SignalR hub uses authenticated connections, automatic reconnect behavior, role-based groups, server broadcasts, and named events. Socket.IO maps directly to these requirements through rooms, acknowledgements, reconnection, middleware, and NestJS's first-party adapter. The lower-level `ws` adapter is faster but would require rebuilding these capabilities and does not provide rooms or namespaces itself.

## 3. Compatibility boundaries

During migration, preserve these externally visible contracts unless a versioned change is explicitly approved:

- REST prefix and endpoint paths currently consumed through `/backend-api`.
- HTTP status codes and the `{ code, message, details? }` error envelope.
- JSON field names, nullability, pagination, filtering, and sorting behavior.
- Media content/download behavior, content types, cache headers, and upload limits.
- Role codes `MN`, `CK`, `MC`, `US`, and `NO`.
- Permission names:
  - `system.manage`
  - `halls.manage`
  - `sessions.manage`
  - `bachelors.manage`
  - `checkin.execute`
  - `led.control`
  - `notifications.manage`
  - `notifications.broadcast`
  - `media.manage`
- Real-time event payloads used by the frontend, especially `SendMessage`-style events and `ReceiveTTSBroadcast`.
- Every human-readable `message` returned to the frontend, including validation, authentication, authorization, domain, upload, and unexpected-error responses, must be entirely in Vietnamese. Stable machine-readable `code` values remain language-neutral and must not be translated.

Create a machine-readable contract inventory before porting behavior. Record every controller route, request DTO, response sample, authorization requirement, side effect, emitted event, and known legacy quirk. Treat current behavior as the compatibility baseline even when endpoint naming is inconsistent.

## 4. Repository layout

Build the new service beside the existing backend until cutover:

```text
be-nest/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── errors/
│   │   ├── guards/
│   │   ├── logging/
│   │   └── validation/
│   ├── auth/
│   ├── bachelor/
│   ├── checkin/
│   ├── hall/
│   ├── session/
│   ├── statistics/
│   ├── notification/
│   ├── realtime/
│   ├── media/
│   ├── audit/
│   └── database/
├── drizzle/
│   ├── migrations/
│   └── meta/
├── test/
├── drizzle.config.ts
├── Dockerfile
├── package.json
└── tsconfig.json
```

Each feature module owns its controller/gateway handlers, DTOs, application service, Drizzle queries, authorization metadata, and tests. Cross-cutting database, auth, error handling, audit, and object-storage infrastructure stay in dedicated modules. Split Drizzle table declarations by domain under `src/database/schema` and export the combined schema from one explicitly named entry point.

## 5. PostgreSQL migration strategy

### 5.1 Target schema

Design a clean PostgreSQL schema declared with Drizzle rather than reproducing every SQL Server implementation detail. Preserve business identifiers and API behavior, but use PostgreSQL-native types and conventions:

- `uuid` for new auth, media, audit, and mapping identifiers where the current values are GUIDs;
- `integer`/identity sequences for existing numeric domain identifiers;
- `timestamptz` with UTC application semantics for instants, and `timestamp` only when a value is intentionally timezone-free;
- `boolean` instead of SQL Server `bit`;
- `text`/`varchar` with explicit validation where current maximum lengths are domain rules;
- PostgreSQL enums only for genuinely closed values; otherwise use constrained strings or integers to avoid costly enum migrations;
- lowercase `snake_case` physical table/column names mapped to stable TypeScript property names;
- equivalent unique constraints, indexes, foreign keys, defaults, and delete behavior.

Review every conversion explicitly, especially:

- SQL Server `datetime` values whose original timezone is implicit;
- identity seeds and the next PostgreSQL sequence value;
- case-insensitive email and student-code comparisons;
- `GETDATE()` defaults;
- nullable foreign keys and `SET NULL`/`RESTRICT` behavior;
- attendance enum integers;
- legacy `Users`/`Roles` and ASP.NET Identity tables;
- notification creator/broadcaster references;
- media metadata, legacy path mappings, SHA-256 indexes, and audit events.

Use normalized columns or PostgreSQL `citext` only after measuring the existing comparison semantics. Add explicit indexes for every current filter, sort, ownership lookup, and foreign key; do not assume indexes migrate with the data.

### 5.2 Source and target ownership

During coexistence:

- SQL Server remains the authoritative source for the .NET application.
- PostgreSQL is owned exclusively by NestJS/Drizzle.
- EF Core never writes PostgreSQL, and Drizzle never migrates SQL Server.
- NestJS is tested against PostgreSQL snapshots imported from SQL Server.
- Production writes are not split or dual-written between databases.

Dual-write is intentionally rejected because bachelor movement, check-in, notification transitions, and real-time side effects cannot be made atomically across SQL Server and PostgreSQL without a much larger event/outbox architecture.

### 5.3 Data migration tool

Create a repository-owned TypeScript CLI under `be-nest/src/migration` that reads SQL Server with a read-only `mssql` connection and writes PostgreSQL in dependency order. Keep migration code separate from runtime repositories.

The CLI must support:

- `plan`: inspect source/target schema and report blockers;
- `dry-run`: transform and validate without target writes;
- `full`: truncate only an explicitly named non-production target, then import all data;
- `resume`: restart safely from checkpoints;
- `verify`: compare source/target counts, key sets, aggregates, foreign-key coverage, and deterministic row hashes;
- a JSON report with timing, rejected rows, transformations, checksums, and sequence values.

Import in dependency order: domain lookup/parent tables, legacy identities, Better Auth identities/roles, bachelors/check-ins, notifications, media assets/mappings, and audit events. Use bounded batches and transactions. Reject malformed rows into a report; never silently coerce or discard them.

After inserting explicit numeric IDs, set every PostgreSQL sequence to a verified value greater than the current maximum. Run `ANALYZE` after the final import.

### 5.4 Migration rehearsal and final cutover

Perform repeated full migrations from restored SQL Server backups before production cutover. Each rehearsal must record duration and pass structural, semantic, API-contract, and performance verification.

Final cutover uses a maintenance window:

1. Announce maintenance and stop FE mutation traffic.
2. Stop .NET workers/API or place it in read-only mode, then verify there are no active writes.
3. Take and verify a recoverable SQL Server backup.
4. Recreate the target PostgreSQL database from the reviewed Drizzle SQL migrations.
5. Run the final full import and identity migration.
6. Run counts, key/hash reconciliation, foreign-key checks, sequence checks, and critical business invariants.
7. Start NestJS against PostgreSQL with traffic still closed.
8. Run auth, check-in, bachelor, media, notification, statistics, and Socket.IO smoke tests.
9. Switch the reverse proxy and reopen traffic only after all gates pass.
10. Keep SQL Server immutable as the cutover snapshot for the stabilization period.

Before traffic reopens, rollback means switching back to .NET/SQL Server. After PostgreSQL accepts new writes, an immediate proxy rollback would lose those writes; use a tested reverse-delta export or prefer forward recovery. Define this decision point and incident authority in the runbook.

### 5.5 Migration ownership

Drizzle Kit owns PostgreSQL schema history from the first target schema. Use `drizzle-kit generate` to produce committed SQL, review the SQL and snapshot metadata, run `drizzle-kit check`, then apply it with `drizzle-kit migrate` as a separate deployment job. Never run migrations during application startup and never use `drizzle-kit push` in shared, staging, or production environments. CI must create an empty PostgreSQL database from committed migrations, detect schema drift, and run the import verifier against a representative SQL Server fixture.

Better Auth uses its official Drizzle adapter with provider `pg`. Generate the Better Auth Drizzle schema from the pinned Better Auth configuration, review it into the application schema, and let Drizzle Kit create the SQL migration. Better Auth must not run a second independent migration mechanism against the same PostgreSQL schema.

## 6. Better Auth migration

### 6.1 Target behavior

- Email/password only initially; public sign-up disabled.
- Eight-hour database-backed sessions with secure, HTTP-only, same-site cookies.
- Unique normalized email.
- Password reset delivery through the existing SMTP configuration.
- Session revocation on password reset and administrative disablement.
- Login rate limiting and account lockout equivalent to the current five-attempt/fifteen-minute policy.
- Trusted origins configured explicitly for development and production.
- Stable `BETTER_AUTH_SECRET`; support secret rotation rather than regenerating it on container recreation.

Better Auth owns users, credentials/accounts, sessions, and verification records. Application roles and permissions remain application tables linked to the Better Auth user ID.

### 6.2 Identity data migration

ASP.NET Identity password hashes cannot be assumed compatible with Better Auth's default password hashing. Use an explicit migration path:

1. Create Better Auth tables alongside ASP.NET Identity tables; do not rename or reuse the old tables in place.
2. Copy user identity, full name, email verification state, legacy user ID, disabled state, and password-reset-required flag into the new model.
3. Implement and test a temporary verifier for the exact ASP.NET Identity V3 PBKDF2 hash format currently stored.
4. On the first successful legacy login, hash the password with the Better Auth configured hasher in the new credential record and mark the legacy credential migrated.
5. Users with no valid legacy credential remain `passwordResetRequired` and must complete the reset flow.
6. Do not migrate active ASP.NET authentication cookies. Require a fresh login at final auth cutover.
7. Remove the legacy verifier only after every active account has migrated or passed through password reset.

Add a dry-run migration command that reports counts, duplicates, invalid emails, missing roles, and unmapped users without writing data. Make the real migration idempotent and auditable.

### 6.3 Auth compatibility facade

Keep the frontend-facing endpoints stable for the first cutover:

- `GET /api/auth/me`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/password`
- `POST /api/auth/password/reset/request`
- `POST /api/auth/password/reset/confirm`

The facade translates current request/response shapes to Better Auth operations. Once the backend migration is stable, a separate FE change may adopt Better Auth's native client endpoints and remove the facade.

Do not reproduce the current ASP.NET antiforgery token mechanism automatically. First document and test Better Auth's own origin/cookie protections. If a separate double-submit CSRF layer remains required by the threat model, implement it once at the NestJS boundary and update the FE interceptor deliberately.

## 7. Authorization

Create application-owned decorators and guards:

- `@Public()` for intentionally unauthenticated routes.
- `@RequirePermissions(...)` for HTTP and WebSocket handlers.
- a session guard that resolves the Better Auth session from request/handshake headers;
- a permission guard that expands roles through the current role-to-permission map;
- an audit interceptor for destructive and security-sensitive operations.

Avoid role checks embedded in services or string comparisons such as `role === "MN"`. Services receive an actor context and enforce domain invariants; transport guards enforce route access.

## 8. Real-time migration

Create a `/events` Socket.IO endpoint on the same origin as the REST API.

### Connection authentication

1. Browser connects with credentials enabled.
2. Gateway middleware resolves the Better Auth session from the handshake cookie headers.
3. Reject missing, expired, or disabled sessions before connection succeeds.
4. Join the socket to `user:<id>`, `role:<role>`, and approved domain rooms.
5. Re-evaluate authorization for every client-to-server command; room membership is not authorization.

### Event contract

Replace the generic `SendMessage(methodName, data)` command with a typed allowlist internally. During coexistence, emit compatibility event names/payloads so current screens keep working. Define a shared TypeScript event map for:

- current bachelor changes;
- hall/session refresh signals;
- notification lifecycle changes;
- `ReceiveTTSBroadcast`;
- connection/authorization errors.

Add event IDs and server timestamps where deduplication matters. Test reconnect, duplicate delivery, ordering expectations, unauthorized broadcast attempts, room isolation, and server restart recovery.

If horizontal scaling is introduced, add the Socket.IO Redis adapter and either force WebSocket transport or configure sticky sessions for polling. Do not add Redis for the initial single-instance deployment.

### Frontend transition

Implement a small realtime transport in `src/lib/realtime` with typed subscribe/unsubscribe semantics. Migrate consumers from `@microsoft/signalr` to `socket.io-client` one feature at a time. Remove `@microsoft/signalr` only after all consumers and production-like reconnect tests pass.

## 9. Module migration order

### Phase 0: Baseline and safety net

- Freeze and inventory REST and SignalR contracts.
- Export current OpenAPI and add representative response fixtures.
- Add .NET integration tests for critical happy/error paths where coverage is missing.
- Snapshot the database schema, row counts, constraints, indexes, and representative data.
- Classify every SQL Server column/default/index into its reviewed PostgreSQL mapping and record timezone/case-sensitivity decisions.
- Document current FE callers for every endpoint and real-time event.
- Define performance baselines for login, bachelor search/list, check-in, media upload/content, and broadcasts.

Exit gate: every externally used endpoint and event has an owner, authorization rule, fixture, and migration destination.

### Phase 1: NestJS foundation

- Scaffold `be-nest` with strict TypeScript, Bun scripts, configuration validation, structured logging, health/readiness endpoints, global validation, consistent error mapping, OpenAPI, and graceful shutdown.
- Add the PostgreSQL Compose service, reviewed Drizzle schema/migrations, and health checks.
- Add the read-only SQL Server source connection only to the data-migration CLI, never to normal NestJS runtime modules.
- Complete the first full snapshot import and reconciliation report.
- Add Docker image and a separate Compose service without changing the current `be` route.
- Add CI commands for lint, typecheck, unit tests, integration tests, build, secret scan, `drizzle-kit check`, migration-from-empty, and schema-drift validation.

Exit gate: NestJS starts in Docker against PostgreSQL, reports dependency readiness, Drizzle migrations can build an empty database without drift, and the imported snapshot reconciles with SQL Server.

### Phase 2: Auth and authorization

- Add Better Auth, its schema, stable secrets, SMTP reset flow, session guard, permission guard, and audit events.
- Implement dry-run and idempotent identity migration.
- Verify legacy hash login-and-rehash plus forced-reset accounts.
- Expose the auth compatibility facade.
- Test cookie flags, origin validation, login enumeration resistance, rate limiting, lockout, reset replay prevention, session revocation, and permission matrix.

Exit gate: a copied production-like identity set can log in/reset safely, all permission tests pass, and rollback to .NET remains possible.

### Phase 3: Read-only domain APIs

Port in low-risk order:

1. hall reads;
2. session reads;
3. statistics;
4. bachelor search/list/detail;
5. check-in read models;
6. notification reads;
7. media metadata/content/download.

Run contract comparison tests with .NET reading the SQL Server source snapshot and NestJS reading its reconciled PostgreSQL import. Because the databases are not kept in sync, use shadow/test traffic or repeatable snapshot fixtures rather than routing live production reads between independently changing databases.

Exit gate: response bodies, status codes, authorization, query counts, and performance meet the compatibility baseline.

### Phase 4: Domain writes

Port one bounded transaction at a time:

1. hall/session management;
2. bachelor create/update/delete/import/reset/transfer;
3. check-in/update/uncheck operations;
4. notifications and lifecycle transitions;
5. database reset, restricted to explicit development/test configuration.

Define transaction boundaries and concurrency behavior explicitly. Add idempotency or optimistic concurrency where repeated scanner/operator actions could duplicate effects.

Exit gate: each write path passes side-by-side final-state comparison on equivalent SQL Server/PostgreSQL fixtures, authorization, audit, race-condition, and rollback tests before final cutover.

### Phase 5: Media and object storage

- Port MinIO bucket checks, validation, hashing, metadata, bulk limits, listing, rename/update, delete, content, and download.
- Preserve object keys and existing database IDs; do not copy already migrated objects unnecessarily.
- Port the legacy media migration as an idempotent CLI command with dry-run and JSON report.
- Stream uploads/downloads; never buffer unbounded files in memory.
- Validate MIME by file content, enforce image dimensions/file/count/aggregate limits, and preserve authenticated content behavior.

Exit gate: old and new services produce equivalent metadata/checksums and all existing media remain readable.

### Phase 6: Real time

- Add the authenticated Socket.IO gateway, typed events, role rooms, and broadcast services.
- Dual-publish domain events to SignalR and Socket.IO temporarily where safe.
- Migrate FE consumers feature by feature and add reconnect/authorization tests.
- Stop SignalR publishing only when usage telemetry shows no remaining SignalR clients.

Exit gate: all current real-time screens work after disconnect/reconnect and unauthorized users cannot subscribe to or emit privileged events.

### Phase 7: Cutover and decommission

- Run full regression, load, security, backup/restore, and disaster-recovery tests.
- Complete the rehearsed maintenance-window import and all reconciliation gates.
- Run Drizzle Kit migration/drift checks against PostgreSQL.
- Back up SQL Server and keep it immutable at the exact rollback point.
- Route all traffic to NestJS with fast proxy rollback available.
- Observe error rate, latency, DB pool usage, login failures, WebSocket connections, reconnect rate, and event-delivery failures.
- After the agreed stabilization window, remove .NET from Compose/deployment, archive EF migrations as historical artifacts, and remove SignalR/Data Protection configuration and FE dependency.

Exit gate: NestJS is the sole traffic and migration owner, rollback criteria were not triggered, and operational documentation is complete.

## 10. Testing and acceptance matrix

Every migrated module must pass:

- unit tests for domain rules and permission expansion;
- DTO validation tests for malformed, boundary, and unknown inputs;
- HTTP contract tests for body, headers, status, and error envelope;
- PostgreSQL integration tests covering constraints, transactions, query plans, and sequence correctness;
- authorization tests for anonymous and every role code;
- audit assertions for security-sensitive changes;
- old/new comparison tests against a restored database snapshot;
- FE end-to-end tests for the affected workflow;
- performance checks against the Phase 0 baseline.

Auth additionally requires cookie, trusted-origin, rate-limit, reset-token, session-revocation, legacy-hash, and account-enumeration tests. Real time additionally requires handshake authentication, room isolation, command authorization, reconnect, duplicate event, and server-restart tests. Media additionally requires malicious MIME, oversized payload, decompression/dimension, partial bulk failure, streaming, and object/metadata consistency tests.

## 11. Deployment and rollback

During development and migration rehearsal, run `be`/SQL Server and `be-nest`/PostgreSQL as separate stacks. Never let both stacks accept live production writes. Module-level proxy switching is allowed only with synchronized fixtures in non-production; production changes stacks during the final maintenance-window cutover.

For every route switch:

1. rehearse from a recoverable SQL Server backup;
2. build PostgreSQL from Drizzle migrations and import the snapshot;
3. reconcile data and run NestJS readiness/contract/smoke tests;
4. execute the final stopped-write import during maintenance;
5. switch the whole backend/database pair;
6. monitor defined service-level indicators and apply the documented pre-write or post-write rollback policy.

Keep the SQL Server cutover snapshot and .NET image untouched while rollback is allowed. PostgreSQL migrations must remain forward/backward deployable across NestJS releases during the stabilization period. Remove SQL Server and .NET only after backups and any required reverse-delta procedure are verified.

## 12. Definition of done

The migration is complete only when:

- all FE workflows use NestJS and Socket.IO;
- Better Auth owns authentication and no ASP.NET session is accepted;
- every existing role/permission rule has automated coverage;
- PostgreSQL contains a fully reconciled copy of all required SQL Server business and identity data;
- Drizzle Kit is the sole PostgreSQL schema migration owner and reports no drift;
- all MinIO media and legacy mappings are preserved;
- REST and real-time contracts pass the acceptance matrix;
- production-like load/security/backup-restore tests pass;
- monitoring and runbooks cover HTTP, auth, database, object storage, and Socket.IO;
- rollback artifacts are retained for the agreed stabilization window;
- the .NET container and `@microsoft/signalr` dependency can be removed without loss of behavior.
