<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('namhoc')) {
            Schema::create('namhoc', function (Blueprint $table) {
                $table->increments('NamHocID');
                $table->string('TenNamHoc', 50)->unique();
                $table->timestamps();
            });
        }
    }
    public function down(): void
    {
        Schema::dropIfExists('namhoc');
    }
};