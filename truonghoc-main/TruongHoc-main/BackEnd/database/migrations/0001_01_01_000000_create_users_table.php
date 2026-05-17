<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $tableName = 'users';

        // Nếu tồn tại bảng 'user' (số ít), đổi tên thành 'users' (số nhiều) để khớp với hệ thống
        if (Schema::hasTable('user') && !Schema::hasTable('users')) {
            Schema::rename('user', 'users');
        }

        if (Schema::hasTable($tableName)) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                // Nếu bảng tồn tại với cột 'id' cũ, đổi tên thành 'UserID'
                if (Schema::hasColumn($tableName, 'id') && !Schema::hasColumn($tableName, 'UserID')) {
                    $table->renameColumn('id', 'UserID');
                }
                
                // Bổ sung cột Email nếu thiếu (dựa trên schema bạn cung cấp)
                if (!Schema::hasColumn($tableName, 'Email')) {
                    $table->string('Email', 100)->nullable()->unique()->after('PasswordHash');
                }

                // Bổ sung cột RoleID nếu thiếu
                if (!Schema::hasColumn($tableName, 'RoleID')) {
                    $table->integer('RoleID')->after('Email');
                }
            });
        } else {
            Schema::create($tableName, function (Blueprint $table) {
                $table->increments('UserID'); // int(11) unsigned auto_increment
                $table->string('Username', 50)->unique();
                $table->string('PasswordHash', 255)->nullable();
                $table->string('Email', 100)->nullable()->unique();
                $table->integer('RoleID');
                $table->boolean('is_active')->default(true);
                $table->rememberToken();
                // Nếu muốn dùng CreatedAt riêng, không dùng timestamps() của Laravel
                $table->datetime('CreatedAt')->nullable()->useCurrent(); 
                // Nếu cần updated_at, thêm dòng này: $table->timestamp('updated_at')->nullable();
            });
        }

        // Các bảng khác không liên quan đến lỗi hiện tại, giữ nguyên logic tạo nếu chưa tồn tại
        if (!Schema::hasTable('password_reset_tokens')) {
            Schema::create('password_reset_tokens', function (Blueprint $table) {
                $table->string('email')->primary();
                $table->string('token');
                $table->timestamp('created_at')->nullable();
            });
        }

        if (!Schema::hasTable('sessions')) {
            Schema::create('sessions', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->unsignedInteger('user_id')->nullable();
                $table->foreign('user_id')->references('UserID')->on('users')->onDelete('cascade');
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->longText('payload');
                $table->integer('last_activity')->index();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};