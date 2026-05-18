<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('dotdangky')) {
            Schema::create('dotdangky', function (Blueprint $table) {
                $table->increments('DotDangKyID');
                $table->string('TenDot', 100);
                $table->unsignedInteger('HocKyID');
                $table->date('NgayBatDau');
                $table->date('NgayKetThuc');
                $table->tinyInteger('TrangThai')->default(0)->comment('0: Chưa mở, 1: Đang mở, 2: Đã đóng');
                $table->timestamps();

                $table->foreign('HocKyID')->references('HocKyID')->on('hocky')->onDelete('cascade');
            });
        }
    }
    public function down(): void
    {
        Schema::dropIfExists('dotdangky');
    }
};