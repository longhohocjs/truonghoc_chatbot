<?php

namespace App\Models\View;

use Illuminate\Database\Eloquent\Model;

class LopHocPhanMoDangKy extends Model
{
    protected $table = 'v_lophocphan_mo_dangky';
    public $timestamps = false;

    protected $fillable = [
        'LopHocPhanID', 'MaLopHP', 'MaMon', 'TenMon', 'SoTinChi',
        'TenGiangVien', 'TenHocKy', 'TenDot', 'NgayBatDau', 'NgayKetThuc', 'TrangThaiDot', 'SoLuongToiDa', 'SoLuongDaDangKy'
    ];
}