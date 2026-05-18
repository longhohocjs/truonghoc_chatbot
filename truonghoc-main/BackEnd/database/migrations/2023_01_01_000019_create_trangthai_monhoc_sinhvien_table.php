<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('trangthai_monhoc_sinhvien')) {
            Schema::create('trangthai_monhoc_sinhvien', function (Blueprint $table) {
                $table->increments('ID');
                $table->unsignedInteger('SinhVienID');
                $table->unsignedInteger('MonHocID');
                $table->unsignedInteger('HocKyHoanThanh')->nullable(); // Có thể null nếu chưa hoàn thành
                $table->enum('TrangThai', ['DaHoanThanh', 'Rot', 'HocLai', 'Mien'])->default('Rot');
                $table->decimal('DiemTongKet', 4, 2)->nullable();
                $table->integer('LanThi')->default(1);
                $table->timestamps();

                $table->unique(['SinhVienID', 'MonHocID']);
                $table->foreign('SinhVienID')->references('SinhVienID')->on('sinhvien')->onDelete('cascade');
                $table->foreign('MonHocID')->references('MonHocID')->on('monhoc')->onDelete('cascade');
                $table->foreign('HocKyHoanThanh')->references('HocKyID')->on('hocky')->onDelete('set null');
            });
        }
    }
    public function down(): void
    {
        Schema::dropIfExists('trangthai_monhoc_sinhvien');
    }
};