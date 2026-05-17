<?php

namespace App\Models\View;

use Illuminate\Database\Eloquent\Model;

class VBangDiemLopHocPhan extends Model
{
    protected $table = 'v_bangdiem_lop_hoc_phan';
    public $timestamps = false;

    protected $fillable = [
        'LopHocPhanID', 'MaLopHP', 'TenMon', 'TenHocKy', 'MaSV',
        'HoTen', 'DiemChuyenCan', 'DiemGiuaKy', 'DiemThi', 'DiemTongKet', 'DiemChu'
    ];

}