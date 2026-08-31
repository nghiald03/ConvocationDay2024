# Vận hành và bảo mật

- Rotate `BETTER_AUTH_SECRET`, PostgreSQL, SMTP và MinIO credentials qua secret store; không ghi secret vào image/log/report.
- Backup PostgreSQL theo lịch và diễn tập restore; MinIO bucket cần versioning/backup độc lập.
- Alert khi `/api/health/ready` lỗi, 5xx tăng, pool PostgreSQL cạn, login lockout tăng đột biến, SMTP reset lỗi hoặc Socket.IO disconnect tăng.
- Chạy migration Drizzle trong job riêng trước deployment; không chạy migration khi application startup và không dùng `drizzle-kit push` ở môi trường dùng chung.
- Dữ liệu audit là append-only đối với runtime. Hành động POST/PUT/PATCH/DELETE thành công có actor được ghi audit; không đưa password, cookie, token hoặc payload nhạy cảm vào details.
- `ALLOW_DATABASE_RESET=false` ở production. Nếu bật ở dev/test, endpoint vẫn yêu cầu `system.manage` và header xác nhận đúng tên database.
