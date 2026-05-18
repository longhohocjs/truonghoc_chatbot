<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up() {
        if (!Schema::hasTable('sinhvien')) {
            Schema::create('sinhvien', function (Blueprint $table) {
                $table->increments('SinhVienID');
                $table->string('MaSV', 20)->unique();
                $table->unsignedInteger('UserID')->nullable();
                $table->string('email')->unique()->nullable(); // Thêm cột email
                $table->unsignedInteger('KhoaID');
                $table->unsignedInteger('NganhID')->nullable(); // Thêm NganhID
                $table->string('khoahoc', 20)->nullable();
                $table->timestamps();

                $table->foreign('UserID')->references('UserID')->on('users')->onDelete('set null');
                $table->foreign('KhoaID')->references('KhoaID')->on('khoa');
                $table->foreign('NganhID')->references('NganhID')->on('nganhdaotao')->onDelete('set null'); // FK to nganhdaotao
            });
        }
    }
    public function down() {
        Schema::dropIfExists('sinhvien');
    }
};