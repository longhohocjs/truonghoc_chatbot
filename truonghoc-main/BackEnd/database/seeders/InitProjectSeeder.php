<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Khoa;
use App\Models\Nganh;
use App\Models\MonHoc;
use App\Models\ChuongTrinhDaoTao;
use App\Models\GiangVien;
use App\Models\SinhVien;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class InitProjectSeeder extends Seeder
{
    public function run()
    {
        DB::transaction(function () {
            // 1. Tạo tài khoản Admin mặc định để quản lý
            $admin = User::create([
                'Username' => 'admin',
                'PasswordHash' => Hash::make('admin123'),
                'RoleID' => 1,
                'is_active' => true
            ]);

            // 2. Tạo Khoa và Ngành (2 ngành theo yêu cầu)
            $khoa = Khoa::create(['MaKhoa' => 'CNTT', 'TenKhoa' => 'Công nghệ thông tin']);
            
            $nganh1 = Nganh::create(['KhoaID' => $khoa->KhoaID, 'MaNganh' => 'PM', 'TenNganh' => 'Kỹ thuật phần mềm']);
            $nganh2 = Nganh::create(['KhoaID' => $khoa->KhoaID, 'MaNganh' => 'KHMT', 'TenNganh' => 'Khoa học máy tính']);

            // 3. Tạo 40 môn học cho mỗi chương trình (Tổng 80 môn học mẫu)
            $allNganhs = [$nganh1, $nganh2];
            foreach ($allNganhs as $nganh) {
                for ($i = 1; $i <= 40; $i++) {
                    $mon = MonHoc::create([
                        'MaMon' => $nganh->MaNganh . str_pad($i, 3, '0', STR_PAD_LEFT),
                        'TenMon' => "Môn học mẫu $i - " . $nganh->TenNganh,
                        'SoTinChi' => rand(2, 4),
                        'KhoaID' => $khoa->KhoaID,
                        'TietLyThuyet' => 30,
                        'TietThucHanh' => 15
                    ]);

                    // Gán vào Chương trình đào tạo
                    ChuongTrinhDaoTao::create([
                        'NganhID' => $nganh->NganhID,
                        'MonHocID' => $mon->MonHocID,
                        'HocKyGoiY' => ceil($i / 5), // Chia đều vào các học kỳ từ 1-8
                        'BatBuoc' => true
                    ]);
                }
            }

            // 4. Tạo 10 Giảng viên kèm tài khoản
            for ($i = 1; $i <= 10; $i++) {
                $maGV = 'GV' . str_pad($i, 4, '0', STR_PAD_LEFT);
                $userGV = User::create([
                    'Username' => $maGV,
                    'PasswordHash' => Hash::make('123456'),
                    'RoleID' => 2,
                    'is_active' => true
                ]);

                GiangVien::create([
                    'UserID' => $userGV->UserID,
                    'MaGV' => $maGV,
                    'HoTen' => "Giảng viên mẫu $i",
                    'KhoaID' => $khoa->KhoaID,
                    'email' => "gv$i@truonghoc.edu.vn",
                    'LoaiGiangVien' => ($i % 3 == 0) ? 'Thỉnh giảng' : 'Cơ hữu'
                ]);
            }

            // 5. Tạo 200 Sinh viên kèm tài khoản
            for ($i = 1; $i <= 200; $i++) {
                $maSV = 'SV24' . str_pad($i, 4, '0', STR_PAD_LEFT);
                $userSV = User::create([
                    'Username' => $maSV,
                    'PasswordHash' => Hash::make('123456'),
                    'RoleID' => 3,
                    'is_active' => true
                ]);

                SinhVien::create([
                    'UserID' => $userSV->UserID,
                    'MaSV' => $maSV,
                    'HoTen' => "Sinh viên mẫu $i",
                    'khoahoc' => '2024',
                    'KhoaID' => $khoa->KhoaID,
                    'NganhID' => ($i <= 100) ? $nganh1->NganhID : $nganh2->NganhID, // Chia 100 SV mỗi ngành
                    'TinhTrang' => 'DangHoc',
                    'email' => "sv$i@student.edu.vn"
                ]);
            }
        });
    }
}