<?php

namespace App\Models\View;

use Illuminate\Database\Eloquent\Model;

class VSinhVienLopSinhHoat extends Model
{
    protected $table = 'v_sinhvien_lop_sinh_hoat';
    public $timestamps = false;

    protected $fillable = [
        'LopSinhHoatID', 'MaLop', 'TenLop', 'NamNhapHoc', 'TenKhoa',
        'TenCoVan', 'EmailCoVan', 'SinhVienID', 'MaSV', 'HoTen', 'NgaySinh', 'Email', 'SoDienThoai'
    ];
}