<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('dangkyhocphan')) {
            Schema::create('dangkyhocphan', function (Blueprint $table) {
                $table->increments('DangKyID');
                $table->unsignedInteger('SinhVienID');
                $table->unsignedInteger('LopHocPhanID');
                $table->timestamp('ThoiGianDangKy')->useCurrent();
                $table->enum('TrangThai', ['DangCho', 'ThanhCong', 'ThatBai', 'Huy'])->default('DangCho');
                $table->timestamps();

                $table->foreign('SinhVienID')->references('SinhVienID')->on('sinhvien')->onDelete('cascade');
                $table->foreign('LopHocPhanID')->references('LopHocPhanID')->on('lophocphan')->onDelete('cascade');
            });
        }
    }
    public function down(): void
    {
        Schema::dropIfExists('dangkyhocphan');
    }
};