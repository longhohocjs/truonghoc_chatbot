<?php

namespace App\Services;

use App\Models\LopHocPhan;
use App\Models\LichHoc;

class LichGiangDayService
{
    public function getLichGiangDay($giangVienID)
    {
        return LopHocPhan::where('GiangVienID', $giangVienID)
            ->where('TrangThai', 1)
            ->with(['monHoc', 'hocKy', 'lichHoc'])
            ->get()
            ->map(function ($lop) {
                return [
                    'ma_lop_hp'   => $lop->MaLopHP,
                    'ten_mon'     => $lop->monHoc?->TenMon ?? 'Chưa có môn học',
                    'ten_hoc_ky'  => $lop->hocKy?->TenHocKy ?? 'Chưa có học kỳ',
                    'lich_giang_day' => $lop->lichHoc->map(fn($lh) => [
                        'ngay_hoc'     => $lh->NgayHoc,
                        'buoi'         => $lh->BuoiHoc,
                        'tiet_bd'      => $lh->TietBatDau,
                        'so_tiet'      => $lh->SoTiet,
                        'phong'        => $lh->PhongHoc,
                        'ghi_chu'      => $lh->GhiChu ?? null,
                    ]),
                ];
            });
    }
}