<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('giangvien')) {
            Schema::create('giangvien', function (Blueprint $table) {
                $table->increments('GiangVienID');
                $table->string('MaGV', 20)->unique();
                $table->unsignedInteger('UserID')->nullable();
                $table->string('HoTen', 100);
                $table->string('email')->unique()->nullable(); // Thêm cột email
                $table->unsignedInteger('KhoaID');
                $table->string('ChuyenMon', 100)->nullable();
                $table->timestamp('created_at')->nullable(); // Chỉ tạo created_at
                // const UPDATED_AT = null; trong model nên không tạo updated_at

                $table->foreign('UserID')->references('UserID')->on('users')->onDelete('set null');
                $table->foreign('KhoaID')->references('KhoaID')->on('khoa')->onDelete('cascade');
            });
        }
    }
    public function down(): void
    {
        Schema::dropIfExists('giangvien');
    }
};