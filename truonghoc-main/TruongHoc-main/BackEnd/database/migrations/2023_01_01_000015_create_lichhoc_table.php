<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('lichhoc')) {
            Schema::create('lichhoc', function (Blueprint $table) {
                $table->increments('LichHocID');
                $table->unsignedInteger('LopHocPhanID');
                $table->date('NgayHoc');
                $table->tinyInteger('Thu')->nullable(); // Added from existing diff
                $table->integer('TietBatDau');
                $table->integer('SoTiet');
                $table->string('PhongHoc', 50);
                $table->timestamps();

                $table->foreign('LopHocPhanID')->references('LopHocPhanID')->on('lophocphan')->onDelete('cascade');
            });
        }
    }
    public function down(): void
    {
        Schema::dropIfExists('lichhoc');
    }
};