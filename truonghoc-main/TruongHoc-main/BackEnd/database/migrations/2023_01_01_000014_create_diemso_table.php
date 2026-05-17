<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('diemso')) {
            Schema::create('diemso', function (Blueprint $table) {
                $table->increments('DiemID');
                $table->unsignedInteger('DangKyID');
                $table->decimal('DiemTongKet', 4, 2)->nullable();
                $table->timestamps();

                $table->foreign('DangKyID')->references('DangKyID')->on('dangkyhocphan')->onDelete('cascade');
            });
        }
    }
    public function down(): void
    {
        Schema::dropIfExists('diemso');
    }
};