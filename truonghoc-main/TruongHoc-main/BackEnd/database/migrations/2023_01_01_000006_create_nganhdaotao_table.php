<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('nganhdaotao')) {
            Schema::create('nganhdaotao', function (Blueprint $table) {
                $table->increments('NganhID');
                $table->string('MaNganh', 20)->unique();
                $table->string('TenNganh', 100);
                $table->unsignedInteger('KhoaID');
                $table->timestamps();

                $table->foreign('KhoaID')->references('KhoaID')->on('khoa')->onDelete('cascade');
            });
        }
    }
    public function down(): void
    {
        Schema::dropIfExists('nganhdaotao');
    }
};