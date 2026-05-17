<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('lophocphan')) {
            Schema::create('lophocphan', function (Blueprint $table) {
                $table->increments('LopHocPhanID');
                $table->string('MaLopHP', 50)->unique();
                $table->unsignedInteger('MonHocID');
                $table->unsignedInteger('HocKyID');
                $table->unsignedInteger('GiangVienID')->nullable();
                $table->integer('SoLuongToiDa');
                $table->string('KhoahocAllowed', 100)->nullable(); // e.g., "K60,K61"
                $table->tinyInteger('TrangThai')->default(1)->comment('0: Hủy, 1: Hoạt động');
                $table->timestamps();

                $table->foreign('MonHocID')->references('MonHocID')->on('monhoc')->onDelete('cascade');
                $table->foreign('HocKyID')->references('HocKyID')->on('hocky')->onDelete('cascade');
                $table->foreign('GiangVienID')->references('GiangVienID')->on('giangvien')->onDelete('set null');
            });
        }
    }
    public function down(): void
    {
        Schema::dropIfExists('lophocphan');
    }
};