# Tiến trình triển khai migration backend NestJS

Checkpoint được ghi ngày 2026-08-31 (Asia/Saigon). Đây là trạng thái làm việc để phiên sau tiếp tục; migration production và cutover thật chưa được thực hiện.

## Yêu cầu bắt buộc đã bổ sung

Mọi `message` trả về frontend phải hoàn toàn bằng tiếng Việt, gồm success, validation, auth, permission, domain, media, WebSocket acknowledgement và lỗi hệ thống. `code` vẫn là định danh ổn định, trung lập ngôn ngữ. Yêu cầu đã được ghi vào:

- `BACKEND_NESTJS_MIGRATION_PLAN.md`
- `be-nest/contracts/frontend-message-policy.md`
- `be-nest/contracts/legacy-contract-inventory.json` (`messageLocale: vi-VN`)

Global validation pipe hiện tự tạo chi tiết lỗi tiếng Việt. Global exception filter không chuyển nguyên văn lỗi tiếng Anh mặc định từ Nest/Express/Multer ra frontend.

## Phần đã triển khai

### 1. NestJS foundation và PostgreSQL

- Tạo service mới `be-nest` dùng NestJS 11, strict TypeScript, Bun, Express adapter.
- Cấu hình Joi validation, structured JSON logging, Helmet, compression, CORS trusted origins, graceful shutdown.
- API prefix `/api`, Swagger `/api/docs`, OpenAPI JSON đã xuất tại `be-nest/contracts/openapi.json`.
- Liveness `/api/health/live`; readiness `/api/health/ready` kiểm tra đồng thời PostgreSQL và MinIO.
- Một application-managed `pg` pool, Drizzle schema tách theo domain.
- Hai migration Drizzle đã sinh và check thành công:
  - `be-nest/drizzle/0000_lazy_blue_marvel.sql`
  - `be-nest/drizzle/0001_new_starjammers.sql`
- Có seed role/permission cho `MN`, `CK`, `MC`, `US`, `NO` và 9 permission hiện hành.
- Có audit interceptor cho mutation thành công có actor.

### 2. Data migration CLI

Đã thêm CLI tại `be-nest/src/migration` với các mode:

```bash
bun run migration plan
bun run migration dry-run
bun run migration full --target=<non-production-database>
bun run migration resume
bun run migration verify
```

CLI có SQL Server source chỉ-đọc, PostgreSQL target, bounded batch, dependency order, checkpoint/resume, deterministic IDs, rejected-row report, source fingerprint, count/key SHA-256 reconciliation, FK checks, sequence reset và `ANALYZE`. `full` chỉ cho phép database non-production khi tên thật, `--target` và `MIGRATION_TARGET_NAME` trùng nhau.

Chưa chạy CLI với snapshot SQL Server thật vì phiên làm việc chưa có connection string/credential nguồn chỉ-đọc. Đây là việc bắt buộc trước khi coi migration dữ liệu hoàn tất.

### 3. Better Auth và authorization

- Better Auth 1.7.2 + `@thallesp/nestjs-better-auth` 2.7.0, Drizzle adapter và DB-backed session 8 giờ.
- Auth compatibility facade: csrf no-op, login, logout, me, đổi mật khẩu, request/confirm reset.
- ASP.NET Identity V3 PBKDF2 verifier và rehash sang Better Auth sau lần đăng nhập legacy thành công.
- Account lockout 5 lần/15 phút, rate limit, disabled user, forced reset, session revocation.
- Reset token được đối chiếu đúng user/email trước khi consume để tránh cập nhật nhầm tài khoản.
- Login không tiết lộ user tồn tại qua trạng thái forced-reset/lockout trước khi mật khẩu được xác minh.
- App-owned `@Public`, `@RequireRoles`, `@RequirePermissions`, session guard và permission guard.
- Better Auth native endpoint nằm dưới `/api/internal-auth`; frontend dùng facade `/api/auth`.

### 4. Domain, media và realtime

Đã port các module/endpoint legacy:

- Hall CRUD.
- Session CRUD + auto-fill.
- Statistics.
- Bachelor search/list/add/update/delete/reset/temporary-session/late-transfer.
- Check-in update/uncheck/status/count/open-session/public hall views.
- Notification CRUD/lifecycle/broadcast.
- LED/MC current/first/next/back và compatibility payload.
- Media upload/bulk/list/rename/delete/presigned content/download, Sharp validation và MinIO AWS SDK v3.
- Database reset có config gate, permission và destructive confirmation header.

Socket.IO:

- Namespace `/events`, typed events, Better Auth handshake, trusted-origin check.
- Room `user:<id>` và `role:<role>`.
- Command authorization và allowlist.
- Compatibility events `SendMessage`, `ReceiveNotify`, `ReceiveTTSBroadcast` cùng typed envelope/event ID/timestamp.

### 5. Frontend transition

- Đã dùng skill `vercel-react-best-practices` cho thay đổi React/Next.
- Thêm `socket.io-client`, gỡ `@microsoft/signalr`.
- Xóa `fe/src/lib/realtime/use-signal-r.ts`, thêm `fe/src/lib/realtime/use-realtime.ts`.
- Transport dùng một connection registry theo endpoint, ref-count chống Strict Mode duplicate, stable callback refs, reconnect và typed facade `on/off/send`.
- Đã đổi toàn bộ consumer LED/session/notify/notification-display sang transport mới.
- Rewrite mới `/backend-events/:path*` tới Socket.IO; không còn reference `backend-hub`, `use-signal-r` hoặc `@microsoft/signalr` trong source (lệnh `rg` cuối không trả kết quả).
- `fe/bun.lockb` cũ không tương thích Bun 1.2.10 nên đã xóa có chủ đích và thay bằng text lockfile `fe/bun.lock` đồng bộ. Có thể phục hồi lock cũ từ Git nếu cần, nhưng không nên giữ song song.

### 6. Docker, CI và tài liệu vận hành

- Thêm PostgreSQL 17, `be-nest`, và job riêng `be-nest-migrate` vào Compose.
- NestJS production image build bằng Bun, runtime Node.js 22 non-root.
- Frontend Compose hiện trỏ REST và realtime sang `be-nest`; service ASP.NET `be` vẫn còn làm rollback target.
- CI thêm backend Nest: install, secret scan, lint, typecheck, tests, build, Drizzle check, Docker image build.
- Cập nhật `.env.example` và local dev script cho PostgreSQL/NestJS.
- Đã thêm:
  - `be-nest/docs/cutover-runbook.md`
  - `be-nest/docs/postgresql-mapping.md`
  - `be-nest/docs/operations.md`
  - `be-nest/README.md`
  - machine-readable contract inventory và response fixtures.

## Kiểm tra đã chạy thành công

Trước checkpoint đã đạt:

- Backend `bun run typecheck`.
- Backend `bun run lint`.
- Backend `bun test`: 8 unit tests pass; integration Socket.IO bị skip nếu không có URL.
- Socket.IO integration riêng với server thật: 1 pass, xác nhận kết nối thiếu session bị từ chối bằng message tiếng Việt.
- Backend `bun run build`.
- `bun run drizzle:check`.
- Frontend `bun run lint`.
- Frontend `bun run typecheck`.
- Frontend `bun test`: 8 pass.
- Frontend `bun run build`: pass (cần network để `next/font` tải Montserrat).
- `docker compose config --quiet`: pass khi cung cấp đủ env bắt buộc.
- Docker image `be-nest` và `be-nest-migrate`: build pass.
- Drizzle migrate-from-empty trong container: pass.
- NestJS Docker smoke test: application start pass; `/api/health/live` trả `ok`; `/api/health/ready` trả `ready` cho PostgreSQL + MinIO.
- HTTP smoke test xác nhận 401 và validation envelope có message/details tiếng Việt; Swagger trả HTTP 200.

Lưu ý: sau các smoke test trên có thêm thay đổi cuối trong auth reset/login và secret scanner. Vì vậy phiên sau phải chạy lại toàn bộ validation trước khi kết luận cuối.

## Việc còn lại — thực hiện theo thứ tự

### Ưu tiên 1: xác minh lại code hiện tại

```powershell
Set-Location F:\CODE\ConvocationDay2024\be-nest
bun run secrets:check
bun run lint
bun run typecheck
bun test
bun run build
bun run drizzle:check

Set-Location F:\CODE\ConvocationDay2024\fe
bun run secrets:check
bun run lint
bun run typecheck
bun test
bun run build
```

`scripts/secret-check.mjs` vừa được sửa để quét cả untracked file và cho phép PowerShell variable placeholders. Lần chạy ngay trước sửa đã báo false positive `scripts/start-dev-services.ps1`; cần xác nhận lần chạy mới pass.

### Ưu tiên 2: review tính tương thích và test sâu

- So sánh từng path/status/body/nullability/sort/pagination trong `be-nest/contracts/legacy-contract-inventory.json` với ASP.NET thật và FE caller.
- Bổ sung contract tests chạy song song .NET snapshot và Nest/PostgreSQL fixture.
- Bổ sung HTTP integration tests có PostgreSQL isolated cho auth, permission matrix, bachelor/check-in concurrent writes, notification transitions và media partial failure/cleanup.
- Bổ sung Socket.IO authenticated tests cho reconnect, duplicate/order expectation, room isolation và unauthorized commands.
- Audit tiếp mọi `ApiError`/custom exception/acknowledgement để bảo đảm không còn message tiếng Anh; Better Auth native `/api/internal-auth` không phải frontend facade nhưng vẫn nên kiểm soát exposure.
- Kiểm tra toàn bộ MinIO object tồn tại (`HEAD`) khớp metadata và legacy mappings; CLI hiện import metadata, chưa tự copy file từ các legacy filesystem root.
- Đánh giá bulk media partial-failure report và cleanup object khi một file trong batch lỗi.

### Ưu tiên 3: rehearsal dữ liệu thật

1. Cấp `MIGRATION_SQLSERVER_URL` chỉ-đọc tới SQL Server backup/snapshot.
2. Tạo PostgreSQL rehearsal riêng và chạy committed Drizzle migrations.
3. Chạy `plan`, `dry-run`, xử lý hết blocker/rejected rows.
4. Chạy `full --target=<rehearsal-db>`, rồi `verify` độc lập.
5. Lưu JSON reports, kiểm tra count/hash/FK/sequence/business invariants/media objects.
6. Smoke test auth legacy + rehash, reset, permission, check-in, media, notification, statistics, Socket.IO.
7. Ghi p50/p95 theo baseline trong cutover runbook.

### Ưu tiên 4: hoàn tất cutover khi có phê duyệt vận hành

Không tự chạy production cutover. Thực hiện đúng `be-nest/docs/cutover-runbook.md`, có maintenance window, backup đã verify, người phê duyệt, và phân biệt rõ rollback trước/sau write đầu tiên vào PostgreSQL.

## Trạng thái môi trường sau smoke test

- Container `convocationday2024-be-nest-1` và `convocationday2024-postgres-1` đã được dừng.
- Container MinIO tạm `convocation-smoke-minio` đã xóa.
- Compose migration container và các stopped/created container khác có thể còn trong Docker; không xóa volume vì có thể chứa dữ liệu rehearsal.
- Có MinIO khác đang chiếm host port 9000/9001 (`chals_portfolio-minio-1`) tại thời điểm test; smoke test đã dùng MinIO tạm không publish host port.
- Không có commit nào được tạo.
- `.agents/` là untracked có sẵn/ngoài phạm vi; không sửa hoặc xóa.

## Git working tree dự kiến

- Toàn bộ `be-nest/` là service mới, hiện untracked.
- Root config/docs/CI/Compose/dev scripts đã sửa.
- Frontend realtime files/package/lock/config đã sửa.
- `fe/bun.lockb` bị xóa có chủ đích; `fe/bun.lock` mới là lockfile chuẩn cần giữ.

Trước khi commit, dùng `git diff --check`, review toàn bộ diff và tuyệt đối không đưa `.env`, credential, migration report chứa dữ liệu nhạy cảm hoặc artifact build vào commit.
