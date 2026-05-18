# Hệ Thống Quản Lý Trường Học (BackEnd API)

Dự án này là hệ thống quản lý giáo dục tích hợp Chatbot AI, được xây dựng trên nền tảng Laravel. Hệ thống hỗ trợ quản lý sinh viên, giảng viên, đăng ký học phần, điểm số, học phí và lịch học/thi.

## 🚀 Yêu cầu hệ thống

- **PHP**: >= 8.1
- **Composer**: >= 2.x
- **Cơ sở dữ liệu**: MySQL 8.0+ / MariaDB
- **Công cụ khác**: Git, Docker (tùy chọn để triển khai nhanh)

## 🛠 Hướng dẫn cài đặt (Môi trường Local)

### 1. Clone dự án và cài đặt thư viện

```bash
git clone <url_cua_du_an>
cd BackEnd
composer install
```

### 2. Cấu hình môi trường

Sao chép file `.env.example` thành `.env` và cấu hình các thông số:

```bash
cp .env.example .env
```

Cập nhật các thông tin Database trong `.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ten_database_cua_ban
DB_USERNAME=root
DB_PASSWORD=
```

### 3. Tạo Key và JWT Secret

```bash
php artisan key:generate
php artisan jwt:secret
```

### 4. Khởi tạo Cơ sở dữ liệu và Dữ liệu mẫu

Dự án sử dụng hệ thống Migration và Seeder để thiết lập cấu trúc bảng và dữ liệu ban đầu:

```bash
# Chạy migration
php artisan migrate

# Chạy Seeder khởi tạo (Admin, Khoa, Ngành, Môn học, SV, GV mẫu)
php artisan db:seed --class=InitProjectSeeder

# Hoặc nếu chỉ muốn tạo tài khoản Admin tối giản
php artisan db:seed --class=AdminUserSeeder
```

### 5. Chạy ứng dụng

```bash
php artisan serve
```

API mặc định sẽ chạy tại: `http://127.0.0.1:8000`

---

## 🐳 Triển khai với Docker

Dự án đã tích hợp sẵn file `entrypoint.sh` để tự động hóa quy trình triển khai:

1. Đảm bảo bạn đã có Docker và Docker Compose.
2. Chạy lệnh:

```bash
docker-compose up -d --build
```

Script `entrypoint.sh` sẽ tự động thực hiện:

- Clear cache.
- Migrate database.
- Seed tài khoản Admin.
- Khởi động PHP-FPM và Nginx.

---

## 📖 Các phân hệ chính

- **Quản trị (Admin)**: Quản lý năm học, học kỳ, khoa/ngành, danh mục môn học, người dùng và thống kê.
- **Giảng viên**: Xem lịch dạy, danh sách lớp phụ trách, nhập điểm (hỗ trợ nhập từ Excel), quản lý điểm rèn luyện.
- **Sinh viên**: Đăng ký học phần, xem thời khóa biểu, lịch thi, kết quả học tập, học phí và chương trình đào tạo.
- **Chatbot AI**: Hỗ trợ tra cứu nhanh thông tin cá nhân bằng ngôn ngữ tự nhiên thông qua `ChatbotService`.

## 🔐 Tài khoản mặc định

Sau khi chạy `InitProjectSeeder`, bạn có thể đăng nhập với các tài khoản:

- **Admin**: `admin` / `admin123`
- **Giảng viên**: `GV0001` / `123456`
- **Sinh viên**: `SV240001` / `123456`

## 📝 Lưu ý quan trọng

- **Bảo mật**: Đối với môi trường Production, hãy đảm bảo `APP_DEBUG=false` và thay đổi mật khẩu mặc định của Admin ngay lập tức.
- **Học phí**: Hệ thống có cơ chế tự động khóa xem điểm nếu sinh viên quá hạn đóng học phí (Cấu hình tại `HocPhiService`).
- **Lịch trình**: Đã có lệnh cronjob tự động đóng đợt đăng ký hết hạn trong `console.php`. Hãy thiết lập Scheduler trên Server:
    ```bash
    * * * * * cd /path-to-your-project && php artisan schedule:run >> /dev/null 2>&1
    ```

---

© 2024 Gemini Code Assist - Hệ thống quản lý giáo dục thông minh.
