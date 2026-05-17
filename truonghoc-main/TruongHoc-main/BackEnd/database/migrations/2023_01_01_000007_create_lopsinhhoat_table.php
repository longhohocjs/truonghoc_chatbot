<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('lopsinhhoat')) {
            Schema::create('lopsinhhoat', function (Blueprint $table) {
                $table->increments('LopSHID');
                $table->string('TenLop', 50)->unique();
                $table->unsignedInteger('KhoaID');
                $table->unsignedInteger('GiangVienID')->nullable(); // Trưởng khoa hoặc GVCN
                $table->timestamps();

                $table->foreign('KhoaID')->references('KhoaID')->on('khoa')->onDelete('cascade');
                $table->foreign('GiangVienID')->references('GiangVienID')->on('giangvien')->onDelete('set null'); // Đã bỏ comment
            });
        }
    }
    public function down(): void
    {
        Schema::dropIfExists('lopsinhhoat');
    }
};