<?php

namespace App\Services\StoreProcedure;

use Illuminate\Support\Facades\DB;
use Exception;

class TrangThaiMonService
{
    public function capNhatTrangThai(
        int $sinhVienID,
        int $monHocID,
        int $hocKyID,
        float $diemTongKet,
        int $userID
    ): array {
        try {
            DB::statement("CALL sp_capnhat_trangthai_mon(?, ?, ?, ?, ?)", [
                $sinhVienID,
                $monHocID,
                $hocKyID,
                $diemTongKet,
                $userID
            ]);

            return [
                'success' => true,
                'message' => 'Cập nhật trạng thái môn học thành công'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Lỗi khi cập nhật trạng thái: ' . $e->getMessage()
            ];
        }
    }
}