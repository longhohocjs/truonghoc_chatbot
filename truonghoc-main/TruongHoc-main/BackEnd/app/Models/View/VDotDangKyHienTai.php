<?php

namespace App\Models\View;

use Illuminate\Database\Eloquent\Model;

class VDotDangKyHienTai extends Model
{
    protected $table = 'v_dot_dangky_hien_tai';
    public $timestamps = false;

    protected $fillable = [
        'DotDangKyID', 'TenDot', 'TenHocKy', 'LoaiHocKy', 'NgayBatDau', 
        'NgayKetThuc', 'TrangThai', 'DoiTuong', 'GhiChu', 'ThoiGianHienTai', 'TrangThaiThucTe'
    ];
}