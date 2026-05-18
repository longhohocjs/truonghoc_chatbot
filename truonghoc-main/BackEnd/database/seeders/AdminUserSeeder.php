<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function () {
            // Tạo Role 'Admin' nếu chưa có
            $adminRole = Role::firstOrCreate(
                ['RoleName' => 'Admin'],
                ['Description' => 'Quyền quản trị hệ thống']
            );

            // Tạo người dùng Admin
            $adminUser = User::firstOrCreate(
                ['Username' => 'admin'],
                [
                    'PasswordHash' => Hash::make('password'), // Thay đổi mật khẩu mạnh hơn trong production
                    'Email' => 'admin@example.com',
                    'RoleID' => $adminRole->RoleID,
                    'is_active' => true,
                ]
            );

            // Tạo thông tin Admin trong bảng 'admin'
            \App\Models\Admin::firstOrCreate(
                ['UserID' => $adminUser->UserID],
                [
                    'HoTen' => 'Quản Trị Viên',
                    'Email' => 'admin@example.com',
                ]
            );

            $this->command->info('Admin user created/updated successfully!');
        });
    }
}