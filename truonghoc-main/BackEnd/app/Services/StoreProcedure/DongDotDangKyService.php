<?php

namespace App\Services\StoreProcedure;

use Illuminate\Support\Facades\DB;
use Exception;

class DongDotDangKyService
{
    public function dongDot(int $dotDangKyID, int $userID): array
    {
        try {
            $ketQua = '';

            DB::statement("CALL sp_dong_dot_dangky(?, ?, @p_KetQua)", [
                $dotDangKyID,
                $userID
            ]);

            $result = DB::select("SELECT @p_KetQua AS ketqua");
            $ketQua = $result[0]->ketqua ?? 'Không có phản hồi';

            return [
                'success' => str_contains($ketQua, 'thành công'),
                'message' => $ketQua,
                'error'   => null
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Lỗi khi đóng đợt đăng ký',
                'error'   => $e->getMessage()
            ];
        }
    }
}