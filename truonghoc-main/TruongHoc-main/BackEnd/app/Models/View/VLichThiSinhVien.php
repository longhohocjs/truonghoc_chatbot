<?php

namespace App\Models\View;

use Illuminate\Database\Eloquent\Model;
use App\Models\LopHocPhan;

class VLichThiSinhVien extends Model
{
    protected $table = 'v_lich_thi_sinhvien';
    public $timestamps = false;

    protected $fillable = [
        'SinhVienID', 'MaSV', 'HoTen', 'LichThiID', 'LopHocPhanID', 'NgayThi', 
        'GioBatDau', 'GioKetThuc', 'PhongThi', 'HinhThucThi', 
        'GhiChu', 'TenMon', 'MaLopHP', 'TenGiangVien',
        'HocKyID', 'TenHocKy', 'NamHocID', 'TenNamHoc',
        'NgayBatDauLop', 'NgayKetThucLop', 'NgayBatDauHocKy', 'NgayKetThucHocKy'
    ];

    public function lopHocPhan()
    {
        return $this->belongsTo(LopHocPhan::class, 'LopHocPhanID', 'LopHocPhanID');
    }
}