<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('lichthi')) {
            Schema::create('lichthi', function (Blueprint $table) {
                $table->increments('LichThiID');
                $table->unsignedInteger('LopHocPhanID');
                $table->date('NgayThi');
                $table->time('GioBatDau');
                $table->time('GioKetThuc');
                $table->string('PhongThi', 50);
                $table->string('HinhThucThi', 50)->nullable();
                $table->timestamps();

                $table->foreign('LopHocPhanID')->references('LopHocPhanID')->on('lophocphan')->onDelete('cascade');
            });
        }
    }
    public function down(): void
    {
        Schema::dropIfExists('lichthi');
    }
};