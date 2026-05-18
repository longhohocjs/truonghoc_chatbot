1. Yêu cầu hệ thống
   Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:

PHP: >= 8.1 (Khuyên dùng 8.2)
Composer: Công cụ quản lý thư viện PHP.
Node.js & npm: Để chạy Frontend (Khuyên dùng Node 18+).
MySQL/MariaDB: Hệ quản trị cơ sở dữ liệu.
Web Server: Apache hoặc Nginx (Hoặc dùng server tích hợp của Laravel). 2. Cài đặt Backend (Laravel)
Di chuyển vào thư mục BackEnd:

bash
cd BackEnd
Cài đặt các thư viện PHP:

bash
composer install
Cấu hình biến môi trường:

Sao chép file .env.example thành .env:
bash
cp .env.example .env
Mở file .env và cập nhật thông tin Database:
env
Show full code block
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=truonghoc
DB_USERNAME=root
DB_PASSWORD=your_password_here
Tạo mã khóa ứng dụng:

bash
php artisan key:generate
Thiết lập Cơ sở dữ liệu:

Tạo một database trống tên là truonghoc trong MySQL.
Import file dữ liệu mẫu: Sử dụng phpMyAdmin hoặc command line để import file database/truonghoc.sql vào database vừa tạo.
(Tùy chọn) Chạy migration nếu cần: php artisan migrate
Chạy Backend Server:

bash
php artisan serve
Server sẽ chạy tại: http://127.0.0.1:8000

3. Cài đặt Frontend (React + Vite)
   Di chuyển vào thư mục frontend:

bash
cd ../frontend
Cài đặt các gói thư viện Node.js:

bash
npm install
Cấu hình API URL:

Mở file .env (hoặc .env.local) trong thư mục frontend.
Đảm bảo đường dẫn API trỏ về Backend:
env
VITE_API_URL=http://localhost:8000/api
Chạy Frontend:

bash
npm run dev
Ứng dụng thường sẽ chạy tại: http://localhost:5173

4. Tài khoản đăng nhập mặc định
   Hệ thống đã cấu hình sẵn các tài khoản demo để kiểm thử các phân quyền khác nhau:

Vai trò Username Mật khẩu Ghi chú
Quản trị viên (Admin) admin01 123456 Toàn quyền hệ thống
Giảng viên textgv 123456 Xem lịch dạy, nhập điểm, quản lý lớp
Sinh viên text1 123456 Đăng ký học phần, xem điểm, học phí
