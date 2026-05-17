<?php

namespace App\Models\View;

use Illuminate\Database\Eloquent\Model;

class VDiemHocKySinhVien extends Model
{
    protected $table = 'v_diem_hoc_ky_sinhvien';
    public $timestamps = false;

    protected $fillable = [
        'SinhVienID', 'MaSV', 'HoTen', 'TenHocKy', 'NamHocID',
        'MaMon', 'TenMon', 'SoTinChi',
        'DiemChuyenCan', 'DiemGiuaKy', 'DiemThi', 'DiemTongKet', 'ThoiGianDangKy'
    ];
}