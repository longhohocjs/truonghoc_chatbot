<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('chuongtrinhdaotao')) {
            Schema::create('chuongtrinhdaotao', function (Blueprint $table) {
                $table->increments('CTDTID');
                $table->unsignedInteger('NganhID');
                $table->unsignedInteger('MonHocID');
                $table->timestamps();

                $table->foreign('NganhID')->references('NganhID')->on('nganhdaotao')->onDelete('cascade');
                $table->foreign('MonHocID')->references('MonHocID')->on('monhoc')->onDelete('cascade');
            });
        }
    }
    public function down(): void
    {
        Schema::dropIfExists('chuongtrinhdaotao');
    }
};