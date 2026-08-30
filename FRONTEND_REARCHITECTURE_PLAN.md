# Frontend rearchitecture and security plan

## 1. Document status

- Status: Source implementation substantially complete; cleanup, browser tests and operational acceptance remain
- Created: 2026-08-30
- Scope: `fe`, authentication integration with `be`, media migration from `imageAPI` and local frontend storage to MinIO
- Reference implementation: `F:\CODE\tan-thuan-my-viet\apps\web`
- Delivery strategy: incremental vertical-slice migration with rollback; no big-bang rewrite
- CI platform: GitHub Actions; Jenkins is not used
- Frontend package manager: Bun only, with `bun.lockb` as the only frontend lockfile

## 2. Objectives

1. Rebuild the frontend around feature-owned modules with small, explicit interfaces.
2. Remove browser-accessible credentials and JWT storage from `localStorage`.
3. Replace the current authentication flow with ASP.NET Core Identity and secure cookie sessions.
4. Remove `imageAPI` and filesystem-based application uploads; use MinIO as the only object store for business media.
5. Preserve the core Manager, Checkiner, MC, Noticer, LED and statistics workflows during migration.
6. Establish mandatory lint, type, test, build, secret-scanning and security gates.
7. Run all repository CI gates through GitHub Actions for pull requests and protected branches.

## 3. Current-state findings

### 3.1 Frontend architecture

- Next.js 14 and React 18 are used under `fe`.
- Product code is mixed with a large dashboard template and demo routes/assets.
- API calls, DTOs, authorization UI and transport configuration are centralized or duplicated instead of owned by features.
- The frontend has no meaningful automated test suite or enforced typecheck script.
- ESLint errors are ignored during production builds.
- Multiple package-manager lockfiles are present.

### 3.2 Authentication and authorization

- Backend JWTs are stored in browser `localStorage` and read from multiple components/hooks.
- Route protection is primarily client-side and can only be considered a UX gate.
- Roles are inferred by decoding the browser-held JWT in multiple locations.
- A secondary frontend auth implementation contains hard-coded credentials/API keys.
- The backend compares user passwords directly instead of using a password hash.
- Backend CORS currently permits arbitrary origins together with credentials.

### 3.3 Secrets

- Environment files are tracked by Git.
- Service credentials have been hard-coded in source and deployment configuration.
- At least one error response path can expose a service credential to the caller.
- Removing the strings from the current files is insufficient; exposed credentials must be revoked and rotated.

### 3.4 Media storage

There are two legacy media paths:

1. The standalone Express application under `imageAPI`.
2. Next.js route handlers that write files and JSON metadata to frontend-local volumes.

The legacy implementation lacks a single authoritative metadata store, consistent authorization, strong upload validation and production-grade object lifecycle management.

## 4. Target system architecture

```text
Browser
  |
  | HTTPS + HttpOnly session cookie
  v
Reverse proxy / same-origin gateway
  |-------------------------|
  v                         v
Next.js frontend       ASP.NET Core API
                            |          |
                            v          v
                       SQL Server     MinIO
                       metadata       object data
```

Rules:

- The browser calls application endpoints through the same origin.
- The browser never receives MinIO access keys or root credentials.
- The ASP.NET API is the authorization authority for every protected operation.
- SQL Server stores media metadata and ownership; MinIO stores object bytes.
- UI assets such as logos and icons remain in `fe/public`; only business media belongs in MinIO.
- Server Components are the default. Client Components are limited to browser APIs, interaction and client state.

## 5. Target frontend structure

```text
fe/src/
|-- app/                       # Routes, layouts, loading/error boundaries, route handlers
|-- components/
|   `-- ui/                    # Shared UI primitives only
|-- features/
|   |-- auth/
|   |-- bachelor/
|   |-- check-in/
|   |-- hall/
|   |-- session/
|   |-- notification/
|   |-- led/
|   |-- statistics/
|   `-- media/
|       |-- api/
|       |-- model/
|       |-- queries/
|       `-- ui/
|-- hooks/                     # Truly shared hooks
|-- lib/
|   |-- env/
|   |-- http/
|   |-- query/
|   `-- security/
`-- stores/                    # Shared client-only state
```

Frontend rules:

- Remote data is TanStack Query state.
- Cross-feature client-only state may use Zustand.
- Local interaction state stays in the closest component.
- UI modules do not call Axios or `fetch` directly.
- Endpoint operations live in the owning feature's `api` directory.
- Query keys and hooks live in the owning feature's `queries` directory.
- Domain rules, schemas and types live in `model`.
- Avoid barrel imports and unnecessary wrapper abstractions.
- Avoid sequential awaits when requests are independent.
- Dynamically load large QR, chart, Excel, editor and map modules.
- Do not upgrade Next.js/React in the same pull request as business-feature migration.

## 6. Authentication target: ASP.NET Core Identity

Better Auth will not be used because it is a TypeScript authentication server and has no native ASP.NET Core adapter. The project will use ASP.NET Core Identity integrated directly into the existing API.

### 6.1 Web authentication

- Use ASP.NET Core Identity for users, password hashing, lockout, password reset and security stamps.
- Use an opaque session cookie with `HttpOnly`, `Secure` and an explicit `SameSite` policy.
- Implement `POST /api/auth/login`, `POST /api/auth/logout` and `GET /api/auth/me`.
- Return a typed session-user DTO from `/me`; never return password hashes or authentication secrets.
- Do not store or decode authentication tokens in frontend code.
- Use safe, allowlisted post-login redirects.
- Add CSRF protection to cookie-authenticated mutations.
- Regenerate the session on login and revoke it on logout/password/role changes.

### 6.2 Authorization

- Express business permissions as ASP.NET authorization policies.
- Keep role-to-permission mapping on the server as the source of truth.
- Frontend navigation filtering is UX only and consumes permissions from `/me`.
- Apply policy authorization to controllers and SignalR hub methods.
- Add stronger confirmation and audit logging for database reset, delete-all and bulk destructive operations.

### 6.3 Mobile and SignalR

- Prefer cookie authentication for same-origin browser and SignalR traffic.
- If the mobile client cannot use the web session, issue short-lived audience-bound access tokens through a dedicated mobile flow.
- Do not reuse a long-lived web token from `localStorage`.
- If SignalR requires a query-string connection ticket, use a short-lived, narrowly scoped ticket and ensure query strings are not logged.

## 7. MinIO media architecture

### 7.1 Backend ownership

Add a backend media module with an object-storage interface:

```text
be/Media/
|-- MediaController.cs
|-- MediaService.cs
|-- MediaValidator.cs
|-- ObjectStorage.cs
`-- MediaAsset.cs
```

Required storage operations:

- Put object.
- Head object.
- Generate short-lived presigned GET URL.
- Delete object.
- Copy/move object when promoting temporary uploads.

### 7.2 Media metadata

Create a SQL `MediaAsset` record containing at least:

- `Id`
- `ObjectKey`
- `OriginalName`
- `ContentType`
- `Size`
- `Width` and `Height` where applicable
- `Sha256`
- `OwnerType` and `OwnerId`
- `Status`
- `UploadedBy`
- `CreatedAt`
- `DeletedAt`

Store only `mediaId` or stable object identity in business records. Do not persist presigned URLs because they expire.

### 7.3 Object keys

Do not include untrusted filenames, student codes or other personal data directly in object keys.

```text
bachelors/{bachelorId}/avatar/{uuid}.webp
notifications/{notificationId}/{uuid}.mp3
exports/{jobId}/{uuid}.xlsx
temp/{userId}/{uuid}
```

### 7.4 Initial upload flow

The first implementation will proxy uploads through the ASP.NET API:

```text
Browser -> authenticated API -> validate/re-encode -> MinIO -> SQL metadata
```

This provides a single enforcement point for permissions, type validation, size limits, image dimension limits, hashing and audit logging.

Direct-to-MinIO upload may be added later for large batches:

1. Browser requests a short-lived upload ticket from the API.
2. API authorizes the operation and returns a constrained presigned upload.
3. Browser uploads without receiving permanent credentials.
4. Browser calls finalize.
5. API verifies the object with HEAD, validates ownership and records metadata.

### 7.5 Media API

Initial contract:

```text
POST   /api/media/images
POST   /api/media/images/bulk
GET    /api/media/{id}
GET    /api/media/{id}/download
PATCH  /api/media/{id}
DELETE /api/media/{id}
```

The bucket is private. Reads use authorization followed by a short-lived presigned URL or an API-streamed response where tighter control is required.

### 7.6 Upload security

- Validate authorization before accepting the request body.
- Enforce per-file and per-request size limits.
- Allowlist supported image formats.
- Detect MIME from bytes; do not trust the browser-supplied type or extension.
- Reject SVG initially unless there is a proven requirement and a sanitizer.
- Enforce decoded pixel limits to prevent decompression bombs.
- Decode and re-encode avatar images to a normalized format.
- Generate server-side object keys.
- Apply rate limits and quotas.
- Record audit events for upload, replacement and deletion.
- Treat delete as soft-delete first; perform object cleanup through an idempotent job.

## 8. Infrastructure changes

Add a MinIO service to Docker Compose:

- MinIO API on the internal container network.
- MinIO Console exposed only in development or an administrator-only network.
- Persistent `minio_data` volume.
- Health check and startup dependency for the API.
- Private bucket initialized idempotently.

Server-only configuration:

```text
S3_ENDPOINT=http://minio:9000
S3_PUBLIC_ENDPOINT=https://media.example.com
S3_BUCKET=convocation
S3_ACCESS_KEY=<secret>
S3_SECRET_KEY=<secret>
```

Production requirements:

- No default MinIO credentials.
- No MinIO secret in `NEXT_PUBLIC_*` or frontend build arguments.
- HTTPS for browser-facing presigned URLs.
- MinIO Console not publicly exposed.
- Scheduled backup and restore test for `minio_data`.
- Lifecycle policy for abandoned `temp/` objects.
- Consider bucket versioning for critical business media.

## 9. Delivery phases

### Phase 0 - Security containment

1. Revoke and rotate every credential exposed in source, environment files or Git history.
2. Stop tracking `.env`; provide redacted `.env.example` files.
3. Remove hard-coded frontend auth credentials and service keys.
4. Stop returning credentials and verbose upstream errors to clients.
5. Restrict backend CORS to known origins.
6. Add secret scanning to CI and local hooks.

Exit criteria:

- No active exposed credential remains usable.
- Repository scans contain no real secrets.
- Environment files with real values are untracked.

### Phase 1 - Engineering foundation

1. Establish `fe/src` and feature-first boundaries.
2. Add typed environment validation.
3. Add a same-origin HTTP client and normalized error handling.
4. Add Query Client and minimal application providers.
5. Enforce strict TypeScript and ESLint during builds.
6. Use Bun as the only frontend package manager and `bun.lockb` as the only frontend lockfile.
7. Add `lint`, `typecheck`, `test`, `build` and `secrets:check` commands.
8. Add CSP, frame, MIME-sniffing, referrer and permissions headers.
9. Add GitHub Actions gates for frontend Bun verification, backend .NET verification and container builds.

### Phase 1 CI requirements

- GitHub Actions is the only supported CI platform; do not add or maintain Jenkins configuration.
- Run on every pull request and on pushes to protected delivery branches.
- Install frontend dependencies with `bun install --frozen-lockfile`.
- Run frontend secret scan, lint, typecheck, Bun tests and production build as separate visible steps.
- Restore, build and test the backend with .NET 8.
- Validate Docker Compose and build application images only after frontend and backend gates pass.
- Grant workflows read-only repository permissions unless a later deployment workflow explicitly needs more.
- Use concurrency cancellation so superseded commits do not consume CI capacity.
- Never place production secrets in workflow YAML; deployment secrets must come from GitHub Environments or an external secret manager.

### Phase 2 - ASP.NET Core Identity and secure sessions

1. Introduce Identity schema and migrate existing users.
2. Force password reset where plaintext passwords cannot be safely migrated.
3. Implement login, logout and `/me`.
4. Add secure cookie and CSRF configuration.
5. Define authorization policies and a permission DTO.
6. Replace protected client providers with server/session-aware boundaries.
7. Remove browser JWT storage and decoding.
8. Update SignalR authentication.

### Phase 3 - MinIO and backend media module

1. Add MinIO to Docker Compose and environment examples.
2. Implement object-storage service and private bucket initialization.
3. Add `MediaAsset` migration and repository/service layer.
4. Implement validated upload, metadata, read and delete endpoints.
5. Add presigned GET URLs with short TTL.
6. Add media authorization policies and audit events.

### Phase 4 - Legacy media migration and cutover

Build an idempotent migration process that:

1. Scans both `imageAPI/uploads` and frontend-local upload storage.
2. Rejects symlinks and invalid paths.
3. Detects and validates real file types.
4. Calculates SHA-256 hashes.
5. Uploads objects using the new key convention.
6. Inserts SQL metadata.
7. Records `oldPath -> mediaId` mappings.
8. Produces success, duplicate, missing and failure reports.
9. Verifies object checksums after upload.
10. Can safely resume without creating duplicates.

Preferred cutover:

1. Back up database and legacy upload volumes.
2. Temporarily freeze upload mutations.
3. Run the migration and reconciliation report.
4. Switch reads/writes to the new media API.
5. Verify Manager, Check-in, MC and LED image flows.
6. Keep legacy storage read-only for one rollback window.
7. Remove legacy storage only after acceptance.

Use temporary dual-read only if a maintenance window is impossible. Avoid long-lived dual-write.

### Phase 5 - Product vertical slices

Migrate in this order:

1. Admin shell and permission-aware navigation.
2. Hall and Session.
3. Manual/QR Check-in and seating lookup.
4. MC controller and LED display.
5. Notification and Noticer workflows.
6. Bachelor management, Excel import and avatars.
7. Statistics.
8. Remaining verified product routes.

Each slice includes model/schema, API operations, queries/mutations, UI, authorization checks, tests, feature flag or route switch, and rollback instructions.

### Phase 6 - Legacy removal and optimization

After production acceptance:

- Remove the `imageAPI` directory and port 3214 service/configuration.
- Remove frontend-local upload and JSON metadata code.
- Remove legacy `/api/images`, `/api/resize` and `/images/[filename]` handlers.
- Remove obsolete upload environment variables and API keys.
- Remove `fe_uploads` and `fe_data` only after the rollback window and backup verification.
- Remove unused dashboard demos, assets and dependencies.
- Reduce Client Component boundaries and dynamically load large modules.
- Upgrade Next.js/React in a separate, tested change if required.

### Phase 7 - Hardening and rollout

1. Run the full permission matrix for every role.
2. Test expired sessions, safe redirects, CSRF and concurrent 401/403 handling.
3. Test fake MIME, malicious SVG, oversized files, decompression bombs, path traversal and object-key injection.
4. Test presigned URL expiry and tamper resistance.
5. Test MinIO outage, retries and partial-failure consistency.
6. Test SignalR reconnect and session expiry during an event.
7. Run dependency, secret and container image scans.
8. Deploy to staging, then canary by hall/session where operationally possible.
9. Verify monitoring, backup restore and rollback before full rollout.

## 10. Testing strategy

### Unit tests

- Domain rules and validation schemas.
- Role-to-permission mapping.
- Safe redirect handling.
- Media key generation and filename sanitization.
- Upload size/type/dimension policies.

### Integration tests

- Login/logout/session expiry and password reset.
- HTTP client error normalization.
- Authorized and unauthorized media operations.
- SQL metadata and MinIO object consistency.
- Presigned URL TTL and signature validation.
- Idempotent media migration.

### End-to-end tests

- Manager manages halls, sessions and bachelors.
- Checkiner checks in a bachelor manually and by QR.
- MC controls the correct hall/session and LED display.
- Noticer creates and broadcasts permitted notifications.
- Users cannot access another role's restricted operations.
- Destructive Manager actions require confirmation and produce audit records.

## 11. Pull-request sequence

Keep changes reviewable and independently reversible:

1. Security containment and credential rotation documentation.
2. Frontend tooling, `src` structure and GitHub Actions CI gates.
3. ASP.NET Identity schema and migration path.
4. Cookie auth endpoints, `/me` and policy foundation.
5. Frontend auth migration and removal of localStorage JWT.
6. MinIO infrastructure and backend storage abstraction.
7. Media schema/API and security tests.
8. Legacy media migration tooling and dry-run report.
9. Media cutover.
10. Product vertical slices.
11. Legacy `imageAPI`/filesystem removal.
12. Framework upgrade and final performance hardening, if approved.

## 12. Rollback strategy

- Keep each phase deployable without requiring unfinished later phases.
- Use route/feature switches for migrated slices.
- Back up SQL Server and legacy media before media cutover.
- Keep the old media source read-only during the agreed rollback window.
- Preserve the `oldPath -> mediaId` reconciliation map.
- Roll back application traffic before attempting data reversal.
- Do not delete legacy volumes or `imageAPI` data until restore and acceptance checks pass.

## 13. Definition of done

### 13.1 Source implementation status (2026-08-30)

Implemented and verified in the repository:

- Security containment, environment examples, secret scanning, restricted CORS, secure cookie/CSRF auth and authorization policies.
- Bun-only frontend gates and GitHub Actions for frontend, backend and container builds.
- Feature-first `fe/src` architecture, shared HTTP/query infrastructure and minimal app providers.
- ASP.NET Core Identity integration, SignalR cookie authentication, MinIO private storage, media metadata/security and migration dry-run tooling.
- Feature-owned Bachelor, Check-in, Hall, Session, LED, Notification, Statistics, Admin and Media modules.
- Feature-owned Bachelor/Check-in query keys and options; thin routes for Bachelor management, Check-in management, MC controller and Media management.
- Tests for safe redirects, HTTP error normalization, query keys/options, LED boundary normalization and destructive confirmation headers.

Intentionally not marked complete from source code alone:

- Credential rotation for values previously exposed in Git history.
- Staging Identity/media migration, checksum reconciliation, backup restore drill and canary acceptance.
- Real-account permission-matrix and end-to-end operational workflow acceptance.
- Removal of `imageAPI`, legacy volumes and rollback data before the agreed rollback window expires.
- Removal of bundled Nextra docs/dashboard demos without a confirmed product-owner decision that they are not shipped surfaces.
- Playwright smoke tests, which require adding and maintaining browser-test infrastructure.

The rearchitecture is complete only when:

- No authentication token is stored in `localStorage` or exposed to UI code.
- No production secret, password, API key or private endpoint is hard-coded or tracked.
- ASP.NET Core Identity securely stores passwords and manages web sessions.
- Every protected backend operation enforces an explicit authorization policy.
- MinIO is the only object store for business media.
- Browser code has no MinIO credentials.
- Media metadata is stored in SQL and every object has a traceable owner.
- The legacy `imageAPI`, local upload routes and upload volumes are retired after rollback expiry.
- All required lint, typecheck, unit, integration, end-to-end, build and secret checks pass.
- Required GitHub Actions checks protect the delivery branch; no Jenkins pipeline remains.
- Core workflows pass role-based acceptance testing.
- Security headers, HTTPS, restricted CORS, audit logging, backup and restore are verified.
- A production rollback exercise has been completed successfully.

## 14. Immediate next action

Begin with Phase 0 as a dedicated security containment change. Do not start broad frontend migration until exposed credentials are rotated and environment files are no longer tracked.
