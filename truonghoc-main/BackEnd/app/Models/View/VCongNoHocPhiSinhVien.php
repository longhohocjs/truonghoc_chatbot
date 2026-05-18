<?php

namespace App\Models\View;

use Illuminate\Database\Eloquent\Model;

class CongNoHocPhiSinhVien extends Model
{
    protected $table = 'v_cong_no_hoc_phi_sinhvien';
    public $timestamps = false;

    protected $fillable = [
        'SinhVienID', 'MaSV', 'HoTen', 'TenHocKy', 'HocPhiID',
        'TongTien', 'DaNop', 'ConNo', 'HanNop', 'TrangThaiNo', 'TongDaThanhToanChiTiet'
    ];
}