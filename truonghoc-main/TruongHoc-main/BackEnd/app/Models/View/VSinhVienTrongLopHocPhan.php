<?php

namespace App\Models\View;

use Illuminate\Database\Eloquent\Model;

class VSinhVienTrongLopHocPhan extends Model
{
    protected $table = 'v_sinhvien_trong_lop_hoc_phan';
    public $timestamps = false;

    protected $fillable = [
        'LopHocPhanID', 'MaLopHP', 'TenMon', 'TenHocKy', 'GiangVienPhuTrach',
        'SinhVienID', 'MaSV', 'HoTenSinhVien', 'Email', 'SoDienThoai', 'ThoiGianDangKy', 'TrangThai'
    ];
}