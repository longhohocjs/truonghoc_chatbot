<?php

namespace App\Services\StoreProcedure;

use Illuminate\Support\Facades\DB;
use Exception;

class MoDotDangKyService
{
    public function moDot(
        int $hocKyID,
        string $tenDot,
        string $ngayBatDau,
        string $ngayKetThuc,
        string $doiTuong,
        ?string $ghiChu,
        int $userID
    ): array {
        try {
            $dotDangKyID = 0;

            DB::statement("CALL sp_mo_dot_dangky(?, ?, ?, ?, ?, ?, ?, @p_DotDangKyID)", [
                $hocKyID,
                $tenDot,
                $ngayBatDau,
                $ngayKetThuc,
                $doiTuong,
                $ghiChu,
                $userID
            ]);

            $result = DB::select("SELECT @p_DotDangKyID AS dotDangKyID");
            $dotDangKyID = (int) $result[0]->dotDangKyID;

            return [
                'success' => true,
                'message' => 'Mở đợt đăng ký thành công',
                'dot_dang_ky_id' => $dotDangKyID,
                'error' => null
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Lỗi khi mở đợt đăng ký',
                'error'   => $e->getMessage()
            ];
        }
    }
}