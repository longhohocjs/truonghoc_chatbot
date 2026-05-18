<?php

namespace App\Services;

use App\Models\LopHocPhan;

class LichCoiThiService
{
    public function getLichCoiThi($giangVienID)
    {
        return LopHocPhan::where('GiangVienID', $giangVienID)
            ->where('TrangThai', 1)
            ->with(['monHoc', 'hocKy', 'lichThi'])
            ->get()
            ->map(fn($lop) => [
                'ma_lop_hp' => $lop->MaLopHP,
                'ten_mon'   => $lop->monHoc->TenMon,
                'ten_hoc_ky'=> $lop->hocKy->TenHocKy,
                'lich_thi'  => $lop->lichThi->map(fn($lt) => [
                    'ngay_thi'     => $lt->NgayThi,
                    'gio_bd'       => $lt->GioBatDau,
                    'gio_kt'       => $lt->GioKetThuc,
                    'phong_thi'    => $lt->PhongThi,
                    'hinh_thuc'    => $lt->HinhThucThi,
                    'ghi_chu'      => $lt->GhiChu,
                ]),
            ]);
    }
}