<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('admin')) {
            Schema::create('admin', function (Blueprint $table) {
                $table->increments('AdminID');
                $table->unsignedInteger('UserID')->nullable();
                $table->string('HoTen', 100);
                $table->string('Email')->unique()->nullable();
                $table->timestamps();

                $table->foreign('UserID')->references('UserID')->on('users')->onDelete('set null');
            });
        }
    }
    public function down(): void
    {
        Schema::dropIfExists('admin');
    }
};