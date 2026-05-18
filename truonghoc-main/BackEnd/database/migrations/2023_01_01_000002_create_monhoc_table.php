<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up() {
        if (!Schema::hasTable('monhoc')) {
            Schema::create('monhoc', function (Blueprint $table) {
                $table->increments('MonHocID');
                $table->string('MaMon', 20)->unique();
                $table->string('TenMon', 200);
                $table->integer('SoTinChi');
                $table->integer('TietLyThuyet')->default(0);
                $table->integer('TietThucHanh')->default(0);
                $table->unsignedInteger('KhoaID');
                $table->string('HinhThucHoc', 50)->default('Trực tiếp');
                $table->string('LoaiMonHoc', 50)->nullable();
                $table->timestamps();

                $table->foreign('KhoaID')->references('KhoaID')->on('khoa')->onDelete('cascade');
            });
        }
    }
    public function down() {
        Schema::dropIfExists('monhoc');
    }
};