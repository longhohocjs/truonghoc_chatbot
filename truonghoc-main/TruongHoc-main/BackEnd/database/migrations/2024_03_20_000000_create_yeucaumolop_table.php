<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up() {
        if (!Schema::hasTable('yeucaumolop')) {
            Schema::create('yeucaumolop', function (Blueprint $table) {
                $table->increments('YeuCauID');
                $table->unsignedInteger('SinhVienID');
                $table->unsignedInteger('MonHocID');
                $table->text('LyDo')->nullable();
                $table->tinyInteger('TrangThai')->default(0); // 0: Chờ, 1: Duyệt, 2: Từ chối
                $table->timestamps();

                $table->foreign('SinhVienID')->references('SinhVienID')->on('sinhvien')->onDelete('cascade');
                $table->foreign('MonHocID')->references('MonHocID')->on('monhoc')->onDelete('cascade');
            });
        }
    }
    public function down() {
        Schema::dropIfExists('yeucaumolop');
    }
};