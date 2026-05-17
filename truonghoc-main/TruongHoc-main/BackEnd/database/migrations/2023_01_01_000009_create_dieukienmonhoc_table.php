<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('dieukienmonhoc')) {
            Schema::create('dieukienmonhoc', function (Blueprint $table) {
                $table->increments('DieuKienID');
                $table->unsignedInteger('MonHocID');
                $table->unsignedInteger('MonTienQuyetID'); // Môn học là điều kiện
                $table->tinyInteger('Loai')->default(1)->comment('1: Tien quyet, 2: Song hanh'); // Added from existing diff
                $table->timestamps();

                $table->foreign('MonHocID')->references('MonHocID')->on('monhoc')->onDelete('cascade');
                $table->foreign('MonTienQuyetID')->references('MonHocID')->on('monhoc')->onDelete('cascade');
            });
        }
    }
    public function down(): void
    {
        Schema::dropIfExists('dieukienmonhoc');
    }
};