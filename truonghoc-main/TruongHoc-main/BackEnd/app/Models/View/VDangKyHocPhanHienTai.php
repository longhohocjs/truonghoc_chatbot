<?php

namespace App\Models\View;

use Illuminate\Database\Eloquent\Model;

class VDangKyHocPhanHienTai extends Model
{
    protected $table = 'v_dangkyhocphan_hien_tai';
    public $timestamps = false;

    protected $fillable = [
        'SinhVienID', 'MaSV', 'HoTen', 'DangKyID', 'ThoiGianDangKy',
        'MaLopHP', 'MaMon', 'TenMon', 'SoTinChi', 'TenGiangVien', 'TenHocKy'
    ];
}