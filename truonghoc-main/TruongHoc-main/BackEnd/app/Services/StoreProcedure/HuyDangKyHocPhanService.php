<?php

namespace App\Services\StoreProcedure;

use Illuminate\Support\Facades\DB;
use Exception;

class HuyDangKyHocPhanService
{
    public function huyDangKy(int $dangKyID, int $userID): array
    {
        try {
            $ketQua = '';
            $thanhCong = 0;

            DB::statement("CALL sp_huy_dangky_hocphan(?, ?, @p_KetQua, @p_ThanhCong)", [
                $dangKyID,
                $userID
            ]);

            $result = DB::select("SELECT @p_KetQua AS ketqua, @p_ThanhCong AS thanhcong");
            $ketQua = $result[0]->ketqua ?? 'Không có phản hồi';
            $thanhCong = (int) $result[0]->thanhcong === 1;

            return [
                'success' => $thanhCong,
                'message' => $ketQua,
                'error'   => null
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => 'Lỗi hệ thống: ' . $e->getMessage(),
                'error'   => $e->getTraceAsString()
            ];
        }
    }
}