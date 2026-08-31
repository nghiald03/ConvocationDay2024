# Chính sách message trả về frontend

Mọi nội dung có khóa `message` mà NestJS trả về cho frontend phải hoàn toàn bằng tiếng Việt. Quy tắc này áp dụng cho phản hồi thành công, lỗi validation, đăng nhập, phân quyền, nghiệp vụ, media, WebSocket acknowledgement và lỗi hệ thống.

`code` là định danh ổn định để frontend xử lý bằng chương trình nên giữ dạng ngôn ngữ trung lập, ví dụ `auth/unauthorized` hoặc `request/validation-failed`. Chi tiết kỹ thuật, stack trace và thông báo tiếng Anh từ framework hoặc thư viện không được chuyển nguyên văn ra frontend.

Global validation pipe tạo lỗi tiếng Việt theo tên trường. Global exception filter chỉ giữ `message` do ứng dụng chủ động khai báo cùng `code`; các lỗi mặc định từ NestJS, Express, Multer hoặc thư viện được thay bằng thông báo tiếng Việt theo HTTP status.
