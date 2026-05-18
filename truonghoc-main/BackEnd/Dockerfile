# Sử dụng PHP 8.2 FPM làm base
FROM php:8.2-fpm-alpine

# Cài đặt các dependencies hệ thống và Nginx
RUN apk add --no-cache \
    nginx \
    libpng-dev \
    libxml2-dev \
    libzip-dev \
    oniguruma-dev \
    zip \
    unzip \
    git \
    curl

# Cài đặt các PHP extensions cần thiết cho Laravel
RUN docker-php-ext-install pdo_mysql gd xml mbstring zip bcmath

# Cài đặt Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Thiết lập thư mục làm việc
WORKDIR /var/www

# Tối ưu layer cache: Cài đặt dependencies trước khi copy code
COPY composer.json ./

RUN composer install --no-dev --no-scripts --no-autoloader

# Copy toàn bộ source code sau
COPY . .

# Tạo autoloader tối ưu
RUN composer dump-autoload --optimize --no-dev

# Cấu hình quyền truy cập cho thư mục storage và bootstrap/cache
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache

# Copy entrypoint script
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Copy cấu hình Nginx vào container (File nằm cùng cấp với Dockerfile)
COPY nginx.conf /etc/nginx/http.d/default.conf

# Expose cổng 80
EXPOSE 80

# Script khởi chạy: Chạy entrypoint script
CMD ["/usr/local/bin/entrypoint.sh"]