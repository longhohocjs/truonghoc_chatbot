<?php

namespace App\Services;

use App\Models\GiangVien;
use Illuminate\Support\Facades\Hash;
use Exception;

class GiangVienProfileService
{
    public function getProfile($giangVienID)
    {
        $gv = GiangVien::with(['khoa', 'user'])->findOrFail($giangVienID);
        
        return [
            'success' => true,
            'data' => [
                'giang_vien_id'  => $gv->GiangVienID,
                'user_id'        => $gv->UserID,
                'username'       => $gv->user->Username ?? 'N/A',
                'ma_gv'          => $gv->MaGV,
                'ho_ten'         => $gv->HoTen,
                'hoc_vi'         => $gv->HocVi,
                'chuyen_mon'     => $gv->ChuyenMon,
                'email'          => $gv->email,
                'so_dien_thoai'  => $gv->sodienthoai,
                'loai_giang_vien'=> $gv->LoaiGiangVien ?? 'Cơ hữu',
                'ten_khoa'       => $gv->khoa->TenKhoa ?? 'N/A',
                'role'           => 'giang_vien'
            ]
        ];
    }

    public function updateContactInfo($giangVienID, array $data)
    {
        $giangVien = GiangVien::findOrFail($giangVienID);

        $updateData = [];
        if (array_key_exists('email', $data)) {
            $updateData['email'] = $data['email'] ?: null;
        }
        if (array_key_exists('sodienthoai', $data)) {
            $updateData['sodienthoai'] = $data['sodienthoai'] ?: null;
        }

        $giangVien->update($updateData);
        // Nạp lại các quan hệ để Frontend hiển thị đầy đủ thông tin sau khi cập nhật
        return $giangVien->load(['khoa', 'user']);
    }

    public function changePassword($user, $oldPassword, $newPassword)
    {
        if (!Hash::check($oldPassword, $user->PasswordHash)) {
            throw new Exception("Mật khẩu cũ không chính xác.");
        }
        $user->update(['PasswordHash' => Hash::make($newPassword)]);
        return true;
    }
}