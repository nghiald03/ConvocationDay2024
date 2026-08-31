# Runbook diễn tập, cutover và rollback

## Điều kiện trước diễn tập

- SQL Server backup đã restore và tài khoản migration chỉ có quyền đọc.
- PostgreSQL đích là database non-production rỗng, có tên chứa `rehearsal`, `migration`, `staging`, `test` hoặc `dev`.
- Drizzle SQL đã được review, `bun run drizzle:check` thành công và migration từ database rỗng thành công.
- MinIO bucket đã tồn tại; metadata `MediaAssets` và `LegacyMediaMappings` phải trỏ tới object có thể `HEAD`/download.
- Secret Better Auth cố định, trusted origins, SMTP và cookie flags đã được kiểm tra.

## Diễn tập

1. Chạy `plan`, xử lý mọi blocker schema.
2. Chạy `dry-run`; không chấp nhận email trùng/sai, role lạ, user không ánh xạ hoặc rejected row.
3. Chạy `full --target=<database>` và lưu JSON report như artifact bất biến.
4. Chạy `verify` độc lập; yêu cầu count, SHA-256 tập khóa, FK coverage và sequence đều đạt.
5. Smoke test đăng nhập legacy + rehash, reset mật khẩu, CRUD hall/session/bachelor, check-in đồng thời, notification, media và Socket.IO reconnect/room isolation.
6. Ghi p50/p95 và so với baseline: login 500/1500 ms, bachelor list 500/1500 ms, check-in 300/1000 ms, media content bắt đầu tải 500/1500 ms, broadcast acknowledgement 200/750 ms.

## Cutover production

1. Thông báo maintenance, đóng mutation traffic từ frontend và xác nhận không còn write đang chạy.
2. Dừng ASP.NET worker/API; tạo và xác minh SQL Server backup cuối.
3. Tạo PostgreSQL mới từ committed Drizzle migrations bằng deployment job riêng.
4. Chạy final `full`, sau đó `verify`; lưu report và người phê duyệt.
5. Khởi động NestJS nhưng chưa mở traffic; `/api/health/ready` phải trả ready cho PostgreSQL và MinIO.
6. Chạy smoke test bắt buộc trên auth, phân quyền, check-in, bachelor, media, notification, statistics và Socket.IO.
7. Chuyển reverse proxy `/backend-api` và `/backend-events` sang NestJS, mở traffic và giám sát error rate/p95/login/check-in trong ít nhất 60 phút.
8. Giữ SQL Server snapshot bất biến trong toàn bộ stabilization period.

## Điểm quyết định rollback

Trước khi PostgreSQL nhận write mới, rollback bằng cách chuyển proxy về ASP.NET/SQL Server. Sau write đầu tiên trên PostgreSQL, không chuyển proxy ngược trực tiếp vì sẽ mất các write đó. Incident commander phải chọn forward recovery hoặc chạy reverse-delta export đã được diễn tập; quyết định, mốc thời gian và người phê duyệt phải được ghi trong incident log.

## Tiêu chí dừng cutover

- Bất kỳ rejected row/blocker/hash/count/FK mismatch nào.
- Readiness không ổn định, login legacy/reset/session revocation sai, hoặc permission matrix sai.
- Check-in tạo kết quả không idempotent, ghế/phiên không nhất quán, media thiếu object.
- Socket.IO cho phép command trái quyền, room rò dữ liệu hoặc frontend không reconnect.
- p95 vượt 2 lần baseline hoặc error rate 5xx vượt 1% trong 5 phút.
