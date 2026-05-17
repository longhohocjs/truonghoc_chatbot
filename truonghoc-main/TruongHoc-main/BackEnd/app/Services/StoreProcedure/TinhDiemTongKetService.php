<?php

namespace App\Services\StoreProcedure;

use Illuminate\Support\Facades\DB;
use Exception;

class TinhDiemTongKetService
{
    public function tinhDiem(int $dangKyID, int $userID): array
    {
        try {
            DB::statement("CALL sp_tinh_diem_tong_ket(?, ?)", [
                $dangKyID,
                $userID
            ]);

            return [
                'success' => true,
                'message' => 'Tính điểm tổng kết thành công',
                'error'   => null
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Lỗi khi tính điểm tổng kết',
                'error'   => $e->getMessage()
            ];
        }
    }
}