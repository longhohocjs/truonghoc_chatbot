<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('thongbao')) {
            Schema::create('thongbao', function (Blueprint $table) {
                $table->increments('ThongBaoID');
                $table->string('TieuDe', 255);
                $table->text('NoiDung');
                $table->enum('DoiTuong', ['SinhVien', 'GiangVien', 'ToanBo'])->default('ToanBo');
                $table->timestamps();
            });
        }
    }
    public function down(): void
    {
        Schema::dropIfExists('thongbao');
    }
};