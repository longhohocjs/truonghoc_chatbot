#!/bin/sh
set -e # Dừng script ngay lập tức nếu có lệnh nào bị lỗi

# Chờ một chút để đảm bảo database sẵn sàng (tùy chọn, nhưng hữu ích)
# sleep 5

# Xóa cache cũ để tránh xung đột dữ liệu cấu hình
php artisan config:clear

# Chạy database migrations
echo "Running database migrations..."
php artisan migrate --force

# Chạy seeder cho Admin user (chỉ chạy một lần hoặc khi cần)
echo "Running Admin user seeder..."
php artisan db:seed --class=AdminUserSeeder --force

# Xóa và cache các cấu hình cho môi trường production để tối ưu hiệu suất
echo "Caching configurations..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Khởi động PHP-FPM và Nginx
echo "Starting PHP-FPM and Nginx..."
php-fpm -D && nginx -g "daemon off;"