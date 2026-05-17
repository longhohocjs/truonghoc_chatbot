<?php

namespace App\Models\View;

use Illuminate\Database\Eloquent\Model;
use App\Models\LopHocPhan;

class VLichHocSinhVien extends Model
{
    protected $table = 'v_lich_hoc_sinhvien';
    public $timestamps = false;

    protected $fillable = [
        'SinhVienID', 'MaSV', 'HoTen', 'LichHocID', 'LopHocPhanID', 'NgayHoc', 
        'BuoiHoc', 'TietBatDau', 'SoTiet', 'PhongHoc', 'GhiChu', 
        'TenMon', 'MaLopHP', 'TenGiangVien',
        'HocKyID', 'TenHocKy', 'NamHocID', 'TenNamHoc',
        'NgayBatDauLop', 'NgayKetThucLop', 'NgayBatDauHocKy', 'NgayKetThucHocKy'
    ];

    public function lopHocPhan()
    {
        return $this->belongsTo(LopHocPhan::class, 'LopHocPhanID', 'LopHocPhanID');
    }
}