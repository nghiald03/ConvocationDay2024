# Hệ thống Check-in cho Lễ Tốt Nghiệp

## 1. Tổng quan kiến trúc

Hệ thống bao gồm:

### Frontend (FE):

- Viết bằng **Next.js** với **TypeScript**, cung cấp giao diện người dùng thân thiện và hiệu năng cao.
- Tích hợp API với backend để xử lý dữ liệu và các yêu cầu từ người dùng.

### Backend (BE):

- Viết bằng **C# .NET**, đảm bảo hiệu suất và khả năng mở rộng.
- Chịu trách nhiệm xử lý logic nghiệp vụ và giao tiếp với cơ sở dữ liệu.

### Database:

- Sử dụng **Microsoft SQL Server** để lưu trữ thông tin:
  - Tân cử nhân
  - Hall (Hội trường)
  - Session (Buổi lễ)
  - Trạng thái check-in

### Docker:

- Toàn bộ hệ thống được đóng gói trong các container **Docker**, giúp dễ dàng triển khai và chạy trên môi trường local.

---

## 2. Vai trò người dùng

Hệ thống có **3 vai trò chính**, mỗi vai trò được cung cấp quyền hạn và giao diện riêng:

### **Manager (Người Quản Lý):**

- Quản lý danh sách tân cử nhân:
  - Thêm, sửa, xóa thông tin tân cử nhân:
    - Họ và tên
    - Mã số sinh viên (MSSV)
    - Email
    - Hall (Hội trường)
    - Session (Buổi lễ)
    - Số ghế của tân cử nhân và phụ huynh
  - Upload ảnh đại diện theo định dạng `MSSV.png`.
- Quản lý hội trường (Hall) và buổi lễ (Session).
- Mở/đóng check-in cho từng hall và session khi đến thời gian.

### **Checkiner (Nhân viên Check-in):**

- Thực hiện check-in cho tân cử nhân dựa trên mã số sinh viên (MSSV).
- Tra cứu vị trí ghế ngồi của tân cử nhân qua giao diện trực quan.

### **MC (Người Điều Khiển Lễ):**

- Sử dụng giao diện để hiển thị danh sách tân cử nhân đã check-in của từng hall và session.
- Điều khiển và trình chiếu ảnh đại diện tân cử nhân trên màn hình LED.

---

## 3. Core Flow (Luồng chính)

### **Quản lý danh sách tân cử nhân (Manager):**

1. Nhập thông tin cơ bản của tân cử nhân:
   - Họ và tên
   - MSSV
   - Email
   - Hội trường, buổi lễ, và số ghế
2. Upload ảnh đại diện (tên file ảnh là `MSSV.png`).

### **Mở check-in:**

- Manager mở check-in cho một hội trường (hall) và buổi lễ (session) khi đến giờ.

### **Thực hiện check-in (Checkiner):**

1. Tân cử nhân đến điểm check-in và cung cấp MSSV.
2. Checkiner xác nhận sự có mặt của tân cử nhân qua giao diện web.
3. Vị trí ghế ngồi của tân cử nhân được hiển thị trực quan để hướng dẫn.

### **Hiển thị trên LED (MC):**

1. MC truy cập giao diện, xem danh sách tân cử nhân đã check-in trong hội trường và buổi lễ hiện tại.
2. Điều khiển việc chiếu ảnh đại diện và thông tin tân cử nhân lên màn hình LED.

---

## 4. Công nghệ & triển khai

### **Frontend:**

- **Framework:** Next.js với TypeScript.
- **Styling:** Tailwind CSS và ShadcnUI.
- **API Integration:** Sử dụng `axios`.

### **Backend:**

- **Framework:** ASP.NET Core Web API.
- **Kết nối Database:** Entity Framework Core.
- **Xử lý file ảnh:** Lưu trữ file upload trên thư mục của server.

### **Database:**

- **Microsoft SQL Server** với các bảng chính:
  - **Bachelors:** Lưu thông tin tân cử nhân (Họ tên, MSSV, Email, Hall, Session, Số ghế).
  - **Sessions:** Lưu thông tin buổi lễ.
  - **CheckIns:** Lưu trạng thái check-in của từng tân cử nhân.

### **Docker:**

- FE, BE, và DB được container hóa bằng **Docker Compose**, giúp dễ dàng quản lý và chạy trên môi trường local khác nhau.

---

## 5. Điểm nổi bật với tính năng tự động hóa quy trình

Hệ thống được thiết kế để tối ưu hóa và tự động hóa các bước trong quy trình quản lý và check-in tân cử nhân, giúp:

- Tiết kiệm thời gian
- Giảm thiểu sai sót thủ công
- Nâng cao hiệu quả vận hành

### **Tự động tạo danh sách tân cử nhân từ file Excel:**

- **Tính năng nhập liệu hàng loạt:**
  - Manager upload file Excel chứa thông tin tân cử nhân (Họ tên, MSSV, Email, Hall, Session, Số ghế).
  - Hệ thống tự động xử lý và lưu dữ liệu vào database, đồng thời kiểm tra tính hợp lệ (ví dụ: định dạng email, trùng lặp MSSV).

### **Tự động kiểm tra trạng thái và mở check-in:**

- **Quản lý thời gian:**
  - Manager cấu hình thời gian bắt đầu và kết thúc của từng hall và session.
  - Hệ thống tự động kích hoạt hoặc đóng quy trình check-in khi đến giờ.
- Gửi thông báo đến Checkiner để sẵn sàng làm việc.

### **Tự động cập nhật danh sách MC:**

- Khi tân cử nhân được check-in, hệ thống tự động cập nhật danh sách cho MC.
- MC có thể điều khiển việc trình chiếu ngay lập tức.

### **Tích hợp thông báo thời gian thực:**

- Sử dụng **SignalR** để cập nhật danh sách check-in theo thời gian thực cho Checkiner và MC.
- Bất kỳ thay đổi nào (check-in, hủy check-in) đều được hiển thị ngay lập tức.

### **Tự động hóa chiếu LED:**

- MC chỉ cần chọn session và hall, hệ thống sẽ tự động sắp xếp thứ tự trình chiếu ảnh và thông tin tân cử nhân.

---

Với các tính năng tự động hóa này, hệ thống giúp giảm tải công việc thủ công và đảm bảo tính chính xác, mượt mà trong toàn bộ quy trình tổ chức lễ tốt nghiệp.
