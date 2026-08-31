# Quyết định ánh xạ SQL Server sang PostgreSQL

| Nguồn | Đích | Quyết định |
|---|---|---|
| `Hall.HallId`, `Session.SessionId`, `Bachelor.Id`, `CheckIn.CheckinID`, `Notification.NotificationId` | identity `integer` | Giữ nguyên ID khi import; đặt sequence thành `max + 1` |
| `bit` | `boolean` | Chỉ nhận 0/1/true/false, giá trị khác bị reject |
| `datetime`/`datetimeoffset` | `timestamptz` | Driver đọc thành `Date`, ghi UTC; datetime ngầm định được xem theo quyết định Asia/Ho_Chi_Minh trong report |
| Email, student code, hall name | text/varchar + functional unique index `lower(...)` | So sánh không phân biệt hoa thường, dry-run báo duplicate |
| ASP.NET Identity user/password | `auth_user`, `auth_account`, `legacy_identity_credential` | ID UUID xác định từ source ID; hash V3 được xác minh tạm thời và rehash sau login đầu |
| ASP.NET roles | `user_role` | Chỉ chấp nhận `MN`, `CK`, `MC`, `US`, `NO`; permission seed do ứng dụng sở hữu |
| Notification creator/broadcaster | FK tới `auth_user` | Ánh xạ qua `LegacyUserId`; thiếu ánh xạ là rejected row |
| Attendance integer | integer check 0..3 | Không dùng PostgreSQL enum để giữ khả năng tiến hóa |
| Media GUID | PostgreSQL `uuid` | Giữ ID và object key, đối soát metadata + object storage |
| Audit `Details` text | `jsonb` | JSON hợp lệ được giữ cấu trúc; text cũ đặt trong `legacyText` |

FK dùng `restrict`, `set null` hoặc `cascade` theo vòng đời domain trong Drizzle schema. Mọi filter/sort/FK nóng có index tường minh; Drizzle Kit là chủ sở hữu duy nhất của schema PostgreSQL.
