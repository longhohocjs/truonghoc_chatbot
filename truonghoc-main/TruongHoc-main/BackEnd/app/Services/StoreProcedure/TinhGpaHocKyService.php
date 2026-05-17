<?php

namespace App\Services\StoreProcedure;

use Illuminate\Support\Facades\DB;
use Exception;

class TinhGpaHocKyService
{
    public function tinhGpa(int $sinhVienID, int $hocKyID): array
    {
        try {
            $gpa = 0.00;
            $tongTinChi = 0;

            DB::statement("CALL sp_tinh_gpa_hoc_ky(?, ?, @p_GPA, @p_TongTinChi)", [
                $sinhVienID,
                $hocKyID
            ]);

            $result = DB::select("SELECT @p_GPA AS gpa, @p_TongTinChi AS tongTinChi");

            $gpa = (float) ($result[0]->gpa ?? 0.00);
            $tongTinChi = (int) ($result[0]->tongTinChi ?? 0);

            return [
                'success' => true,
                'gpa' => $gpa,
                'tong_tin_chi' => $tongTinChi,
                'message' => 'Tính GPA học kỳ thành công',
                'error'   => null
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'gpa' => 0.00,
                'tong_tin_chi' => 0,
                'message' => 'Lỗi khi tính GPA học kỳ',
                'error'   => $e->getMessage()
            ];
        }
    }
}