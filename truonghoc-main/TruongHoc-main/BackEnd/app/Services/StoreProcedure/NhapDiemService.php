<?php

namespace App\Services\StoreProcedure;

use Illuminate\Support\Facades\DB;

class NhapDiemService
{
    public function capNhatDiem(int $dangKyID, array $data, int $userID)
    {
        $cc  = $data['diem_chuyen_can'] ?? null;
        $gk  = $data['diem_giua_ky'] ?? null;
        $thi = $data['diem_thi'] ?? null;

        DB::statement("CALL sp_nhap_diem_tong_hop(?, ?, ?, ?, ?, @p_KetQua)", [
            $dangKyID,
            $cc,
            $gk,
            $thi,
            $userID
        ]);

        $res = DB::select("SELECT @p_KetQua AS msg");
        return ['success' => true, 'message' => $res[0]->msg];
    }
}