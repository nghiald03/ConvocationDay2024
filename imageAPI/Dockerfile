# Sử dụng hình ảnh Node.js đã có sẵn
FROM node:14

# Tạo thư mục làm việc
WORKDIR /app

# Sao chép các tệp cấu hình và mã nguồn ứng dụng vào hình ảnh
COPY package*.json ./
COPY server.js ./

# Cài đặt các gói phụ thuộc
RUN npm install

# Expose cổng mà ứng dụng Express chạy
EXPOSE 3214

# Khởi chạy ứng dụng Express
CMD ["node", "server.js"]