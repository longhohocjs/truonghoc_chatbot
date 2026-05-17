<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('hocky')) {
            Schema::create('hocky', function (Blueprint $table) {
                $table->increments('HocKyID');
                $table->string('TenHocKy', 50);
                $table->unsignedInteger('NamHocID');
                $table->date('NgayBatDau');
                $table->date('NgayKetThuc');
                $table->timestamps();

                $table->foreign('NamHocID')->references('NamHocID')->on('namhoc')->onDelete('cascade');
            });
        }
    }
    public function down(): void
    {
        Schema::dropIfExists('hocky');
    }
};