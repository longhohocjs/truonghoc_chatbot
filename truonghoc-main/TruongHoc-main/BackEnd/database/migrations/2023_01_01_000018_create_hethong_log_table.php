<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('hethong_log')) {
            Schema::create('hethong_log', function (Blueprint $table) {
                $table->increments('LogID');
                $table->unsignedInteger('UserID')->nullable();
                $table->string('HanhDong', 100);
                $table->text('MoTa')->nullable();
                $table->string('BangLienQuan', 100)->nullable();
                $table->unsignedInteger('IDBanGhi')->nullable();
                $table->string('IP', 45)->nullable();
                $table->text('UserAgent')->nullable();
                $table->timestamps();

                $table->foreign('UserID')->references('UserID')->on('users')->onDelete('set null');
            });
        }
    }
    public function down(): void
    {
        Schema::dropIfExists('hethong_log');
    }
};