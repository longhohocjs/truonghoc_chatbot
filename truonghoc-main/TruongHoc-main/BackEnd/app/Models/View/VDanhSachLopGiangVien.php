<?php

namespace App\Models\View;

use Illuminate\Database\Eloquent\Model;

class VDanhSachLopGiangVien extends Model
{
    protected $table = 'v_danhsach_lop_giangvien';
    
    public $timestamps = false;

    protected $fillable = [
        'GiangVienID',
        'TenGiangVien',
        'HocVi',
        'ChuyenMon',
        'KhoaID',
        'email',
        'sodienthoai',
        'LopHocPhanID',
        'MaLopHP',
        'MaMon',
        'TenMon',
        'SoTinChi',
        'NamHoc',           
        'TenHocKy',
        'LoaiHocKy',       
        'SoLuongToiDa',
        'SoSinhVien',
    ];

    protected $appends = ['si_so'];

    public function getSiSoAttribute()
    {
        return $this->SoSinhVien . ' / ' . $this->SoLuongToiDa;
    }
}