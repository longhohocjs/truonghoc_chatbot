<?php

namespace App\Models\View;

use Illuminate\Database\Eloquent\Model;

class VDiemRenLuyenSinhVien extends Model
{
    protected $table = 'v_diemrenluyen_sinhvien';
    public $timestamps = false;

    protected $fillable = [
        'SinhVienID', 'MaSV', 'HoTen', 'HocKyID', 
        'TenHocKy', 'TongDiem', 'XepLoai', 'NgayDanhGia'
    ];
}