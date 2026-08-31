# Convocation Day NestJS backend

Backend thay thế ASP.NET Core, chạy NestJS 11 trên Node.js 22, dùng PostgreSQL/Drizzle, Better Auth, Socket.IO và MinIO.

## Chạy cục bộ

```bash
bun install
cp .env.example .env
bun run drizzle:migrate
bun run dev
```

Tạo `BETTER_AUTH_SECRET` bằng bộ sinh số ngẫu nhiên mật mã rồi lưu kết quả vào `.env` cục bộ hoặc secret store:

```bash
bun run key:generate
```

Lệnh chỉ in một dòng `BETTER_AUTH_SECRET=...`; lệnh không tự tạo hoặc ghi đè file môi trường.

## Dữ liệu thử nghiệm

Seed 240 tân cử nhân vào database local/rehearsal đã migrate:

```bash
bun run seed:test --dry-run
bun run seed:test --confirm-test-data
```

Lệnh dùng `DATABASE_URL`, chỉ chấp nhận tên database chứa `dev`, `test`, `local`, `demo` hoặc `migration`. Seed có thể chạy lại: nó chỉ thay nhóm mã `TEST26%`, tạo 4 hội trường, 6 phiên và dùng luân phiên 6 ảnh có sẵn `/images/users/user-1.jpg` đến `/images/users/user-6.jpg`.

Seed cũng tạo account cho đủ vai trò:

- `manager.test@convocation.local` (`MN`)
- `checkin.test@convocation.local` (`CK`)
- `mc.test@convocation.local` (`MC`)
- `user.test@convocation.local` (`US`)
- `notify.test@convocation.local` (`NO`)

Mật khẩu chung lấy từ `TEST_ACCOUNT_PASSWORD`; script Docker local tự sinh biến này trong env tạm ngoài repository. Không hard-code hoặc commit mật khẩu test.

API dùng prefix `/api`, Swagger ở `/api/docs`, liveness ở `/api/health/live`, readiness PostgreSQL + MinIO ở `/api/health/ready`, Socket.IO namespace `/events` với path `/socket.io`.

## Data migration

CLI chỉ đọc SQL Server qua `MIGRATION_SQLSERVER_URL`; runtime NestJS không chứa kết nối SQL Server.

```bash
bun run migration plan --report=migration-reports/plan.json
bun run migration dry-run --report=migration-reports/dry-run.json
bun run migration full --target=convocation_rehearsal --report=migration-reports/full.json
bun run migration resume --report=migration-reports/resume.json
bun run migration verify --report=migration-reports/verify.json
```

`full` chỉ chạy khi `--target`, `MIGRATION_TARGET_NAME` và tên database thực tế trùng nhau, đồng thời tên database thể hiện rõ môi trường non-production. Công cụ nhập theo batch, ghi checkpoint, đặt lại sequence, chạy `ANALYZE`, đối chiếu count/key hash/khóa ngoại và thoát mã lỗi nếu có blocker hoặc rejected row.

## Kiểm tra bắt buộc

```bash
bun run secrets:check
bun run lint
bun run typecheck
bun test
bun run build
bun run drizzle:check
```

Mọi `message` trả về frontend phải bằng tiếng Việt theo [frontend-message-policy.md](contracts/frontend-message-policy.md).
